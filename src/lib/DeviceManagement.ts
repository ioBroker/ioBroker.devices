import {
    DeviceManagement,
    type ConfigItemAny,
    type DeviceDetails,
    type DeviceLoadContext,
    type DeviceStatus,
} from '@iobroker/dm-utils';
import type DevicesAdapter from '../main';
import type DevicesWidgetsManagement from './WidgetsManagement';
import type { DevicesPatternControl } from './WidgetsManagement';

/**
 * The card type, derived from the framework's own `addDevice` signature rather than spelled out.
 *
 * `DeviceInfo` takes the action type as its FIRST parameter and the device id as its second, but
 * `DeviceLoadContext<TId>` passes the id into the first slot — so naming `DeviceInfo<'api'>` here
 * produces a type the base class rejects. Reading the type back out of `addDevice` sidesteps that:
 * whatever dm-utils means by those generics, this follows, and it keeps following if a later
 * release straightens them out.
 */
type LoadContext = DeviceLoadContext<string>;

/**
 * Detected states that the card already reports in its status line (see `statusOf`). They are
 * skipped in the list so a battery level is not shown twice on the same card.
 */
const STATUS_STATES = ['BATTERY', 'LOWBAT', 'UNREACH'];

/**
 * Exposes the devices this adapter manages through the ioBroker Device Manager.
 *
 * The adapter already advertises `common.supportedMessages.deviceManager` in io-package.json, so
 * Admin offers a Device Manager for this instance and sends the `dm:*` commands the base class
 * below answers. Until this existed, only `dm:loadItems` — the WidgetsManager GUI's own command —
 * was handled, and every real Device Manager request went unanswered.
 *
 * A card carries no `controls`, and therefore no control button: everything a device offers is on
 * the card itself (see `buildCustomInfo`). Controls would put a second copy of the same slider and
 * the same switch behind a dialog, and two places to operate one value is one too many.
 *
 * Detection is NOT repeated here: `DevicesWidgetsManagement` has already walked `alias.0.*` and
 * `linkeddevices.0.*` and run the type-detector over them, so this asks that instance for the
 * result and only translates it into cards. Both classes listen on the adapter's `message` event
 * and both filter on the `dm:` prefix; neither has a `default` branch, so each ignores the other's
 * commands, and they use separate communication states (`info.deviceManager` here,
 * `info.widgetManager` there).
 */
export default class DevicesDeviceManagement extends DeviceManagement<DevicesAdapter> {
    private readonly widgets: DevicesWidgetsManagement;

    constructor(adapter: DevicesAdapter, widgets: DevicesWidgetsManagement) {
        super(adapter, true);
        this.widgets = widgets;
    }

    /** Resolve a possibly translated object name into the admin's language. */
    private nameOf(obj: ioBroker.Object, fallback: string): string {
        const name = obj.common?.name;
        if (!name) {
            return fallback;
        }
        if (typeof name === 'object') {
            return name[this.adapter.language || 'en'] || name.en || fallback;
        }
        return name || fallback;
    }

    /**
     * How a writable state is operated in the list.
     *
     * The type-detector already says what each state is for, so the form follows the state itself
     * rather than the device type: a boolean is a switch, a number with a range is a slider,
     * anything carrying a value list is a select.
     */
    private static cardControl(common: ioBroker.StateCommon): {
        control: 'select' | 'switch' | 'slider' | 'number' | 'input';
        min?: number;
        max?: number;
        step?: number;
    } {
        if (common.states) {
            return { control: 'select' };
        }
        if (common.type === 'boolean') {
            return { control: 'switch' };
        }
        if (common.type === 'number') {
            let { min, max } = common;
            if (typeof min !== 'number' || typeof max !== 'number') {
                // A value declared in percent spans 0..100 by definition, and the aliases this
                // adapter builds routinely carry no explicit range — a dimmer or a blind would
                // otherwise be an input field where a slider is the obvious control.
                //
                // This only decides how the row is DRAWN; nothing is written back to the object.
                // That is the difference to the hard 0/100 that issue #22 rightly removed from the
                // alias creation path, which overwrote the source's real range.
                if (common.unit === '%') {
                    min = 0;
                    max = 100;
                }
            }
            // A slider needs both ends. A bare number without a range would get an arbitrary
            // scale, so it stays a plain value field.
            if (typeof min === 'number' && typeof max === 'number') {
                return { control: 'slider', min, max, step: typeof common.step === 'number' ? common.step : undefined };
            }
            return { control: 'number' };
        }
        return { control: 'input' };
    }

