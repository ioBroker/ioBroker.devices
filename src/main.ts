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
        });
    }

    unload(cb: () => void): void {
        //this.deviceManagement?.destroy();
        cb?.();
    }

    async main(): Promise<void> {
        this.deviceManagement = new DevicesDeviceManagement(this, true);
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.language = systemConfig?.common?.language || 'en';
        this.subscribeForeignObjects('*');
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new DevicesAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new DevicesAdapter())();
}
