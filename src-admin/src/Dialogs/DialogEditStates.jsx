import React from 'react';
import PropTypes from 'prop-types';

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
const DragHandle = SortableHandle(() => <IconDragHandle style={{ cursor: 'grab' }} />);

const SortableItem = SortableElement(({ item, ownIndex, onDelete, onChange }) => (
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
));

const SortableList = SortableContainer(({ items, onDelete, onChange }) => {
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
});

class DialogEditStates extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            states: Object.keys(this.props.states || {}).map(value => ({ label: this.props.states[value], value })),
            error: false,
        };
    }

    onClose() {
        const result = {};
        this.state.states.forEach(item => (result[item.value] = item.label));
        this.props.onClose(result);
    }

    onDelete = i => {
        const states = JSON.parse(JSON.stringify(this.state.states));
        states.splice(i, 1);
        this.setState({ states });
    };

    onChange = (i, value, label) => {
        const states = JSON.parse(JSON.stringify(this.state.states));
        if (value !== undefined) {
            states[i].value = value;
        }
        if (label !== undefined) {
            states[i].label = label;
        }
        this.setState({ states });
    };

    onSortEnd = ({ oldIndex, newIndex }) => {
        const states = JSON.parse(JSON.stringify(this.state.states));
        const item = states[oldIndex];
        states[oldIndex] = states[newIndex];
        states[newIndex] = item;
        this.setState({ states });
    };

    render() {
        return (
            <Dialog
                open={!0}
                disableBackdropClick
                disableEscapeKeyDown
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
                        <Table
                            className={this.props.classes.table}
                            aria-label="simple table"
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell />
                                    <TableCell>Value</TableCell>
                                    <TableCell>Title</TableCell>
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

DialogEditStates.propTypes = {
    states: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default DialogEditStates;
