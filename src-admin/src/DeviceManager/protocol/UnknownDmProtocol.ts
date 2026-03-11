/* eslint-disable class-methods-use-this */
import type { ControlState, DmActionResponse, DmControlResponse, InstanceDetails } from './api';
import { type CommandName, DmProtocolBase, type LoadDevicesCallback, type Message } from './DmProtocolBase';

export class UnknownDmProtocol extends DmProtocolBase {
    constructor() {
        // as socket is never used in this protocol, we can use this ugly hack:
        super('', undefined as any);
    }

    public override convertInstanceDetails(details: any): InstanceDetails {
        return details;
    }

    public loadDevices(_callback: LoadDevicesCallback): Promise<void> {
        throw new Error('Protocol version unknown');
    }

    public sendAction(_command: CommandName, _messageToSend: Message): Promise<DmActionResponse> {
        throw new Error('Protocol version unknown');
    }

    public sendControl(
        _command: CommandName,
        _messageToSend: { deviceId: string; controlId: string; state?: ControlState },
    ): Promise<DmControlResponse> {
        throw new Error('Protocol version unknown');
    }
}
