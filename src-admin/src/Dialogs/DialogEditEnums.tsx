/**
 * Copyright 2020-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';

import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItemSecondaryAction,
    ListItemIcon,
    ListItemText,
    Checkbox,
    ListItemButton,
} from '@mui/material';

import { I18n, Utils, Icon } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
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

interface DialogEditEnumsProps {
    onClose: (values: string[] | null) => void;
    deviceName: string;
    objects: Record<string, ioBroker.Object>;
    enumIDs: string[];
    values?: string[];
}

interface DialogEditEnumsState {
    values: string[];
}

class DialogEditEnums extends React.Component<DialogEditEnumsProps, DialogEditEnumsState> {
    constructor(props: DialogEditEnumsProps) {
        super(props);
        this.state = {
            values: this.props.values ? this.props.values.slice() : [], // copy array
        };
    }

    handleClose(): void {
        this.props.onClose(null);
    }

    handleOk(): void {
        this.props.onClose(this.state.values);
    }

    onToggle(id: string): void {
        const values = this.state.values.slice();
        const pos = values.indexOf(id);
        if (pos === -1) {
            values.push(id);
        } else {
            values.splice(pos, 1);
        }
        this.setState({ values });
    }

    renderSelectEnum(): React.JSX.Element {
        const enums = this.props.enumIDs;
        const language = I18n.getLanguage();
        const objs = enums.map(id => ({
            name: Utils.getObjectName(this.props.objects, id, language),
            icon: Utils.getObjectIcon(id, this.props.objects[id]),
            id,
        }));

        return (
            <List>
                {objs.map(obj => (
                    <ListItemButton
                        key={obj.id}
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
                    </ListItemButton>
                ))}
            </List>
        );
    }

    render(): React.JSX.Element {
        return (
            <Dialog
                key="enumDialog"
                open={!0}
                maxWidth={'sm'}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="edit-device-dialog-title">
                    {I18n.t('Edit enums')} <b>{this.props.deviceName}</b>
                </DialogTitle>
                <DialogContent>
                    <div style={styles.divDialogContent}>{this.renderSelectEnum()}</div>
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

export default DialogEditEnums;
