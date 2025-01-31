/**
 * Copyright 2020-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';

import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemIcon,
    ListItemText,
    Checkbox,
} from '@mui/material';

import { I18n, Utils, Icon } from '@iobroker/adapter-react-v5';

const styles = {
    header: {
        width: '100%',
        fontSize: 16,
        textTransform: 'capitalize',
        textAlign: 'center',
        paddingBottom: 20,
        color: '#000',
    },
    divDialogContent: {
        fontSize: '1rem',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    enumIcon: {
        width: 24,
        height: 24,
    },
};

class DialogEditEnums extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            values: this.props.values ? this.props.values.slice() : [], // copy array
        };
    }

    handleClose() {
        this.props.onClose && this.props.onClose(null);
    }

    handleOk(isRefresh) {
        this.props.onClose && this.props.onClose(this.state.values);
    }

    renderHeader() {
        return null;
    }

    onToggle(id) {
        const values = this.state.values.slice();
        const pos = values.indexOf(id);
        if (pos === -1) {
            values.push(id);
        } else {
            values.splice(pos, 1);
        }
        this.setState({ values });
    }

    renderSelectEnum() {
        const enums = this.props.enumIDs;
        const language = I18n.getLanguage();
        const objs = enums.map(id => ({
            name: Utils.getObjectName(this.props.objects, id, { language }),
            icon: Utils.getObjectIcon(id, this.props.objects[id]),
            id,
        }));

        return (
            <List style={styles.list}>
                {objs.map(obj => (
                    <ListItem
                        key={obj.id}
                        button
                        onClick={() => this.onToggle(obj.id)}
                    >
                        <ListItemIcon>
                            {obj.icon ? (
                                <Icon
                                    style={styles.enumIcon}
                                    src={obj.icon}
                                    alt={obj.id}
                                />
                            ) : (
                                <div style={styles.enumIcon} />
                            )}
                        </ListItemIcon>
                        <ListItemText primary={obj.name} />
                        <ListItemSecondaryAction>
                            <Checkbox
                                edge="end"
                                onChange={() => this.onToggle(obj.id)}
                                checked={this.state.values.includes(obj.id)}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        );
    }

    render() {
        return (
            <Dialog
                key="enumDialog"
                open={!0}
                maxWidth={'sm'}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle
                    style={styles.titleBackground}
                    classes={{ root: this.props.classes.titleColor }}
                    id="edit-device-dialog-title"
                >
                    {I18n.t('Edit enums')} <b>{this.props.deviceName}</b>
                </DialogTitle>
                <DialogContent>
                    <div style={styles.divDialogContent}>
                        {this.renderHeader()}
                        {this.renderSelectEnum()}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => this.handleOk()}
                        color="primary"
                        autoFocus
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.handleClose()}
                        color="grey"
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogEditEnums.propTypes = {
    onClose: PropTypes.func,
    deviceName: PropTypes.string,
    objects: PropTypes.object,
    enumIDs: PropTypes.array,
    values: PropTypes.array,
};

export default DialogEditEnums;
