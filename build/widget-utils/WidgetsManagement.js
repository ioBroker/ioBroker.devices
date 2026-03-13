"use strict";
/**
 * The idea of a widgets manager to minimize the communication between GUI and backend.
 * All items will be detected in the backend, and GUI must not load ALL objects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetsManagement = void 0;
class WidgetsManagement {
    adapter;
    widgets;
    categories;
    communicationStateId = '';
    constructor(adapter, communicationStateId) {
        this.adapter = adapter;
        adapter.on('message', this.onMessage.bind(this));
        if (communicationStateId === true) {
            // use standard ID `info.deviceManager`
            this.communicationStateId = 'info.widgetManager';
        }
        else if (communicationStateId) {
            this.communicationStateId = communicationStateId;
        }
        if (this.communicationStateId) {
            this.ensureCommunicationState().catch(e => this.log().error(`Cannot initialize communication state: ${e}`));
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
                await this.loadItems();
                this.sendReply({
                    categories: [...this.categories.values()],
                    widgets: [...this.widgets.values()],
                }, msg);
                return;
            }
        }
    }
    sendReply(reply, msg) {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
}
exports.WidgetsManagement = WidgetsManagement;
//# sourceMappingURL=WidgetsManagement.js.map