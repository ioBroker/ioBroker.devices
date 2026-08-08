import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Close, Visibility, VisibilityOff, TouchApp } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import type { CategoryInfo, WidgetInfo, WidgetSettingsBase } from '../../../packages/dm-widgets/src/index';
import type { AclLevel, WmAcl } from './acl';
import { loadAclSubjects, type AclSubjectOption } from './AclEditor';
import type { CategorySettings } from './CategorySettingsDialog';
import type StateContext from './StateContext';

interface AclMatrixDialogProps {
    open: boolean;
    onClose: () => void;
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    categorySettings: Record<string, CategorySettings>;
    widgetSettings: Record<string, WidgetSettingsBase>;
    /** Persist the rules of one node; `acl` undefined clears them */
    onChange: (kind: 'category' | 'widget', id: string, acl: WmAcl | undefined) => void;
    stateContext: StateContext;
    getCategoryName: (category: CategoryInfo) => string;
    rootCategory: string;
}

const LEVELS: { value: AclLevel; label: string; icon: React.JSX.Element }[] = [
    { value: 'hidden', label: 'wm_acl_hidden', icon: <VisibilityOff sx={{ fontSize: 16 }} /> },
    { value: 'read', label: 'wm_acl_read', icon: <Visibility sx={{ fontSize: 16 }} /> },
    { value: 'control', label: 'wm_acl_control', icon: <TouchApp sx={{ fontSize: 16 }} /> },
];

interface Row {
    kind: 'category' | 'widget';
    id: string;
    label: string;
    depth: number;
    acl?: WmAcl;
}

/**
 * Every category and widget against every group in one table.
 *
 * The per-node dialogs are fine for a single change, but building a profile such as "the kids"
 * means touching a dozen nodes — that is what this view is for. Only groups get columns; single
 * users stay the exception and are edited in the node's own permissions tab.
 */
export default function AclMatrixDialog(props: AclMatrixDialogProps): React.JSX.Element | null {
    const { open, onClose, categories, widgets, categorySettings, widgetSettings, onChange } = props;
    const [groups, setGroups] = useState<AclSubjectOption[]>([]);

    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        void loadAclSubjects(props.stateContext).then(list => {
            if (!cancelled) {
                setGroups(list.filter(s => s.kind === 'group'));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [open, props.stateContext]);

    /** Categories depth-first, each followed by its widgets — mirrors what the user navigates. */
    const rows = useMemo(() => {
        const result: Row[] = [];
        const addCategory = (category: CategoryInfo, depth: number): void => {
            const id = String(category.id);
            result.push({
                kind: 'category',
                id,
                // The root has no real name — `getCategoryName` would print the `__root__` marker
                label:
                    id === props.rootCategory
                        ? categorySettings[id]?.name || I18n.t('wm_acl_root')
                        : props.getCategoryName(category),
                depth,
                acl: categorySettings[id]?.acl,
            });
            for (const widget of widgets.filter(w => String(w.parent) === id)) {
                const widgetId = String(widget.id);
                result.push({
                    kind: 'widget',
                    id: widgetId,
                    label: widgetSettings[widgetId]?.name || widgetId.split('.').pop() || widgetId,
                    depth: depth + 1,
                    acl: widgetSettings[widgetId]?.acl,
                });
            }
            for (const child of categories.filter(c => String(c.parent) === id)) {
                addCategory(child, depth + 1);
            }
        };
        for (const root of categories.filter(c => String(c.id) === props.rootCategory)) {
            addCategory(root, 0);
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, widgets, categorySettings, widgetSettings]);

    if (!open) {
        return null;
    }

    const setLevel = (row: Row, groupId: string, level: AclLevel | null): void => {
        const map = { ...row.acl?.groups };
        if (level) {
            map[groupId] = level;
        } else {
            delete map[groupId];
        }
        const next: WmAcl = { ...row.acl, groups: map };
        if (!Object.keys(map).length) {
            delete next.groups;
        }
        onChange(row.kind, row.id, Object.keys(next).length ? next : undefined);
    };

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>{I18n.t('wm_acl_matrix')}</DialogTitle>
            <DialogContent dividers>
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                >
                    {I18n.t('wm_acl_matrix_hint')}
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            {groups.map(group => (
                                <TableCell
                                    key={group.id}
                                    align="center"
                                >
                                    {group.name}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={`${row.kind}:${row.id}`}>
                                <TableCell sx={{ pl: 1 + row.depth * 2 }}>
                                    <Box
                                        sx={{
                                            fontWeight: row.kind === 'category' ? 600 : 400,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 320,
                                        }}
                                    >
                                        {row.label}
                                    </Box>
                                </TableCell>
                                {groups.map(group => (
                                    <TableCell
                                        key={group.id}
                                        align="center"
                                        sx={{ p: 0.5 }}
                                    >
                                        <ToggleButtonGroup
                                            exclusive
                                            size="small"
                                            value={row.acl?.groups?.[group.id] ?? null}
                                            onChange={(_e, value: AclLevel | null) => setLevel(row, group.id, value)}
                                        >
                                            {LEVELS.map(level => (
                                                <Tooltip
                                                    key={level.value}
                                                    title={I18n.t(level.label)}
                                                >
                                                    <ToggleButton
                                                        value={level.value}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        {level.icon}
                                                    </ToggleButton>
                                                </Tooltip>
                                            ))}
                                        </ToggleButtonGroup>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    startIcon={<Close />}
                    onClick={onClose}
                >
                    {I18n.t('wm_Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
