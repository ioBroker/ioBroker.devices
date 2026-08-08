import React, { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { I18n } from '@iobroker/gui-components';

import { loadAclSubjects, type AclSubjectOption } from './AclEditor';
import type { AclSubject } from './acl';
import type StateContext from './StateContext';

interface ViewAsSelectProps {
    /** Currently simulated subject, null while looking at one's own view */
    value: AclSubject | null;
    onChange: (subject: AclSubject | null) => void;
    stateContext: StateContext;
}

/**
 * Lets an editor look at the page through the eyes of a group or a user.
 *
 * Purely local and not persisted — it only swaps the subject the resolver is built from. Without
 * it a permission setup is barely verifiable: an administrator never sees the effect of their own
 * rules, because the permissions do not apply to them.
 */
export default function ViewAsSelect(props: ViewAsSelectProps): React.JSX.Element | null {
    const { value, onChange, stateContext } = props;
    const [subjects, setSubjects] = useState<AclSubjectOption[]>([]);
    const [groupsOfUser, setGroupsOfUser] = useState<Record<string, string[]>>({});

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const list = await loadAclSubjects(stateContext);
            // Which groups a simulated user belongs to — the resolver needs them, and reading the
            // membership here keeps the simulation identical to the real resolution.
            const membership: Record<string, string[]> = {};
            try {
                const groups = await stateContext.getSocket().getGroups();
                for (const group of groups) {
                    for (const member of (group.common?.members as string[] | undefined) || []) {
                        (membership[member] ||= []).push(group._id);
                    }
                }
            } catch {
                // Without the membership a user is simulated with their direct rules only
            }
            if (!cancelled) {
                setSubjects(list);
                setGroupsOfUser(membership);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [stateContext]);

    if (!subjects.length) {
        return null;
    }

    return (
        <TextField
            select
            variant="standard"
            size="small"
            sx={{ minWidth: 170 }}
            label={I18n.t('wm_acl_view_as')}
            value={value?.userId || ''}
            onChange={e => {
                const id = e.target.value;
                if (!id) {
                    onChange(null);
                    return;
                }
                const subject = subjects.find(s => s.id === id);
                if (!subject) {
                    return;
                }
                onChange(
                    subject.kind === 'group'
                        ? // A group is simulated as an anonymous member of exactly that group
                          { userId: '', groupIds: [subject.id] }
                        : { userId: subject.id, groupIds: groupsOfUser[subject.id] || [] },
                );
            }}
        >
            <MenuItem value="">{I18n.t('wm_acl_view_as_self')}</MenuItem>
            {subjects.map(s => (
                <MenuItem
                    key={s.id}
                    value={s.id}
                >
                    {I18n.t(s.kind === 'group' ? 'wm_acl_group' : 'wm_acl_user')}: {s.name}
                </MenuItem>
            ))}
        </TextField>
    );
}
