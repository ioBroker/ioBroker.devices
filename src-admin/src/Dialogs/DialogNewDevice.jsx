/**
 * Copyright 2019-2023 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';

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
import { I18n, Utils, Icon } from '@iobroker/adapter-react-v5';

// import TreeView from '../Components/TreeView';
import TypeIcon from '../Components/TypeIcon';
import TYPE_OPTIONS, { ICONS_TYPE } from '../Components/TypeOptions';

const styles = {
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

const UNSUPPORTED_TYPES = [Types.unknown, Types.instance, Types.chart];

function getParentId(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(0, pos);
    } else {
        return '';
    }
}

function getLastPart(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    } else {
        return id;
    }
}

class DialogNewDevice extends React.Component {
    constructor(props) {
        super(props);
        let i = 1;

        this.prefix = this.props.prefix || 'alias.0';

        while (this.props.objects[`${this.prefix}.${I18n.t('Device')}_${i}`]) {
            i++;
        }

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        // filter aliases
        const ids = [];

        Object.keys(this.props.objects).forEach(id => {
            if (
                id.startsWith(prefix) &&
                this.props.objects[id] &&
                this.props.objects[id].common &&
                (this.props.objects[id].type === 'channel' ||
                    this.props.objects[id].type === 'device' ||
                    this.props.objects[id].type === 'folder')
            ) {
                let parentId;
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
            .filter(id => !UNSUPPORTED_TYPES.includes(id))
            .forEach(typeId => (this.typesWords[typeId] = I18n.t(`type-${Types[typeId]}`)));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a] === this.typesWords[b]) {
                return 0;
            } else if (this.typesWords[a] > this.typesWords[b]) {
                return 1;
            } else {
                return -1;
            }
        });

        const stateIds = {};
        const language = I18n.getLanguage();
        ids.forEach(
            id =>
                (stateIds[id] = {
                    common: {
                        name:
                            this.props.objects[id] && this.props.objects[id].type === 'folder'
                                ? Utils.getObjectName(this.props.objects, id, { language })
                                : getLastPart(id),
                        nondeletable: true,
                        color:
                            this.props.objects[id]?.common && this.props.objects[id].common.color
                                ? this.props.objects[id].common.color
                                : null,
                        icon:
                            this.props.objects[id]?.common && this.props.objects[id].common.icon
                                ? this.props.objects[id].common.icon
                                : null,
                    },
                    type: 'folder',
                }),
        );

        stateIds[this.prefix] = {
            common: {
                name: I18n.t('Root'),
                nondeletable: true,
            },
            type: 'folder',
        };
        let functions = [];
        let rooms = [];
        try {
            functions = JSON.parse(window.localStorage.getItem('Devices.new.functions') || '[]');
            rooms = JSON.parse(window.localStorage.getItem('Devices.new.rooms') || '[]');
        } catch (e) {
            // ignore
        }

        let root = window.localStorage.getItem('NewDeviceRoot');
        if (!root || this.props.prefix.includes('alias') !== root.includes('alias') || !this.props.objects[root]) {
            root = null;
        }

        if (this.props.selected.startsWith('alias') && this.props.prefix.startsWith('alias.0')) {
            const checkIdSelected = (newPart = this.props.selected) => {
                if (this.props.objects[newPart]?.type && this.props.objects[newPart]?.type !== 'folder') {
                    let parts = newPart.split('.');
                    parts.pop();
                    parts = parts.join('.');
                    return checkIdSelected(parts);
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
            type: window.localStorage.getItem('Devices.newType') || 'light',
            ids: stateIds,
            rootCheck: (root || this.prefix) === this.prefix ? this.prefix : null,
            open: {},
        };
    }

    setStateAsync(newState) {
        return new Promise(resolve => this.setState(newState, () => resolve()));
    }

    renderSelectEnum(name, title) {
        const enums = this.props.enumIDs.filter(id => id.startsWith(`enum.${name}.`));
        const language = I18n.getLanguage();
        const objs = enums.map(id => ({
            name: Utils.getObjectName(this.props.objects, id, { language }),
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
                    style={styles.oidField}
                    open={!!this.state.open[name]}
                    onClick={() => this.setState({ open: { [name]: !this.state.open[name] } })}
                    onClose={() => this.state[name] && this.setState({ open: { [name]: false } })}
                    fullWidth
                    multiple
                    renderValue={arrId => {
                        const newArr =
                            arrId.length && typeof arrId !== 'string'
                                ? arrId.map(id => ({
                                      name: Utils.getObjectName(this.props.objects, id, { language }),
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
                        this.setState({ [name]: e.target.value, open: { [name]: false } });
                    }}
                >
                    {objs.map(obj => (
                        <MenuItem
                            key={obj.id}
                            icon={obj.icon}
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

    generateId() {
        return `${this.state.root}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    async onCopyDevice(newChannelId) {
        // if this is device not from linkeddevices or from alias
        this.channelId = this.props.copyDevice.channelId;
        const isAlias = this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.');

        const channelObj = this.props.objects[this.channelId];
        const { functions, rooms, icon, states, color, type } = this.props.copyDevice;
        const tasks = [];

        const patterns = this.props.detector.getPatterns();
        const role = patterns[type]?.states && patterns[type].states.find(item => item.defaultChannelRole);

        tasks.push({
            id: newChannelId,
            obj: {
                common: {
                    name: channelObj.common.name,
                    color: color,
                    desc: channelObj.common.desc,
                    role: role?.defaultChannelRole || type,
                    icon: icon && icon.startsWith('adapter/') ? `../../${icon}` : icon,
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

    handleOk = async () => {
        // check if name is unique
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
                color: null,
                rooms: this.state.rooms,
                prefix: this.prefix,
            });
        }
    };

    handleCancel = () => {
        // check if name is unique
        this.props.onClose && this.props.onClose(null);
    };

    showEnumIcon(name) {
        const obj = this.props.objects[this.state[name]];
        if (obj && obj.common && obj.common.icon) {
            return (
                <Icon
                    style={styles.icon}
                    src={obj.icon}
                    alt=""
                />
            );
        } else {
            return null;
        }
    }

    async addNewFolder(name, parentId) {
        const id = `${parentId}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        const obj = {
            _id: id,
            common: { name: { [I18n.getLanguage()]: name } },
            native: {},
            type: 'folder',
        };

        await this.props.processTasks([{ id, obj }]);

        // create folder
        const ids = JSON.parse(JSON.stringify(this.state.ids));
        ids[id] = {
            common: { name },
            type: 'folder',
        };
        this.prefix = id;
        await this.setStateAsync({ ids, root: id });
    }

    render() {
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
                                    checked={this.state.rootCheck}
                                    onChange={() => {
                                        let newRootCheck = null;
                                        let newRoot = this.state.rootCheck;
                                        if (!this.state.rootCheck) {
                                            newRootCheck = this.state.root;
                                            newRoot = this.prefix;
                                        }
                                        this.setState({ rootCheck: newRootCheck, root: newRoot });
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
                            style={styles.name}
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
                                        this.setState({ type: e.target.value });
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
                                                        <span style={styles.selectText}>
                                                            {this.typesWords[typeId]}
                                                        </span>
                                                    </div>
                                                    <div style={styles.iconWrapper}>
                                                        {Object.keys(TYPE_OPTIONS[typeId]).map(key =>
                                                            TYPE_OPTIONS[typeId][key] ? (
                                                                <Icon
                                                                    key={key}
                                                                    style={styles.iconStyle}
                                                                    src={ICONS_TYPE[key]}
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

DialogNewDevice.defaultProps = {
    selected: 'alias.0',
};

DialogNewDevice.propTypes = {
    onClose: PropTypes.func,
    objects: PropTypes.object,
    theme: PropTypes.object,
    themeType: PropTypes.string,
    enumIDs: PropTypes.array,
    socket: PropTypes.object,
    detector: PropTypes.object,
};

export default DialogNewDevice;
