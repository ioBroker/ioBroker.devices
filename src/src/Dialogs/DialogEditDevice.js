/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import clsx from 'clsx';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import { MdEdit as IconEdit } from 'react-icons/md';
import { MdFunctions as IconFunction } from 'react-icons/md';
import { MdOpenInNew as IconExtended } from 'react-icons/md';
// import { MdContentCopy as IconCopy } from 'react-icons/md';
import { MdHelpOutline } from 'react-icons/md';

import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';

import { AppBar, IconButton, LinearProgress, Paper, Tab, Tabs, Tooltip, Typography } from '@material-ui/core';
import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';
import { MdDelete as IconDelete } from 'react-icons/md';
import { MdAdd as IconAdd } from 'react-icons/md';
import ImportExportIcon from '@material-ui/icons/ImportExport';
import TypeIcon from '../Components/TypeIcon';

import { STATES_NAME_ICONS } from '../Components/TypeOptions';
import DialogEditProperties from './DialogEditProperties';
import { addStateCallBack } from './AddState';

const styles = theme => {
    return ({
        header: {
            width: '100%',
            fontSize: 16,
            textTransform: 'capitalize',
            textAlign: 'center',
            paddingBottom: 20,
            color: '#000',
        },
        divOidField: {
            width: '100%',
            display: 'flex',
            paddingTop: 5,
            paddingBottom: 5,
            height: 69,
        },
        oidName: {
            minWidth: 100,
            display: 'flex',
            // alignItems: 'center',
            flexDirection: 'column',
            marginTop: 17,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        oidField: {
            display: 'inline-block',
            marginTop: 0,
            marginBottom: 0,
            width: 'calc(100% - 185px)',
        },
        colorButton: {
            '&>div': {
                width: '100%'
            }
        },
        divOids: {
            display: 'inline-block',
            verticalAlign: 'top',
            width: '100%',
        },
        divDevice: {
            color: theme.palette.type === 'light' ? 'black' : 'white',
            display: 'inline-block',
            width: 100,
            verticalAlign: 'top',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            lineHeight: '32px',
        },
        divIndicators: {
            display: 'inline-block',
            verticalAlign: 'top',
        },
        menuWrapperIcons: {
            display: 'flex'
        },
        divExtended: {
            width: 'calc(50% - 55px)',
        },
        divDialogContent: {
            fontSize: '1rem',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
        },
        buttonPen: {
            color: '#ffffff',
        },
        headerButtons: {
            textAlign: 'right'
        },
        headerButton: {
            float: 'right',
            marginLeft: 3,
        },
        enumIcon: {
            width: 24,
            height: 24
        },
        funcDivEdit: {
            width: '100%'
        },
        funcEditName: {
            display: 'inline-block',
            width: 85
        },
        funcEdit: {
            display: 'inline-block',
            marginTop: 0,
            marginBottom: 0,
            width: 'calc(100% - 85px)',
        },
        idEditName: {
            display: 'inline-block',
            width: 200
        },
        idEdit: {
            width: 'calc(100% - 200px)',
            display: 'inline-block',
            marginTop: 0,
            marginBottom: 0,
        },
        icon: {
            color: theme.palette.type === 'light' ? 'black' : 'white',
            display: 'inline-block',
            verticalAlign: 'middle'
        },
        deviceText: {
            verticalAlign: 'middle'
        },
        wrapperIconHead: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 900,
            marginTop: 5
        },
        iconStyle: {
            marginRight: 7
        },
        content: {
            paddingTop: 0
        },
        wrapperItemButtons: {
            display: 'flex',
            margin: 'auto 0'
        },
        emptyButton: {
            width: 48,
            height: 48
        },
        tab: {
            '& .Mui-selected': {
                color: theme.name === 'colored' && 'black'
            }
        },
        indicator: {
            backgroundColor: theme.name === 'colored' && 'black'
        },
        divOidFieldObj: {
            height: 140
        },
        displayFlex: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
        },
        displayFlexRow: {
            display: 'flex',

        },
        width100: {
            width: '100%'
        },
        stateSubCategory: {
            fontSize: 12,
            opacity: .6
        },
        wrapperHeaderIndicators: {
            display: 'flex',
            padding: 30
        },
        headerIndicatorsLine: {
            flexGrow: 1,
            borderTop: '1px solid #4dabf5',
            margin: '0 10px',
            marginTop: 11,
            opacity: 0.8
        },
        headerIndicatorsName: {
            color: '#4dabf5',
            fontSize: 18
        },
        wrapperOidName: {
            display: 'flex',
        },
        oidNameIcon: {
            marginTop: 16,
            marginRight: 3
        },
        helperText: {
            opacity: 0.2
        }
    })
};

