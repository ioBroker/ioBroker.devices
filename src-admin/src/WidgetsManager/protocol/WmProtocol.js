import {} from '@iobroker/adapter-react-v5';
export class WmProtocol {
    selectedInstance;
    socket;
    constructor(selectedInstance, socket) {
        this.selectedInstance = selectedInstance;
        this.socket = socket;
    }
    async loadItems(callback) {
        const response = await this.send('dm:loadItems');
        try {
            void callback(response);
        }
        catch (error) {
            console.error(error);
        }
    }
    send(command, data) {
        return this.socket.sendTo(this.selectedInstance, command, data);
    }
}
//# sourceMappingURL=WmProtocol.js.map