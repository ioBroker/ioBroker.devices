import React from 'react';

import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

import { I18n } from '@iobroker/gui-components';

function SortableItem(props: {
    id: string;
    item: { label: string; value: string };
    ownIndex: number;
    onDelete: (i: number) => void;
    onChange: (i: number, value?: string, label?: string) => void;
}): React.JSX.Element {
    const { item, ownIndex, onDelete, onChange } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10000 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            {...attributes}
        >
            <TableCell>
                <IconDragHandle
                    style={{ cursor: 'grab' }}
                    {...listeners}
                />
            </TableCell>
            <TableCell
                component="th"
                scope="row"
            >
                <TextField
                    variant="standard"
                    value={item.value}
                    onChange={e => onChange(ownIndex, e.target.value)}
                />
            </TableCell>
            <TableCell align="right">
                <TextField
                    variant="standard"
                    value={item.label}
                    onChange={e => onChange(ownIndex, undefined, e.target.value)}
                />
            </TableCell>
            <TableCell>
                <IconButton onClick={() => onDelete(ownIndex)}>
                    <IconDelete />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

function SortableList(props: {
    items: { label: string; value: string }[];
    onSortEnd: (args: { oldIndex: number; newIndex: number }) => void;
    onDelete: (i: number) => void;
    onChange: (i: number, value?: string, label?: string) => void;
}): React.JSX.Element {
    const { items, onSortEnd, onDelete, onChange } = props;

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    const itemIds = items.map((_item, index) => `item-${index}`);

    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = itemIds.indexOf(active.id as string);
            const newIndex = itemIds.indexOf(over.id as string);
            onSortEnd({ oldIndex, newIndex });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={itemIds}
                strategy={verticalListSortingStrategy}
            >
                <TableBody>
                    {items.map((item, index) => (
                        <SortableItem
                            key={`item-${index}`}
                            id={`item-${index}`}
                            ownIndex={index}
                            onDelete={onDelete}
                            onChange={onChange}
                            item={item}
                        />
                    ))}
                </TableBody>
            </SortableContext>
        </DndContext>
    );
}

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

    /**
     * The dialog edits a list of rows, the caller hands in and expects a map — this is the single
     * place that converts back, so the OK button can compare like with like.
     */
    private toStates(): { [value: string]: string } {
        const result: { [value: string]: string } = {};
        this.state.states.forEach(item => (result[item.value] = item.label));
        return result;
    }

    onClose(): void {
        this.props.onClose(this.toStates());
    }

    onDelete = (i: number): void => {
        const states: { label: string; value: string }[] = JSON.parse(JSON.stringify(this.state.states));
        states.splice(i, 1);
        this.setState({ states });
    };

    onChange = (i: number, value?: string, label?: string): void => {
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
        // Move the row to its new place instead of trading it with whatever sits there: dragging
        // across several rows would otherwise shuffle the ones in between.
        const [item] = states.splice(oldIndex, 1);
        states.splice(newIndex, 0, item);
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
                            const states: { label: string; value: string }[] = JSON.parse(
                                JSON.stringify(this.state.states),
                            );
                            // Continue the numbering after the highest value there is. The values
                            // may well be plain text — a thermostat's modes, for instance — and
                            // then there is nothing to count on: starting from `states[0]` made
                            // `max` NaN, every later comparison false, and the new row arrived as
                            // {value: NaN, label: 'NaN'}. Values that are not numbers are skipped
                            // instead, and the value is written as the string the type asks for.
                            let max = -1;
                            for (const state of states) {
                                const val = parseFloat(state.value);
                                if (!isNaN(val) && val > max) {
                                    max = val;
                                }
                            }
                            const next = (max + 1).toString();
                            states.push({ value: next, label: next });
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
                            JSON.stringify(this.props.states || {}) === JSON.stringify(this.toStates()) ||
                            this.state.error
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
