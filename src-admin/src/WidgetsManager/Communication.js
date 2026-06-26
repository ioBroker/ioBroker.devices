import {} from '@iobroker/adapter-react-v5';
import { Backdrop, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, Snackbar, } from '@mui/material';
import React, { Component } from 'react';
import { WmProtocol } from './protocol/WmProtocol';
import { getTranslation } from './Utils';
/**
 * Communication Component
 */
export default class Communication extends Component {
    protocol;
    responseTimeout = null;
    constructor(props) {
        super(props);
        this.state = {
            showSpinner: false,
            showToast: null,
            message: null,
            selectedInstance: this.props.selectedInstance ?? (window.localStorage.getItem('wmSelectedInstance') || ''),
        };
        this.protocol = new WmProtocol(this.state.selectedInstance, this.props.socket);
        this.props.registerHandler?.(() => this.loadItemsList());
    }
    componentWillUnmount() {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }
    // eslint-disable-next-line react/no-unused-class-component-methods
    loadItems(callback) {
        return this.protocol.loadItems(callback);
    }
    // eslint-disable-next-line class-methods-use-this
    loadItemsList() {
        console.error('loadDeviceList not implemented');
    }
    // eslint-disable-next-line class-methods-use-this,react/no-unused-class-component-methods
    updateItem(_update) {
        console.error('updateDevice not implemented');
    }
    // eslint-disable-next-line class-methods-use-this,react/no-unused-class-component-methods
    deleteItem(_itemId) {
        console.error('deleteDevice not implemented');
    }
    renderMessageDialog() {
        if (!this.state.message) {
            return null;
        }
        const message = this.state.message;
        return (React.createElement(Dialog, { open: !0, onClose: () => message.handleClose(), hideBackdrop: true, "aria-describedby": "message-dialog-description" },
            React.createElement(DialogContent, null,
                React.createElement(DialogContentText, { id: "message-dialog-description" }, message.message)),
            React.createElement(DialogActions, null,
                React.createElement(Button, { color: "primary", onClick: () => message.handleClose(), variant: "contained", autoFocus: true }, getTranslation('okButtonText')))));
    }
    renderSnackbar() {
        return (React.createElement(Snackbar, { open: !!this.state.showToast, autoHideDuration: 6_000, onClose: () => this.setState({ showToast: null }), message: this.state.showToast }));
    }
    // eslint-disable-next-line class-methods-use-this
    renderContent() {
        return null;
    }
    renderSpinner() {
        if (!this.state.showSpinner) {
            return null;
        }
        return (React.createElement(Backdrop, { style: { zIndex: 1000 }, open: true },
            React.createElement(CircularProgress, null)));
    }
    render() {
        return (React.createElement(React.Fragment, null,
            this.renderSnackbar(),
            this.renderContent(),
            this.renderMessageDialog(),
            this.renderSpinner()));
    }
}
//# sourceMappingURL=Communication.js.map