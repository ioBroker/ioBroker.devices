import {
    DeviceTypeIcon,
    I18n,
    Utils,
    type Connection,
    type IobTheme,
    type ThemeName,
    type ThemeType,
} from '@iobroker/adapter-react-v5';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/json-config';
import { Close as CloseIcon, VideogameAsset as ControlIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    IconButton,
    Paper,
    Skeleton,
    Typography,
} from '@mui/material';
import React, { Component, type JSX } from 'react';
import DeviceActionButton from './DeviceActionButton';
import DeviceControlComponent from './DeviceControl';
import DeviceImageUpload from './DeviceImageUpload';
import DeviceStatusComponent from './DeviceStatus';
import JsonConfig from './JsonConfig';
import type {
    ActionBase,
    ControlBase,
    ControlState,
    DeviceDetails,
    DeviceInfo,
    DeviceId,
    ConfigConnectionType,
} from './protocol/api';
import { getTranslation } from './Utils';
import { StateOrObjectHandler, type StateOrObjectSubscription } from './StateOrObjectHandler';

const smallCardStyle = {
    maxWidth: 345,
    minWidth: 200,
} as const;

/** Reserved action names (this is copied from https://github.com/ioBroker/dm-utils/blob/main/src/types/base.ts as we can only have type references to dm-utils) */
const ACTIONS = {
    /** This action will be called when the user clicks on the connection icon */
    STATUS: 'status',
    /** This action will be called when the user clicks on the enabled / disabled icon. The enabled/disabled icon will be shown only if the node status has the "enabled" flag set to false or true */
    ENABLE_DISABLE: 'enable/disable',
};

const styles: Record<string, React.CSSProperties> = {
    cardStyle: {
        width: 300,
        minHeight: 280,
        margin: 10,
        overflow: 'hidden',
        display: 'inline-block',
    },
    headerStyle: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 8,
        paddingRight: 8,
        position: 'relative',
        minHeight: 60,
        color: '#000',
    },
    imgAreaStyle: {
        height: 45,
        width: 45,
        justifyContent: 'center',
        display: 'flex',
        alignItems: 'center',
    },
    imgStyle: {
        zIndex: 2,
        maxWidth: '100%',
        maxHeight: '100%',
        color: '#FFF',
    },
    titleStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        // whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    detailsButtonStyle: {
        right: 20,
        bottom: -20,
        position: 'absolute',
    },
    bodyStyle: {
        height: 'calc(100% - 116px)',
    },
    deviceInfoStyle: {
        padding: '20px 16px 0 16px',
        height: 133,
    },
    statusStyle: {
        padding: '15px 25px 0 15px',
        height: 41,
    },
};

function NoImageIcon(props: { style?: React.CSSProperties; className?: string }): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            style={props.style}
            className={props.className}
        >
            <path
                fill="currentColor"
                d="M21.9,21.9l-8.49-8.49l0,0L3.59,3.59l0,0L2.1,2.1L0.69,3.51L3,5.83V19c0,1.1,0.9,2,2,2h13.17l2.31,2.31L21.9,21.9z M5,18 l3.5-4.5l2.5,3.01L12.17,15l3,3H5z M21,18.17L5.83,3H19c1.1,0,2,0.9,2,2V18.17z"
            />
        </svg>
    );
}

interface DeviceCardProps {
    filter?: string;
    /* Device ID */
    id: DeviceId;
    identifierLabel: ioBroker.StringOrTranslated;
    device: DeviceInfo;
    instanceId: string;
    socket: Connection;
    /* Instance, where the images should be uploaded to */
    uploadImagesToInstance?: string;
    deviceHandler: (deviceId: DeviceId, action: ActionBase) => () => void;
    controlHandler: (
        deviceId: DeviceId,
        control: ControlBase,
        state: ControlState,
    ) => () => Promise<ioBroker.State | null>;
    controlStateHandler: (deviceId: DeviceId, control: ControlBase) => () => Promise<ioBroker.State | null>;
    smallCards?: boolean;
    alive: boolean;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    isFloatComma: boolean;
    dateFormat: string;
}

