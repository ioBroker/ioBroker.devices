import {
    I18n,
    Icon,
    Utils,
    type AdminConnection,
    type Connection,
    type IobTheme,
    type ThemeName,
    type ThemeType,
} from '@iobroker/adapter-react-v5';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/json-config';
import { Check, Close, ContentCopy } from '@mui/icons-material';
import {
    Backdrop,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid2,
    IconButton,
    Input,
    InputAdornment,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Slider,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';
import React, { Component } from 'react';
import JsonConfig from './JsonConfig';
import type {
    ActionBase,
    ActionButton,
    CommunicationForm,
    ControlBase,
    ControlState,
    DeviceId,
    InstanceDetails,
    ProgressUpdate,
    DeviceInfo,
} from './protocol/api';
import type { CommandName, DmProtocolBase, LoadDevicesCallback, Message } from './protocol/DmProtocolBase';
import { DmProtocolV1 } from './protocol/DmProtocolV1';
import { DmProtocolV2 } from './protocol/DmProtocolV2';
import { DmProtocolV3 } from './protocol/DmProtocolV3';
import { UnknownDmProtocol } from './protocol/UnknownDmProtocol';
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

interface CommunicationFormInState extends CommunicationForm {
    handleClose?: (data?: Record<string, any>) => void;
    originalData: string;
    changed: boolean;
}

interface InputAction extends ActionBase {
    /** If it is a device action */
    deviceId?: string;
}

export type CommunicationState = {
    showSpinner: boolean;
    showToast: string | null;
    message: {
        message: string;
        handleClose: () => void;
    } | null;
    confirm: {
        message: string;
        handleClose: (confirmation?: boolean) => void;
    } | null;
    form: CommunicationFormInState | null;
    progress: ProgressUpdate | null;
    showConfirmation: InputAction | null;
    showInput: InputAction | null;
    inputValue: string | boolean | number | null;
    selectedInstance: string; // adapterName.X
};

/**
 * Communication Component
 */
export default class Communication<P extends CommunicationProps, S extends CommunicationState> extends Component<P, S> {
    private protocol: DmProtocolBase = new UnknownDmProtocol();
    private responseTimeout: ReturnType<typeof setTimeout> | null = null;

    // eslint-disable-next-line react/no-unused-class-component-methods
    instanceHandler: (action: ActionBase) => () => void;

    // eslint-disable-next-line react/no-unused-class-component-methods
    deviceHandler: (deviceId: string, action: ActionBase) => () => void;

    // eslint-disable-next-line react/no-unused-class-component-methods
    controlHandler: (
        deviceId: string,
        control: ControlBase,
        state: ControlState,
    ) => () => Promise<ioBroker.State | null>;

    // eslint-disable-next-line react/no-unused-class-component-methods
    controlStateHandler: (deviceId: string, control: ControlBase) => () => Promise<ioBroker.State | null>;

    constructor(props: P) {
        super(props);

        this.state = {
            showSpinner: false,
            showToast: null,
            message: null,
            confirm: null,
            form: null,
            progress: null,
            showConfirmation: null,
            showInput: null,
            inputValue: null,
            selectedInstance: this.props.selectedInstance ?? (window.localStorage.getItem('dmSelectedInstance') || ''),
        } as S;

        // eslint-disable-next-line react/no-unused-class-component-methods
        this.instanceHandler = action => () => {
            if (action.confirmation) {
                this.setState({ showConfirmation: action });
                return;
            }
            if (action.inputBefore) {
                this.setState({ showInput: action });
                return;
            }

            this.sendActionToInstance('dm:instanceAction', { actionId: action.id, timeout: action.timeout });
        };

        // eslint-disable-next-line react/no-unused-class-component-methods
        this.deviceHandler = (deviceId, action) => () => {
            if (action.confirmation) {
                this.setState({ showConfirmation: { ...action, deviceId } });
                return;
            }
            if (action.inputBefore) {
                this.setState({
                    showInput: { ...action, deviceId },
                    inputValue: action.inputBefore.defaultValue || '',
                });
                return;
            }

            this.sendActionToInstance('dm:deviceAction', { deviceId, actionId: action.id, timeout: action.timeout });
        };

        // eslint-disable-next-line react/no-unused-class-component-methods
        this.controlHandler = (deviceId, control, state) => () =>
            this.sendControlToInstance('dm:deviceControl', { deviceId, controlId: control.id, state });

        // eslint-disable-next-line react/no-unused-class-component-methods
        this.controlStateHandler = (deviceId, control) => () =>
            this.sendControlToInstance('dm:deviceControlState', { deviceId, controlId: control.id });

        this.props.registerHandler?.(() => this.loadDeviceList());
    }

    componentWillUnmount(): void {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    loadAllData(): Promise<void> {
        console.error('loadAllData not implemented');
        return Promise.resolve();
    }

    // eslint-disable-next-line class-methods-use-this
    loadDeviceList(): void {
        console.error('loadDeviceList not implemented');
    }

    // eslint-disable-next-line class-methods-use-this
    updateDevice(_update: DeviceInfo): void {
        console.error('updateDevice not implemented');
    }

    // eslint-disable-next-line class-methods-use-this
    deleteDevice(_deviceId: DeviceId): void {
        console.error('deleteDevice not implemented');
    }

    sendActionToInstance = (command: CommandName, messageToSend: Message): void => {
        const send = async (): Promise<void> => {
            this.setState({ showSpinner: true });

            this.responseTimeout = setTimeout(() => {
                this.setState({ showSpinner: false });
                window.alert(I18n.t('ra_No response from the backend'));
            }, messageToSend.timeout || 5000);

            const response = await this.protocol.sendAction(command, messageToSend);

            if (this.responseTimeout) {
                clearTimeout(this.responseTimeout);
                this.responseTimeout = null;
            }

            const type = response.type;
            console.log(`Response: ${type}`);
            switch (response.type) {
                case 'message': {
                    const message = getTranslation(response.message);
                    console.log(`Message received: ${message}`);
                    if (message) {
                        this.setState({
                            message: {
                                message,
                                handleClose: () =>
                                    this.setState({ message: null }, () =>
                                        this.sendActionToInstance('dm:actionProgress', { origin: response.origin }),
                                    ),
                            },
                            showSpinner: false,
                        });
                    }
                    break;
                }

                case 'confirm': {
                    const message = getTranslation(response.confirm);
                    console.log(`Confirm received: ${message}`);
                    if (message) {
                        this.setState({
                            confirm: {
                                message: message,
                                handleClose: (confirm?: boolean) =>
                                    this.setState({ confirm: null }, () =>
                                        this.sendActionToInstance('dm:actionProgress', {
                                            origin: response.origin,
                                            confirm,
                                        }),
                                    ),
                            },
                            showSpinner: false,
                        });
                    }
                    break;
                }

                case 'form':
                    console.log('Form received');
                    if (response.form) {
                        const data: Record<string, any> | undefined = response.form.data;
                        const originalData: Record<string, any> = {};
                        if (data) {
                            Object.keys(data).forEach(key => {
                                if (data[key] !== undefined) {
                                    originalData[key] = data[key];
                                }
                            });
                        }
                        response.form.data = JSON.parse(JSON.stringify(originalData)) as Record<string, any>;

                        this.setState({
                            form: {
                                ...response.form,
                                changed: false,
                                originalData: JSON.stringify(originalData),
                                handleClose: (data: any) =>
                                    this.setState({ form: null }, () => {
                                        console.log(`Form ${JSON.stringify(data)}`);
                                        this.sendActionToInstance('dm:actionProgress', {
                                            origin: response.origin,
                                            data,
                                        });
                                    }),
                            },
                            showSpinner: false,
                        });
                    }
                    break;

                case 'progress':
                    console.log('Progress received', response.progress);
                    if (response.progress) {
                        if (response.progress.open === false) {
                            this.setState({ progress: null, showSpinner: false });
                        } else if (this.state.progress) {
                            const progress = { ...this.state.progress, ...response.progress };
                            this.setState({ progress, showSpinner: false });
                        } else {
                            this.setState({ progress: response.progress, showSpinner: false });
                        }
                    }
                    this.sendActionToInstance('dm:actionProgress', { origin: response.origin });
                    break;

                case 'result':
                    console.log('Response content', response.result);
                    if ('refresh' in response.result && response.result.refresh) {
                        if (response.result.refresh === true || response.result.refresh === 'all') {
                            console.log('Refreshing all');
                            await this.loadAllData();
                        } else if (response.result.refresh === 'instance') {
                            console.log(`Refreshing instance infos: ${this.state.selectedInstance}`);
                            await this.loadInstanceInfos();
                        } else if (response.result.refresh === 'devices') {
                            console.log('Refreshing devices');
                            this.loadDeviceList();
                        } else {
                            console.log('Not refreshing anything');
                        }
                    } else if ('update' in response.result && response.result.update) {
                        console.log('Update received', response.result.update);
                        this.updateDevice(response.result.update);
                    } else if ('delete' in response.result && response.result.delete) {
                        console.log('Delete received', response.result.delete);
                        this.deleteDevice(response.result.delete);
                    }

                    if ('error' in response.result && response.result.error) {
                        console.error(`Error: ${response.result.error.message}`);
                        this.setState({ showToast: response.result.error.message, showSpinner: false });
                    } else {
                        this.setState({ showSpinner: false });
                    }
                    break;

                default:
                    console.log(`Unknown response type: ${type}`);
                    this.setState({ showSpinner: false });
                    break;
            }
        };

        void send().catch(console.error);
    };

    sendControlToInstance = async (
        command: CommandName,
        messageToSend: { deviceId: string; controlId: string; state?: ControlState },
    ): Promise<null | ioBroker.State> => {
        const response = await this.protocol.sendControl(command, messageToSend);
        const type = response.type;
        console.log(`Response: ${response.type}`);
        if (response.type === 'result') {
            console.log('Response content', response.result);
            if ('error' in response.result) {
                console.error(`Error: ${response.result.error.message}`);
                this.setState({ showToast: response.result.error.message });
            } else if (response.result.state !== undefined) {
                return response.result.state;
            }
        } else {
            console.warn('Unexpected response type', type);
        }

        return null;
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    loadDevices(callback: LoadDevicesCallback): Promise<void> {
        return this.protocol.loadDevices(callback);
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    async loadInstanceInfos(): Promise<InstanceDetails> {
        if (!this.state.selectedInstance) {
            throw new Error('No instance selected');
        }
        const details = await this.props.socket.sendTo(this.state.selectedInstance, 'dm:instanceInfo');
        console.log('Instance details of', this.state.selectedInstance, details);
        if (details.apiVersion === 'v1') {
            this.protocol = new DmProtocolV1(this.state.selectedInstance, this.props.socket);
        } else if (details.apiVersion === 'v2') {
            this.protocol = new DmProtocolV2(this.state.selectedInstance, this.props.socket);
        } else if (details.apiVersion === 'v3') {
            this.protocol = new DmProtocolV3(this.state.selectedInstance, this.props.socket);
        } else {
            this.protocol = new UnknownDmProtocol();
        }

        return this.protocol.convertInstanceDetails(details);
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

    renderConfirmDialog(): React.JSX.Element | null {
        if (!this.state.confirm) {
            return null;
        }

        const confirm = this.state.confirm;
        return (
            <Dialog
                open={!0}
                onClose={() => confirm.handleClose()}
                hideBackdrop
                aria-describedby="confirm-dialog-description"
            >
                <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                        {getTranslation(confirm.message)}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => confirm.handleClose(true)}
                        autoFocus
                    >
                        {getTranslation('yesButtonText')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => confirm.handleClose(false)}
                        autoFocus
                    >
                        {getTranslation('noButtonText')}
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

    getOkButton(button?: ActionButton | 'apply' | 'cancel' | 'close'): React.JSX.Element {
        if (typeof button === 'string') {
            button = undefined;
        }

        // TODO: detect if any input fields are present and if no one, do not disable the button

        return (
            <Button
                key="apply"
                disabled={!this.state.form?.changed && !this.state.form?.ignoreApplyDisabled}
                variant={button?.variant || 'contained'}
                color={
                    button?.color === 'primary' ? 'primary' : button?.color === 'secondary' ? 'secondary' : 'primary'
                }
                style={{
                    backgroundColor:
                        button?.color && button?.color !== 'primary' && button?.color !== 'secondary'
                            ? button?.color
                            : undefined,
                    ...(button?.style || undefined),
                }}
                onClick={() => this.state.form?.handleClose && this.state.form.handleClose(this.state.form?.data)}
                startIcon={button?.icon ? <Icon src={button?.icon} /> : undefined}
            >
                {getTranslation(button?.label || 'okButtonText', button?.noTranslation)}
            </Button>
        );
    }

    getCancelButton(button?: ActionButton | 'apply' | 'cancel' | 'close'): React.JSX.Element {
        let isClose = false;
        if (typeof button === 'string') {
            isClose = button === 'close';
            button = undefined;
        }
        return (
            <Button
                key="cancel"
                variant={button?.variant || 'contained'}
                color={button?.color === 'primary' ? 'primary' : button?.color === 'secondary' ? 'secondary' : 'grey'}
                style={{
                    backgroundColor:
                        button?.color && button?.color !== 'primary' && button?.color !== 'secondary'
                            ? button?.color
                            : undefined,
                    ...(button?.style || undefined),
                }}
                onClick={() => this.state.form?.handleClose && this.state.form.handleClose()}
                startIcon={isClose ? <Close /> : button?.icon ? <Icon src={button?.icon} /> : undefined}
            >
                {getTranslation(button?.label || 'cancelButtonText', button?.noTranslation)}
            </Button>
        );
    }

    renderFormDialog(): React.JSX.Element | null {
        if (!this.state.form?.schema) {
            return null;
        }
        if (!this.state.selectedInstance) {
            throw new Error('No instance selected');
        }

        const form = this.state.form;
        let buttons: React.JSX.Element[];
        if (form.buttons) {
            buttons = [];
            form.buttons.forEach((button: ActionButton | 'apply' | 'cancel' | 'close'): void => {
                if (typeof button === 'object' && button.type === 'copyToClipboard') {
                    buttons.push(
                        <Button
                            key="copyToClipboard"
                            variant={button.variant || 'outlined'}
                            color={
                                button.color === 'primary'
                                    ? 'primary'
                                    : button.color === 'secondary'
                                      ? 'secondary'
                                      : undefined
                            }
                            style={{
                                backgroundColor:
                                    button.color && button.color !== 'primary' && button.color !== 'secondary'
                                        ? button.color
                                        : undefined,
                                ...(button.style || undefined),
                            }}
                            onClick={() => {
                                if (button.copyToClipboardAttr && form.data) {
                                    const val = form.data[button.copyToClipboardAttr];
                                    if (typeof val === 'string') {
                                        Utils.copyToClipboard(val);
                                    } else {
                                        Utils.copyToClipboard(JSON.stringify(val, null, 2));
                                    }
                                    window.alert(I18n.t('copied'));
                                } else if (form.data) {
                                    Utils.copyToClipboard(JSON.stringify(form.data, null, 2));
                                    window.alert(I18n.t('copied'));
                                } else {
                                    window.alert(I18n.t('nothingToCopy'));
                                }
                            }}
                            startIcon={button?.icon ? <Icon src={button?.icon} /> : <ContentCopy />}
                        >
                            {getTranslation(button?.label || 'ctcButtonText', button?.noTranslation)}
                        </Button>,
                    );
                } else if (button === 'apply' || (button as ActionButton).type === 'apply') {
                    buttons.push(this.getOkButton(button));
                } else {
                    buttons.push(this.getCancelButton(button));
                }
            });
        } else {
            buttons = [this.getOkButton(), this.getCancelButton()];
        }

        return (
            <Dialog
                onClose={() => form.handleClose?.()}
                hideBackdrop
                fullWidth
                open
                sx={{
                    '& .MuiDialog-paper': {
                        minWidth: form.minWidth || undefined,
                    },
                }}
                maxWidth={form.maxWidth || 'md'}
            >
                {form.title ? (
                    <DialogTitle>{getTranslation(form.label || form.title, form.noTranslation)}</DialogTitle>
                ) : null}
                <DialogContent>
                    <JsonConfig
                        instanceId={this.state.selectedInstance}
                        schema={form.schema as ConfigItemPanel | ConfigItemTabs}
                        data={form.data || {}}
                        socket={this.props.socket as AdminConnection}
                        onChange={(data: Record<string, any>) => {
                            console.log('handleFormChange', { data });
                            if (form) {
                                form.data = data;
                                form.changed = JSON.stringify(data) !== form.originalData;
                                this.setState({ form });
                            }
                        }}
                        themeName={this.props.themeName}
                        themeType={this.props.themeType}
                        theme={this.props.theme}
                        isFloatComma={this.props.isFloatComma}
                        dateFormat={this.props.dateFormat}
                    />
                </DialogContent>
                <DialogActions>{buttons}</DialogActions>
            </Dialog>
        );
    }

    renderProgressDialog(): React.JSX.Element | null {
        if (!this.state.progress) {
            return null;
        }
        return (
            <Dialog
                onClose={() => {}}
                hideBackdrop
                open
            >
                {this.state.progress.title && <DialogTitle>{getTranslation(this.state.progress.title)}</DialogTitle>}
                <DialogContent>
                    {this.state.progress.label && (
                        <DialogContentText>{getTranslation(this.state.progress.label)}</DialogContentText>
                    )}
                    <LinearProgress
                        variant={this.state.progress.indeterminate ? 'indeterminate' : 'determinate'}
                        value={this.state.progress.value}
                    />
                </DialogContent>
            </Dialog>
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

    renderConfirmationDialog(): React.JSX.Element | null {
        if (!this.state.showConfirmation) {
            return null;
        }
        return (
            <Dialog
                onClose={() => this.setState({ showConfirmation: null })}
                open
            >
                <DialogTitle>
                    {getTranslation(
                        this.state.showConfirmation.confirmation === true
                            ? getTranslation('areYouSureText')
                            : getTranslation(this.state.showConfirmation.confirmation as ioBroker.StringOrTranslated),
                    )}
                </DialogTitle>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            if (!this.state.showConfirmation) {
                                return;
                            }

                            const showConfirmation = this.state.showConfirmation;
                            this.setState({ showConfirmation: null }, () => {
                                if (showConfirmation.deviceId) {
                                    this.sendActionToInstance('dm:deviceAction', {
                                        actionId: showConfirmation.id,
                                        deviceId: showConfirmation.deviceId,
                                        timeout: showConfirmation.timeout,
                                    });
                                } else {
                                    this.sendActionToInstance('dm:instanceAction', {
                                        actionId: showConfirmation.id,
                                        timeout: showConfirmation.timeout,
                                    });
                                }
                            });
                        }}
                        autoFocus
                        startIcon={<Check />}
                    >
                        {getTranslation('yesButtonText')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => this.setState({ showConfirmation: null })}
                        startIcon={<Close />}
                    >
                        {getTranslation('cancelButtonText')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    onShowInputOk(): void {
        if (!this.state.showInput) {
            return;
        }

        const showInput = this.state.showInput;
        this.setState({ showInput: null }, () => {
            if (showInput.deviceId) {
                this.sendActionToInstance('dm:deviceAction', {
                    actionId: showInput.id,
                    deviceId: showInput.deviceId,
                    timeout: showInput.timeout,
                    value:
                        showInput.inputBefore?.type === 'checkbox'
                            ? !!this.state.inputValue
                            : showInput.inputBefore?.type === 'number'
                              ? parseFloat(this.state.inputValue as string) || 0
                              : this.state.inputValue,
                });
            } else {
                this.sendActionToInstance('dm:instanceAction', {
                    actionId: showInput.id,
                    timeout: showInput.timeout,
                    value:
                        showInput.inputBefore?.type === 'checkbox'
                            ? !!this.state.inputValue
                            : showInput.inputBefore?.type === 'number'
                              ? parseFloat(this.state.inputValue as string) || 0
                              : this.state.inputValue,
                });
            }
        });
    }

    renderInputDialog(): React.JSX.Element | null {
        if (!this.state.showInput || !this.state.showInput.inputBefore) {
            return null;
        }
        let okDisabled = false;
        if (!this.state.showInput.inputBefore.allowEmptyValue && this.state.showInput.inputBefore.type !== 'checkbox') {
            if (
                this.state.showInput.inputBefore.type === 'number' ||
                this.state.showInput.inputBefore.type === 'slider'
            ) {
                okDisabled =
                    this.state.inputValue === '' ||
                    this.state.inputValue === null ||
                    !window.isFinite(this.state.inputValue as number);
            } else {
                okDisabled = !this.state.inputValue;
            }
        }

        return (
            <Dialog
                onClose={() => this.setState({ showInput: null })}
                open
            >
                <DialogTitle>{getTranslation('pleaseEnterValueText')}</DialogTitle>
                <DialogContent>
                    {this.state.showInput.inputBefore.type === 'text' ||
                    this.state.showInput.inputBefore.type === 'number' ||
                    !this.state.showInput.inputBefore.type ? (
                        <TextField
                            autoFocus
                            margin="dense"
                            label={getTranslation(this.state.showInput.inputBefore.label)}
                            slotProps={{
                                htmlInput:
                                    this.state.showInput.inputBefore.type === 'number'
                                        ? {
                                              min: this.state.showInput.inputBefore.min,
                                              max: this.state.showInput.inputBefore.max,
                                              step: this.state.showInput.inputBefore.step,
                                          }
                                        : undefined,
                                input: {
                                    endAdornment: this.state.inputValue ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                tabIndex={-1}
                                                size="small"
                                                onClick={() => this.setState({ inputValue: '' })}
                                            >
                                                <Close />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                },
                            }}
                            type={this.state.showInput.inputBefore.type === 'number' ? 'number' : 'text'}
                            fullWidth
                            value={this.state.inputValue}
                            onChange={e => this.setState({ inputValue: e.target.value })}
                            onKeyUp={(e: React.KeyboardEvent) => {
                                if (e.key === 'Enter') {
                                    this.onShowInputOk();
                                }
                            }}
                        />
                    ) : null}
                    {this.state.showInput.inputBefore.type === 'checkbox' ? (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!this.state.inputValue}
                                    autoFocus
                                    onChange={e => this.setState({ inputValue: e.target.checked })}
                                />
                            }
                            label={getTranslation(this.state.showInput.inputBefore.label)}
                        />
                    ) : null}
                    {this.state.showInput.inputBefore.type === 'select' ? (
                        <FormControl fullWidth>
                            <InputLabel>{getTranslation(this.state.showInput.inputBefore.label)}</InputLabel>
                            <Select
                                variant="standard"
                                value={this.state.inputValue}
                                onChange={e => this.setState({ inputValue: e.target.value })}
                            >
                                {this.state.showInput.inputBefore.options?.map(item => (
                                    <MenuItem
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {getTranslation(item.label)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : null}
                    {this.state.showInput.inputBefore.type === 'slider' ? (
                        <Box sx={{ width: '100%' }}>
                            <Typography gutterBottom>
                                {getTranslation(this.state.showInput.inputBefore.label)}
                            </Typography>
                            <Grid2
                                container
                                spacing={2}
                                alignItems="center"
                            >
                                <Grid2>
                                    <Slider
                                        value={typeof this.state.inputValue === 'number' ? this.state.inputValue : 0}
                                        onChange={(_event: Event, newValue: number) =>
                                            this.setState({ inputValue: newValue })
                                        }
                                    />
                                </Grid2>
                                <Grid2>
                                    <Input
                                        value={this.state.inputValue}
                                        size="small"
                                        onChange={e =>
                                            this.setState({
                                                inputValue: e.target.value === '' ? 0 : Number(e.target.value),
                                            })
                                        }
                                        onBlur={() => {
                                            if (!this.state.showInput) {
                                                return;
                                            }

                                            const min =
                                                this.state.showInput.inputBefore?.min === undefined
                                                    ? 0
                                                    : this.state.showInput.inputBefore.min;
                                            const max =
                                                this.state.showInput.inputBefore?.max === undefined
                                                    ? 100
                                                    : this.state.showInput.inputBefore.max;

                                            if ((this.state.inputValue as number) < min) {
                                                this.setState({ inputValue: min });
                                            } else if ((this.state.inputValue as number) > max) {
                                                this.setState({ inputValue: max });
                                            }
                                        }}
                                        inputProps={{
                                            step: this.state.showInput.inputBefore.step,
                                            min:
                                                this.state.showInput.inputBefore.min === undefined
                                                    ? 0
                                                    : this.state.showInput.inputBefore.min,
                                            max:
                                                this.state.showInput.inputBefore.max === undefined
                                                    ? 100
                                                    : this.state.showInput.inputBefore.max,
                                            type: 'number',
                                        }}
                                    />
                                </Grid2>
                            </Grid2>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={okDisabled}
                        color="primary"
                        onClick={() => this.onShowInputOk()}
                        startIcon={<Check />}
                    >
                        {getTranslation('yesButtonText')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => this.setState({ showInput: null })}
                        startIcon={<Close />}
                    >
                        {getTranslation('cancelButtonText')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {this.renderSnackbar()}
                {this.renderContent()}
                {this.renderConfirmDialog()}
                {this.renderMessageDialog()}
                {this.renderFormDialog()}
                {this.renderProgressDialog()}
                {this.renderConfirmationDialog()}
                {this.renderInputDialog()}
                {this.renderSpinner()}
            </>
        );
    }
}
