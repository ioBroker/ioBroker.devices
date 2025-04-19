import React from 'react';

import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';

import {
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    Fab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Button,
} from '@mui/material';

import {
    Add as IconAdd,
    Check as IconCheck,
    Close as IconClose,
    Delete as IconDelete,
    DragHandle as IconDragHandle,
} from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';
const DragHandle = SortableHandle((): React.JSX.Element => <IconDragHandle style={{ cursor: 'grab' }} />);

const SortableItem = SortableElement<{
    item: { label: string; value: string };
    ownIndex: number;
    onDelete: (i: number) => void;
    onChange: (i: number, value?: string, label?: string) => void;
}>(
    (props: {
        item: { label: string; value: string };
        ownIndex: number;
        onDelete: (i: number) => void;
        onChange: (i: number, value?: string, label?: string) => void;
    }): React.JSX.Element => {
        const { item, ownIndex, onDelete, onChange } = props;
        return (
            <TableRow style={{ zIndex: 10000 }}>
                <TableCell>
                    <DragHandle />
                </TableCell>
                <TableCell
                    component="th"
                    scope="row"
                >
                    {
                        <TextField
                            variant="standard"
                            value={item.value}
                            onChange={e => onChange(ownIndex, e.target.value)}
                        />
                    }
                </TableCell>
                <TableCell align="right">
                    {
                        <TextField
                            variant="standard"
                            value={item.label}
                            onChange={e => onChange(ownIndex, undefined, e.target.value)}
                        />
                    }
                </TableCell>
                <TableCell>
                    <IconButton onClick={() => onDelete(ownIndex)}>
                        <IconDelete />
                    </IconButton>
                </TableCell>
            </TableRow>
        );
    },
);

const SortableList = SortableContainer<{
    items: { label: string; value: string }[];
    onDelete: (i: number) => void;
    onChange: (i: number, value?: string, label?: string) => void;
}>(
    (props: {
        items: { label: string; value: string }[];
        onDelete: (i: number) => void;
        onChange: (i: number, value?: string, label?: string) => void;
    }): React.JSX.Element => {
        const { items, onDelete, onChange } = props;
        return (
            <TableBody>
                {items.map((item, index) => (
                    <SortableItem
                        key={`item-${index}`}
                        index={index}
                        ownIndex={index}
                        onDelete={onDelete}
                        onChange={onChange}
                        item={item}
                    />
                ))}
            </TableBody>
        );
    },
);

interface DialogEditStatesProps {
    states: { [value: string]: string } | undefined;
    onClose: (result?: { [value: string]: string }) => void;
}

interface DialogEditStatesState {
    states: { label: string; value: string }[];
    error: boolean;
}

class DialogEditStates extends React.Component<DialogEditStatesProps, DialogEditStatesState> {
    constructor(props: DialogEditStatesProps) {
        super(props);
        this.state = {
            states: Object.keys(this.props.states || {}).map(value => ({
                label: (this.props.states || {})[value],
                value,
            })),
            error: false,
        };
    }

    onClose(): void {
        const result: { [value: string]: string } = {};
        this.state.states.forEach(item => (result[item.value] = item.label));
        this.props.onClose(result);
    }

    onDelete = (i: number): void => {
        const states: { label: string; value: string }[] = JSON.parse(JSON.stringify(this.state.states));
        states.splice(i, 1);
        this.setState({ states });
    };

    onChange = (i: number, value: string, label: string): void => {
        const states: { label: string; value: string }[] = JSON.parse(JSON.stringify(this.state.states));
        if (value !== undefined) {
            states[i].value = value;
        }
        if (label !== undefined) {
            states[i].label = label;
        }
        this.setState({ states });
    };

    onSortEnd = (props: { oldIndex: number; newIndex: number }): void => {
        const { oldIndex, newIndex } = props;
        const states: { label: string; value: string }[] = JSON.parse(JSON.stringify(this.state.states));
        const item = states[oldIndex];
        states[oldIndex] = states[newIndex];
        states[newIndex] = item;
        this.setState({ states });
    };

    render(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                onClose={(_e, reason): void => {
                    if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                        this.onClose();
                    }
                }}
            >
                <DialogTitle>{I18n.t('Edit states')}</DialogTitle>
                <DialogContent>
                    <Fab
                        size="small"
                        style={{ marginBottom: 10 }}
                        onClick={() => {
                            const states = JSON.parse(JSON.stringify(this.state.states));
                            // find max value
                            let max = states.length ? parseFloat(states[0].value) : 0;
                            for (let i = 1; i < states.length; i++) {
                                const val = parseFloat(states[i].value);
                                if (val > max) {
                                    max = val;
                                }
                            }
                            if (states.length) {
                                states.push({ value: max + 1, label: (max + 1).toString() });
                            } else {
                                states.push({ value: 0, label: '0' });
                            }
                            this.setState({ states });
                        }}
                    >
                        <IconAdd />
                    </Fab>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell />
                                    <TableCell>{I18n.t('Value')}</TableCell>
                                    <TableCell>{I18n.t('Title')}</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <SortableList
                                useDragHandle
                                items={this.state.states}
                                onSortEnd={this.onSortEnd}
                                onDelete={this.onDelete}
                                onChange={this.onChange}
                            />
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={
                            JSON.stringify(this.props.states) === JSON.stringify(this.state.states) || this.state.error
                        }
                        onClick={() => this.onClose()}
                        color="primary"
                        startIcon={<IconCheck />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.props.onClose()}
                        startIcon={<IconClose />}
                    >
                        {I18n.t('Cancel')}{' '}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogEditStates;