function getText(text: ioBroker.StringOrTranslated | undefined): string | undefined {
    if (typeof text === 'object') {
        return text[I18n.getLanguage()] || text.en;
    }

    return text;
}

interface DeviceCardState {
    open: boolean;
    details: DeviceDetails | null;
    data: Record<string, any>;
    showControlDialog: boolean;

    // values possibly loaded from states/objects
    name?: string;
    identifier?: string;
    hasDetails?: boolean;
    icon?: string;
    backgroundColor?: string;
    color?: string;
    manufacturer?: string;
    model?: string;
    connectionType?: ConfigConnectionType;
    enabled?: boolean;
}

/**
 * Device Card Component
 */
export default class DeviceCard extends Component<DeviceCardProps, DeviceCardState> {
    private readonly stateOrObjectHandler: StateOrObjectHandler;
    private readonly subscriptions: Map<
        keyof DeviceInfo & keyof DeviceCardState,
        { subscription: StateOrObjectSubscription; transform?: (value: any) => any }
    > = new Map();

    constructor(props: DeviceCardProps) {
        super(props);

        this.state = {
            open: false,
            details: null,
            data: {},
            showControlDialog: false,
        };

        this.stateOrObjectHandler = new StateOrObjectHandler(this.props.socket);
    }

    async fetchIcon(): Promise<void> {
        if (!this.props.device.icon) {
            const manufacturer = this.state.manufacturer;
            const model = this.state.model;

            // try to load the icon from file storage
            const fileName = `${manufacturer ? `${manufacturer}_` : ''}${model || JSON.stringify(this.props.device.id)}`;

            try {
                const file = await this.props.socket.readFile(
                    this.props.instanceId.replace('system.adapter.', ''),
                    `${fileName}.webp`,
                    true,
                );
                if (file) {
                    this.setState({ icon: `data:${file.mimeType};base64,${file.file}` });
                } else {
                    this.setState({ icon: '' });
                }
                // const response = await fetch(url);
                // if (response.ok) {
                //     const blob = await response.blob();
                //     const reader = new FileReader();
                //     reader.onloadend = () => {
                //         setIcon(reader.result);
                //     };
                //     reader.readAsDataURL(blob);
                // } else {
                //     throw new Error('Response not ok');
                // }
            } catch {
                if (this.state.icon) {
                    this.setState({ icon: '' });
                }
            }
        }
    }

    async componentDidMount(): Promise<void> {
        await this.addStateOrObjectListener('name', getText);
        await this.addStateOrObjectListener('identifier');
        await this.addStateOrObjectListener('hasDetails');
        await this.addStateOrObjectListener('icon');
        await this.addStateOrObjectListener('backgroundColor');
        await this.addStateOrObjectListener('color');
        await this.addStateOrObjectListener('manufacturer', getText);
        await this.addStateOrObjectListener('model', getText);
        await this.addStateOrObjectListener('connectionType');
        await this.addStateOrObjectListener('enabled');

        await this.fetchIcon().catch(e => console.error(e));
    }

    private async addStateOrObjectListener(
        key: keyof DeviceInfo & keyof DeviceCardState,
        transform?: (value: any) => any,
    ): Promise<void> {
        const sub = await this.stateOrObjectHandler.addListener(this.props.device[key], value =>
            this.setState<typeof key>({ [key]: transform ? transform(value) : value }),
        );
        this.subscriptions.set(key, { subscription: sub, transform });
    }

    async componentDidUpdate(prevProps: DeviceCardProps): Promise<void> {
        for (const [key, { subscription, transform }] of [...this.subscriptions]) {
            const newItem = this.props.device[key];
            const prevItem = prevProps.device[key];

            if (newItem !== prevItem) {
                console.log(`${key} of device ${JSON.stringify(this.props.device.id)} updated`, prevItem, newItem);
                this.subscriptions.delete(key);
                await this.addStateOrObjectListener(key, transform);
                await subscription.unsubscribe();
            }
        }
    }

    async componentWillUnmount(): Promise<void> {
        for (const [, { subscription }] of this.subscriptions) {
            await subscription.unsubscribe();
        }
        this.subscriptions.clear();
    }

