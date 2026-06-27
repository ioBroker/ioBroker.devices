import { readFileSync } from 'node:fs';
import { Adapter, type AdapterOptions } from '@iobroker/adapter-core';
import DevicesDeviceManagement from './lib/WidgetsManagement';

export default class DevicesAdapter extends Adapter {
    private deviceManagement: DevicesDeviceManagement | null = null;
    public language: ioBroker.Languages = 'en';

    public constructor(options: Partial<AdapterOptions> = {}) {
        super({
            ...options,
            name: 'devices',
            objectChange: (id: string, obj: ioBroker.Object | null | undefined): void => {
                this.deviceManagement?.objectChange(id, obj);
            },
            ready: () => this.main(),
            unload: cb => this.unload(cb),
            install: () => this.onInstall(),
        });
    }

    private async onInstall(noTerminate?: boolean): Promise<void> {
        // DB ist hier nutzbar → bestehendes Objekt anpassen
        const instances = await this.getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.devices.',
            endkey: 'system.adapter.devices.香',
        });
        if (instances.rows) {
            for (const instance of instances.rows) {
                if (instance.value?.common?.mode !== 'daemon') {
                    instance.value.common.mode = 'daemon';
                    await this.setForeignObjectAsync(instance.value._id, instance.value);
                }
            }
        }
        if (!noTerminate) {
            this.terminate ? this.terminate('install finished', 0) : process.exit(0);
        }
    }

    unload(cb: () => void): void {
        this.deviceManagement?.destroy();
        cb?.();
    }

    async main(): Promise<void> {
        this.deviceManagement = new DevicesDeviceManagement(this, true);
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.language = systemConfig?.common?.language || 'en';
        this.subscribeForeignObjects('*');
        await this.onInstall(true);

        // Upload one picture to devices.0, so it will be available in the File selector
        try {
            if (!(await this.fileExistsAsync(this.namespace, 'ioBrokerLogo.png'))) {
                const image = readFileSync(`${__dirname}/../img/ioBrokerLogo.png`);
                await this.writeFileAsync(this.namespace, 'ioBrokerLogo.png', image);
            }
        } catch (error) {
            this.log.error(`Unable to upload default image: ${error}`);
        }

        // Warn if any installed `web` adapter instance is misconfigured for the devices GUI.
        // The widget manager backend talks to the GUI via socket.io sendTo; with the legacy
        // built-in socket.io transport on `web` this hangs (no router for our namespace), so
        // the instance must either run `usePureWebSockets` or delegate the socket layer to a
        // `ws.X` adapter instance via `native.socketio`.
        await this.checkWebInstances();
    }

    private async checkWebInstances(): Promise<void> {
        try {
            let found = false;
            const res = await this.getObjectViewAsync('system', 'instance', {
                startkey: 'system.adapter.web.',
                endkey: 'system.adapter.web.香',
            });
            for (const row of res?.rows || []) {
                const id = row.id;
                // Skip ws.* / other adapters that happen to alphabetically fall in this range
                if (!/^system\.adapter\.web\.\d+$/.test(id)) {
                    continue;
                }
                const native = (row.value?.native || {}) as { usePureWebSockets?: boolean; socketio?: string };
                if (!native.socketio && native.usePureWebSockets) {
                    found = true;
                    break;
                }
                if (typeof native.socketio === 'string' && /^ws\.\d+$/.test(native.socketio)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.log.warn(
                    `web instance is not configured for the devices GUI — enable "Pure Web Sockets" or set "Socket.io adapter" to a "ws.X" instance, otherwise the widget view will hang.`,
                );
            }
        } catch (error) {
            this.log.debug(`Could not check web instance configuration: ${error as Error}`);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new DevicesAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new DevicesAdapter())();
}
