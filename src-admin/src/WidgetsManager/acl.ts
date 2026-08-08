/**
 * Resolution of the widget/category view permissions.
 *
 * Pure, dependency-free logic (type-only imports) so it can be unit tested without a DOM or a
 * bundler — see `test/acl.test.js`. The model and the rules are specified in `PERMISSIONS.md`.
 */
import type { AclLevel, WmAcl } from '../../../packages/dm-widgets/src/types';

export type { AclLevel, WmAcl };

/** Order of the levels — a higher number is more permissive. */
const RANK: Record<AclLevel, number> = { hidden: 0, read: 1, control: 2 };

/** The level in effect when no rule matches anywhere. */
export const DEFAULT_LEVEL: AclLevel = 'control';

export interface AclSubject {
    /** Full ID, e.g. `system.user.lena` */
    userId: string;
    /** Full IDs, e.g. `['system.group.user', 'system.group.kids']` */
    groupIds: string[];
}

/** A category as far as the resolution is concerned. */
export interface AclCategoryNode {
    id: string;
    /** Parent category ID; undefined for the root */
    parent?: string;
    acl?: WmAcl;
}

/** Who may configure — a single global setting, stored on the root category. */
export interface AclEditors {
    groups?: string[];
    users?: string[];
}

/** The account that may always configure, even without an `editors` entry. */
export const ADMIN_USER_ID = 'system.user.admin';

/** Guard against a cyclic `parent` chain in broken configurations. */
const MAX_DEPTH = 32;

/**
 * Level a single node grants to a subject, or undefined when the node says nothing about it.
 *
 * Within one node: a user entry beats the groups, and among several matching groups the most
 * permissive one wins — permissions from group memberships add up.
 *
 * @param acl Rules of the node, may be undefined
 * @param subject User and groups to resolve for
 * @returns The level, or undefined when the node has no opinion
 */
export function resolveForSubject(acl: WmAcl | undefined, subject: AclSubject): AclLevel | undefined {
    if (!acl) {
        return undefined;
    }
    const own = acl.users?.[subject.userId];
    if (own) {
        return own;
    }
    let best: AclLevel | undefined;
    if (acl.groups) {
        for (const groupId of subject.groupIds) {
            const level = acl.groups[groupId];
            if (level && (best === undefined || RANK[level] > RANK[best])) {
                best = level;
            }
        }
    }
    return best ?? acl.default;
}

/**
 * Walk a chain of nodes, most specific first, and return the first level anyone has an opinion on.
 *
 * @param chain Rules from the most specific node up to the root
 * @param subject User and groups to resolve for
 * @returns The effective level, `control` when the whole chain is silent
 */
export function resolveLevel(chain: (WmAcl | undefined)[], subject: AclSubject): AclLevel {
    for (const acl of chain) {
        const level = resolveForSubject(acl, subject);
        if (level) {
            return level;
        }
    }
    return DEFAULT_LEVEL;
}

/**
 * Whether a subject may configure. Only ever evaluated against the root category.
 *
 * @param editors Configured editors, may be undefined
 * @param subject User and groups to resolve for
 * @returns True when the subject may edit
 */
export function isEditor(editors: AclEditors | undefined, subject: AclSubject): boolean {
    if (subject.userId === ADMIN_USER_ID) {
        return true;
    }
    if (editors?.users?.includes(subject.userId)) {
        return true;
    }
    return !!editors?.groups?.some(groupId => subject.groupIds.includes(groupId));
}

export interface AclResolver {
    /** False when no rules apply at all (admin tab, no login) — then everything is `control`. */
    readonly enabled: boolean;
    /** May the current subject configure? */
    readonly canEdit: boolean;
    /** Effective level of a category, including containment by its ancestors. */
    categoryLevel: (categoryId: string) => AclLevel;
    /**
     * Effective level of a widget: its own rules first, then the rules of its category chain.
     * A hidden category hides its content regardless of the widget's own level.
     */
    widgetLevel: (acl: WmAcl | undefined, categoryId: string | undefined) => AclLevel;
}

/** Resolver used whenever permissions do not apply — everything visible and controllable. */
export const ALLOW_ALL: AclResolver = {
    enabled: false,
    canEdit: true,
    categoryLevel: () => 'control',
    widgetLevel: () => 'control',
};

/**
 * Build a resolver for one subject.
 *
 * Category levels are precomputed once: first each category on its own (its rules, then those of
 * its ancestors as a fallback), then top-down containment — a category below a hidden one is
 * hidden too. Only `hidden` cascades; a `control` widget inside a `read` category stays
 * controllable, because the more specific rule is the one the admin set deliberately.
 *
 * @param categories All known categories
 * @param subject Resolve for this user, or null to disable the permissions entirely
 * @param editors Editors configured on the root category
 * @returns A resolver with precomputed category levels
 */
export function createAclResolver(
    categories: AclCategoryNode[],
    subject: AclSubject | null,
    editors?: AclEditors,
    rootId = '__root__',
): AclResolver {
    if (!subject) {
        return ALLOW_ALL;
    }

    const byId = new Map<string, AclCategoryNode>();
    for (const category of categories) {
        byId.set(category.id, category);
    }

    /** Rules of a category and of all its ancestors, most specific first. */
    const chainOf = (categoryId: string | undefined): (WmAcl | undefined)[] => {
        const chain: (WmAcl | undefined)[] = [];
        let current = categoryId ? byId.get(categoryId) : undefined;
        for (let depth = 0; current && depth < MAX_DEPTH; depth++) {
            chain.push(current.acl);
            current = current.parent ? byId.get(current.parent) : undefined;
        }
        return chain;
    };

    // Own level per category, ancestors only as a fallback
    const own = new Map<string, AclLevel>();
    for (const category of categories) {
        own.set(category.id, resolveLevel(chainOf(category.id), subject));
    }

    // Containment, resolved lazily and memoized — the category list is not sorted by depth
    const effective = new Map<string, AclLevel>();
    const effectiveLevel = (categoryId: string, depth = 0): AclLevel => {
        const cached = effective.get(categoryId);
        if (cached) {
            return cached;
        }
        const category = byId.get(categoryId);
        let level = own.get(categoryId) ?? DEFAULT_LEVEL;
        // The root is the baseline, not a container one navigates into: `default: 'hidden'` on the
        // root is the whitelist idiom, and an explicit rule further down must be able to lift it.
        // Its hiding still reaches descendants through the fallback chain in `own`.
        const container = category?.parent && category.parent !== rootId ? category.parent : undefined;
        if (container && depth < MAX_DEPTH && effectiveLevel(container, depth + 1) === 'hidden') {
            level = 'hidden';
        }
        effective.set(categoryId, level);
        return level;
    };

    const canEdit = isEditor(editors, subject);

    return {
        enabled: true,
        canEdit,
        categoryLevel: categoryId => (byId.has(categoryId) ? effectiveLevel(categoryId) : DEFAULT_LEVEL),
        widgetLevel: (acl, categoryId) => {
            if (categoryId && byId.has(categoryId) && effectiveLevel(categoryId) === 'hidden') {
                return 'hidden';
            }
            return resolveLevel([acl, ...chainOf(categoryId)], subject);
        },
    };
}
