/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React from 'react';

import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    TextField,
} from '@mui/material';
import { Check as IconCheck, Close as IconClose } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';
import { type AdminConnection, DeviceTypeSelector, I18n, type ThemeType, Utils } from '@iobroker/adapter-react-v5';
import type { ExternalDetectorState } from '@iobroker/type-detector/types';

import TYPE_OPTIONS, { ICONS_TYPE } from '../Components/TypeOptions';
import type SmartDetector from '../Devices/SmartDetector';
import type { PatternControlEx } from '../types';
import { copyDevice, getLastPart, getParentId } from '../Components/helpers/utils';
import EnumSelector from '../Components/EnumSelector';

const styles: Record<string, any> = {
    header: {
        width: '100%',
        fontSize: 16,
        textTransform: 'capitalize',
        textAlign: 'center',
        paddingBottom: 20,
        color: '#000',
    },
    nameDiv: {
        width: '50%',
        display: 'inline-block',
        verticalAlign: 'top',
    },
    viewDiv: {
        width: '50%',
        display: 'inline-block',
    },
    type: {
        marginTop: 10,
    },
    input: {
        width: 200,
    },
    icon: {
        display: 'inline-block',
    },
    selectIcon: {
        paddingRight: 8,
        verticalAlign: 'middle',
        width: 20,
        height: 20,
    },
    selectText: {
        verticalAlign: 'middle',
    },
    enumIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    renderValueWrapper: {
        display: 'flex',
        gap: 4,
    },
    renderValueCurrent: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 10,
    },
    blockFields: {
        display: 'flex',
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        margin: 5,
    },
    container: {
        display: 'flex',
        overflowX: 'hidden',
        flexFlow: 'wrap',
    },
    treeDiv: {
        width: '100%',
        flex: 1,
        margin: 5,
        overflow: 'hidden',
    },
    titleColor: {
        '& h2': {
            overflow: 'hidden',
            direction: 'rtl',
            textOverflow: 'ellipsis',
            textAlign: 'end',
        },
    },
    iconStyle: {
        width: 16,
        height: 16,
        margin: '0 3px',
    },
    emptyIcon: {
        width: 16,
        height: 16,
        margin: '0 3px',
    },
    itemChildrenWrapper: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
    },
    iconWrapper: {
        display: 'flex',
        alignItems: 'center',
    },
};

const UNSUPPORTED_TYPES: Types[] = [Types.unknown, Types.instance, Types.chart];

interface DialogNewDeviceProps {
    onClose: (data?: {
        id: string;
        type: Types;
        name: string;
        functions: string[];
        icon: string;
        states: ExternalDetectorState[];
        color?: string;
        rooms: string[];
        prefix: string;
    }) => void;
    objects: Record<string, ioBroker.Object>;
    detector: SmartDetector;
    enumIDs: string[];
    themeType: ThemeType;
    deviceToCopy: PatternControlEx | null;
    socket: AdminConnection;
    prefix?: string;
    selected?: string;
    noInfo: boolean;
    toggleInfo: () => void;
}

interface DialogNewDeviceState {
    root: string;
    name: string;
    notUnique: boolean;
    functions: string[];
    rooms: string[];
    type: Types;
    ids: Record<string, ioBroker.FolderObject>;
    rootCheck: string | null;
    open: Record<string, boolean>;
}

class DialogNewDevice extends React.Component<DialogNewDeviceProps, DialogNewDeviceState> {
    private readonly prefix: string;

