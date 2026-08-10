import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    Select,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Delete, Visibility, VisibilityOff, TouchApp } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import { ADMIN_GROUP_ID, ADMIN_USER_ID, type AclLevel, type WmAcl } from './acl';
import type StateContext from './StateContext';

interface AclEditorProps {
    /** Rules of the edited node, undefined when nothing has been set yet */
    acl?: WmAcl;
    onChange: (acl: WmAcl | undefined) => void;
    stateContext: StateContext;
    /** Shown above the rows, e.g. "applies to all widgets of this category" */
    hint?: string;
}

interface Subject {
    id: string;
    name: string;
    kind: 'group' | 'user';
}

const LEVELS: { value: AclLevel; label: string; icon: React.JSX.Element }[] = [
    { value: 'hidden', label: 'wm_acl_hidden', icon: <VisibilityOff fontSize="small" /> },
    { value: 'read', label: 'wm_acl_read', icon: <Visibility fontSize="small" /> },
    { value: 'control', label: 'wm_acl_control', icon: <TouchApp fontSize="small" /> },
];

/** Drop empty maps so a node without rules stores nothing at all. */
function compact(acl: WmAcl): WmAcl | undefined {
    const result: WmAcl = {};
    if (acl.default) {
        result.default = acl.default;
    }
    if (acl.groups && Object.keys(acl.groups).length) {
        result.groups = acl.groups;
    }
    if (acl.users && Object.keys(acl.users).length) {
        result.users = acl.users;
    }
    return Object.keys(result).length ? result : undefined;
}

function LevelSelect(props: { value?: AclLevel; onChange: (level: AclLevel) => void }): React.JSX.Element {
    return (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={props.value ?? null}
            onChange={(_e, value: AclLevel | null) => value && props.onChange(value)}
        >
            {LEVELS.map(level => (
                <Tooltip
                    key={level.value}
                    title={I18n.t(level.label)}
                >
                    <ToggleButton value={level.value}>{level.icon}</ToggleButton>
                </Tooltip>
            ))}
        </ToggleButtonGroup>
    );
}

/**
 * Editor for the view permissions of one widget or one category.
 *
 * Groups come first — a group is the profile ("the kids"), single users are the exception. The
 * component only edits the rules; how they are resolved is in `acl.ts`, the model in
 * `PERMISSIONS.md`.
 */
