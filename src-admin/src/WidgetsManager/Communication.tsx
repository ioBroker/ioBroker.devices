import { type Connection, type IobTheme, type ThemeName, type ThemeType } from '@iobroker/adapter-react-v5';
import {
    Backdrop,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    Snackbar,
} from '@mui/material';
import React, { Component } from 'react';
import type { ItemInfo } from './protocol/api';
import { WmProtocol, type LoadItemsCallback } from './protocol/WmProtocol';
import { getTranslation } from './Utils';

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        grey: true;
    }
}

export type CommunicationProps = {
    /** Socket connection */
    socket: Connection;
    /** Instance to communicate with device-manager backend, like `adapterName.X` */
    selectedInstance?: string; // adapterName.X
    registerHandler?: (handler: null | ((command: string) => void)) => void;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    isFloatComma: boolean;
    dateFormat: string;
};

export type CommunicationState = {
    showSpinner: boolean;
    showToast: string | null;
    message: {
        message: string;
        handleClose: () => void;
    } | null;
    selectedInstance: string; // adapterName.X
};

/**
 * Communication Component
 */
export default class Communication<P extends CommunicationProps, S extends CommunicationState> extends Component<P, S> {
    private protocol: WmProtocol;
    private responseTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: P) {
        super(props);

        this.state = {
            showSpinner: false,
            showToast: null,
            message: null,
            selectedInstance: this.props.selectedInstance ?? (window.localStorage.getItem('wmSelectedInstance') || ''),
        } as S;

        this.protocol = new WmProtocol(this.state.selectedInstance, this.props.socket);

        this.props.registerHandler?.(() => this.loadItemsList());
    }

    componentWillUnmount(): void {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    loadItems(callback: LoadItemsCallback): Promise<void> {
        return this.protocol.loadItems(callback);
    }

    // eslint-disable-next-line class-methods-use-this
    loadItemsList(): void {
        console.error('loadDeviceList not implemented');
    }

    // eslint-disable-next-line class-methods-use-this
    updateItem(_update: ItemInfo): void {
        console.error('updateDevice not implemented');
    }

    // eslint-disable-next-line class-methods-use-this
    deleteItem(_itemId: string): void {
        console.error('deleteDevice not implemented');
    }

    renderMessageDialog(): React.JSX.Element | null {
        if (!this.state.message) {
            return null;
        }

        const message = this.state.message;
        return (
            <Dialog
                open={!0}
                onClose={() => message.handleClose()}
                hideBackdrop
                aria-describedby="message-dialog-description"
            >
                <DialogContent>
                    <DialogContentText id="message-dialog-description">{message.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="primary"
                        onClick={() => message.handleClose()}
                        variant="contained"
                        autoFocus
                    >
                        {getTranslation('okButtonText')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderSnackbar(): React.JSX.Element {
        return (
            <Snackbar
                open={!!this.state.showToast}
                autoHideDuration={6_000}
                onClose={() => this.setState({ showToast: null })}
                message={this.state.showToast}
            />
        );
    }

    // eslint-disable-next-line class-methods-use-this
    renderContent(): React.JSX.Element | React.JSX.Element[] | null {
        return null;
    }

    renderSpinner(): React.JSX.Element | null {
        if (!this.state.showSpinner) {
            return null;
        }
        return (
            <Backdrop
                style={{ zIndex: 1000 }}
                open
            >
                <CircularProgress />
            </Backdrop>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {this.renderSnackbar()}
                {this.renderContent()}
                {this.renderMessageDialog()}
                {this.renderSpinner()}
            </>
        );
    }
}
