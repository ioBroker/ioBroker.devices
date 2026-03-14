/**
 * The idea of a widgets manager to minimize the communication between GUI and backend.
 * All items will be detected in the backend, and GUI must not load ALL objects.
 */

import type { AdapterInstance } from '@iobroker/adapter-core';
import type { WidgetInfo, CategoryInfo, DeviceStatus, RetVal, BackendToGuiCommand } from './types';
import type { WmResponseItems } from './types/api';

export abstract class WidgetsManagement<TAdapter extends AdapterInstance = AdapterInstance> {
    protected widgets?: Map<string, WidgetInfo>;
    protected categories?: Map<string, CategoryInfo>;
    private readonly communicationStateId: string = '';
    protected adapter: AdapterInstance;

    constructor(adapter: TAdapter, communicationStateId?: string | boolean) {
        adapter.on('message', this.onMessage.bind(this));
        this.adapter = adapter;
        if (communicationStateId === true) {
            // use standard ID `info.deviceManager`
            this.communicationStateId = 'info.widgetManager';
        } else if (communicationStateId) {
            this.communicationStateId = communicationStateId;
        }
        if (this.communicationStateId) {
            this.ensureCommunicationState().catch(e => this.log.error(`Cannot initialize communication state: ${e}`));
        }
    }

    private async ensureCommunicationState(): Promise<void> {
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

    protected async sendCommandToGui(command: BackendToGuiCommand): Promise<void> {
        if (this.communicationStateId) {
            await this.adapter.setState(this.communicationStateId, JSON.stringify(command), true);
        } else {
            throw new Error('Communication state not found');
        }
    }

    protected get log(): ioBroker.Log {
        return this.adapter.log;
    }

    protected abstract loadItems(): RetVal<void>;

    protected getWidgetStatus(_itemId: string): RetVal<DeviceStatus | DeviceStatus[]> {
        throw new Error('Do not send "statusUpdate" command without implementing getDeviceStatus method!');
    }

    private onMessage(obj: ioBroker.Message): void {
        if (!obj.command.startsWith('dm:')) {
            return;
        }
        void this.handleMessage(obj).catch(this.log.error);
    }

    private async handleMessage(msg: ioBroker.Message): Promise<void> {
        this.log.debug(`DeviceManagement received: ${JSON.stringify(msg)}`);
        switch (msg.command) {
            case 'dm:loadItems': {
                await this.loadItems();
                this.sendReply<WmResponseItems>(
                    {
                        categories: [...this.categories!.values()],
                        widgets: [...this.widgets!.values()],
                    },
                    msg,
                );
                return;
            }
        }
    }

    private sendReply<T>(reply: T, msg: ioBroker.Message): void {
        this.adapter.sendTo(msg.from, msg.command, reply, msg.callback);
    }
}
