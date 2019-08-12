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

import I18n from '@iobroker/adapter-react/i18n';
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
        width: '50%',
        display: 'inline-block',
    },
    nameDiv: {
        width: '50%',
        display: 'inline-block',
    },
    viewDiv: {
        width: '50%',
        display: 'inline-block',
    },
});

class DialogNewDevice extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            root: ''
        };

        // filter aliases
        const ids = Object.keys(this.props.objects).filter(id => id.startsWith('alias.'));
        this.ids = {
            'alias.0': {
                common: {
                    name: I18n.t('Root'),
                    nondeletable: true
                },
                type: 'folder'
            }
        };
        ids.forEach(id => this.ids[id] = this.props.objects[id]);
    }

    handleOk() {
        this.props.onClose && this.props.onClose();
    };

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
                         id="edit-device-dialog-title">{I18n.t('Create new device')}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    <div className={this.props.classes.treeDiv}>
                        <TreeView
                            ids={this.ids}
                            selected={this.state.root}
                            onSelect={id => this.setState({root: id})}
                            root="alias.0"
                        />
                    </div>
                    <form className={this.props.classes.nameDiv} noValidate autoComplete="off">
                        <TextField
                            label={I18n.t('Device name')}
                            className={this.props.classes.name}
                            value={this.state.name}
                            onChange={e => this.setState({name: e.target.value})}
                            margin="normal"
                        />
                    </form>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => this.handleOk()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
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
