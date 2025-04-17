/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React from 'react';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    TextField,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
    Checkbox,
    FormControlLabel,
    DialogTitle,
} from '@mui/material';
import { Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import { Types } from '@iobroker/type-detector';
import { I18n, Utils, Icon, type ThemeType } from '@iobroker/adapter-react-v5';

import TypeIcon from '../Components/TypeIcon';
import TYPE_OPTIONS, { type ApplicationType, ICONS_TYPE } from '../Components/TypeOptions';
import SmartDetector from '../Devices/SmartDetector';
import type { PatternControlEx } from '../types';
import type { ExternalDetectorState } from '@iobroker/type-detector/types';

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

function getParentId(id: string): string {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(0, pos);
    }
    return '';
}

function getLastPart(id: string): string {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    }

    return id;
}

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
    copyDevice: PatternControlEx | null;
    prefix?: string;
    selected?: string;
    processTasks: (
        tasks: {
            id: string;
            obj: ioBroker.Object;
            enums?: string[];
        }[],
    ) => Promise<void>;
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
    private prefix: string;

    private channelId: string;

    private types: Types[];

    private readonly typesWords: Partial<Record<Types, string>>;

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

        this.typesWords = {};
        Object.keys(Types)
            .filter(id => !UNSUPPORTED_TYPES.includes(id as Types))
            .forEach(typeId => (this.typesWords[typeId as Types] = I18n.t(`type-${Types[typeId as Types]}`)));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a as Types] === this.typesWords[b as Types]) {
                return 0;
            }
            if (this.typesWords[a as Types]! > this.typesWords[b as Types]!) {
                return 1;
            }
            return -1;
        }) as Types[];

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
                    const parts = newPart.split('.');
                    parts.pop();
                    return checkIdSelected(parts.join('.'));
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
            name: this.props.copyDevice ? `${this.props.copyDevice.name}-copy` : `${I18n.t('Device')} ${i}`,
            notUnique: false,
            functions,
            rooms,
            type: (window.localStorage.getItem('Devices.newType') as Types) || Types.light,
            ids: stateIds,
            rootCheck: (root || this.prefix) === this.prefix ? this.prefix : null,
            open: {},
        };
    }

    setStateAsync(newState: Partial<DialogNewDeviceState>): Promise<void> {
        return new Promise<void>(resolve => this.setState(newState as DialogNewDeviceState, () => resolve()));
    }

    renderSelectEnum(name: 'functions' | 'rooms', title: string): React.JSX.Element {
        const enums = this.props.enumIDs.filter(id => id.startsWith(`enum.${name}.`));
        const language = I18n.getLanguage();
        const objs = enums.map(id => ({
            name: Utils.getObjectName(this.props.objects, id, language),
            icon: Utils.getObjectIcon(id, this.props.objects[id]),
            id,
        }));

        return (
            <FormControl
                style={styles.type}
                variant="standard"
            >
                <InputLabel>{title}</InputLabel>
                <Select
                    variant="standard"
                    open={!!this.state.open[name]}
                    onClick={() => this.setState({ open: { [name]: !this.state.open[name] } })}
                    onClose={() => this.state[name] && this.setState({ open: { [name]: false } })}
                    fullWidth
                    multiple
                    renderValue={arrId => {
                        const newArr =
                            arrId.length && typeof arrId !== 'string'
                                ? arrId.map(id => ({
                                      name: Utils.getObjectName(this.props.objects, id, language),
                                      icon: Utils.getObjectIcon(id, this.props.objects[id]),
                                      id,
                                  }))
                                : [];

                        return (
                            <div style={styles.renderValueWrapper}>
                                {newArr.map(obj => (
                                    <div
                                        style={styles.renderValueCurrent}
                                        key={`${obj.id}-render`}
                                    >
                                        {obj.icon ? (
                                            <Icon
                                                style={styles.enumIcon}
                                                src={obj.icon}
                                                alt={obj.id}
                                            />
                                        ) : (
                                            <div style={styles.enumIcon} />
                                        )}
                                        {obj.name}
                                    </div>
                                ))}
                            </div>
                        );
                    }}
                    value={this.state[name] || []}
                    onChange={e => {
                        localStorage.setItem(`Devices.new.${name}`, JSON.stringify(e.target.value));
                        if (name === 'functions') {
                            this.setState({ functions: e.target.value as string[], open: { functions: false } });
                        } else {
                            this.setState({ rooms: e.target.value as string[], open: { rooms: false } });
                        }
                    }}
                >
                    {objs.map(obj => (
                        <MenuItem
                            key={obj.id}
                            value={obj.id}
                        >
                            <Checkbox checked={(this.state[name] || []).includes(obj.id)} />
                            {obj.icon ? (
                                <Icon
                                    style={styles.enumIcon}
                                    src={obj.icon}
                                    alt={obj.id}
                                />
                            ) : (
                                <div style={styles.enumIcon} />
                            )}
                            {obj.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    }

    generateId(): string {
        return `${this.state.root}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    async onCopyDevice(newChannelId: string): Promise<void> {
        // if this is device not from linkeddevices or from alias
        this.channelId = this.props.copyDevice!.channelId;
        const isAlias = this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.');

        const channelObj = this.props.objects[this.channelId];
        const { functions, rooms, icon, states, color, type } = this.props.copyDevice!;
        const tasks: {
            id: string;
            obj: ioBroker.Object;
            enums?: string[];
        }[] = [];

        const patterns = SmartDetector.getPatterns();
        const role = patterns[type]?.states?.find(item => item.defaultChannelRole);

        tasks.push({
            id: newChannelId,
            obj: {
                _id: newChannelId,
                common: {
                    name: channelObj.common.name,
                    color: color || undefined,
                    desc: channelObj.common.desc,
                    role: role?.defaultChannelRole || type,
                    icon: (icon?.startsWith('adapter/') ? `../../${icon}` : icon) || undefined,
                },
                type: 'channel',
                native: channelObj.native || {},
            },
            enums: rooms.concat(functions),
        });

        states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(this.props.objects[state.id]));
            obj._id = `${newChannelId}.${state.name}`;

            if (!obj.native) {
                obj.native = {};
            }
            if (!isAlias) {
                obj.common.alias = { id: state.id };
            }
            tasks.push({ id: obj._id, obj });
        });

        await this.props.processTasks(tasks);
    }

    handleOk = async (): Promise<void> => {
        // check if the name is unique
        if (this.props.copyDevice) {
            await this.onCopyDevice(this.generateId());
            // await this.props.onChange();
            this.props.onClose();
        } else {
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

    handleCancel = (): void => {
        this.props.onClose();
    };

    render(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                maxWidth="md"
                fullWidth
                onClose={() => this.handleCancel()}
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
                            autoFocus={!!this.props.copyDevice}
                            onKeyPress={ev => {
                                if (this.props.copyDevice) {
                                    if (ev.key === 'Enter') {
                                        if (this.state.name && !this.props.objects[this.generateId()]) {
                                            this.handleOk();
                                        } else {
                                            this.handleCancel();
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
                        {!this.props.copyDevice && (
                            <FormControl
                                style={styles.type}
                                variant="standard"
                            >
                                <InputLabel>{I18n.t('Device type')}</InputLabel>
                                <Select
                                    variant="standard"
                                    value={this.state.type}
                                    onChange={e => {
                                        localStorage.setItem('Devices.newType', e.target.value);
                                        this.setState({ type: e.target.value as Types });
                                    }}
                                >
                                    {this.types
                                        .filter(id => !UNSUPPORTED_TYPES.includes(id) && TYPE_OPTIONS[id])
                                        .map(typeId => (
                                            <MenuItem
                                                key={Types[typeId]}
                                                value={Types[typeId]}
                                            >
                                                <div style={styles.itemChildrenWrapper}>
                                                    <div>
                                                        <TypeIcon
                                                            type={Types[typeId]}
                                                            style={{
                                                                ...styles.selectIcon,
                                                                color:
                                                                    this.props.themeType === 'dark'
                                                                        ? '#FFFFFF'
                                                                        : '#000',
                                                            }}
                                                        />
                                                        <span style={styles.selectText}>{this.typesWords[typeId]}</span>
                                                    </div>
                                                    <div style={styles.iconWrapper}>
                                                        {Object.keys(TYPE_OPTIONS[typeId]!).map(key =>
                                                            TYPE_OPTIONS[typeId]![key as ApplicationType] ? (
                                                                <Icon
                                                                    key={key}
                                                                    style={styles.iconStyle}
                                                                    src={ICONS_TYPE[key as ApplicationType]}
                                                                />
                                                            ) : (
                                                                <div
                                                                    key={key}
                                                                    style={styles.emptyIcon}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        )}
                        {!this.props.copyDevice && this.renderSelectEnum('functions', I18n.t('Function'))}
                        {!this.props.copyDevice && this.renderSelectEnum('rooms', I18n.t('Room'))}
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
                        onClick={this.handleCancel}
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
