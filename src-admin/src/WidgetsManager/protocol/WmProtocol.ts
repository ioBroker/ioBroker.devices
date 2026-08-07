import { type Connection } from '@iobroker/gui-components';
import type { RetVal } from '@iobroker/dm-utils';
import type { WmResponseItems } from './api';

export type CommandName = `dm:${string}`;

export type LoadItemsCallback = (result: WmResponseItems) => RetVal<void>;

/** Give up on a request if the backend did not answer within this time */
const RESPONSE_TIMEOUT_MS = 10_000;

export class WmProtocol {
    constructor(
        private readonly selectedInstance: string,
        private readonly socket: Connection,
    ) {}

    /**
     * Check if the backend instance is running.
     * A `sendTo` to a stopped instance is never answered, so every request must be guarded by this.
     */
    public async isAlive(): Promise<boolean> {
        if (!this.selectedInstance) {
            return false;
        }
        try {
            const state = await this.socket.getState(`system.adapter.${this.selectedInstance}.alive`);
            return !!state?.val;
        } catch (error) {
            console.error(`Cannot read alive state of "${this.selectedInstance}": ${error as string}`);
            return false;
        }
    }

    /**
     * Request categories and widgets from the backend
     *
     * @param callback called with the answer of the backend
     * @returns false if the instance is not running and therefore nothing was requested
     */
    public async loadItems(callback: LoadItemsCallback): Promise<boolean> {
        if (!(await this.isAlive())) {
            console.warn(`Instance "${this.selectedInstance}" is not running. "dm:loadItems" was not sent`);
            return false;
        }
        const response = await this.send<WmResponseItems>('dm:loadItems');
        try {
            void callback(response);
        } catch (error) {
            console.error(error);
        }
        return true;
    }

    protected async send<T = any>(command: CommandName, data?: any): Promise<T> {
        // The instance can still die between the alive check and the answer,
        // and `sendTo` would stay pending forever in that case
        let timeout: ReturnType<typeof setTimeout> | null = null;
        try {
            return await Promise.race([
                this.socket.sendTo(this.selectedInstance, command, data),
                new Promise<never>((_resolve, reject) => {
                    timeout = setTimeout(
                        () => reject(new Error(`No answer from "${this.selectedInstance}" on "${command}"`)),
                        RESPONSE_TIMEOUT_MS,
                    );
                }),
            ]);
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }
}