    constructor(props: DialogNewDeviceProps) {
        super(props);
        let i = 1;

        this.prefix = this.props.prefix || 'alias.0';

        while (this.props.objects[`${this.prefix}.${I18n.t('Device')}_${i}`]) {
            i++;
        }

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        // filter aliases
        const ids: string[] = [];

        Object.keys(this.props.objects).forEach(id => {
            if (
                id.startsWith(prefix) &&
                this.props.objects[id]?.common &&
                (this.props.objects[id].type === 'channel' ||
                    this.props.objects[id].type === 'device' ||
                    this.props.objects[id].type === 'folder')
            ) {
                let parentId: string;
                // getParentId
                if (this.props.objects[id].type === 'folder') {
                    parentId = id;
                } else {
                    parentId = getParentId(id);
                }

                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });

        const stateIds: Record<string, ioBroker.FolderObject> = {};
        const language = I18n.getLanguage();
        ids.forEach(
            id =>
                (stateIds[id] = {
                    _id: id,
                    common: {
                        name:
                            this.props.objects[id] && this.props.objects[id].type === 'folder'
                                ? Utils.getObjectName(this.props.objects, id, language)
                                : getLastPart(id),
                        nondeletable: true,
                        color:
                            this.props.objects[id]?.common && this.props.objects[id].common.color
                                ? this.props.objects[id].common.color
                                : undefined,
                        icon:
                            this.props.objects[id]?.common && this.props.objects[id].common.icon
                                ? this.props.objects[id].common.icon
                                : undefined,
                    },
                    type: 'folder',
                    native: {},
                }),
        );

        stateIds[this.prefix] = {
            _id: this.prefix,
            common: {
                name: I18n.t('Root'),
                nondeletable: true,
            },
            type: 'folder',
            native: {},
        };
        let functions: string[] = [];
        let rooms: string[] = [];
        try {
            functions = JSON.parse(window.localStorage.getItem('Devices.new.functions') || '[]');
            rooms = JSON.parse(window.localStorage.getItem('Devices.new.rooms') || '[]');
        } catch {
            // ignore
        }

        let root = window.localStorage.getItem('NewDeviceRoot');
        if (!root || this.prefix.includes('alias') !== root.includes('alias') || !this.props.objects[root]) {
            root = null;
        }

        const selected = this.props.selected || 'alias.0';

        if (selected.startsWith('alias') && this.prefix.startsWith('alias.0')) {
            const checkIdSelected = (newPart = selected): string => {
                if (this.props.objects[newPart]?.type && this.props.objects[newPart]?.type !== 'folder') {
                    return checkIdSelected(getParentId(newPart));
                }
                return newPart;
            };
            root = checkIdSelected();
        }

        if (root?.startsWith('alias.0.automatically_detected') || root?.startsWith('alias.0.linked_devices')) {
            root = this.prefix;
        }

        this.state = {
            root: root?.startsWith(this.prefix) ? root : this.prefix,
            name: this.props.deviceToCopy ? `${this.props.deviceToCopy.name}-copy` : `${I18n.t('Device')} ${i}`,
            notUnique: false,
            functions,
            rooms,
            type: (window.localStorage.getItem('Devices.newType') as Types) || Types.light,
            ids: stateIds,
            rootCheck: (root || this.prefix) === this.prefix ? this.prefix : null,
            open: {},
        };
    }

    renderSelectEnum(name: 'functions' | 'rooms', title: string): React.JSX.Element {
        return (
            <EnumSelector
                name={name}
                style={styles.type}
                title={title}
                objects={this.props.objects}
                enumIDs={this.props.enumIDs.filter(id => id.startsWith(`enum.${name}.`))}
                value={this.state[name] || []}
                onChange={newSelected => {
                    localStorage.setItem(`Devices.new.${name}`, JSON.stringify(newSelected));
                    if (name === 'functions') {
                        this.setState({ functions: newSelected });
                    } else {
                        this.setState({ rooms: newSelected });
                    }
                }}
            />
        );
    }

    generateId(): string {
        if (this.props.deviceToCopy) {
            const channelId = this.props.deviceToCopy.channelId;
            const parentId = getParentId(channelId);
            return `${parentId || this.state.root}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
        }

        return `${this.state.root}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    handleOk = async (): Promise<void> => {
        // check if the name is unique
        if (this.props.deviceToCopy) {
            await copyDevice(this.generateId(), {
                newName: this.state.name,
                socket: this.props.socket,
                deviceToCopy: this.props.deviceToCopy,
                language: I18n.getLanguage(),
                objects: this.props.objects,
            });
            this.props.onClose();
        } else {
            if (this.state.type === Types.info && this.props.noInfo) {
                this.props.toggleInfo();
            }

            this.props.onClose({
                id: this.generateId(),
                type: this.state.type,
                name: this.state.name,
                functions: this.state.functions,
                icon: '',
                states: [],
                color: undefined,
                rooms: this.state.rooms,
                prefix: this.prefix,
            });
        }
    };

    render(): React.JSX.Element {
        // TODO remove it after admin 7.6.15, as no more required
        const supportedDevices = Object.keys(Types);

        return (
            <Dialog
                open={!0}
                maxWidth="md"
                fullWidth
                onClose={() => this.props.onClose()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle
                    style={styles.titleBackground}
                    sx={styles.titleColor}
                    id="edit-device-dialog-title"
                >
                    {I18n.t('Create new device')}: <b>{this.generateId()}</b>
                </DialogTitle>
                <DialogContent style={styles.container}>
                    <div style={styles.blockFields}>
                        <FormControlLabel
                            disabled={this.state.rootCheck === this.state.root}
                            control={
                                <Checkbox
                                    checked={!!this.state.rootCheck}
                                    onChange={() => {
                                        let newRootCheck = null;
                                        let newRoot = this.state.rootCheck;
                                        if (!this.state.rootCheck) {
                                            newRootCheck = this.state.root;
                                            newRoot = this.prefix;
                                        }
                                        this.setState({ rootCheck: newRootCheck, root: newRoot! });
                                    }}
                                />
                            }
                            label={I18n.t('Add to root')}
                        />
                        <TextField
                            variant="standard"
                            fullWidth
                            autoFocus={!!this.props.deviceToCopy}
                            onKeyUp={ev => {
                                if (this.props.deviceToCopy) {
                                    if (ev.key === 'Enter') {
                                        if (this.state.name && !this.props.objects[this.generateId()]) {
                                            void this.handleOk();
                                        } else {
                                            this.props.onClose();
                                        }
                                        ev.preventDefault();
                                    }
                                }
                            }}
                            label={I18n.t('Device name')}
                            error={!!this.props.objects[this.generateId()]}
                            value={this.state.name}
                            onChange={e => this.setState({ name: e.target.value })}
                            margin="normal"
                        />
                        {!this.props.deviceToCopy ? (
                            <DeviceTypeSelector
                                themeType={this.props.themeType}
                                style={styles.type}
                                value={this.state.type}
                                onChange={type => {
                                    localStorage.setItem('Devices.newType', type);
                                    this.setState({ type });
                                }}
                                supportedDevices={supportedDevices as Types[]}
                                unsupportedDevices={UNSUPPORTED_TYPES}
                                showApplications={{
                                    TYPE_OPTIONS,
                                    ICONS_TYPE,
                                }}
                            />
                        ) : null}
                        {!this.props.deviceToCopy && this.renderSelectEnum('functions', I18n.t('Function'))}
                        {!this.props.deviceToCopy && this.renderSelectEnum('rooms', I18n.t('Room'))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!!this.props.objects[this.generateId()]}
                        onClick={this.handleOk}
                        startIcon={<IconCheck />}
                        color="primary"
                    >
                        {I18n.t('Create')}
                    </Button>
                    <Button
                        variant="contained"
                        color="grey"
                        onClick={() => this.props.onClose()}
                        startIcon={<IconClose />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogNewDevice;