    /**
     * The whole device, on the card: every mapped state, readable at a glance and operable where
     * the state allows it.
     *
     * A row binds ONE object for reading and writing. That is why a command state is bound to
     * itself rather than to its feedback partner — binding the partner would read the truth but
     * write into a read-only object. The partner is listed as its own row instead, so a device that
     * reports back shows both what it was told (`SET`) and what it does (`ON_ACTUAL`).
     *
     * Only the two status states stay out; the status line above the list already carries them.
     *
     * `state` items with `foreign: true` bind to the object directly, so the GUI keeps the values
     * live without this adapter pushing updates.
     */
    private buildCustomInfo(deviceId: string, device: DevicesPatternControl): DeviceDetails<string> | undefined {
        const items: Record<string, ConfigItemAny> = {};
        let count = 0;

        for (const state of device.states) {
            const common = this.widgets.getCachedObject(state.id)?.common as ioBroker.StateCommon | undefined;
            if (!state.id || !common || STATUS_STATES.includes(state.name)) {
                continue;
            }
            const writable = common.write !== false && state.write !== false;
            items[`state_${count}`] = {
                type: 'state',
                oid: state.id,
                foreign: true,
                label: state.name,
                unit: common.unit,
                newLine: true,
                xs: 12,
                ...(writable ? DevicesDeviceManagement.cardControl(common) : { control: 'text' }),
            };
            count++;
        }

        return count ? { id: deviceId, schema: { type: 'panel', items } } : undefined;
    }

    /**
     * Battery and reachability come from the indicator states the type-detector found, so a card
     * warns about the same things the widget does.
     *
     * `UNREACH` is inverted by definition — `true` means the device cannot be reached — so it is
     * mapped rather than passed through. `LOWBAT` becomes a warning instead of a battery level:
     * it says the battery is low, not how full it is, and `battery` would render it as a reading.
     */
    private statusOf(device: DevicesPatternControl): DeviceStatus {
        const find = (name: string): string | undefined => device.states.find(s => s.id && s.name === name)?.id;
        const battery = find('BATTERY');
        const lowbat = find('LOWBAT');
        const unreach = find('UNREACH');

        const status: DeviceStatus = {
            // A device with no reachability state is not "unknown" — its states are readable, which
            // is all this adapter can honestly claim about an alias.
            connection: unreach
                ? { stateId: unreach, mapping: { true: 'disconnected', false: 'connected' } }
                : 'connected',
        };
        if (battery) {
            status.battery = { stateId: battery };
        }
        if (lowbat) {
            status.warning = { stateId: lowbat };
        }
        return status;
    }

    protected async loadDevices(context: LoadContext): Promise<void> {
        const devices = await this.widgets.getDetectedDevices();
        context.setTotalDevices(devices.length);

        for (const { device, obj } of devices) {
            const common = obj.common as { icon?: string; color?: string };
            context.addDevice({
                id: device.storeId,
                name: this.nameOf(obj, device.storeId),
                icon: common.icon || undefined,
                color: common.color || undefined,
                status: this.statusOf(device),
                customInfo: this.buildCustomInfo(device.storeId, device),
                // Grouped by what the type-detector made of them, so a long list stays navigable.
                group: { key: device.type, name: device.type },
            });
        }
    }
}
