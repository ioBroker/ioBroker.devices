import { Adapter, type AdapterOptions } from '@iobroker/adapter-core';
import DevicesDeviceManagement from './lib/DeviceManagement';

export default class DevicesAdapter extends Adapter {
    private deviceManagement: DevicesDeviceManagement | null = null;
    public language: ioBroker.Languages = 'en';

    public constructor(options: Partial<AdapterOptions> = {}) {
        super({
            ...options,
            name: 'devices',
            ready: () => this.main(),
            unload: cb => this.unload(cb),
        });

        this.deviceManagement = new DevicesDeviceManagement(this);
    }

    unload(cb: () => void) {
        //this.deviceManagement?.destroy();
        cb?.();
    }

    async main(): Promise<void> {
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.language = systemConfig?.common?.language || 'en';
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new DevicesAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new DevicesAdapter())();
}
