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
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';


import {Types} from 'iobroker.type-detector';
import I18n from '@iobroker/adapter-react/i18n';
import {FORBIDDEN_CHARS} from '@iobroker/adapter-react/Components/Utils';
import TreeView from '../Components/TreeView';

const styles = theme => ({
    header: {
        width: '100%',
        fontSize: 16,
        textTransform: 'capitalize',
        textAlign: 'center',
        paddingBottom: 20,
        color: '#000',
    },
    treeDiv: {
        width: 'calc(50% - 22px)',
        display: 'inline-block',
        padding: 10,
        verticalAlign: 'top',
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
    }
});

const SUPPORTED_TYPES = [
    Types.light,
    Types.dimmer,
    Types.socket,
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

        while (this.props.objects[this.prefix + '.' + I18n.t('Device') + '_' + i]) {
            i++;
        }

        this.state = {
            root: this.prefix,
            name: I18n.t('Device') + ' ' + i,
            notUnique: false,
            type: window.localStorage.getItem('Devices.newType') || SUPPORTED_TYPES[0]
        };


        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        // filter aliases
        const ids = [];

        Object.keys(this.props.objects).filter(id => {
            if (id.startsWith(prefix) &&
                this.props.objects[id] &&
                this.props.objects[id].common &&
                (this.props.objects[id].type === 'channel' || this.props.objects[id].type === 'devices')) {
                // getParentId
                const parentId = getParentId(id);
                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });

        this.ids = {};

        ids.forEach(id => this.ids[id] = {
            common: {
                name: getLastPart(id),
                nondeletable: true
            },
            type: 'folder'
        });

        this.ids[this.prefix] = {
            common: {
                name: I18n.t('Root'),
                nondeletable: true
            },
            type: 'folder'
        };
    }

    generateId() {
        return `${this.state.root}.${this.state.name.replace(FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    handleOk() {
        // check if name is unique
        this.props.onClose && this.props.onClose({
            id: this.generateId(),
            type: this.state.type,
            name: this.state.name,
            prefix: this.prefix
        });
    }

    handleCancel() {
        // check if name is unique
        this.props.onClose && this.props.onClose(null);
    }

    render() {
        return (<Dialog
            open={true}
            maxWidth="md"
            fullWidth={true}
            onClose={() => this.handleOk()}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={this.props.classes.titleBackground}
                         classes={{root: this.props.classes.titleColor}}
                         id="edit-device-dialog-title">{I18n.t('Create new device')}: <b>{this.generateId()}</b></DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    <div className={this.props.classes.treeDiv}>
                        <TreeView
                            objects={this.ids}
                            selected={this.state.root}
                            onSelect={id => this.setState({root: id})}
                            root={this.prefix}
                        />
                    </div>
                    <form className={this.props.classes.nameDiv} noValidate autoComplete="off">
                        <TextField
                            label={I18n.t('Device name')}
                            error={!!this.props.objects[this.generateId()]}
                            className={this.props.classes.name}
                            value={this.state.name}
                            onChange={e => this.setState({name: e.target.value})}
                            margin="normal"
                        />
                        <br/>
                        <FormControl className={this.props.classes.type}>
                            <InputLabel htmlFor="age-helper">{I18n.t('Device type')}</InputLabel>
                            <Select
                                value={this.state.type}
                                onChange={e => {
                                    localStorage.setItem('Devices.newType', e.target.value);
                                    this.setState({type: e.target.value});
                                }}
                            >
                                {SUPPORTED_TYPES.map(type => (<MenuItem value={type}>{I18n.t('Type_' + type)}</MenuItem>))}
                            </Select>
                            {/*<FormHelperText>Some important helper text</FormHelperText>*/}
                        </FormControl>
                    </form>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => this.handleOk()} disabled={!!this.props.objects[this.generateId()]} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                <Button onClick={() => this.handleCancel()}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>);
    }
}

DialogNewDevice.propTypes = {
    onClose: PropTypes.func,
    objects: PropTypes.object,
    theme: PropTypes.string,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogNewDevice);
