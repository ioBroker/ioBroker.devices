/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Fab from '@material-ui/core/Fab';

import {MdEdit as IconEdit} from 'react-icons/md';
import {MdFunctions as IconFunction} from 'react-icons/md';
import {MdOpenInNew as IconExtended} from 'react-icons/md';
import {MdContentCopy as IconCopy} from 'react-icons/md';
import IconExpert from '../icons/RepairExpert';

import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';
import TypeIcon from "../Components/TypeIcon";

const styles = theme => ({
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
        borderTop: '1px dashed #cacaca',
        display: 'block',
        paddingTop: 5,
        paddingBottom: 5,
        height: 69,
    },
    oidName: {
        width: 100,
        display: 'inline-block',
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
        lineHeight: '32px'
    },
    divIndicators: {
        display: 'inline-block',
        verticalAlign: 'top',
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
});

const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

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
                        read:  obj.common.alias.read  || '',
                        write: obj.common.alias.write || '',
                    };
                } else {
                    this.fx[state.name] = {read: '', write: ''};
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
                this.fx[state.name] = {read: '', write: ''};
            }
        });

        this.channelId = this.props.channelInfo.channelId;
        let name = '';
        const channelObj = this.props.objects[this.channelId];

        if (channelObj && channelObj.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, {language: I18n.getLanguage()});
        }

        const extendedAvailable = !!(this.props.channelInfo.states.filter(item => item.indicator).length) && (this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.'));

        this.state = {
            ids,
            name,
            extended: extendedAvailable && window.localStorage.getItem('Devices.editExtended') === 'true',
            expertMode: window.localStorage.getItem('Devices.expertMode') === 'true',
            selectIdFor: '',
            editFxFor: '',
            newChannelId: '',
            newChannelError: false,
            showCopyDialog: false,
            extendedAvailable
        };

        this.pattern = this.props.patterns[Object.keys(this.props.patterns)
            .find(type => this.props.patterns[type].type === this.props.channelInfo.type)];
    }

    renderSelectDialog() {
        if (!this.state.selectIdFor) {
            return null;
        }

        return (<DialogSelectID
            key="selectDialog"
            imagePrefix="../.."
            socket={this.props.socket}
            dialogName="devicesEdit"
            title={I18n.t('Select for ') + this.state.selectIdFor}
            selected={this.state.ids[this.state.selectIdFor] || this.findRealDevice()}
            statesOnly={true}
            onOk={id => {
                const ids = JSON.parse(JSON.stringify(this.state.ids));
                ids[this.state.selectIdFor] = id;
                this.setState({selectIdFor: '', ids})
            }}
            onClose={() => this.setState({selectIdFor: ''})}
        />);
    }

    handleClose() {
        this.props.onClose && this.props.onClose(null);
    }

    handleOk(isRefresh) {
        this.props.onClose && this.props.onClose({
            ids: this.state.ids,
            fx:  this.fx,
        }, isRefresh);
    };

    showDeviceIcon() {
        return (
            <div className={this.props.classes.icon}>
                <TypeIcon type={this.props.channelInfo.type} style={{color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000'}}/>
            </div>
        );
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
                obj.common.alias = {id: state.id};
            }
            tasks.push({id: obj._id, obj});
        });

        this.processTasks(tasks, cb);
    }

    renderHeader() {
        const classes = this.props.classes;
        const alias = this.props.channelInfo.channelId.startsWith('alias.');

        return (<div className={classes.header}>
            <div className={classes.divOids + ' ' + classes.headerButtons + ' ' + classes.divExtended}/>
            <div className={classes.divDevice}>{this.showDeviceIcon()}<span className={classes.deviceText}>{this.props.channelInfo.type}</span></div>
            <div className={classes.divIndicators + ' ' + classes.divExtended}>

                <Fab title={I18n.t('Show expert settings')} className={classes.headerButton} color={this.state.expertMode ? 'primary' : 'default'} size="small" onClick={() => {
                    window.localStorage.setItem('Devices.expertMode', this.state.expertMode ? 'false' : 'true');
                    this.setState({expertMode: !this.state.expertMode});
                }}><IconExpert style={{width: 22, height: 22, paddingLeft: 2}}/></Fab>

                {!alias ? (<Fab title={I18n.t('Copy device into aliases')} className={classes.headerButton} size="small" onClick={() => {
                    this.setState({showCopyDialog: true, newChannelId: ''});
                }}><IconCopy /></Fab>) : null}

                {this.state.extendedAvailable ? (<Fab title={I18n.t('Show hide indicators')} className={classes.headerButton} size="small" onClick={() => {
                    window.localStorage.setItem('Devices.editExtended', this.state.extended ? 'false' : 'true');
                    this.setState({extended: !this.state.extended});
                }}><IconExtended style={{transform: !this.state.extended ? 'rotate(180deg)' : ''}}/></Fab>) : null}
            </div>
        </div>);
    }

    findRealDevice() {
        let realParent = Object.keys(this.state.ids).find(id => this.state.ids[id]);
        if (realParent) {
            realParent = this.state.ids[realParent];
            const parts = realParent.split('.');
            parts.pop();
            realParent = parts.join('.');
        }
        return realParent || '';
    }

    renderSelectEnum(name) {
        const enums = this.props.enumIDs.filter(id => id.startsWith('enum.' + name + '.'));
        const language = I18n.getLanguage();
        const objs = enums.map(id => {
            return {
                name: Utils.getObjectName(this.props.objects, id, {language}),
                icon: Utils.getObjectIcon(id, this.props.objects[id]),
                id: id
            }
        });

        return (<Select
            className={this.props.classes.oidField}
            value={this.state[name]}
            multiple={true}
            onChange={e => {
                this.setState({[name]: e.target.value})
            }}
            >
            {objs.map(obj => (<MenuItem key={obj.id} icon={obj.icon} value={obj.id}>
                    {/*obj.icon ? (<img className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id}/>) : (<div className={this.props.classes.enumIcon}/>)*/}
                    {obj.name}
                </MenuItem>))}
        </Select>);
    }

    renderEditFxDialog() {
        if (!this.state.editFxFor) {
            return null;
        }
        const fx = this.fx[this.state.editFxFor];

        this.fxRead  = fx.read;
        this.fxWrite = fx.write;

        return (<Dialog
            open={true}
            key="editFxDialog"
            maxWidth="sm"
            onClose={() => this.setState({editFxFor: ''})}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={this.props.classes.titleBackground}
                         classes={{root: this.props.classes.titleColor}}
                         id="edit-device-dialog-title">{I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b></DialogTitle>
            <DialogContent>
                <div className={this.props.classes.divDialogContent}>
                    {fx.read !== undefined ? (<div className={this.props.classes.funcDivEdit}>
                        <div className={this.props.classes.funcEditName} style={{fontWeight: 'bold'}}>{I18n.t('Read')}</div>
                        <TextField
                            fullWidth
                            defaultValue={this.fxRead}
                            className={this.props.classes.funcEdit}
                            onChange={e => this.fxRead = e.target.value}
                            helperText={I18n.t('JS function like') + ' "val / 5 + 21"'}
                            margin="normal"
                        />
                    </div>) : null}
                    {fx.write !== undefined ? (<div className={this.props.classes.funcDivEdit}>
                        <div className={this.props.classes.funcEditName} style={{fontWeight: 'bold'}}>{I18n.t('Write')}</div>
                        <TextField
                            fullWidth
                            defaultValue={this.fxWrite}
                            helperText={I18n.t('JS function like') + ' "(val - 21) * 5"'}
                            className={this.props.classes.funcEdit}
                            onChange={e => this.fxWrite = e.target.value}
                            margin="normal"
                        />
                    </div>) : null}
                </div>
            </DialogContent>
            <DialogActions>
                <Button href="" onClick={() => {
                    this.setState({editFxFor: ''});
                    if (this.fx[this.state.editFxFor].read !== undefined) {
                        this.fx[this.state.editFxFor].read = this.fxRead;
                    }
                    if (this.fx[this.state.editFxFor].write !== undefined) {
                        this.fx[this.state.editFxFor].write = this.fxWrite;
                    }
                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button href="" onClick={() => this.setState({editFxFor: ''})}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>);
    }

    renderCopyDialog() {
        if (!this.state.showCopyDialog) {
            return;
        }

        const ALIAS_PREFIX = 'alias.0.';

        return (<Dialog
            key="copyDialog"
            open={true}
            maxWidth="sm"
            fullWidth={true}
            onClose={() => this.setState({showCopyDialog: false})}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={this.props.classes.titleBackground}
                         classes={{root: this.props.classes.titleColor}}
                         id="edit-device-dialog-title">{I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b></DialogTitle>
            <DialogContent>
                <div className={this.props.classes.divDialogContent}>
                    <div className={this.props.classes.idEditName} style={{fontWeight: 'bold'}}>{I18n.t('New device ID')} - {ALIAS_PREFIX}</div>
                    <TextField
                        fullWidth
                        placeholder={I18n.t('...')}
                        label={ALIAS_PREFIX + this.state.newChannelId}
                        error={this.state.newChannelError}
                        value={this.state.newChannelId}
                        className={this.props.classes.idEdit}
                        onChange={e => this.setState({newChannelId: e.target.value.replace(FORBIDDEN_CHARS, '_'), newChannelError: !!this.props.objects[ALIAS_PREFIX + e.target.value.replace(FORBIDDEN_CHARS, '_')]})}
                        margin="normal"
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button href="" disabled={this.state.newChannelError} onClick={() => {
                    this.onCopyDevice(ALIAS_PREFIX + this.state.newChannelId, () =>
                        this.setState({showCopyDialog: false, newChannelId: ''}, () =>
                            this.handleOk(true)));

                }} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button href="" onClick={() => this.setState({showCopyDialog: false})}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>);
    }

    renderVariable(item) {
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
        const alias = this.channelId.startsWith('alias.');
        const linkeddevices = this.channelId.startsWith('linkeddevices.');
        const name = item.name;

        return (
            <div key={name} className={this.props.classes.divOidField} style={!item.id && !this.state.ids[name] ? {opacity: 0.6} : {}}>
                <div className={this.props.classes.oidName} style={item.required ? {fontWeight: 'bold'} : {}}>{(item.required ? '*' : '') + name}</div>
                <TextField
                    key={name}
                    fullWidth
                    disabled={!alias && !linkeddevices}
                    label={this.state.expertMode ? item.id || (this.channelId + '.' + name) : ''}
                    value={alias || linkeddevices ? this.state.ids[name] || '' : item.id || ''}
                    className={this.props.classes.oidField}
                    style={{paddingTop: this.state.expertMode ? undefined: 8}}
                    onChange={e => {
                        const ids = JSON.parse(JSON.stringify(this.state.ids));
                        ids[name] = e.target.value;
                        this.setState({ids});
                    }}
                    helperText={this.state.expertMode ? props.join(', ') : ''}
                    margin="normal"
                />
                {(alias || linkeddevices) ? (<Fab href="" size="small" color="secondary" title={I18n.t('Select ID')} onClick={() => {this.setState({selectIdFor: name})}} className={this.props.classes.buttonPen}><IconEdit /></Fab>) : null}
                {this.state.expertMode && alias && this.state.ids[name] ? (<Fab title={I18n.t('Edit convert functions')}  href="" color={this.fx[name] && (this.fx[name].read || this.fx[name].write) ? 'primary' : ''} style={{marginLeft: 5}} size="small" onClick={() => {this.setState({editFxFor: name})}} className={this.props.classes.buttonPen}><IconFunction /></Fab>) : null}
            </div>);
    }

    renderVariables() {
        return (<div key="vars" className={this.props.classes.divOids + ' ' + (this.state.extended ? this.props.classes.divExtended : this.props.classes.divCollapsed)}>
            {this.props.channelInfo.states.filter(item => !item.indicator && item.defaultRole).map(item => this.renderVariable(item))}
        </div>);
    }

    renderIndicators() {
        if (!this.state.extended || !this.state.extendedAvailable) {
            return null;
        }
        return (<div key="indicators" className={this.props.classes.divIndicators + ' ' + this.props.classes.divExtended}>{
            this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole).map(item => this.renderVariable(item))
        }</div>);
    }

    renderContent() {
        return [
            this.renderVariables(),
            (<div key="device" className={this.props.classes.divDevice}/>),
            this.renderIndicators()
        ];
    }

    render() {
        return [(<Dialog
                key="editDialog"
                open={true}
                maxWidth={this.state.extended && this.state.extendedAvailable ? 'xl' : 'md'}
                fullWidth={true}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle className={this.props.classes.titleBackground}
                             classes={{root: this.props.classes.titleColor}}
                             id="edit-device-dialog-title">{I18n.t('Edit device')} <b>{this.channelId}</b></DialogTitle>
                <DialogContent>
                    <div className={this.props.classes.divDialogContent}>
                        {this.renderHeader()}
                        {this.renderContent()}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button href="" onClick={() => this.handleOk()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                    <Button href="" onClick={() => this.handleClose()}>{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>),
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
