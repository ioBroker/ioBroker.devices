import { type Connection } from '@iobroker/adapter-react-v5';
import type { RetVal } from '@iobroker/dm-utils';
import type { CategoryInfo, WidgetInfo } from './api';

export type CommandName = `dm:${string}`;

export type LoadItemsCallback = (result: { categories: CategoryInfo[]; widgets: WidgetInfo[] }) => RetVal<void>;

export class WmProtocol {
    constructor(
        private readonly selectedInstance: string,
        private readonly socket: Connection,
    ) {}

    public async loadItems(callback: LoadItemsCallback): Promise<void> {
        const response = await this.send<{ categories: CategoryInfo[]; widgets: WidgetInfo[] }>('dm:loadItems');
        try {
            void callback(response);
        } catch (error) {
            console.error(error);
        }
    }

    protected send<T = any>(command: CommandName, data?: any): Promise<T> {
        return this.socket.sendTo(this.selectedInstance, command, data);
    }
}
