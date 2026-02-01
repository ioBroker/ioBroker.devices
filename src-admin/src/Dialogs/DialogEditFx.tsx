import React, { Component } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material';
import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';
import { Clear as ClearIcon } from '@mui/icons-material';

const styles: Record<string, React.CSSProperties> = {
    divDialogContent: {
        fontSize: '1rem',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    funcDivEdit: {
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    funcEditName: {
        display: 'inline-block',
        width: 85,
    },
    funcEdit: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
        width: 'calc(100% - 85px)',
    },
};

interface DialogEditFxProps {
    socket: AdminConnection;
    fxRead: string | undefined;
    fxWrite: string | undefined;
    editFxFor: string;
    onClose: (result?: { read?: string; write?: string }) => void;
    aliasId: string | { read: string; write: string };
}

interface DialogEditFxState {
    fxRead: string;
    fxWrite: string;
    fxReadOriginal: string;
    fxWriteOriginal: string;
    editFxFor: string;
    values: Record<string, ioBroker.State | null | undefined>;
}

export default class DialogEditFx extends Component<DialogEditFxProps, DialogEditFxState> {
    constructor(props: DialogEditFxProps) {
        super(props);

        this.state = {
            fxRead: props.fxRead || '',
            fxWrite: props.fxWrite || '',
            fxReadOriginal: props.fxRead || '',
            fxWriteOriginal: props.fxWrite || '',
            editFxFor: props.editFxFor,
            values: {},
        };
    }

    async componentDidMount(): Promise<void> {
        // Read alias ID
        if (this.props.aliasId) {
            const values: Record<string, ioBroker.State | null | undefined> = {};
            values[this.props.editFxFor] = await this.props.socket.getState(this.props.editFxFor);
            await this.props.socket.subscribeState(this.props.editFxFor, this.onStateChange);

            if (typeof this.props.aliasId !== 'string') {
                if (this.props.aliasId.read) {
                    values[this.props.aliasId.read] = await this.props.socket.getState(this.props.aliasId.read);
                    await this.props.socket.subscribeState(this.props.aliasId.read, this.onStateChange);
                }
            } else {
                values[this.props.aliasId] = await this.props.socket.getState(this.props.aliasId);
                await this.props.socket.subscribeState(this.props.aliasId, this.onStateChange);
            }
            this.setState({ values });
        }
    }

    componentWillUnmount(): void {
        // Unsubscribe from all states
        if (typeof this.props.aliasId !== 'string') {
            if (this.props.aliasId.read) {
                this.props.socket.unsubscribeState(this.props.aliasId.read, this.onStateChange);
            }
        } else {
            this.props.socket.unsubscribeState(this.props.aliasId, this.onStateChange);
        }
        this.props.socket.unsubscribeState(this.props.editFxFor, this.onStateChange);
    }

    onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        const values = { ...this.state.values };
        if (state) {
            values[id] = state;
        } else {
            delete values[id];
        }
        this.setState({ values });
    };

    render(): React.JSX.Element {
        const readId = typeof this.props.aliasId === 'string' ? this.props.aliasId : this.props.aliasId.read;

        let readVal: string | undefined = undefined;
        let writeVal: string | undefined = undefined;

        if (this.state.fxRead) {
            try {
                if (this.state.values[readId]) {
                    // eslint-disable-next-line no-new-func
                    const readValFunc = new Function('val', `return ${this.state.fxRead}`);
                    readVal = readValFunc(this.state.values[readId].val);
                } else {
                    readVal = '--';
                }
            } catch {
                // ignore
            }
        } else {
            const value = this.state.values[readId]?.val;
            if (value === null || value === undefined) {
                readVal = '--';
            } else {
                readVal = value.toString();
            }
        }
        if (this.state.fxWrite) {
            try {
                const value = this.state.values[this.props.editFxFor];
                if (value) {
                    // eslint-disable-next-line no-new-func
                    const writeValFunc = new Function('val', `return ${this.state.fxWrite}`);
                    writeVal = writeValFunc(value.val);
                } else {
                    writeVal = '--';
                }
            } catch {
                // ignore
            }
        } else {
            const value = this.state.values[this.props.editFxFor]?.val;
            if (value === null || value === undefined) {
                writeVal = '--';
            } else {
                writeVal = value.toString();
            }
        }

        return (
            <Dialog
                open={!0}
                key="editFxDialog"
                maxWidth="sm"
                onClose={() => this.props.onClose()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="edit-device-dialog-title">
                    {I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b>
                </DialogTitle>
                <DialogContent>
                    <div style={styles.divDialogContent}>
                        {this.props.fxRead !== undefined ? (
                            <div style={styles.funcDivEdit}>
                                <div style={{ ...styles.funcEditName, fontWeight: 'bold' }}>
                                    {I18n.t('Read function')}
                                </div>
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            endAdornment: this.state.fxRead ? (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => this.setState({ fxRead: '' })}
                                                >
                                                    <ClearIcon />
                                                </IconButton>
                                            ) : null,
                                        },
                                    }}
                                    value={this.state.fxRead}
                                    style={styles.funcEdit}
                                    onChange={e => this.setState({ fxRead: e.target.value })}
                                    helperText={`${I18n.t('JS function like')} "val / 5 + 21"`}
                                    margin="normal"
                                />
                            </div>
                        ) : null}
                        {this.props.fxRead !== undefined && this.state.values[readId] ? (
                            <div style={{ fontSize: 'smaller', opacity: 0.7, width: '100%' }}>
                                <span style={{ marginRight: 8 }}>{I18n.t('Execution')}:</span>
                                {this.state.values[readId].val} → {readVal}
                            </div>
                        ) : null}
                        {this.props.fxWrite !== undefined ? (
                            <div style={{ ...styles.funcDivEdit, marginTop: 20 }}>
                                <div style={{ ...styles.funcEditName, fontWeight: 'bold' }}>
                                    {I18n.t('Write function')}
                                </div>
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            endAdornment: this.state.fxWrite ? (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => this.setState({ fxWrite: '' })}
                                                >
                                                    <ClearIcon />
                                                </IconButton>
                                            ) : null,
                                        },
                                    }}
                                    value={this.state.fxWrite}
                                    helperText={`${I18n.t('JS function like')} "(val - 21) * 5"`}
                                    style={styles.funcEdit}
                                    onChange={e => this.setState({ fxWrite: e.target.value })}
                                    margin="normal"
                                />
                            </div>
                        ) : null}
                        {this.props.fxWrite !== undefined && this.state.values[this.props.editFxFor] ? (
                            <div style={{ fontSize: 'smaller', opacity: 0.7, width: '100%' }}>
                                <span style={{ marginRight: 8 }}>{I18n.t('Execution')}:</span>
                                {this.state.values[this.props.editFxFor]!.val} → {writeVal}
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={
                            this.state.fxRead === this.state.fxReadOriginal &&
                            this.state.fxWrite === this.state.fxWriteOriginal
                        }
                        onClick={() => {
                            const result: { read?: string; write?: string } = {};
                            if (this.props.fxRead !== undefined) {
                                result.read = this.state.fxRead;
                            }
                            if (this.props.fxWrite !== undefined) {
                                result.write = this.state.fxWrite;
                            }
                            this.props.onClose(result);
                        }}
                        color="primary"
                        autoFocus
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.props.onClose()}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
