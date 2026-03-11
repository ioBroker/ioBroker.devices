/* eslint-disable class-methods-use-this */
import type { ControlState, DeviceLoadIncrement, DmActionResponse, DmControlResponse, InstanceDetails } from './api';
import { type CommandName, DmProtocolBase, type LoadDevicesCallback, type Message } from './DmProtocolBase';

export class DmProtocolV3 extends DmProtocolBase {
    public override convertInstanceDetails(details: any): InstanceDetails {
        if (details.apiVersion !== 'v3') {
            throw new Error(`Unsupported API version: ${details.apiVersion ?? 'unknown'}`);
        }

        return details;
    }

    public override async loadDevices(callback: LoadDevicesCallback): Promise<void> {
        let response = await this.send<DeviceLoadIncrement>('dm:loadDevices');
        let total = response.total;
        while (response.add) {
            await callback(response.add, total);
            if (!response.next) {
                break;
            }
            response = await this.send<DeviceLoadIncrement>('dm:deviceLoadProgress', response.next);
            total = response.total ?? total;
        }
    }

    public override sendAction(command: CommandName, messageToSend: Message): Promise<DmActionResponse> {
        return this.send<DmActionResponse>(command, messageToSend);
    }

    public sendControl(
        command: CommandName,
        messageToSend: { deviceId: string; controlId: string; state?: ControlState },
    ): Promise<DmControlResponse> {
        return this.send<DmControlResponse>(command, messageToSend);
    }
}