// const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return <div
        role="tabpanel"
        hidden={value !== index}
        id={`scrollable-auto-tabpanel-${index}`}
        aria-labelledby={`scrollable-auto-tab-${index}`}
        {...other}
    >
        {value === index && (
            <Paper style={{ padding: `10px 20px` }} p={3}>
                <Typography component="div">{children}</Typography>
            </Paper>
        )}
    </div>;
}

class DialogEditDevice extends React.Component {
    constructor(props) {
        super(props);
        const ids = {};
        this.fx = {};

        this.props.channelInfo.states.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj && obj.common && obj.common.alias) {
                    ids[state.name] = obj.common.alias.id || '';
                    this.fx[state.name] = {
                        read: obj.common.alias.read || '',
                        write: obj.common.alias.write || '',
                    };
                } else {
                    this.fx[state.name] = { read: '', write: '' };
                }
                if (obj && obj.common && obj.common.custom) {
                    const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                    if (attr && attr.length && obj.common.custom[attr] && obj.common.custom[attr].parentId) {
                        ids[state.name] = obj.common.custom[attr].parentId;
                    }
                }

                if (state.defaultRole && state.defaultRole.startsWith('button')) {
                    delete this.fx[state.name].read;
                }
                if (!state.write ||
                    (state.defaultRole && (state.defaultRole.startsWith('indicator') || state.defaultRole.startsWith('value')))
                ) {
                    delete this.fx[state.name].write;
                }
            } else {
                this.fx[state.name] = { read: '', write: '' };
            }
        });

        const newDevices = Object.keys(this.props.objects)
            .filter(key => key.includes(this.props.channelInfo.channelId) && !this.props.channelInfo.states.find(item => item.id === key) && this.props.objects[key].type === 'state')
            .map(key => {
                const objOriginal = this.props.objects[key];
                const obj = {
                    defaultRole: objOriginal?.common?.role,
                    id: objOriginal?._id,
                    noType: true,
                    name: objOriginal?.common?.name,
                    type: objOriginal?.common?.type,
                    write: objOriginal?.common?.write,
                    indicator: false,
                    required: false
                };
                return obj;
            })
            .filter(item => !this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole).find(el => el.name === item.name));

        newDevices.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj && obj.common && obj.common.alias) {
                    ids[state.name] = obj.common.alias.id || '';
                    this.fx[state.name] = {
                        read: obj.common.alias.read || '',
                        write: obj.common.alias.write || '',
                    };
                } else {
                    this.fx[state.name] = { read: '', write: '' };
                }
                if (obj && obj.common && obj.common.custom) {
                    const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                    if (attr && attr.length && obj.common.custom[attr] && obj.common.custom[attr].parentId) {
                        ids[state.name] = obj.common.custom[attr].parentId;
                    }
                }

                if (state.defaultRole && state.defaultRole.startsWith('button')) {
                    delete this.fx[state.name].read;
                }
                if (!state.write ||
                    (state.defaultRole && (state.defaultRole.startsWith('indicator') || state.defaultRole.startsWith('value')))
                ) {
                    delete this.fx[state.name].write;
                }
            } else {
                this.fx[state.name] = { read: '', write: '' };
            }
        });

        this.channelId = this.props.channelInfo.channelId;
        let name = '';
        const channelObj = this.props.objects[this.channelId];

        if (channelObj && channelObj.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, { language: I18n.getLanguage() });
        }

        const extendedAvailable = !!(this.props.channelInfo.states.filter(item => item.indicator).length) && (this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.'));

        this.state = {
            ids,
            idsInit: ids,
            name,
            newDevices,
            extended: extendedAvailable && window.localStorage.getItem('Devices.editExtended') === 'true',
            expertMode: true,
            selectIdFor: '',
            newState: false,
            selectIdPrefix: '',
            editFxFor: '',
            newChannelId: '',
            newChannelError: false,
            startTheProcess: false,
            //showCopyDialog: false,
            disabledButton: false,
            extendedAvailable,
            tab: localStorage.getItem('EditDevice.tab') ? JSON.parse(localStorage.getItem('EditDevice.tab')) || 0 : 0,
            initChangeProperties: {},
            changeProperties: {}
        };

        this.pattern = this.props.patterns[Object.keys(this.props.patterns)
            .find(type => this.props.patterns[type].type === this.props.channelInfo.type)];
    }

    // componentWillReceiveProps(nextProps) {
    //     console.log(nextProps.channelInfo.states);
    // }

    componentDidUpdate(prevProps) {
        // if (JSON.stringify(prevProps.objects) !== JSON.stringify(this.props.objects)) {
        const newDevices = Object.keys(this.props.objects)
            .filter(key => key.includes(this.props.channelInfo.channelId) && !this.props.channelInfo.states.find(item => item.id === key) && this.props.objects[key].type === 'state')
            .map(key => {
                const objOriginal = this.props.objects[key];
                const obj = {
                    defaultRole: objOriginal?.common?.role,
                    id: objOriginal?._id,
                    noType: true,
                    name: objOriginal?.common?.name,
                    type: objOriginal?.common?.type,
                    write: objOriginal?.common?.write,
                    indicator: false,
                    required: false
                };
                return obj;
            })
            .filter(item => !this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole).find(el => el.name === item.name));

        if (JSON.stringify(newDevices) !== JSON.stringify(this.state.newDevices)) {
            newDevices.forEach(state => {
                if (state.id && !this.fx[state.name]) {
                    const obj = this.props.objects[state.id];
                    if (obj && obj.common && obj.common.alias) {
                        this.fx[state.name] = {
                            read: obj.common.alias.read || '',
                            write: obj.common.alias.write || '',
                        };
                    } else {
                        this.fx[state.name] = { read: '', write: '' };
                    }

                    if (state.defaultRole && state.defaultRole.startsWith('button')) {
                        delete this.fx[state.name].read;
                    }
                    if (!state.write ||
                        (state.defaultRole && (state.defaultRole.startsWith('indicator') || state.defaultRole.startsWith('value')))
                    ) {
                        delete this.fx[state.name].write;
                    }
                } else {
                    this.fx[state.name] = { read: '', write: '' };
                }
            });
            this.setState({ newDevices });
        }
        // }
    }

    renderSelectDialog() {
        if (!this.state.selectIdFor && !this.state.newState) {
            return null;
        }
        const selected = this.state.selectIdPrefix ? this.state.ids[this.state.selectIdFor][this.state.selectIdPrefix] : this.state.ids[this.state.selectIdFor];
        return <DialogSelectID
            key="selectDialog"
            imagePrefix="../.."
            socket={this.props.socket}
            dialogName="devicesEdit"
            title={this.state.newState ? I18n.t('Importer state') : I18n.t('Select for ') + this.state.selectIdFor}
            selected={selected || this.findRealDevice(this.state.selectIdPrefix)}
            statesOnly={true}
            onOk={async id => {
                const ids = JSON.parse(JSON.stringify(this.state.ids));
                if (!this.state.newState) {
                    if (this.state.selectIdPrefix) {
                        ids[this.state.selectIdFor][this.state.selectIdPrefix] = id;
                    } else {
                        ids[this.state.selectIdFor] = id;
                    }
                } else {
                    const isAlias = id.startsWith('alias.') || id.startsWith('linkeddevices.');
                    const obj = JSON.parse(JSON.stringify(this.props.objects[id]));
                    let parts = id.split('.');
                    parts = parts.pop();
                    obj._id = `${this.channelId}.${parts}`;
                    obj.native = {};
                    obj.common.name = parts;
                    if (!isAlias) {
                        obj.common.alias = { id };
                    }
                    await this.props.socket.setObject(`${this.channelId}.${parts}`, obj);
                    const newObject = await this.props.socket.getObject(`${this.channelId}.${parts}`);
                    this.props.objects[`${this.channelId}.${parts}`] = newObject;
                    if (newObject.common) {
                        ids[newObject.common.name] = newObject?.common?.alias?.id;
                    }
                }
                this.setState({ selectIdPrefix: '', selectIdFor: '', ids });
            }}
            onClose={() => this.setState({ selectIdFor: '', selectIdPrefix: '', newState: false })}
        />;
    }

    handleClose = () => {
        this.props.onClose && this.props.onClose(null);
    }

    updateNewState = async () => {
        const array = this.state.newDevices.filter(item => Object.keys(this.state.ids).includes(item.name));
        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            const stateObj = this.props.objects[item.id];
            stateObj.common = stateObj.common || {};
            stateObj.common.alias = stateObj.common.alias || {};
            stateObj.common.alias.id = this.state.ids[item.name];
            if (!this.fx[item.name].read) {
                delete stateObj.common.alias.read;
            } else {
                stateObj.common.alias.read = this.fx[item.name].read;
            }
            if (!this.fx[item.name].write) {
                delete stateObj.common.alias.write;
            } else {
                stateObj.common.alias.write = this.fx[item.name].write;
            }
            await this.props.socket.setObject(stateObj._id, stateObj);
        }
    }

    handleOk = async () => {
        this.setState({ startTheProcess: true });
        if (JSON.stringify(this.state.initChangeProperties) !== JSON.stringify(this.state.changeProperties)) {
            this.props.onSaveProperties && (await this.props.onSaveProperties(this.state.changeProperties));
        }
        await this.props.onClose({
            ids: this.state.ids,
            fx: this.fx,
        });
        await this.updateNewState();

        if (this.state.changeProperties.name &&
            this.state.initChangeProperties.name &&
            this.state.initChangeProperties.name !== this.state.changeProperties.name
        ) {
            let parts = this.channelId.split('.');
            parts.pop();
            parts = parts.join('.');
            parts = `${parts}.${this.state.changeProperties.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
            await this.props.onCopyDevice(this.channelId, parts);
        }
        this.setState({ startTheProcess: false });
    };

    showDeviceIcon() {
        return <div className={this.props.classes.icon}>
            <TypeIcon type={this.props.channelInfo.type} style={{ color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000' }} />
        </div>;
    }

    /*async addToEnum(enumId, id) {
       const obj = await this.props.socket.getObject(enumId)
       if (obj && obj.common) {
           obj.common.members = obj.common.members || [];

           if (!obj.common.members.includes(id)) {
               obj.common.members.push(id);
               obj.common.members.sort();
               await this.props.socket.setObject(enumId, obj);
           }
       }
   }

   async processTasks(tasks) {
       for (let t = 0; t < tasks.length; t++) {
           const task = tasks[t];
           if (task.enums) {
               for (let m = 0; m < task.enums.length; m++) {
                   await this.addToEnum(task.enums[i], task.id);
               }
           }

           this.props.objects[task.id] = task.obj;
           await this.props.socket.setObject(task.id, task.obj);
       }
   }*/

    /*onCopyDevice(newChannelId, cb) {
        // if this is device not from linkeddevice or from alias
        const isAlias = this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.');

        if (!isAlias) {
            return cb();
        }

        const channelObj = this.props.objects[this.channelId];
        const tasks = [];
        tasks.push({
            id: newChannelId,
            obj: {
                common: {
                    name: channelObj.common.name,
                    color: channelObj.common.color,
                    desc: channelObj.common.desc,
                    role: channelObj.common.role,
                    icon: channelObj.common.icon,
                },
                type: 'channel'
            },
            enums: this.props.channelInfo.rooms.concat(this.props.channelInfo.functions)
        });

        this.props.channelInfo.states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(this.props.objects[state.id]));
            obj._id = newChannelId + '.' + state.name;

            obj.native = {};
            if (!isAlias) {
                obj.common.alias = { id: state.id };
            }
            tasks.push({ id: obj._id, obj });
        });

        this.processTasks(tasks, cb);
    }*/

    renderHeader() {
        const classes = this.props.classes;
        // const alias = this.props.channelInfo.channelId.startsWith('alias.');

        return <div className={classes.header}>
            <div className={classes.divOids + ' ' + classes.headerButtons + ' ' + classes.divExtended} />
            <div className={classes.menuWrapperIcons}>
                {/* {!alias && <Tooltip title={I18n.t('Copy device into aliases')}>
                    <IconButton onClick={() => this.setState({ showCopyDialog: true, newChannelId: '' })}>
                        <IconCopy />
                    </IconButton>
                </Tooltip>} */}
                {this.state.extendedAvailable && !this.state.startTheProcess && <Tooltip title={I18n.t('Show hide indicators')}>
                    <IconButton
                        style={this.state.extended ? { color: '#4dabf5' } : null}
                        onClick={() => {
                            window.localStorage.setItem('Devices.editExtended', this.state.extended ? 'false' : 'true');
                            this.setState({ extended: !this.state.extended });
                        }}>
                        <IconExtended style={{ transform: !this.state.extended ? 'rotate(180deg)' : '' }} />
                    </IconButton>
                </Tooltip>}
                {this.state.extendedAvailable && !this.state.startTheProcess &&
                    <Tooltip title={I18n.t('Add state')}>
                        <IconButton
                            onClick={() => addStateCallBack(
                                async obj => {
                                    if (obj) {
                                        const newObject = await this.props.socket.getObject(obj._id);
                                        this.props.objects[obj._id] = newObject;
                                    }
                                },
                                this.props.objects,
                                this.props.socket,
                                this.channelId,
                                this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole)
                            )}>
                            <IconAdd />
                        </IconButton>
                    </Tooltip>}
                {this.state.extendedAvailable && !this.state.startTheProcess &&
                    <Tooltip title={I18n.t('Import state')}>
                        <IconButton
                            style={{ color: '#e67e229e' }}
                            onClick={() => this.setState({ newState: true })}
                        >
                            <IconAdd />
                        </IconButton>
                    </Tooltip>}
            </div>
        </div>;
    }

    onDelete = async (id) => {
        await this.props.socket.delObject(id);
        delete this.props.objects[id];
    }

    findRealDevice(prefix) {
        if (prefix) {
            return
        }
        let realParent = Object.keys(this.state.ids).find(id => this.state.ids[id]);
        if (realParent) {
            realParent = this.state.ids[realParent];
            if (typeof realParent === 'string') {
                const parts = realParent.split('.');
                parts.pop();
                realParent = parts.join('.');
            } else if (typeof realParent === 'object') {
                realParent = Object.keys(realParent)[0];
                const parts = realParent.split('.');
                parts.pop();
                realParent = parts.join('.');
            }
        }
        return realParent || '';
    }

    renderSelectEnum(name) {
        const enums = this.props.enumIDs.filter(id => id.startsWith('enum.' + name + '.'));
        const language = I18n.getLanguage();
        const objs = enums.map(id => {
            return {
                name: Utils.getObjectName(this.props.objects, id, { language }),
                icon: Utils.getObjectIcon(id, this.props.objects[id]),
                id: id
            }
        });

        return <Select
            className={this.props.classes.oidField}
            value={this.state[name]}
            multiple={true}
            onChange={e => this.setState({ [name]: e.target.value })}
        >
            {objs.map(obj => <MenuItem key={obj.id} icon={obj.icon} value={obj.id}>
                {obj.name}
            </MenuItem>)}
        </Select>;
    }

    renderEditFxDialog() {
        if (!this.state.editFxFor) {
            return null;
        }
        const fx = this.fx[this.state.editFxFor];

        this.fxRead = fx.read;
        this.fxWrite = fx.write;

        return <Dialog
            open={true}
            key="editFxDialog"
            maxWidth="sm"
            onClose={() => this.setState({ editFxFor: '' })}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={this.props.classes.titleBackground}
                classes={{ root: this.props.classes.titleColor }}
                id="edit-device-dialog-title">{I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b></DialogTitle>
            <DialogContent>
                <div className={this.props.classes.divDialogContent}>
                    {fx.read !== undefined ? <div className={this.props.classes.funcDivEdit}>
                        <div className={this.props.classes.funcEditName} style={{ fontWeight: 'bold' }}>
                            {I18n.t('Read function')}
                        </div>
                        <TextField
                            fullWidth
                            defaultValue={this.fxRead}
                            className={this.props.classes.funcEdit}
                            onChange={e => this.fxRead = e.target.value}
                            helperText={I18n.t('JS function like') + ' "val / 5 + 21"'}
                            margin="normal"
                        />
                    </div> : null}
                    {fx.write !== undefined ? <div className={this.props.classes.funcDivEdit}>
                        <div className={this.props.classes.funcEditName} style={{ fontWeight: 'bold' }}>
                            {I18n.t('Write function')}
                        </div>
                        <TextField
                            fullWidth
                            defaultValue={this.fxWrite}
                            helperText={I18n.t('JS function like') + ' "(val - 21) * 5"'}
                            className={this.props.classes.funcEdit}
                            onChange={e => this.fxWrite = e.target.value}
                            margin="normal"
                        />
                    </div> : null}
                </div>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={() => {
                    this.setState({ editFxFor: '' });
                    if (this.fx[this.state.editFxFor].read !== undefined) {
                        this.fx[this.state.editFxFor].read = this.fxRead;
                    }
                    if (this.fx[this.state.editFxFor].write !== undefined) {
                        this.fx[this.state.editFxFor].write = this.fxWrite;
                    }
                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button variant="contained" onClick={() => this.setState({ editFxFor: '' })}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }

    /*renderCopyDialog() {
        if (!this.state.showCopyDialog) {
            return;
        }

        const ALIAS_PREFIX = 'alias.0.';

        return <Dialog
            key="copyDialog"
            open={true}
            maxWidth="sm"
            fullWidth={true}
            onClose={() => this.setState({ showCopyDialog: false })}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={this.props.classes.titleBackground}
                classes={{ root: this.props.classes.titleColor }}
                id="edit-device-dialog-title">{I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b></DialogTitle>
            <DialogContent>
                <div className={this.props.classes.divDialogContent}>
                    <div className={this.props.classes.idEditName} style={{ fontWeight: 'bold' }}>{I18n.t('New device ID')} - {ALIAS_PREFIX}</div>
                    <TextField
                        fullWidth
                        placeholder={I18n.t('...')}
                        label={ALIAS_PREFIX + this.state.newChannelId}
                        error={this.state.newChannelError}
                        value={this.state.newChannelId}
                        className={this.props.classes.idEdit}
                        onChange={e => this.setState({ newChannelId: e.target.value.replace(FORBIDDEN_CHARS, '_'), newChannelError: !!this.props.objects[ALIAS_PREFIX + e.target.value.replace(FORBIDDEN_CHARS, '_')] })}
                        margin="normal"
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button href="" disabled={this.state.newChannelError} onClick={() => {
                    // this.onCopyDevice(ALIAS_PREFIX + this.state.newChannelId, () =>
                    this.setState({ showCopyDialog: false, newChannelId: '' }, () =>
                        this.handleOk(true));
                    // );

                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button href="" onClick={() => this.setState({ showCopyDialog: false })}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }*/

    onToggleTypeStates = (name) => {
        let stateDevice = this.state.ids[name];
        if (typeof stateDevice === 'object') {
            stateDevice = stateDevice.read;
        } else {
            stateDevice = {
                read: stateDevice,
                write: ''
            }
        }
        const newIds = JSON.parse(JSON.stringify(this.state.ids));
        newIds[name] = stateDevice;
        this.setState({ ids: newIds });
    }

    renderVariable(item, color = null) {
        if (!item.id && !this.channelId.startsWith('alias.') && !this.channelId.startsWith('linkeddevices.')) {
            return null;
        }
        let props = [item.type || 'any'];
        const dName = item.name.replace(/\d+$/, '%d');
        let pattern = this.pattern.states.find(state => state.name === item.name || state.name === dName);
        if (item.write) props.push('write');
        if (item.read) props.push('read');
        if (pattern?.defaultRole) {
            props.push('role=' + pattern.defaultRole);
        } else if (item.defaultRole) {
            props.push('role=' + item.defaultRole);
        } else {
            pattern?.role && props.push('role=' + pattern.role.toString());
        }

        if (pattern?.enums) {
            const type = this.props.channelInfo.type;
            if (type === 'dimmer' || type === 'light') {
                props.push('enum light');
            } else if (type === 'blinds' || type === 'window' || type === 'windowTilt') {
                props.push('enum window');
            } else if (type === 'door') {
                props.push('enum door');
            } else {
                props.push('enum ' + this.props.channelInfo.type);
            }
        }

        if (item.required) {
            props.push('required')
        }

        const role = pattern?.defaultRole || (pattern?.role && pattern?.role.toString()) || item?.defaultRole || '';
        const titleTooltip = <div>
            {item.required && <div>{`${I18n.t('Required')}: true`}</div>}
            <div>{`${I18n.t('Type')}: ${item.type || 'any'}`}</div>
            <div>{`${I18n.t('Writable')}: ${!!item.write}`}</div>
            {role && <div>{`${I18n.t('Role')}: ${pattern?.defaultRole || (pattern?.role && pattern?.role.toString()) || item?.defaultRole || ''}`}</div>}
        </div>

        ////////////// ImportExportIcon
        const alias = this.channelId.startsWith('alias.');
        const linkeddevices = this.channelId.startsWith('linkeddevices.');
        const name = item.name;

        const IconsState = STATES_NAME_ICONS[name] || MdHelpOutline

        if (typeof this.state.ids[name] === 'object') {
            return <div key={name}>
                <div key={name} className={clsx(this.props.classes.divOidField, this.props.classes.divOidFieldObj)} style={!item.id && !this.state.ids[name] ? { opacity: 0.6 } : {}}>
                    <div className={this.props.classes.displayFlex}>
                        <div className={this.props.classes.displayFlexRow}>
                            <Tooltip title={titleTooltip}>
                                <div className={this.props.classes.wrapperOidName}>
                                    <IconsState style={{ color }} className={this.props.classes.oidNameIcon} />
                                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color }}>
                                        {(item.required ? '*' : '') + name}
                                        <div className={this.props.classes.stateSubCategory}>{I18n.t('alias_read')}</div>
                                    </div>
                                </div>
                            </Tooltip>
                            <TextField
                                key={name}
                                fullWidth
                                disabled={(!alias && !linkeddevices) || this.state.startTheProcess}
                                value={this.state.ids[name].read}
                                className={clsx(this.props.classes.oidField, this.props.classes.width100)}
                                style={{ paddingTop: 8 }}
                                onChange={e => {
                                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                                    ids[name].read = e.target.value;
                                    this.setState({ ids });
                                }}
                                FormHelperTextProps={{
                                    className: this.props.classes.helperText
                                }}
                                helperText={`${props.join(', ')}`}
                                margin="normal"
                            />
                            <div className={this.props.classes.wrapperItemButtons}>
                                {(alias || linkeddevices) && !this.state.startTheProcess && <Tooltip title={I18n.t('Select ID')}>
                                    <IconButton onClick={() => this.setState({ selectIdFor: name, selectIdPrefix: 'read' })}>
                                        <IconEdit />
                                    </IconButton>
                                </Tooltip>}
                            </div>
                        </div>
                        <div className={this.props.classes.displayFlexRow}>
                            <Tooltip title={titleTooltip}>
                                <div className={this.props.classes.wrapperOidName}>
                                    <IconsState style={{ color }} className={this.props.classes.oidNameIcon} />
                                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color }}>
                                        {(item.required ? '*' : '') + name}
                                        <div className={this.props.classes.stateSubCategory}>{I18n.t('alias_write')}</div>
                                    </div>
                                </div>
                            </Tooltip>
                            <TextField
                                key={name}
                                fullWidth
                                disabled={(!alias && !linkeddevices) || this.state.startTheProcess}
                                value={this.state.ids[name].write}
                                className={clsx(this.props.classes.oidField, this.props.classes.width100)}
                                style={{ paddingTop: 8 }}
                                onChange={e => {
                                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                                    ids[name].write = e.target.value;
                                    this.setState({ ids });
                                }}
                                FormHelperTextProps={{
                                    className: this.props.classes.helperText
                                }}
                                helperText={`${props.join(', ')}`}
                                margin="normal"
                            /> <div className={this.props.classes.wrapperItemButtons}>
                                {(alias || linkeddevices) && !this.state.startTheProcess && <Tooltip title={I18n.t('Select ID')}>
                                    <IconButton onClick={() => this.setState({ selectIdFor: name, selectIdPrefix: 'write' })}>
                                        <IconEdit />
                                    </IconButton>
                                </Tooltip>}
                            </div>
                        </div>
                    </div>
                    <div className={this.props.classes.wrapperItemButtons}>
                        {(alias || linkeddevices) && !this.state.startTheProcess && <Tooltip title={I18n.t('Use one state for read and write')}>
                            <IconButton color="primary" onClick={() => this.onToggleTypeStates(name)}>
                                <ImportExportIcon />
                            </IconButton>
                        </Tooltip>}
                        {(this.state.ids[name].read || this.state.ids[name].write) && alias && this.state.ids[name] && !this.state.startTheProcess ? <Tooltip title={I18n.t('Edit convert functions')}>
                            <IconButton onClick={() => this.setState({ editFxFor: name })}>
                                <IconFunction />
                            </IconButton>
                        </Tooltip> : item.noType ? '' : <div className={this.props.classes.emptyButton} />}
                        {item.noType && !this.state.startTheProcess && <Tooltip title={I18n.t('Delete state')}>
                            <IconButton onClick={() => this.onDelete(item.id)}>
                                <IconDelete />
                            </IconButton>
                        </Tooltip>}
                    </div>
                </div>
            </div>;
        }

        return <div key={name} className={clsx(this.props.classes.divOidField)} style={!item.id && !this.state.ids[name] ? { opacity: 0.6 } : {}}>
            <Tooltip title={titleTooltip}>
                <div className={this.props.classes.wrapperOidName}>
                    <IconsState style={{ color }} className={this.props.classes.oidNameIcon} />
                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color }}>
                        {(item.required ? '*' : '') + name}
                    </div>
                </div>
            </Tooltip>
            <TextField
                key={name}
                fullWidth
                disabled={(!alias && !linkeddevices) || this.state.startTheProcess}
                value={alias || linkeddevices ? this.state.ids[name] || '' : item.id || ''}
                className={this.props.classes.oidField}
                style={{ paddingTop: 8 }}
                onChange={e => {
                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                    ids[name] = e.target.value;
                    this.setState({ ids });
                }}
                FormHelperTextProps={{
                    className: this.props.classes.helperText
                }}
                helperText={props.join(', ')}
                margin="normal"
            />
            <div className={this.props.classes.wrapperItemButtons}>
                {(alias || linkeddevices) && !this.state.startTheProcess && <Tooltip title={I18n.t('Select ID')}>
                    <IconButton onClick={() => this.setState({ selectIdFor: name })}>
                        <IconEdit />
                    </IconButton>
                </Tooltip>}
                {(alias || linkeddevices) && !this.state.startTheProcess && <Tooltip title={I18n.t('Use differnet states for read and write')}>
                    <IconButton onClick={() => this.onToggleTypeStates(name)}>
                        <ImportExportIcon />
                    </IconButton>
                </Tooltip>}
                {alias && this.state.ids[name] && !this.state.startTheProcess ? <Tooltip title={I18n.t('Edit convert functions')}>
                    <IconButton onClick={() => this.setState({ editFxFor: name })}>
                        <IconFunction />
                    </IconButton>
                </Tooltip> : item.noType ? '' : <div className={this.props.classes.emptyButton} />}
                {item.noType && !this.state.startTheProcess && <Tooltip title={I18n.t('Delete state')}>
                    <IconButton onClick={() => this.onDelete(item.id)}>
                        <IconDelete />
                    </IconButton>
                </Tooltip>}
            </div>
        </div>;
    }

    renderVariables() {
        return <div key="vars" className={clsx(this.props.classes.divOids, this.props.classes.divCollapsed)}>
            {this.props.channelInfo.states.filter(item => !item.indicator && item.defaultRole).map(item => this.renderVariable(item))}
            {this.state.extendedAvailable && this.state.newDevices.map(item => this.renderVariable(item, '#e67e229e'))}
            {this.state.extended && this.state.extendedAvailable &&
                <div className={this.props.classes.wrapperHeaderIndicators}>
                    <div className={this.props.classes.headerIndicatorsLine} />
                    <div className={this.props.classes.headerIndicatorsName}>{I18n.t('Indicators')}</div>
                    <div className={this.props.classes.headerIndicatorsLine} />
                </div>}
            {this.state.extended && this.state.extendedAvailable && this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole).map(item => this.renderVariable(item, '#4dabf5'))}
        </div>;
    }

    a11yProps(index) {
        return {
            id: `scrollable-auto-tab-${index}`,
            'aria-controls': `scrollable-auto-tabpanel-${index}`,
        };
    }

    render() {
        return <Dialog
            key="editDialog"
            open={true}
            maxWidth="md"
            fullWidth={true}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            {this.renderSelectDialog()}
            {this.renderEditFxDialog()}
            {/*this.renderCopyDialog()*/}
            <DialogTitle className={this.props.classes.titleBackground}
                classes={{ root: this.props.classes.titleColor }}
                id="edit-device-dialog-title">{I18n.t('Edit device')} <b>{this.channelId}</b></DialogTitle>
            <DialogContent className={this.props.classes.content}>
                <AppBar style={{ top: 0 }} position="sticky" color="default">
                    {this.state.startTheProcess && <LinearProgress />}
                    <div className={this.props.classes.wrapperIconHead}>
                        <div className={this.props.classes.iconStyle}>{this.showDeviceIcon()}</div>
                        <span className={this.props.classes.deviceText}>{I18n.t('type-' + this.props.channelInfo.type)}</span>
                    </div>
                    <Tabs
                        value={this.state.tab}
                        className={this.props.classes.tab}
                        classes={{
                            indicator: this.props.classes.indicator
                        }}
                        onChange={(_, newTab) => this.setState({ tab: newTab }, () => {
                            localStorage.setItem('EditDevice.tab', newTab);
                        })}
                        indicatorColor="primary"
                        textColor="primary"
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="scrollable auto tabs example"
                    >
                        <Tab disabled={this.state.startTheProcess} label={I18n.t('General')} {...this.a11yProps(0)} />
                        <Tab disabled={this.state.startTheProcess} label={I18n.t('States')} {...this.a11yProps(1)} />
                    </Tabs>
                </AppBar>
                <TabPanel value={this.state.tab} index={1}>
                    <div className={this.props.classes.divDialogContent}>
                        {this.renderHeader()}
                        {this.renderVariables()}
                    </div>
                </TabPanel>
                <TabPanel value={this.state.tab} index={0}>
                    <DialogEditProperties
                        channelId={this.props.channelId}
                        disabled={this.state.startTheProcess}
                        type={this.props.type}
                        iot={this.props.iot}
                        iotNoCommon={this.props.iotNoCommon}
                        objects={this.props.objects}
                        patterns={this.props.patterns}
                        enumIDs={this.props.enumIDs}
                        socket={this.props.socket}
                        changeProperties={this.state.changeProperties}
                        onChange={(state, initState, disabledButton) => {
                            if (initState) {
                                // TODO unclear! why immediately after setstate the settings are reseted
                                return this.setState({ initChangeProperties: initState, changeProperties: initState, disabledButton: false }, () =>
                                    this.setState({ changeProperties: state, disabledButton }));
                            } else {
                                this.setState({ changeProperties: state, disabledButton });
                            }
                        }}
                    />
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={(JSON.stringify(this.state.initChangeProperties) === JSON.stringify(this.state.changeProperties) && JSON.stringify(this.state.ids) === JSON.stringify(this.state.idsInit)) || this.state.disabledButton || this.state.startTheProcess}
                    onClick={async () => await this.handleOk()}
                    startIcon={<IconCheck />}
                    color="primary">{I18n.t('Save')}</Button>
                <Button
                    variant="contained"
                    disabled={this.state.startTheProcess}
                    onClick={this.handleClose}
                    startIcon={<IconClose />}
                >{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogEditDevice.propTypes = {
    channelId: PropTypes.string,
    onClose: PropTypes.func,
    patterns: PropTypes.object,
    channelInfo: PropTypes.object,
    objects: PropTypes.object,
    enumIDs: PropTypes.array,
    states: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    onCopyDevice: PropTypes.func,
    onSaveProperties: PropTypes.func,
};

export default withStyles(styles)(DialogEditDevice);
