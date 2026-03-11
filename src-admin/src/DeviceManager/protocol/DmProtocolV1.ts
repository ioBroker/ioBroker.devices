/* eslint-disable class-methods-use-this */
import type { DeviceRefresh as DeviceRefreshV1 } from '@iobroker/dm-utils-v1';
import type * as V1 from '@iobroker/dm-utils-v1/build/types/api';
import type {
    CommunicationForm,
    ControlState,
    DeviceInfo,
    DmActionResponse,
    DmControlResponse,
    InstanceDetails,
} from './api';
import { DmProtocolBase, type CommandName, type LoadDevicesCallback, type Message } from './DmProtocolBase';

interface DmResponseV1 {
    /* Type of message */
    type: 'message' | 'confirm' | 'progress' | 'result' | 'form';
    /* Origin */
    origin: string;
}

interface DmControlResponseV1 extends DmResponseV1 {
    result: {
        error?: {
            code: number;
            message: string;
        };
        state?: ioBroker.State;
        deviceId: string;
        controlId: string;
    };
}

interface DmActionResponseV1 extends DmResponseV1 {
    result: {
        refresh?: DeviceRefreshV1;
        error?: {
            code: number;
            message: string;
        };
    };
    message?: string;
    confirm?: string;
    form?: CommunicationForm;
    progress?:
        | {
              open: boolean;
              indeterminate: boolean;
          }
        | {
              open: boolean;
              progress: number;
          };
}

export class DmProtocolV1 extends DmProtocolBase {
    public override convertInstanceDetails(details: any): InstanceDetails {
        if (details.apiVersion !== 'v1') {
            throw new Error(`Unsupported API version: ${details.apiVersion ?? 'unknown'}`);
        }

        const v1 = details as V1.InstanceDetails;
        return { ...v1, apiVersion: 'v3' };
    }

    public override async loadDevices(callback: LoadDevicesCallback): Promise<void> {
        // in V1, devices come in a single batch; thus we can simply call the callback with those
        const devices = await this.send<V1.DeviceInfo[]>('dm:listDevices');
        await callback(devices.map<DeviceInfo>(d => ({ ...d, identifier: d.id })));
    }

    public override async sendAction(command: CommandName, messageToSend: Message): Promise<DmActionResponse> {
        const response = await this.send<DmActionResponseV1>(command, messageToSend);
        switch (response.type) {
            case 'message':
                return {
                    type: 'message',
                    message: response.message || '',
                    origin: response.origin as any, // origin was accidentally set to string in V1
                };
            case 'confirm':
                return {
                    type: 'confirm',
                    confirm: response.confirm || '',
                    origin: response.origin as any, // origin was accidentally set to string in V1
                };
            case 'progress':
                return {
                    type: 'progress',
                    progress: response.progress || { open: false, indeterminate: true },
                    origin: response.origin as any, // origin was accidentally set to string in V1
                };
            case 'form':
                return {
                    type: 'form',
                    form: response.form || { title: '', schema: { type: 'panel', items: {} } },
                    origin: response.origin as any, // origin was accidentally set to string in V1
                };
            case 'result':
                if (response.result.error) {
                    return {
                        type: 'result',
                        result: { error: response.result.error },
                        origin: response.origin as any, // origin was accidentally set to string in V1
                    };
                }
                switch (response.result.refresh) {
                    case true:
                        return {
                            type: 'result',
                            result: { refresh: true },
                            origin: response.origin as any, // origin was accidentally set to string in V1
                        };
                    case 'device':
                        return {
                            type: 'result',
                            result: { refresh: 'devices' },
                            origin: response.origin as any, // origin was accidentally set to string in V1
                        };
                    case 'instance':
                        return {
                            type: 'result',
                            result: { refresh: 'instance' },
                            origin: response.origin as any, // origin was accidentally set to string in V1
                        };
                    default:
                        return {
                            type: 'result',
                            result: { refresh: false },
                            origin: response.origin as any, // origin was accidentally set to string in V1
                        };
                }
            default:
                throw new Error(`Unknown response type: ${(response as any).type}`);
        }
    }

    public async sendControl(
        command: CommandName,
        messageToSend: { deviceId: string; controlId: string; state?: ControlState },
    ): Promise<DmControlResponse> {
        const response = await this.send<DmControlResponseV1>(command, messageToSend);
        // contents matches, types unfortunately don't, so we need to cast here
        return response as any;
    }
}
