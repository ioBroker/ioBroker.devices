/**
 * Copyright 2019-2022 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import IconClose from '@mui/icons-material/Close';
import IconCheck from '@mui/icons-material/Check';

import { Types } from 'iobroker.type-detector';
import I18n from '@iobroker/adapter-react-v5/i18n';
import Utils from '@iobroker/adapter-react-v5/Components/Utils';
import Icon from '@iobroker/adapter-react-v5/Components/Icon';

// import TreeView from '../Components/TreeView';
import TypeIcon from '../Components/TypeIcon';
import TYPE_OPTIONS, { ICONS_TYPE } from '../Components/TypeOptions';
import { Checkbox, FormControlLabel } from '@mui/material';

const styles = theme => ({
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
        marginTop: 10
    },
    input: {
        width: 200
    },
    icon: {
        display: 'inline-block',
    },
    selectIcon: {
        paddingRight: theme.spacing(1),
        verticalAlign: 'middle',
        width: 20,
        height: 20
    },
    selectText: {
        verticalAlign: 'middle',
    },
    enumIcon: {
        width: 24,
        height: 24,
        marginRight: 10
    },
    renderValueWrapper: {
        display: 'flex'
    },
    renderValueCurrent: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 10
    },
    blockFields: {
        display: 'flex',
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        margin: 5
    },
    container: {
        display: 'flex',
        overflowX: 'hidden',
        flexFlow: 'wrap'
    },
    treeDiv: {
        width: '100%',
        flex: 1,
        margin: 5,
        overflow: 'hidden'
    },
    titleColor: {
        '& h2': {
            overflow: 'hidden',
            direction: 'rtl',
            textOverflow: 'ellipsis',
            textAlign: 'end'
        },
    },
    iconStyle: {
        width: 16,
        height: 16,
        margin: '0 3px'
    },
    emptyIcon: {
        width: 16,
        height: 16,
        margin: '0 3px'
    },
    itemChildrenWrapper: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between'
    },
    iconWrapper: {
        display: 'flex',
        alignItems: 'center'
    }
});

const UNSUPPORTED_TYPES = [
    Types.unknown,
    Types.instance,
    Types.chart,
];

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
            if (id.startsWith(prefix) &&
                this.props.objects[id] &&
                this.props.objects[id].common &&
                (this.props.objects[id].type === 'channel' || this.props.objects[id].type === 'device' || this.props.objects[id].type === 'folder')) {
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
            .forEach(typeId => this.typesWords[typeId] = I18n.t('type-' + Types[typeId]));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a] === this.typesWords[b]) {
                return 0;
            } else
                if (this.typesWords[a] > this.typesWords[b]) {
                    return 1;
                } else {
                    return -1;
                }
        });

        const stateIds = {};
        const language = I18n.getLanguage();
        ids.forEach(id => stateIds[id] = {
            common: {
                name: this.props.objects[id] && this.props.objects[id].type === 'folder' ? Utils.getObjectName(this.props.objects, id, { language }) : getLastPart(id),
                nondeletable: true,
                color: this.props.objects[id]?.common && this.props.objects[id].common.color ? this.props.objects[id].common.color : null,
                icon: this.props.objects[id]?.common && this.props.objects[id].common.icon ? this.props.objects[id].common.icon : null
            },
            type: 'folder'
        });

        stateIds[this.prefix] = {
            common: {
                name: I18n.t('Root'),
                nondeletable: true
            },
            type: 'folder'
        };
        let functions = [];
        let rooms = [];
        try {
            functions = JSON.parse(window.localStorage.getItem('Devices.new.functions') || '[]');
            rooms = JSON.parse(window.localStorage.getItem('Devices.new.rooms') || '[]');
        } catch (e) {

        }

        let root = window.localStorage.getItem('NewDeviceRoot');
        if (!root || this.props.prefix.includes('alias') !== root.includes('alias') || !this.props.objects[root]) {
            root = null;
        }

        if ((this.props.selected.startsWith('alias') && this.props.prefix.startsWith('alias.0'))) {
            const checkIdSelected = (newPart = this.props.selected) => {
                if (this.props.objects[newPart]?.type && this.props.objects[newPart]?.type !== 'folder') {
                    let parts = newPart.split('.');
                    parts.pop();
                    parts = parts.join('.');
                    return checkIdSelected(parts);
                }
                return newPart
            }
            root = checkIdSelected();
        }

        if (root?.startsWith('alias.0.automatically_detected') || root?.startsWith('alias.0.linked_devices')){
            root = this.prefix;
        }

        this.state = {
            root: root?.startsWith(this.prefix) ? root : this.prefix,
            name: this.props.copyDevice ? `${this.props.copyDevice.name}-copy` : I18n.t('Device') + ' ' + i,
            notUnique: false,
            functions,
            rooms,
            type: window.localStorage.getItem('Devices.newType') || 'light',
            ids: stateIds,
            rootCheck: (root || this.prefix) === this.prefix ? this.prefix : null
        };
    }

    setStateAsync(newState) {
        return new Promise(resolve => this.setState(newState, () => resolve()));
    }

    renderSelectEnum(name, title) {
        const enums = this.props.enumIDs.filter(id => id.startsWith('enum.' + name + '.'));
        const language = I18n.getLanguage();
        const objs = enums.map(id => {
            return {
                name: Utils.getObjectName(this.props.objects, id, { language }),
                icon: Utils.getObjectIcon(id, this.props.objects[id]),
                id: id
            }
        });

        return <FormControl className={this.props.classes.type} variant="standard">
            <InputLabel>{title}</InputLabel>
            <Select
                variant="standard"
                className={this.props.classes.oidField}
                fullWidth
                multiple
                renderValue={(arrId) => {
                    const newArr = arrId.length && typeof arrId !== 'string' ? arrId.map(id => {
                        return {
                            name: Utils.getObjectName(this.props.objects, id, { language }),
                            icon: Utils.getObjectIcon(id, this.props.objects[id]),
                            id: id
                        }
                    }) : [];
                    return <div className={this.props.classes.renderValueWrapper}>
                        {newArr.map(obj => <div className={this.props.classes.renderValueCurrent} key={`${obj.id}-render`}>
                            {obj.icon ? <Icon className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} /> : <div className={this.props.classes.enumIcon} />}
                            {obj.name}
                        </div>)}
                    </div>
                }}
                value={this.state[name] || []}
                onChange={e => {
                    localStorage.setItem('Devices.new.' + name, JSON.stringify(e.target.value));
                    this.setState({ [name]: e.target.value });
                }}
            >
                {objs.map(obj => <MenuItem key={obj.id} icon={obj.icon} value={obj.id}>
                    {obj.icon ? <Icon className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} /> : <div className={this.props.classes.enumIcon} />}
                    {obj.name}
                </MenuItem>)}
            </Select>
        </FormControl>;
    }

    generateId() {
        return `${this.state.root}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    async onCopyDevice(newChannelId) {
        // if this is device not from linkeddevice or from alias
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
                native: channelObj.native || {}
            },
            enums: rooms.concat(functions)
        });

        states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(this.props.objects[state.id]));
            obj._id = newChannelId + '.' + state.name;

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
                prefix: this.prefix
            });
        }
    }

    handleCancel = () => {
        // check if name is unique
        this.props.onClose && this.props.onClose(null);
    }

    showEnumIcon(name) {
        const obj = this.props.objects[this.state[name]];
        if (obj && obj.common && obj.common.icon) {
            return <Icon className={this.props.classes.icon} src={obj.icon} alt="" />;
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
            type: 'folder'
        };

        await this.props.processTasks([{ id, obj }]);

        // create folder
        const ids = JSON.parse(JSON.stringify(this.state.ids));
        ids[id] = {
            common: { name },
            type: 'folder'
        };
        this.prefix = id;
        await this.setStateAsync({ ids, root: id });
    }

    render() {
        const classes = this.props.classes;

        return <Dialog
            open={true}
            maxWidth="md"
            fullWidth={true}
            onClose={() => this.handleCancel()}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={classes.titleBackground}
                classes={{ root: classes.titleColor }}
                id="edit-device-dialog-title">{I18n.t('Create new device')}: <b>{this.generateId()}</b>
            </DialogTitle>
            <DialogContent className={classes.container}>
                <div className={classes.blockFields}>
                    <FormControlLabel
                        disabled={this.state.rootCheck === this.state.root}
                        control={<Checkbox checked={this.state.rootCheck} onChange={() => {
                            let newRootCheck = null;
                            let newRoot = this.state.rootCheck;
                            if (!this.state.rootCheck) {
                                newRootCheck = this.state.root;
                                newRoot = this.prefix;
                            }
                            this.setState({ rootCheck: newRootCheck, root: newRoot })
                        }} />}
                        label={I18n.t('Add to root')}
                    />
                    <TextField
                        variant="standard"
                        fullWidth
                        autoFocus={!!this.props.copyDevice}
                        onKeyPress={(ev) => {
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
                        className={classes.name}
                        value={this.state.name}
                        onChange={e => this.setState({ name: e.target.value })}
                        margin="normal"
                    />
                    {!this.props.copyDevice && <FormControl className={classes.type} variant="standard">
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
                                .map(typeId => <MenuItem key={Types[typeId]} value={Types[typeId]}>
                                    <div className={classes.itemChildrenWrapper}>
                                        <div>
                                            <TypeIcon className={this.props.classes.selectIcon} type={Types[typeId]} style={{ color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000' }} />
                                            <span className={this.props.classes.selectText}>{this.typesWords[typeId]}</span>
                                        </div>
                                        <div className={classes.iconWrapper}>{
                                            Object.keys(TYPE_OPTIONS[typeId])
                                                .map(key => TYPE_OPTIONS[typeId][key] ?
                                                    <Icon className={classes.iconStyle} src={ICONS_TYPE[key]} /> :
                                                    <div key={key} className={classes.emptyIcon} />
                                                )}
                                        </div>
                                    </div>
                                </MenuItem>)}
                        </Select>
                    </FormControl>}
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
                    color="primary">{I18n.t('Create')}</Button>
                <Button
                    variant="contained"
                    onClick={this.handleCancel}
                    startIcon={<IconClose />}
                >{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogNewDevice.defaultProps = {
    selected: 'alias.0'
}

DialogNewDevice.propTypes = {
    onClose: PropTypes.func,
    objects: PropTypes.object,
    theme: PropTypes.object,
    themeType: PropTypes.string,
    enumIDs: PropTypes.array,
    socket: PropTypes.object,
    detector: PropTypes.object,
};

export default withStyles(styles)(DialogNewDevice);