    /**
     * Load the device details
     */
    async loadDetails(): Promise<void> {
        console.log(`Loading device details for`, this.props.device.id, `... from ${this.props.instanceId}`);
        const details: DeviceDetails | null = await this.props.socket.sendTo(
            this.props.instanceId,
            'dm:deviceDetails',
            this.props.device.id,
        );
        console.log(`Got device details for`, this.props.device.id, details);
        this.setState({ details, data: details?.data || {} });
    }

    /**
     * Copy the device ID to the clipboard
     */
    copyToClipboard = (): void => {
        const textToCopy = this.state.identifier;
        if (!textToCopy) {
            return;
        }
        Utils.copyToClipboard(textToCopy);
        alert(`${getTranslation('copied')} ${textToCopy} ${getTranslation('toClipboard')}!`);
    };

    renderDialog(): JSX.Element | null {
        if (!this.state.open || !this.state.details) {
            return null;
        }

        return (
            <Dialog
                open={!0}
                maxWidth="md"
                onClose={() => this.setState({ open: false })}
            >
                <DialogContent>
                    <JsonConfig
                        instanceId={this.props.instanceId}
                        socket={this.props.socket}
                        schema={this.state.details.schema as ConfigItemPanel | ConfigItemTabs}
                        data={this.state.data}
                        onChange={(data: Record<string, any>) => this.setState({ data })}
                        themeName={this.props.themeName}
                        themeType={this.props.themeType}
                        theme={this.props.theme}
                        isFloatComma={this.props.isFloatComma}
                        dateFormat={this.props.dateFormat}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!this.props.alive}
                        variant="contained"
                        color="primary"
                        onClick={() => this.setState({ open: false })}
                        autoFocus
                    >
                        {getTranslation('closeButtonText')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderControlDialog(): JSX.Element | null {
        if (!this.state.showControlDialog || !this.props.alive) {
            return null;
        }
        const colors = { primary: '#111', secondary: '#888' };
        return (
            <Dialog
                open={!0}
                onClose={() => this.setState({ showControlDialog: false })}
            >
                <DialogTitle>
                    {this.state.name}
                    <IconButton
                        style={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            zIndex: 10,
                        }}
                        onClick={() => this.setState({ showControlDialog: false })}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent style={{ display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
                    {this.props.device.controls?.map(control => (
                        <DeviceControlComponent
                            disabled={false}
                            key={control.id}
                            control={control}
                            socket={this.props.socket}
                            colors={colors}
                            deviceId={this.props.device.id}
                            controlHandler={this.props.controlHandler}
                            controlStateHandler={this.props.controlStateHandler}
                        />
                    ))}
                </DialogContent>
            </Dialog>
        );
    }

    renderControls(): JSX.Element | null {
        const colors = { primary: '#111', secondary: '#888' };
        const firstControl = this.props.device.controls?.[0];
        if (
            this.props.device.controls?.length === 1 &&
            firstControl &&
            (firstControl.type === 'icon' || firstControl.type === 'switch') &&
            !firstControl.label
        ) {
            // control can be placed in the button icon
            return (
                <DeviceControlComponent
                    disabled={!this.props.alive}
                    control={firstControl}
                    colors={colors}
                    socket={this.props.socket}
                    deviceId={this.props.device.id}
                    controlHandler={this.props.controlHandler}
                    controlStateHandler={this.props.controlStateHandler}
                />
            );
        }

        if (this.props.device.controls?.length) {
            // place a button and show a controls dialog
            return (
                <Fab
                    size="small"
                    style={{ width: 32, height: 32, minHeight: 32 }}
                    disabled={!this.props.alive}
                    onClick={() => this.setState({ showControlDialog: true })}
                >
                    <ControlIcon />
                </Fab>
            );
        }
        return null;
    }

    renderActions(): JSX.Element[] | null {
        const actions = this.props.device.actions?.filter(
            a => a.id !== ACTIONS.STATUS && a.id !== ACTIONS.ENABLE_DISABLE,
        );

        return actions?.length
            ? actions.map(a => (
                  <DeviceActionButton
                      disabled={!this.props.alive}
                      key={a.id}
                      deviceId={this.props.device.id}
                      action={a}
                      deviceHandler={this.props.deviceHandler}
                  />
              ))
            : null;
    }

    renderSmall(): JSX.Element {
        const hasDetails = this.state.hasDetails;
        const status = !this.props.device.status
            ? []
            : Array.isArray(this.props.device.status)
              ? this.props.device.status
              : [this.props.device.status];

        const icon = this.state.icon ? <DeviceTypeIcon src={this.state.icon} /> : <NoImageIcon />;

        const headerStyle = this.getCardHeaderStyle(this.props.theme, 345);

        return (
            <Card sx={smallCardStyle}>
                <CardHeader
                    style={headerStyle}
                    avatar={
                        <div>
                            {this.props.uploadImagesToInstance ? (
                                <DeviceImageUpload
                                    uploadImagesToInstance={this.props.uploadImagesToInstance}
                                    deviceId={this.props.device.id}
                                    manufacturer={this.state.manufacturer}
                                    model={this.state.model}
                                    onImageSelect={(imageData: string): void => {
                                        if (imageData) {
                                            this.setState({ icon: imageData });
                                        }
                                    }}
                                    socket={this.props.socket}
                                />
                            ) : null}
                            {icon}
                        </div>
                    }
                    action={
                        hasDetails ? (
                            <IconButton
                                aria-label="settings"
                                onClick={() => {
                                    if (!this.state.open) {
                                        this.loadDetails().catch(console.error);
                                        this.setState({ open: true });
                                    }
                                }}
                            >
                                <MoreVertIcon />
                            </IconButton>
                        ) : null
                    }
                    title={this.state.name}
                    subheader={
                        this.state.manufacturer ? (
                            <span>
                                <b style={{ marginRight: 4 }}>{getTranslation('manufacturer')}:</b>
                                {this.state.manufacturer}
                            </span>
                        ) : null
                    }
                />
                <CardContent style={{ position: 'relative' }}>
                    {status?.length ? (
                        <div
                            style={{
                                display: 'flex',
                                position: 'absolute',
                                top: -11,
                                background: '#88888880',
                                padding: '0 8px',
                                borderRadius: 5,
                                width: 'calc(100% - 46px)',
                            }}
                        >
                            {status.map((s, i) => (
                                <DeviceStatusComponent
                                    key={i}
                                    socket={this.props.socket}
                                    status={s}
                                    connectionType={this.state.connectionType}
                                    enabled={this.state.enabled}
                                    deviceId={this.props.device.id}
                                    statusAction={this.props.device.actions?.find(a => a.id === ACTIONS.STATUS)}
                                    disableEnableAction={this.props.device.actions?.find(
                                        a => a.id === ACTIONS.ENABLE_DISABLE,
                                    )}
                                    deviceHandler={this.props.deviceHandler}
                                    theme={this.props.theme}
                                    stateOrObjectHandler={this.stateOrObjectHandler}
                                />
                            ))}
                        </div>
                    ) : null}
                    <div>
                        <Typography variant="body1">
                            {this.state.identifier ? (
                                <div
                                    onClick={this.copyToClipboard}
                                    style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
                                >
                                    <b>{getText(this.props.identifierLabel)}:</b>
                                    <span style={{ marginLeft: 4 }}>{this.state.identifier}</span>
                                </div>
                            ) : null}
                            {this.state.manufacturer ? (
                                <div>
                                    <b style={{ marginRight: 4 }}>{getTranslation('manufacturer')}:</b>
                                    {this.state.manufacturer}
                                </div>
                            ) : null}
                            {this.state.model ? (
                                <div>
                                    <b style={{ marginRight: 4 }}>{getTranslation('model')}:</b>
                                    {this.state.model}
                                </div>
                            ) : null}
                        </Typography>
                    </div>
                </CardContent>
                <CardActions disableSpacing>
                    {this.renderActions()}
                    <div style={{ flexGrow: 1 }} />
                    {this.renderControls()}
                </CardActions>
                {this.renderDialog()}
                {this.renderControlDialog()}
            </Card>
        );
    }

    getCardHeaderStyle(theme: IobTheme, maxWidth?: number): React.CSSProperties {
        const backgroundColor =
            this.state.backgroundColor === 'primary'
                ? theme.palette.primary.main
                : this.state.backgroundColor === 'secondary'
                  ? theme.palette.secondary.main
                  : this.state.backgroundColor || theme.palette.secondary.main;

        let color;
        if (this.state.color && this.state.color !== 'primary' && this.state.color !== 'secondary') {
            // Color was directly defined
            color = this.state.color;
        } else if (this.state.color === 'primary') {
            color = theme.palette.primary.main;
        } else if (this.state.color === 'secondary') {
            color = theme.palette.secondary.main;
        } else {
            // Color was not defined
            if (this.state.backgroundColor === 'primary') {
                color = theme.palette.primary.contrastText;
            } else if (this.state.backgroundColor === 'secondary' || !this.state.backgroundColor) {
                color = theme.palette.secondary.contrastText;
            } else {
                color = Utils.invertColor(backgroundColor, true);
            }
        }

        return {
            backgroundColor,
            color,
            maxWidth,
        };
    }

    renderBig(): JSX.Element {
        const status = !this.props.device.status
            ? []
            : Array.isArray(this.props.device.status)
              ? this.props.device.status
              : [this.props.device.status];

        const icon = this.state.icon ? (
            <DeviceTypeIcon
                src={this.state.icon}
                style={styles.imgStyle}
            />
        ) : (
            <NoImageIcon style={styles.imgStyle} />
        );
        const headerStyle = this.getCardHeaderStyle(this.props.theme);

        const title: string = this.state.details?.data?.name || this.props.device.name || '';

        return (
            <Paper
                style={styles.cardStyle}
                key={JSON.stringify(this.props.id)}
            >
                <Box
                    sx={headerStyle}
                    style={styles.headerStyle}
                >
                    <div style={styles.imgAreaStyle}>
                        {this.props.uploadImagesToInstance ? (
                            <DeviceImageUpload
                                uploadImagesToInstance={this.props.uploadImagesToInstance}
                                deviceId={this.props.device.id}
                                manufacturer={this.state.manufacturer}
                                model={this.state.model}
                                onImageSelect={(imageData: string): void => {
                                    if (imageData) {
                                        this.setState({ icon: imageData });
                                    }
                                }}
                                socket={this.props.socket}
                            />
                        ) : null}
                        {icon}
                    </div>
                    <Box
                        style={styles.titleStyle}
                        title={title.length > 20 ? title : undefined}
                        sx={theme => ({ color: headerStyle.color || theme.palette.secondary.contrastText })}
                    >
                        {this.state.details?.data?.name || this.state.name}
                    </Box>
                    {this.state.hasDetails ? (
                        <Fab
                            disabled={!this.props.alive}
                            size="small"
                            style={styles.detailsButtonStyle}
                            onClick={() => {
                                if (!this.state.open) {
                                    this.loadDetails().catch(console.error);
                                    this.setState({ open: true });
                                }
                            }}
                            color="primary"
                        >
                            <MoreVertIcon />
                        </Fab>
                    ) : null}
                </Box>
                <div style={styles.statusStyle}>
                    {status.map((s, i) => (
                        <DeviceStatusComponent
                            key={i}
                            socket={this.props.socket}
                            deviceId={this.props.device.id}
                            connectionType={this.state.connectionType}
                            status={s}
                            enabled={this.state.enabled}
                            statusAction={this.props.device.actions?.find(a => a.id === ACTIONS.STATUS)}
                            disableEnableAction={this.props.device.actions?.find(a => a.id === ACTIONS.ENABLE_DISABLE)}
                            deviceHandler={this.props.deviceHandler}
                            theme={this.props.theme}
                            stateOrObjectHandler={this.stateOrObjectHandler}
                        />
                    ))}
                </div>
                <div style={styles.bodyStyle}>
                    <Typography
                        variant="body1"
                        style={styles.deviceInfoStyle}
                    >
                        {this.state.identifier ? (
                            <div onClick={this.copyToClipboard}>
                                <b style={{ marginRight: 4 }}>{getText(this.props.identifierLabel)}:</b>
                                {this.state.identifier}
                            </div>
                        ) : null}
                        {this.state.manufacturer ? (
                            <div>
                                <b style={{ marginRight: 4 }}>{getTranslation('manufacturer')}:</b>
                                {this.state.manufacturer}
                            </div>
                        ) : null}
                        {this.state.model ? (
                            <div>
                                <b style={{ marginRight: 4 }}>{getTranslation('model')}:</b>
                                {this.state.model}
                            </div>
                        ) : null}
                    </Typography>
                    {!!(this.props.device.actions?.length || this.props.device.controls?.length) && (
                        <div
                            style={{
                                flex: 1,
                                position: 'relative',
                                display: 'flex',
                                gap: 8,
                                paddingBottom: 5,
                                height: 34,
                                paddingLeft: 10,
                                paddingRight: 10,
                            }}
                        >
                            {this.renderActions()}
                            <div style={{ flexGrow: 1 }} />
                            {this.renderControls()}
                        </div>
                    )}
                </div>
                {this.renderDialog()}
                {this.renderControlDialog()}
            </Paper>
        );
    }

    render(): JSX.Element {
        const name = this.state.name?.toLowerCase() ?? '';
        if (this.props.filter && !name.includes(this.props.filter.toLowerCase())) {
            return <></>;
        }

        if (this.props.smallCards) {
            return this.renderSmall();
        }

        return this.renderBig();
    }
}

type DeviceCardSkeletonProps = Pick<DeviceCardProps, 'smallCards' | 'theme'>;

export class DeviceCardSkeleton extends Component<DeviceCardSkeletonProps> {
    render(): JSX.Element {
        if (this.props.smallCards) {
            return this.renderSmall();
        }

        return this.renderBig();
    }

    renderSmall(): JSX.Element {
        const headerStyle = this.getCardHeaderStyle(this.props.theme, 345);

        return (
            <Card sx={smallCardStyle}>
                <CardHeader
                    style={headerStyle}
                    avatar={
                        <div>
                            <Skeleton
                                variant="rounded"
                                width={24}
                                height={24}
                            />
                        </div>
                    }
                    title={<Skeleton />}
                    subheader={<Skeleton />}
                />
                <CardContent style={{ position: 'relative' }}>
                    <div>
                        <Typography variant="body1">
                            <div>
                                <Skeleton />
                            </div>
                            <div>
                                <Skeleton />
                            </div>
                            <div>
                                <Skeleton />
                            </div>
                        </Typography>
                    </div>
                </CardContent>
            </Card>
        );
    }

    renderBig(): JSX.Element {
        const headerStyle = this.getCardHeaderStyle(this.props.theme);

        return (
            <Paper style={styles.cardStyle}>
                <Box
                    sx={headerStyle}
                    style={styles.headerStyle}
                >
                    <div style={styles.imgAreaStyle}>
                        <Skeleton
                            variant="rounded"
                            width={24}
                            height={24}
                        />
                    </div>
                    <Box
                        style={styles.titleStyle}
                        sx={theme => ({
                            color: headerStyle.color || theme.palette.secondary.contrastText,
                            minWidth: '50%',
                        })}
                    >
                        <Skeleton />
                    </Box>
                </Box>
                <div style={styles.statusStyle}></div>
                <div style={styles.bodyStyle}>
                    <Typography
                        variant="body1"
                        style={styles.deviceInfoStyle}
                    >
                        <div>
                            <Skeleton />
                        </div>
                        <div>
                            <Skeleton />
                        </div>
                        <div>
                            <Skeleton />
                        </div>
                    </Typography>
                </div>
            </Paper>
        );
    }

    // eslint-disable-next-line class-methods-use-this
    getCardHeaderStyle(theme: IobTheme, maxWidth?: number): React.CSSProperties {
        const backgroundColor = theme.palette.secondary.main;
        const color = theme.palette.secondary.contrastText;

        return {
            backgroundColor,
            color,
            maxWidth,
        };
    }
}
