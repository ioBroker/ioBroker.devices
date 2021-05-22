/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
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
import { MdContentCopy as IconCopy } from 'react-icons/md';
import { MdHelpOutline } from 'react-icons/md';

import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';
import TypeIcon from "../Components/TypeIcon";
import { AppBar, IconButton, Paper, Tab, Tabs, Tooltip, Typography } from '@material-ui/core';
import DialogEditProperties from './DialogEditProperties';
import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';
import clsx from 'clsx';
import ImportExportIcon from '@material-ui/icons/ImportExport';
import { STATES_NAME_ICONS } from '../Components/TypeOptions';

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
        }
    })
};

const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Paper style={{ padding: `10px 20px` }} p={3}>
                    <Typography variant="outlined" component="div">{children}</Typography>
                </Paper>
            )}
        </div>
    );
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
            extended: extendedAvailable && window.localStorage.getItem('Devices.editExtended') === 'true',
            expertMode: true,
            selectIdFor: '',
            selectIdPrefix: '',
            editFxFor: '',
            newChannelId: '',
            newChannelError: false,
            showCopyDialog: false,
            extendedAvailable,
            tab: localStorage.getItem('EditDevice.tab') ? JSON.parse(localStorage.getItem('EditDevice.tab')) || 0 : 0,
            initChangeProperties: {},
            changeProperties: {}
        };

        this.pattern = this.props.patterns[Object.keys(this.props.patterns)
            .find(type => this.props.patterns[type].type === this.props.channelInfo.type)];
    }

    renderSelectDialog() {
        if (!this.state.selectIdFor) {
            return null;
        }
        const selected = this.state.selectIdPrefix ? this.state.ids[this.state.selectIdFor][this.state.selectIdPrefix] : this.state.ids[this.state.selectIdFor];
        return <DialogSelectID
            key="selectDialog"
            imagePrefix="../.."
            socket={this.props.socket}
            dialogName="devicesEdit"
            title={I18n.t('Select for ') + this.state.selectIdFor}
            selected={selected || this.findRealDevice(this.state.selectIdPrefix)}
            statesOnly={true}
            onOk={id => {
                const ids = JSON.parse(JSON.stringify(this.state.ids));
                if (this.state.selectIdPrefix) {
                    ids[this.state.selectIdFor][this.state.selectIdPrefix] = id;
                } else {
                    ids[this.state.selectIdFor] = id;
                }
                this.setState({ selectIdPrefix: '', selectIdFor: '', ids });
            }}
            onClose={() => this.setState({ selectIdFor: '', selectIdPrefix: '' })}
        />;
    }

    handleClose = () => {
        this.props.onClose && this.props.onClose(null);
    }

    handleOk = isRefresh => {
        if (JSON.stringify(this.state.initChangeProperties) !== JSON.stringify(this.state.changeProperties)) {
            this.props.onSaveProperties && this.props.onSaveProperties(this.state.changeProperties);
        }
        this.props.onClose && this.props.onClose({
            ids: this.state.ids,
            fx: this.fx,
        }, isRefresh);
    };

    showDeviceIcon() {
        return <div className={this.props.classes.icon}>
            <TypeIcon type={this.props.channelInfo.type} style={{ color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000' }} />
        </div>;
    }

    addToEnum(enumId, id) {
        this.props.socket.getObject(enumId)
            .then(obj => {
                if (obj && obj.common) {
                    obj.common.members = obj.common.members || [];

                    if (!obj.common.members.includes(id)) {
                        obj.common.members.push(id);
                        obj.common.members.sort();
                        this.props.objects[enumId] = obj;
                        return this.props.socket.setObject(enumId, obj);
                    }
                }
            });
    }

    processTasks(tasks, cb) {
        if (!tasks || !tasks.length) {
            cb && cb();
        } else {
            const task = tasks.shift();
            let promises = [];

            if (task.enums) {
                promises = task.enums.map(enumId => this.addToEnum(enumId, task.id))
            }
            this.props.objects[task.id] = task.obj;
            promises.push(this.props.socket.setObject(task.id, task.obj));

            Promise.all(promises)
                .then(() => setTimeout(() =>
                    this.processTasks(tasks, cb), 0));
        }
    }

    onCopyDevice(newChannelId, cb) {
        // if this is device not from linkeddevice or from alias
        const isAlias = this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.');

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
    }

    renderHeader() {
        const classes = this.props.classes;
        const alias = this.props.channelInfo.channelId.startsWith('alias.');

        return <div className={classes.header}>
            <div className={classes.divOids + ' ' + classes.headerButtons + ' ' + classes.divExtended} />
            <div className={classes.menuWrapperIcons}>
                {!alias && <Tooltip title={I18n.t('Copy device into aliases')}>
                    <IconButton onClick={() => this.setState({ showCopyDialog: true, newChannelId: '' })}>
                        <IconCopy />
                    </IconButton>
                </Tooltip>}
                {this.state.extendedAvailable && <Tooltip title={I18n.t('Show hide indicators')}>
                    <IconButton
                        style={this.state.extended ? { color: '#4dabf5' } : null}
                        onClick={() => {
                            window.localStorage.setItem('Devices.editExtended', this.state.extended ? 'false' : 'true');
                            this.setState({ extended: !this.state.extended });
                        }}>
                        <IconExtended style={{ transform: !this.state.extended ? 'rotate(180deg)' : '' }} />
                    </IconButton>
                </Tooltip>}
            </div>
        </div>;
    }

    findRealDevice(prefix) {
        if (prefix) {
            return
        }
        let realParent = Object.keys(this.state.ids).find(id => this.state.ids[id]);
        if (realParent) {
            realParent = this.state.ids[realParent];
            if(typeof realParent === 'string'){
                const parts = realParent.split('.');
                parts.pop();
                realParent = parts.join('.');
            }else if(typeof realParent === 'object'){
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
                        <div className={this.props.classes.funcEditName} style={{ fontWeight: 'bold' }}>{I18n.t('Read')}</div>
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
                        <div className={this.props.classes.funcEditName} style={{ fontWeight: 'bold' }}>{I18n.t('Write')}</div>
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
                <Button href="" onClick={() => {
                    this.setState({ editFxFor: '' });
                    if (this.fx[this.state.editFxFor].read !== undefined) {
                        this.fx[this.state.editFxFor].read = this.fxRead;
                    }
                    if (this.fx[this.state.editFxFor].write !== undefined) {
                        this.fx[this.state.editFxFor].write = this.fxWrite;
                    }
                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button href="" onClick={() => this.setState({ editFxFor: '' })}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }

    renderCopyDialog() {
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
                    this.onCopyDevice(ALIAS_PREFIX + this.state.newChannelId, () =>
                        this.setState({ showCopyDialog: false, newChannelId: '' }, () =>
                            this.handleOk(true)));

                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button href="" onClick={() => this.setState({ showCopyDialog: false })}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }

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

    renderVariable(item, color) {
        if (!item.id && !this.channelId.startsWith('alias.') && !this.channelId.startsWith('linkeddevices.')) {
            return null;
        }
        let props = [item.type || 'any'];
        const dName = item.name.replace(/\d+$/, '%d');
        let pattern = this.pattern.states.find(state => state.name === item.name || state.name === dName);
        if (item.write) props.push('write');
        if (item.read) props.push('read');
        if (pattern.defaultRole) {
            props.push('role=' + pattern.defaultRole);
        } else {
            pattern.role && props.push('role=' + pattern.role.toString());
        }

        if (pattern.enums) {
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

        const titleTooltip = <div>
            <div>{`${I18n.t("Type")}: ${item.type || 'any'}`}</div>
            <div>{`${I18n.t("Write")}: ${!!item.write}`}</div>
            <div>{`${I18n.t("Role")}: ${pattern.defaultRole || (pattern.role && pattern.role.toString()) || ''}`}</div>
        </div>

        ////////////// ImportExportIcon
        const alias = this.channelId.startsWith('alias.');
        const linkeddevices = this.channelId.startsWith('linkeddevices.');
        const name = item.name;

        const IconsState = STATES_NAME_ICONS[name] || MdHelpOutline

        if (typeof this.state.ids[name] === 'object') {
            return <>
                <div key={name} className={clsx(this.props.classes.divOidField, this.props.classes.divOidFieldObj)} style={!item.id && !this.state.ids[name] ? { opacity: 0.6 } : {}}>
                    <div className={this.props.classes.displayFlex}>
                        <div className={this.props.classes.displayFlexRow}>
                            <Tooltip title={titleTooltip}>
                                <div className={this.props.classes.wrapperOidName}>
                                    <IconsState style={{ color: color ? '#4dabf5' : null }} className={this.props.classes.oidNameIcon} />
                                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color: color ? '#4dabf5' : null }}>
                                        {(item.required ? '*' : '') + name}
                                        <div className={this.props.classes.stateSubCategory}>{I18n.t('alias_read')}</div>
                                    </div>
                                </div>
                            </Tooltip>
                            <TextField
                                key={name}
                                fullWidth
                                disabled={!alias && !linkeddevices}
                                value={this.state.ids[name].read}
                                className={clsx(this.props.classes.oidField, this.props.classes.width100)}
                                style={{ paddingTop: 8 }}
                                onChange={e => {
                                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                                    ids[name].read = e.target.value;
                                    this.setState({ ids });
                                }}
                                helperText={`${props.join(', ')}`}
                                margin="normal"
                            />
                            <div className={this.props.classes.wrapperItemButtons}>
                                {(alias || linkeddevices) && <Tooltip title={I18n.t('Select ID')}>
                                    <IconButton onClick={() => this.setState({ selectIdFor: name, selectIdPrefix: 'read' })}>
                                        <IconEdit />
                                    </IconButton>
                                </Tooltip>}
                            </div>
                        </div>
                        <div className={this.props.classes.displayFlexRow}>
                            <Tooltip title={titleTooltip}>
                                <div className={this.props.classes.wrapperOidName}>
                                    <IconsState style={{ color: color ? '#4dabf5' : null }} className={this.props.classes.oidNameIcon} />
                                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color: color ? '#4dabf5' : null }}>
                                        {(item.required ? '*' : '') + name}
                                        <div className={this.props.classes.stateSubCategory}>{I18n.t('alias_write')}</div>
                                    </div>
                                </div>
                            </Tooltip>
                            <TextField
                                key={name}
                                fullWidth
                                disabled={!alias && !linkeddevices}
                                value={this.state.ids[name].write}
                                className={clsx(this.props.classes.oidField, this.props.classes.width100)}
                                style={{ paddingTop: 8 }}
                                onChange={e => {
                                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                                    ids[name].write = e.target.value;
                                    this.setState({ ids });
                                }}
                                helperText={`${props.join(', ')}`}
                                margin="normal"
                            /> <div className={this.props.classes.wrapperItemButtons}>
                                {(alias || linkeddevices) && <Tooltip title={I18n.t('Select ID')}>
                                    <IconButton onClick={() => this.setState({ selectIdFor: name, selectIdPrefix: 'write' })}>
                                        <IconEdit />
                                    </IconButton>
                                </Tooltip>}
                            </div>
                        </div>
                    </div>
                    <div className={this.props.classes.wrapperItemButtons}>
                        {(alias || linkeddevices) && <Tooltip title={I18n.t('Use one state for read and write')}>
                            <IconButton color="primary" onClick={() => this.onToggleTypeStates(name)}>
                                <ImportExportIcon />
                            </IconButton>
                        </Tooltip>}
                        {alias && this.state.ids[name] ? <Tooltip title={I18n.t('Edit convert functions')}>
                            <IconButton onClick={() => this.setState({ editFxFor: name })}>
                                <IconFunction />
                            </IconButton>
                        </Tooltip> : <div className={this.props.classes.emptyButton} />}
                    </div>
                </div>
            </>
        }

        return <div key={name} className={clsx(this.props.classes.divOidField)} style={!item.id && !this.state.ids[name] ? { opacity: 0.6 } : {}}>
            <Tooltip title={titleTooltip}>
                <div className={this.props.classes.wrapperOidName}>
                    <IconsState style={{ color: color ? '#4dabf5' : null }} className={this.props.classes.oidNameIcon} />
                    <div className={this.props.classes.oidName} style={{ fontWeight: item.required ? 'bold' : null, color: color ? '#4dabf5' : null }}>
                        {(item.required ? '*' : '') + name}
                    </div>
                </div>
            </Tooltip>
            <TextField
                key={name}
                fullWidth
                disabled={!alias && !linkeddevices}
                value={alias || linkeddevices ? this.state.ids[name] || '' : item.id || ''}
                className={this.props.classes.oidField}
                style={{ paddingTop: 8 }}
                onChange={e => {
                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                    ids[name] = e.target.value;
                    this.setState({ ids });
                }}
                helperText={props.join(', ')}
                margin="normal"
            />
            <div className={this.props.classes.wrapperItemButtons}>
                {(alias || linkeddevices) && <Tooltip title={I18n.t('Select ID')}>
                    <IconButton onClick={() => this.setState({ selectIdFor: name })}>
                        <IconEdit />
                    </IconButton>
                </Tooltip>}
                {(alias || linkeddevices) && <Tooltip title={I18n.t('Use differnet states for read and write')}>
                    <IconButton onClick={() => this.onToggleTypeStates(name)}>
                        <ImportExportIcon />
                    </IconButton>
                </Tooltip>}
                {alias && this.state.ids[name] ? <Tooltip title={I18n.t('Edit convert functions')}>
                    <IconButton onClick={() => this.setState({ editFxFor: name })}>
                        <IconFunction />
                    </IconButton>
                </Tooltip> : <div className={this.props.classes.emptyButton} />}
            </div>
        </div>;
    }

    renderVariables() {
        return <div key="vars" className={this.props.classes.divOids + ' ' + this.props.classes.divCollapsed}>
            {this.props.channelInfo.states.filter(item => !item.indicator && item.defaultRole).map(item => this.renderVariable(item))}
            {this.state.extended && this.state.extendedAvailable &&
                <div className={this.props.classes.wrapperHeaderIndicators}>
                    <div className={this.props.classes.headerIndicatorsLine} />
                    <div className={this.props.classes.headerIndicatorsName}>{I18n.t('Indicators')}</div>
                    <div className={this.props.classes.headerIndicatorsLine} />
                </div>}
            {this.state.extended && this.state.extendedAvailable && this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole).map(item => this.renderVariable(item, true))}
        </div>;
    }

    a11yProps(index) {
        return {
            id: `scrollable-auto-tab-${index}`,
            'aria-controls': `scrollable-auto-tabpanel-${index}`,
        };
    }

    render() {
        return [
            <Dialog
                key="editDialog"
                open={true}
                maxWidth="md"
                fullWidth={true}
                onClose={() => this.handleClose()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle className={this.props.classes.titleBackground}
                    classes={{ root: this.props.classes.titleColor }}
                    id="edit-device-dialog-title">{I18n.t('Edit device')} <b>{this.channelId}</b></DialogTitle>
                <DialogContent className={this.props.classes.content}>
                    <AppBar style={{ top: 0 }} position="sticky" color="default">
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
                            <Tab label={I18n.t('General')} {...this.a11yProps(0)} />
                            <Tab label={I18n.t('States')} {...this.a11yProps(1)} />
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
                            type={this.props.type}
                            iot={this.props.iot}
                            iotNoCommon={this.props.iotNoCommon}
                            objects={this.props.objects}
                            patterns={this.props.patterns}
                            enumIDs={this.props.enumIDs}
                            socket={this.props.socket}
                            changeProperties={this.state.changeProperties}
                            onChange={(state, initState) => {
                                if (initState) {
                                    return this.setState({ initChangeProperties: initState, changeProperties: initState });
                                }
                                this.setState({ changeProperties: state });
                            }}
                        />
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={JSON.stringify(this.state.initChangeProperties) === JSON.stringify(this.state.changeProperties) && JSON.stringify(this.state.ids) === JSON.stringify(this.state.idsInit)}
                        onClick={this.handleOk}
                        startIcon={<IconCheck />}
                        color="primary">{I18n.t('Write')}</Button>
                    <Button
                        variant="contained"
                        onClick={this.handleClose}
                        startIcon={<IconClose />}
                    >{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>,
            this.renderSelectDialog(),
            this.renderEditFxDialog(),
            this.renderCopyDialog(),
        ];
    }
}

DialogEditDevice.propTypes = {
    onClose: PropTypes.func,
    patterns: PropTypes.object,
    channelInfo: PropTypes.object,
    objects: PropTypes.object,
    enumIDs: PropTypes.array,
    states: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string
};

export default withStyles(styles)(DialogEditDevice);