export default function AclEditor(props: AclEditorProps): React.JSX.Element {
    const { acl, onChange, stateContext, hint } = props;
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void loadAclSubjects(stateContext).then(list => {
            if (!cancelled) {
                setSubjects(list);
                setLoadError(!list.length);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [stateContext]);

    /** Subjects that already have a rule, in the order groups → users */
    const rows = useMemo(() => {
        const byId = new Map(subjects.map(s => [s.id, s]));
        const entries: { subject: Subject; level: AclLevel }[] = [];
        for (const [id, level] of Object.entries(acl?.groups || {})) {
            entries.push({ subject: byId.get(id) || { id, name: id, kind: 'group' }, level });
        }
        for (const [id, level] of Object.entries(acl?.users || {})) {
            entries.push({ subject: byId.get(id) || { id, name: id, kind: 'user' }, level });
        }
        return entries;
    }, [acl, subjects]);

    const available = subjects.filter(
        s => !(s.kind === 'group' ? acl?.groups : acl?.users)?.[s.id] && s.id !== 'system.user.admin',
    );

    const setLevel = (subject: Subject, level: AclLevel): void => {
        const key = subject.kind === 'group' ? 'groups' : 'users';
        onChange(compact({ ...acl, [key]: { ...acl?.[key], [subject.id]: level } }));
    };

    const remove = (subject: Subject): void => {
        const key = subject.kind === 'group' ? 'groups' : 'users';
        const map = { ...acl?.[key] };
        delete map[subject.id];
        onChange(compact({ ...acl, [key]: map }));
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <Alert
                severity="info"
                sx={{ py: 0 }}
            >
                {I18n.t('wm_acl_disclaimer')}
            </Alert>
            {hint ? (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                >
                    {hint}
                </Typography>
            ) : null}
            {loadError ? <Alert severity="warning">{I18n.t('wm_acl_no_groups')}</Alert> : null}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ flex: 1, minWidth: 0 }}>{I18n.t('wm_acl_default')}</Typography>
                <LevelSelect
                    value={acl?.default}
                    onChange={level => onChange(compact({ ...acl, default: level }))}
                />
                <Tooltip title={I18n.t('wm_acl_inherit')}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!acl?.default}
                            onClick={() => onChange(compact({ ...acl, default: undefined }))}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {rows.map(row => (
                <Box
                    key={`${row.subject.kind}:${row.subject.id}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                    <Typography sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {I18n.t(row.subject.kind === 'group' ? 'wm_acl_group' : 'wm_acl_user')}: {row.subject.name}
                    </Typography>
                    <LevelSelect
                        value={row.level}
                        onChange={level => setLevel(row.subject, level)}
                    />
                    <IconButton
                        size="small"
                        onClick={() => remove(row.subject)}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Box>
            ))}

            {available.length ? (
                <Select
                    variant="standard"
                    displayEmpty
                    value=""
                    onChange={e => {
                        const subject = subjects.find(s => s.id === e.target.value);
                        if (subject) {
                            setLevel(subject, 'read');
                        }
                    }}
                >
                    <MenuItem value="">
                        <span style={{ opacity: 0.6 }}>{I18n.t('wm_acl_add')}</span>
                    </MenuItem>
                    {available.map(s => (
                        <MenuItem
                            key={s.id}
                            value={s.id}
                        >
                            {I18n.t(s.kind === 'group' ? 'wm_acl_group' : 'wm_acl_user')}: {s.name}
                        </MenuItem>
                    ))}
                </Select>
            ) : null}
        </Box>
    );
}

/**
 * Picks the groups and users that may configure at all.
 *
 * Separate from the view levels: this is one global switch on the root category, not a per-node
 * rule. `system.user.admin` is always allowed and therefore not listed.
 */
export function EditorsEditor(props: {
    editors?: { groups?: string[]; users?: string[] };
    onChange: (editors: { groups?: string[]; users?: string[] } | undefined) => void;
    stateContext: StateContext;
}): React.JSX.Element {
    const { editors, onChange, stateContext } = props;
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        let cancelled = false;
        void loadAclSubjects(stateContext).then(list => !cancelled && setSubjects(list));
        return () => {
            cancelled = true;
        };
    }, [stateContext]);

    const selected = [...(editors?.groups || []), ...(editors?.users || [])];

    const toggle = (subject: Subject, on: boolean): void => {
        const key = subject.kind === 'group' ? 'groups' : 'users';
        const list = new Set(editors?.[key] || []);
        if (on) {
            list.add(subject.id);
        } else {
            list.delete(subject.id);
        }
        const next = { ...editors, [key]: [...list] };
        const empty = !next.groups?.length && !next.users?.length;
        onChange(empty ? undefined : next);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {subjects
                .filter(s => s.id !== ADMIN_USER_ID)
                .map(s => {
                    // Administrators are editors by definition — shown ticked, but not revocable,
                    // and never written to the list: the right does not come from there.
                    const always = s.id === ADMIN_GROUP_ID;
                    return (
                        <FormControlLabel
                            key={s.id}
                            control={
                                <Checkbox
                                    size="small"
                                    disabled={always}
                                    checked={always || selected.includes(s.id)}
                                    onChange={(_e, on) => toggle(s, on)}
                                />
                            }
                            label={`${I18n.t(s.kind === 'group' ? 'wm_acl_group' : 'wm_acl_user')}: ${s.name}`}
                        />
                    );
                })}
        </Box>
    );
}

/**
 * Load groups and users as selectable subjects. Groups come with a full `_id`, the user view
 * returns bare keys — both are normalized to full IDs here, so that the stored rules line up with
 * `system.group.*.common.members` and with the subject the resolver is built from.
 *
 * @param stateContext Provides the socket
 * @returns Groups first, then users; empty when even the groups cannot be read
 */
export async function loadAclSubjects(stateContext: StateContext): Promise<Subject[]> {
    const socket = stateContext.getSocket();
    const list: Subject[] = [];
    try {
        const groups = await socket.getGroups();
        for (const group of groups) {
            list.push({
                id: group._id,
                name: getName(group.common?.name, stateContext.language) || group._id,
                kind: 'group',
            });
        }
    } catch {
        return list;
    }
    try {
        const users = await socket.getObjectViewSystem('user', 'system.user.', 'system.user.香');
        for (const [key, obj] of Object.entries(users || {})) {
            const id = key.startsWith('system.user.') ? key : `system.user.${key}`;
            list.push({ id, name: getName(obj?.common?.name, stateContext.language) || id, kind: 'user' });
        }
    } catch {
        // Users are optional — groups alone are enough to configure a profile
    }
    return list;
}

export type { Subject as AclSubjectOption };

/** Resolve an ioBroker name that may be a plain string or a translation object. */
function getName(name: ioBroker.StringOrTranslated | undefined, language: ioBroker.Languages): string {
    if (!name) {
        return '';
    }
    return typeof name === 'string' ? name : name[language] || name.en || '';
}
