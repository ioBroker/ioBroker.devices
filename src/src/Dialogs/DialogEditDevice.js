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
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Fab from '@material-ui/core/Fab';

import {MdEdit as IconEdit} from 'react-icons/md';
import {MdKeyboardArrowUp as IconUp} from 'react-icons/md';

import {MdKeyboardArrowDown as IconDown} from 'react-icons/md';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';

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
        width: 'calc(100% - 150px)',
    },
    divOids: {
        display: 'inline-block',
        width: 'calc(50% - 55px)',
        verticalAlign: 'top',
    },
    divDevice: {
        display: 'inline-block',
        width: 100,
        verticalAlign: 'top',
    },
    divIndicators: {
        display: 'inline-block',
        width: 'calc(50% - 55px)',
        verticalAlign: 'top',
    },
    divDialogContent: {
        fontSize: '1rem',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
    },
    buttonPen: {
        color: '#ffffff'
    },
    headerButtons: {
        textAlign: 'right'
    },
    enumIcon: {
        width: 24,
        height: 24
    }
});

class DialogEditDevice extends React.Component {
    constructor(props) {
        super(props);
        const ids = {};
        let channel;


        const functions = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.functions.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.indexOf(this.channelId) !== -1;
        });
        const rooms = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.rooms.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.indexOf(this.channelId) !== -1;
        });

        this.props.channelInfo.states.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj && obj.common && obj.common.alias) {
                    ids[state.name] = obj.common.alias.id || '';
                }
                if (!channel) {
                    const parts = state.id.split('.');
                    parts.pop();
                    channel = parts.join('.');
                }
            }
        });

        this.channelId = channel;
        let name = '';
        const channelObj = this.props.objects[this.channelId];

        if (channelObj && channelObj.common) {
            name = channelObj.common.name || '';
        }

        this.state = {
            ids,
            functions,
            rooms,
            name,
            selectIdFor: '',
            nameOpened: window.localStorage.getItem('Devices.nameOpened') === 'true'
        };

        this.pattern = this.props.patterns[Object.keys(this.props.patterns)
            .find(type => this.props.patterns[type].type === this.props.channelInfo.type)];
    }

    renderSelectDialog() {
        if (!this.state.selectIdFor) {
            return null;
        }
        return (<DialogSelectID
            connection={this.props.socket}
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
        this.props.onClose && this.props.onClose();
    }

    handleOk() {
        this.props.onClose && this.props.onClose({
            rooms: this.state.rooms,
            functions: this.state.functions,
            ids:  this.state.ids,
            name: this.state.name
        });
    };

    renderHeader() {
        const classes = this.props.classes;
        return (<div className={classes.header}>
            <div className={classes.divOids + ' ' + classes.headerButtons}>
                <Fab href="" size="small" title={I18n.t('Hide/Show enums')} onClick={() => {
                    this.setState({nameOpened: !this.state.nameOpened});
                    window.localStorage.setItem('Devices.nameOpened', this.state.nameOpened ? 'false' : 'true')
                }} className={classes.buttonPen}>{this.state.nameOpened ? (<IconUp />): (<IconDown />)}</Fab>
            </div>
            <div className={classes.divDevice}>{this.props.channelInfo.type}</div>
            <div className={classes.divIndicators}></div>

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

    renderVariable(item) {
        let props = [item.type || 'any'];
        let pattern = this.pattern.states.find(state => state.name === item.name);
        if (item.write) props.push('write');
        if (item.read) props.push('read');
		if (pattern.defaultRole) {
			props.push('role=' + pattern.defaultRole);
		} else {
			if (pattern.role) props.push('role=' + pattern.role.toString());
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
        const name = item.name;

        return (
            <div className={this.props.classes.divOidField} style={!item.id && !this.state.ids[name] ? {opacity: 0.6} : {}}>
                <div className={this.props.classes.oidName} style={item.required ? {fontWeight: 'bold'} : {}}>{(item.required ? '*' : '') + name}</div>
                <TextField
                    key={name}
                    fullWidth
                    disabled={!alias}
                    label={item.id || (this.channelId + '.' + name)}
                    value={alias ? this.state.ids[name] || '' : item.id || ''}
                    className={this.props.classes.oidField}
                    onChange={e => {
                        const ids = JSON.parse(JSON.stringify(this.state.ids));
                        ids[name] = e.target.value;
                        this.setState({ids});
                    }}
                    helperText={props.join(', ')}
                    margin="normal"
                />
                {alias ? (<Fab href="" size="small" color="secondary" onClick={() => {this.setState({selectIdFor: name})}} className={this.props.classes.buttonPen}><IconEdit /></Fab>) : null}
            </div>);
    }

    renderVariables() {
        return (<div className={this.props.classes.divOids}>
            {this.state.nameOpened ?
                (<div className={this.props.classes.divOidField}>
                    <div className={this.props.classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Name')}</div>
                    <TextField
                        key="_name"
                        fullWidth
                        value={this.state.name}
                        className={this.props.classes.oidField}
                        onChange={e => this.setState({name: e.target.value})}
                        margin="normal"
                    />
                </div>) : null}
            {this.state.nameOpened ?
                (<div className={this.props.classes.divOidField}>
                    <div className={this.props.classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Function')}</div>
                    {this.renderSelectEnum('functions')}
                </div>) : null}
            {this.state.nameOpened ?
                (<div className={this.props.classes.divOidField}>
                    <div className={this.props.classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Room')}</div>
                    {this.renderSelectEnum('rooms')}
               </div>): null}
            {this.props.channelInfo.states.filter(item => !item.indicator).map(item => this.renderVariable(item))}
        </div>);
    }

    renderIndicators() {
        return (<div className={this.props.classes.divIndicators}>{
            this.props.channelInfo.states.filter(item => item.indicator).map(item => this.renderVariable(item))
        }</div>);
    }

    renderContent() {
        return [
            this.renderVariables(),
            (<div className={this.props.classes.divDevice}/>),
            this.renderIndicators()
        ];
    }

    render() {
        return [(<Dialog
                open={true}
                maxWidth="l"
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
            this.renderSelectDialog()
        ];
    }
}

DialogEditDevice.propTypes = {
    onClose: PropTypes.func,
    patterns: PropTypes.object,
    channelInfo: PropTypes.object,
    objects: PropTypes.object,
    enumIDs: PropTypes.object,
    states: PropTypes.object,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogEditDevice);
