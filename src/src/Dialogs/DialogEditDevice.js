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

import I18n from '../i18n';

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
    },
    oidName: {
        width: 100,
        display: 'inline-block',
    },
    oidField: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
        width: 'calc(100% - 120px)',
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
    }
});

class DialogEditDevice extends React.Component {
    constructor(props) {
        super(props);
        this.pattern = this.props.patterns[Object.keys(this.props.patterns).find(type => this.props.patterns[type].type === this.props.channelInfo.type)];
    }
    handleOk() {
        this.props.onClose && this.props.onClose();
    };

    renderType() {
        return (<div className={this.props.classes.header}>{this.props.channelInfo.type}</div>);
    }
    renderVariable(item) {
        let props = [item.type || 'any'];
        let pattern = this.pattern.states.find(state => state.name === item.name);
        if (item.write) props.push('write');
        if (item.read) props.push('read');
        if (pattern.role) props.push('role=' + pattern.role.toString());
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

        return [
            (<div className={this.props.classes.divOidField}>
                <div className={this.props.classes.oidName} style={item.required ? {fontWeight: 'bold'} : {}}>{(item.required ? '*' : '') + item.name}</div>
                <TextField
                    key={item.name}
                    fullWidth
                    //label={(item.required ? '*' : '') + item.name}
                    value={item.id || ''}
                    className={this.props.classes.oidField}
                    helperText={props.join(', ')}
                    margin="normal"
                />
            </div>)];
    }

    renderVariables() {
        return (<div className={this.props.classes.divOids}>{
            this.props.channelInfo.states.filter(item => !item.indicator).map(item => this.renderVariable(item))
        }</div>);
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
        return (<Dialog
                open={true}
                maxWidth="l"
                fullWidth={true}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle className={this.props.classes.titleBackground}
                             classes={{root: this.props.classes.titleColor}}
                             id="edit-device-dialog-title">{I18n.t('Edit device')}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {this.renderType()}
                        {this.renderContent()}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.handleOk()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                </DialogActions>
            </Dialog>);
    }
}

DialogEditDevice.propTypes = {
    onClose: PropTypes.func,
    patterns: PropTypes.object,
    channelInfo: PropTypes.object,
    objects: PropTypes.object,
    states: PropTypes.object,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogEditDevice);
