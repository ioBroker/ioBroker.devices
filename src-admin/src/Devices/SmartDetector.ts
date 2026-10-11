/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */

import ChannelDetector, {
    type PatternControl,
    type DetectOptions,
    type ExternalPatternControl,
} from '@iobroker/type-detector';

import { isStateRequired } from '../Components/helpers/utils';

export default class IOBChannelDetector {
    private detector: ChannelDetector = new ChannelDetector();
    private objects: Record<string, ioBroker.Object> = {};
    private keys: string[] = [];

    static getPatterns(): {
        [type: string]: ExternalPatternControl;
    } {
        return ChannelDetector.getPatterns();
    }

    detect(options: DetectOptions & { forceRebuildKeys?: boolean }): PatternControl[] | null {
        if (!options._keysOptional || options.forceRebuildKeys) {
            if (JSON.stringify(this.objects) !== JSON.stringify(options.objects) || options.forceRebuildKeys) {
                this.objects = options.objects;
                this.keys = Object.keys(this.objects).sort();
            }
            options._keysOptional = this.keys;
        }

        return this.detector.detect(options);
    }
}

/**
 * Devices-side guard for type-detector issue #597 / #536.
 *
 * When several independent aliases are grouped under one alias *device*, the
 * type-detector merges them into a single detected device: it fills the device's
 * slots — indicators (UNREACH, LOWBAT, ERROR) as well as regular states like
 * ON_ACTUAL — from the sibling channels of that grouping. The detected device then
 * lists datapoints that belong to completely different devices (see the issue
 * screenshots: a motion alias showing a Shelly's "online", or a dimmer showing
 * another light's status).
 *
 * We drop mappings that are aliases sitting in a *different* alias channel than the
 * device's primary (required) state. Required states are never dropped, and real
 * hardware states carry no `common.alias`, so genuine device-level states on a
 * neighbouring channel (e.g. a Homematic LOWBAT on the .0 channel) stay untouched.
 */
export function removeForeignAliasStates(control: PatternControl, objects: Record<string, ioBroker.Object>): void {
    // Only a mandatory state may define the home channel — a device always has one filled, whether
    // it is `required` or a member of a `requiredOneOf` group. Falling back to "the first state with
    // an ID" would be dangerous: in a leaked grouping that may well be the foreign one, and we would
    // then drop the device's real states instead of the leaked ones.
    const primary = control.states.find(s => s.id && isStateRequired(s));
    if (!primary?.id) {
        return;
    }
    const homeChannel = primary.id.substring(0, primary.id.lastIndexOf('.'));
    for (const state of control.states) {
        if (!state.id || isStateRequired(state)) {
            continue;
        }
        const common = objects[state.id]?.common as ioBroker.StateCommon | undefined;
        if (!common?.alias) {
            // real hardware (no alias) – keep genuine device-level states
            continue;
        }
        if (state.id.substring(0, state.id.lastIndexOf('.')) !== homeChannel) {
            state.id = '';
        }
    }
}

/**
 * Devices-side guard against one datapoint filling two slots of the same pattern.
 *
 * After its main pass the type-detector runs a second one for the `searchInParent` and indicator
 * slots that scans every datapoint under the device again — this time without regard for the ids the
 * main pass already took. A device whose setpoint cannot be written (a thermostat `SET` mapped onto a
 * bare temperature sensor) therefore lands on `ACTUAL` as well, because a read-only temperature is
 * exactly what `ACTUAL` looks for. One reading would then be shown twice, once as the target and once
 * as the measurement, inventing a second value the device never reported.
 *
 * Only the later slot of such a pair is cleared, and never a mandatory one. Slots that share a name
 * are left alone: a pattern may declare one slot twice with different types (`airCondition`'s SWING),
 * and both entries then stand for the same thing.
 *
 * Twin of `removeDuplicateStateIds` in src/lib/WidgetsManagement.ts; the two build roots share no code.
 */
export function removeDuplicateStateIds(control: PatternControl): void {
    // id -> name of the slot that got it first
    const owners = new Map<string, string>();
    for (const state of control.states) {
        if (!state.id) {
            continue;
        }
        const owner = owners.get(state.id);
        if (owner === undefined) {
            owners.set(state.id, state.name);
        } else if (owner !== state.name && !isStateRequired(state)) {
            state.id = '';
        }
    }
}
