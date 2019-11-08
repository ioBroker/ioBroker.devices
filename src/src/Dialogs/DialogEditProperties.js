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
import Switch from '@material-ui/core/Switch';
import ImageSelector from '../Components/ImageSelector';
import TypeIcon from '../Components/TypeIcon';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';

const styles = theme => ({
    header: {
        width: '100%',
        fontSize: 16,
        fontWeight: 'bold',
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
        marginLeft: 5,
        '&>div': {
            width: '100%'
        }
    },
    divOids: {
        display: 'inline-block',
        width: '100%',
        verticalAlign: 'top',
    },
    divDevice: {
        color: theme.palette.type === 'light' ? 'black' : 'white',
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
        color: '#ffffff',
    },
    headerButtons: {
        textAlign: 'right'
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
    tableIconImg: {
        marginTop: 4,
        marginLeft: 4,
        width: 32,
        height: 32,
        color: '#888'
    },
    disableSwitch: {
        '& .Mui-checked .MuiSwitch-thumb': {
            background: '#ffb3ce'
        }
    },
    disableSwitchLabel: {
        '& .MuiFormControlLabel-label': {
            fontSize: '0.75rem',
            opacity: 0.6,
        }
    }
});

class DialogEditProperties extends React.Component {
    constructor(props) {
        super(props);

        let name = '';
        const channelObj = this.props.objects[this.props.channelId];

        if (channelObj && channelObj.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, {language: I18n.getLanguage()});
        }

        const functions = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.functions.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.indexOf(this.props.channelId) !== -1;
        });

        const rooms = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.rooms.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.indexOf(this.props.channelId) !== -1;
        });

        // ;common.custom[adapter.namespace].smartName
        let smartName = this.getSmartName(channelObj);

        this.state = {
            color: channelObj && channelObj.common && channelObj.common.color,
            icon: channelObj && channelObj.common && channelObj.common.icon,
            functions,
            rooms,
            name,
            smartName,
        };
    }

    handleClose() {
        this.props.onClose && this.props.onClose();
    }

    handleOk() {
        this.props.onClose && this.props.onClose({
            rooms: this.state.rooms,
            functions: this.state.functions,
            name: this.state.name,
            icon: this.state.icon,
            color: this.state.color,
            smartName: this.state.smartName,
        });
    };

    renderHeader() {
        const classes = this.props.classes;
        return (<div className={classes.header}>
            <TypeIcon type={this.props.type} className={classes.tableIconImg}/>
            {this.props.type}
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

    getSmartName(obj, language) {
        language = language || I18n.getLanguage();
        let smartName;
        if (obj &&
            obj.common &&
            obj.common.custom) {
            if (this.props.iotNoCommon) {
                const iot = this.props.iot || 'iot.0';
                if (obj.common.custom[iot] && obj.common.custom[iot].smartName) {
                    smartName = obj.common.custom[iot].smartName;
                }
            } else {
                smartName = obj.common.smartName;
            }
        }

        if (smartName && typeof smartName === 'object') {
            smartName = smartName[language] || smartName.en || '';
        }
        return smartName || '';
    }

    showEnumIcon(name) {
        const obj = this.props.objects[this.state[name]];
        if (obj && obj.common && obj.common.icon) {
            return (<img className={this.props.classes.icon} src={obj.icon} alt=""/>);
        } else {
            return null;
        }
    }

    handleIcon(file) {
        const newValue = typeof file === 'object' ? file.data : file;

        //newValue.changed = this.isChanged(name, newValue.values[name]);
        this.setState({icon: newValue});
    }

    renderProperties() {
        const classes = this.props.classes;
        return (
            <div className={classes.divOids}>
                <div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Name')}</div>
                    <TextField
                        key="_name"
                        fullWidth
                        value={this.state.name}
                        className={classes.oidField}
                        onChange={e => this.setState({name: e.target.value})}
                        margin="normal"
                    />
                </div>
                <div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Disable smart')}</div>
                    <FormControlLabel
                        className={classes.disableSwitchLabel}
                        control={
                            <Switch
                                className={classes.disableSwitch}
                                checked={this.state.smartName === false}
                                color="secondary"
                                onChange={e => this.setState({smartName: e.target.checked ? false : ''})}
                            />
                        }
                        label={I18n.t('Hide this name from smart assistance')}
                    />
                </div>
                {this.state.smartName !== false ? (<div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Smart name')}</div>
                    <TextField
                        key="_smartName"
                        fullWidth
                        placeholder={this.state.name.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ')}
                        value={this.state.smartName}
                        className={classes.oidField}
                        helperText={I18n.t('This name will use be in smart assistance. (optional)')}
                        onChange={e => this.setState({smartName: e.target.value.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ')})}
                        margin="normal"
                    />
                </div>) : null}
                <div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Function')}</div>
                    {this.renderSelectEnum('functions')}
                    {this.showEnumIcon('functions')}
                </div>
                <div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Room')}</div>
                    {this.renderSelectEnum('rooms')}
                    {this.showEnumIcon('rooms')}
               </div>
               <div className={classes.divOidField}>
                    <div className={classes.oidName} style={{fontWeight: 'bold'}}>{I18n.t('Color')}</div>
                    <TextField
                        key="_color"
                        fullWidth
                        value={this.state.color}
                        style={{width: 'calc(100% - 185px)'}}
                        onChange={e => this.setState({color: e.target.value})}
                        margin="normal"
                    />
                    <TextField
                        key="_color1"
                        type="color"
                        style={{width: 40, marginTop: 16}}
                        value={this.state.color}
                        className={classes.oidField + ' ' + classes.colorButton}
                        onChange={e => this.setState({color: e.target.value})}
                        margin="normal"
                    />
                </div>
                <ImageSelector
                    maxSize={15000}
                    icons={true}
                    aspect={1}
                    height={64}
                    accept={'image/jpeg, image/png, image/gif, image/svg+xml'}
                    label={I18n.t('Icon')}
                    image={this.state.icon}
                    maxHeight={200}
                    onUpload={file => this.handleIcon(file)}
                    textAccepted={I18n.t('All files will be accepted')}
                    textRejected={I18n.t('Some files will be rejected')}
                    textWaiting={I18n.t('Drop some files here or click...')}
                />
            </div>
        );
    }

    render() {
        return (
            <Dialog
                open={true}
                maxWidth="sm"
                fullWidth={true}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle className={this.props.classes.titleBackground}
                             classes={{root: this.props.classes.titleColor}}
                             id="edit-device-dialog-title">{I18n.t('Edit device')} <b>{this.props.channelId}</b></DialogTitle>
                <DialogContent>
                    <div className={this.props.classes.divDialogContent}>
                        {this.renderHeader()}
                        {this.renderProperties()}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button href="" onClick={() => this.handleOk()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                    <Button href="" onClick={() => this.handleClose()}>{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogEditProperties.propTypes = {
    onClose: PropTypes.func,
    type: PropTypes.string,
    iot: PropTypes.string,
    iotNoCommon: PropTypes.bool,
    channelId: PropTypes.string,
    objects: PropTypes.object,
    enumIDs: PropTypes.array,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogEditProperties);
