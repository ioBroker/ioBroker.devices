/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Switch from '@material-ui/core/Switch';
import TypeIcon from '../Components/TypeIcon';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';
import Icon from '@iobroker/adapter-react/Components/Icon';

import UploadImage from '../Components/UploadImage';

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
        display: 'block',
        paddingTop: 7,
        paddingBottom: 7,
    },
    oidName: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    oidField: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
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
    },
    sizeDropZone: {
        height: 200,
        maxWidth: 500,
    }
});

class DialogEditProperties extends React.PureComponent {
    constructor(props) {
        super(props);

        let name = '';
        const channelObj = this.props.objects[this.props.channelId];

        if (channelObj && channelObj.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, { language: I18n.getLanguage() }) === 'undefined' ? channelObj.common.name[Object.keys(channelObj.common.name)[0]] : Utils.getObjectNameFromObj(channelObj, null, { language: I18n.getLanguage() });
        }

        const functions = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.functions.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.includes(this.props.channelId);
        });

        const rooms = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.rooms.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj && obj.common && obj.common.members && obj.common.members.includes(this.props.channelId);
        });

        // ;common.custom[adapter.namespace].smartName
        let smartName = this.getSmartName(channelObj);

        this.state = Object.keys(this.props.changeProperties).length ? this.props.changeProperties : {
            color: channelObj && channelObj.common && channelObj.common.color,
            icon: channelObj && channelObj.common && channelObj.common.icon,
            functions,
            rooms,
            name,
            initName: name,
            smartName,
        };
    }

    componentDidMount() {
        if (!Object.keys(this.props.changeProperties).length) {
            this.props.onChange(this.state, this.state);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
            this.props.onChange(this.state, false, this.checkedName());
        }
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
    }

    renderHeader() {
        const classes = this.props.classes;
        return <div className={classes.header}>
            <TypeIcon type={this.props.type} className={classes.tableIconImg} />
            {this.props.type}
        </div>;
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
                name: Utils.getObjectName(this.props.objects, id, { language }),
                icon: Utils.getObjectIcon(id, this.props.objects[id]),
                id: id
            }
        });
        return <Select
            className={this.props.classes.oidField}
            value={this.state[name]}
            fullWidth
            multiple
            renderValue={arrId => {
                const newArr = arrId.map(id => {
                    return {
                        name: Utils.getObjectName(this.props.objects, id, { language }),
                        icon: Utils.getObjectIcon(id, this.props.objects[id]),
                        id: id
                    }
                });

                return <div className={this.props.classes.renderValueWrapper}>
                    {newArr.map(obj => <div className={this.props.classes.renderValueCurrent} key={`${obj.id}-render`}>
                        {obj.icon ? <Icon className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} /> : <div className={this.props.classes.enumIcon} />}
                        {obj.name}
                    </div>)}
                </div>
            }}
            onChange={e => {
                this.setState({ [name]: e.target.value })
            }}
        >
            {objs.map(obj => <MenuItem key={obj.id} icon={obj.icon} value={obj.id}>
                {obj.icon ? <Icon className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} /> : <div className={this.props.classes.enumIcon} />}
                {obj.name}
            </MenuItem>)}
        </Select>;
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

    handleIcon(file) {
        const newValue = typeof file === 'object' ? file.data : file;

        //newValue.changed = this.isChanged(name, newValue.values[name]);
        this.setState({ icon: newValue });
    }

    checkedName = () => {
        if (!this.state.name) {
            return true;
        } else if (this.state.name === this.state.initName) {
            return false;
        }
        let parts = this.props.channelId.split('.');
        parts.pop();
        parts = parts.join('.');
        parts = `${parts}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
        return this.props.objects[parts];
    }

    renderProperties() {
        const classes = this.props.classes;
        return <div className={classes.divOids}>
            <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Name')}</div>
                <TextField
                    key="_name"
                    fullWidth
                    value={this.state.name}
                    error={this.checkedName()}
                    className={classes.oidField}
                    onChange={e => this.setState({ name: e.target.value })}
                    margin="normal"
                />
            </div>
            <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Disable smart')}</div>
                <FormControlLabel
                    className={classes.disableSwitchLabel}
                    control={
                        <Switch
                            className={classes.disableSwitch}
                            checked={this.state.smartName === false}
                            color="secondary"
                            onChange={e => this.setState({ smartName: e.target.checked ? false : '' })}
                        />
                    }
                    label={I18n.t('Hide this name from smart assistance')}
                />
            </div>
            {this.state.smartName !== false ? <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Smart name')}</div>
                <TextField
                    key="_smartName"
                    fullWidth
                    placeholder={this.state.name.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ')}
                    value={this.state.smartName}
                    className={classes.oidField}
                    helperText={I18n.t('This name will use be in smart assistance. (optional)')}
                    onChange={e => this.setState({ smartName: e.target.value.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ') })}
                    margin="normal"
                />
            </div> : null}
            <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Function')}</div>
                {this.renderSelectEnum('functions')}
            </div>
            <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Room')}</div>
                {this.renderSelectEnum('rooms')}
            </div>
            <div className={classes.divOidField}>
                <div className={classes.oidName} >{I18n.t('Color')}</div>
                <TextField
                    key="_color"
                    fullWidth
                    value={this.state.color}
                    style={{ width: 'calc(100% - 185px)' }}
                    onChange={e => this.setState({ color: e.target.value })}
                />
                <TextField
                    key="_color1"
                    type="color"
                    style={{ width: 40 }}
                    value={this.state.color}
                    className={classes.oidField + ' ' + classes.colorButton}
                    onChange={e => this.setState({ color: e.target.value })}
                    margin="normal"
                />
            </div>
            <UploadImage
                crop
                icons
                className={classes.sizeDropZone}
                maxSize={256 * 1024}
                icon={this.state.icon}
                removeIconFunc={() => this.setState({ icon: '' })}
                onChange={(base64) => this.setState({ icon: base64 })}
                t={I18n.t}
            />
        </div>;
    }

    render() {
        return <div className={this.props.classes.divDialogContent}>
            {this.renderProperties()}
        </div>
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
