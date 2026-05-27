"use strict";
/**
 * The idea of a widgets manager to minimize the communication between GUI and backend.
 * All items will be detected in the backend, and GUI must not load ALL objects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetsManagement = void 0;
class WidgetsManagement {
    widgets;
    categories;
    communicationStateId = '';
    adapter;
    constructor(adapter, communicationStateId) {
        adapter.on('message', this.onMessage.bind(this));
        this.adapter = adapter;
        if (communicationStateId === true) {
            // use standard ID `info.deviceManager`
            this.communicationStateId = 'info.widgetManager';
        }
        else if (communicationStateId) {
            this.communicationStateId = communicationStateId;
        }
        if (this.communicationStateId) {
            this.ensureCommunicationState().catch(e => this.log.error(`Cannot initialize communication state: ${e}`));
        }
    }
    async ensureCommunicationState() {
        let stateObj = await this.adapter.getObjectAsync(this.communicationStateId);
        if (!stateObj) {
            stateObj = {
                _id: this.communicationStateId,
                type: 'state',
                common: {
                    expert: true,
                    name: 'Communication with GUI for device manager',
                    type: 'string',
                    role: 'state',
                    def: '',
                    read: true,
                    write: false,
                },
                native: {},
            };
            await this.adapter.setObjectAsync(this.communicationStateId, stateObj);
        }
    }
    async sendCommandToGui(command) {
        if (this.communicationStateId) {
            await this.adapter.setState(this.communicationStateId, JSON.stringify(command), true);
        }
        else {
            throw new Error('Communication state not found');
        }
    }
    get log() {
        return this.adapter.log;
    }
    getWidgetStatus(_itemId) {
        throw new Error('Do not send "statusUpdate" command without implementing getDeviceStatus method!');
    }
    onMessage(obj) {
        if (!obj.command.startsWith('dm:')) {
            return;
        }
        void this.handleMessage(obj).catch(this.log.error);
    }
    async handleMessage(msg) {
        this.log.debug(`DeviceManagement received: ${JSON.stringify(msg)}`);
        switch (msg.command) {
            case 'dm:loadItems': {
                const [, adapterWidgets] = await Promise.all([this.loadItems(), this.loadCustomWidgets()]);
                const response = {
                    categories: [...this.categories.values()],
                    widgets: [...this.widgets.values()],
                };
                if (Object.keys(adapterWidgets).length) {
                    response.adapterWidgets = adapterWidgets;
                }
                this.sendReply(response, msg);
                return;
            }
        }
    }
    /**
     * Read all adapter instances that have `common.deviceWidgets` and return them
     * as `{ adapterName: { widget1: any, widget2: any } }`.
     */
    async loadCustomWidgets() {
        const result = {};
        try {
            const instances = await this.adapter.getObjectViewAsync('system', 'instance', {
                startkey: 'system.adapter.',
                endkey: 'system.adapter.\u9999',
            });
            if (instances?.rows) {
                for (const row of instances.rows) {
                    const common = row.value?.common;
                    if (common?.deviceWidgets && typeof common.deviceWidgets === 'object') {
                        // Extract adapter name from "system.adapter.adapterName.0"
                        const parts = row.id.split('.');
                        const adapterName = parts[2];
                        if (adapterName) {
                            result[adapterName] = common.deviceWidgets;
                        }
                    }
                }
            }
        }
        catch (e) {
            this.log.error(`Cannot load custom widgets from instances: ${e}`);
        }
        return result;
    }
    sendReply(reply, msg) {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
    destroy() {
        // do nothing
    }
}
exports.WidgetsManagement = WidgetsManagement;
//# sourceMappingURL=WidgetsManagement.js.map