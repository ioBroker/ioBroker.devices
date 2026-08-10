/**
 * Which tab the settings dialogs open on.
 *
 * Setting up permissions means jumping from category to category and from device to device, and
 * landing on the settings tab every time makes that a click-fest. The choice is therefore
 * remembered globally — one setting for all widgets and categories, not one per object — and
 * survives a reload.
 */

const STORAGE_KEY = 'wm_settings_tab';

/** Index of the permissions tab in both dialogs. */
export const ACL_TAB = 1;

/**
 * Tab a dialog should open on.
 *
 * @param hasAclTab Whether the dialog shows the permissions tab at all
 * @returns The tab index, always 0 when there is no permissions tab
 */
export function loadSettingsTab(hasAclTab: boolean): number {
    if (!hasAclTab) {
        return 0;
    }
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'acl' ? ACL_TAB : 0;
    } catch {
        // Storage can be unavailable (private mode, embedded frame) — then simply do not remember
        return 0;
    }
}

/**
 * Remember the tab for the next dialog.
 *
 * @param tab Index of the now active tab
 */
export function storeSettingsTab(tab: number): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, tab === ACL_TAB ? 'acl' : 'settings');
    } catch {
        // See above — remembering is a convenience, never a requirement
    }
}
