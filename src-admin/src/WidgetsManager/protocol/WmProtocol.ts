import { type Connection } from '@iobroker/gui-components';
import type { RetVal } from '@iobroker/dm-utils';
import type { WmResponseItems } from './api';

export type CommandName = `dm:${string}`;

export type LoadItemsCallback = (result: WmResponseItems) => RetVal<void>;

/** Give up on a request if the backend did not answer within this time */
const RESPONSE_TIMEOUT_MS = 10_000;

/** The list of categories and widgets could not be loaded */
export class WmLoadError extends Error {
    constructor(public readonly reason: 'permission' | 'invalid') {
        super(reason === 'permission' ? 'No permission to call "sendTo"' : 'Invalid answer on "dm:loadItems"');
        this.name = 'WmLoadError';
    }
}

/**
 * Check the answer on `dm:loadItems`.
 *
 * The socket hands over whatever comes back: a user without the `sendTo` right gets a permission error instead of
 * the list, and the backend never sees the request.
 *
 * @param response Answer as it came from the socket
 * @returns The answer, if it holds the list
 * @throws {WmLoadError} If it does not
 */
export function checkItemsResponse(response: unknown): WmResponseItems {
    const answer = response as Partial<WmResponseItems> & { error?: unknown };
    if (Array.isArray(answer?.categories) && Array.isArray(answer.widgets)) {
        return answer as WmResponseItems;
    }
    throw new WmLoadError(
        response === 'permissionError' || answer?.error === 'permissionError' ? 'permission' : 'invalid',
    );
}

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
     * @throws {WmLoadError} If the answer does not hold the list
     */
    public async loadItems(callback: LoadItemsCallback): Promise<boolean> {
        if (!(await this.isAlive())) {
            console.warn(`Instance "${this.selectedInstance}" is not running. "dm:loadItems" was not sent`);
            return false;
        }
        const response = checkItemsResponse(await this.send<unknown>('dm:loadItems'));
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
