import React from 'react';
import { I18n, type IobTheme } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import Category from './Category';
import WidgetSettingsDialog from './WidgetSettingsDialog';
import CategorySettingsDialog, {
    DEFAULT_CATEGORY_SETTINGS,
    type CategorySettings,
    type StatusCandidates,
} from './CategorySettingsDialog';
import CustomWidgetDialog from './CustomWidgetDialog';
import CustomWidgetSettingsDialog from './CustomWidgetSettingsDialog';
import { findWidgetGroup } from './groupUtils';
import SidePanelInstallDialog from './SidePanelInstallDialog';
import type {
    WidgetSettingsBase,
    CustomWidgetBase,
    CategoryInfo,
    CustomWidgetType,
    WidgetInfo,
} from '../../../packages/dm-widgets/src/index';
import WidgetGeneric from './Widgets/Generic';
import type StateContext from './StateContext';

/** Widget types where the icon is stored in `common.icon` and iconActive in `common.custom` */
const ALARM_ICON_TYPES = new Set([
    Types.floodAlarm,
    Types.fireAlarm,
    Types.motion,
    Types.window,
    Types.door,
    Types.warning,
]);

export interface CategoryListDialogsProps {
    // --- Widget settings dialog ---
    settingsWidget: WidgetInfo | null;
    settingsWidgetName: string;
    widgetSettings: Record<string, WidgetSettingsBase>;
    chartAvailable: boolean;
    settingsObjectName: string;
    settingsObjectColor: string;
    onCloseSettings: () => void;
    onSaveSettings: (settings: WidgetSettingsBase) => void;
    onDeleteWidget: () => void;
    /** Default history adapter instance (e.g. "history.0") */
    defaultHistory?: string;

    // --- Category settings dialog ---
    categorySettingsCategoryId: string | null;
    categorySettingsCandidates: StatusCandidates | null;
    categories: CategoryInfo[];
    currentCategory: CategoryInfo;
    categorySettings: Record<string, CategorySettings>;
    rootCategory: string;
    onCloseCategorySettings: () => void;
    onSaveCategorySettings: (settings: CategorySettings) => void;

    // --- Custom widget dialog ---
    customWidgetDialogCategoryId: string | null;
    onCloseCustomWidgetDialog: () => void;
    onAddCustomWidget: (type: CustomWidgetType) => void;
    onCreateCategory?: (name: string) => void;
    adapterWidgets?: Record<string, ioBroker.DevicesWidgets>;
    onAddPluginWidget?: (adapter: string, component: string, url: string, label: string) => void;

    // --- Custom widget settings dialog ---
    customWidgetSettingsCategoryId: string | null;
    customWidgetSettingsWidgetId: string | null;
    onCloseCustomWidgetSettings: () => void;
    onSaveCustomWidgetSettings: (def: CustomWidgetBase) => void;
    onDeleteCustomWidgetFromSettings: () => void;

    // --- Side panel dialog ---
    sidePanelDialogOpen: boolean;
    onCloseSidePanel: () => void;

    // --- Shared ---
    theme: IobTheme;
    settingsWidgetId: string | number | null;
    onWidgetGroupMove: (categoryId: string, widgetId: string, groupId: string) => void;
    getCategoryName: (category: CategoryInfo) => string;
    stateContext: StateContext;
}

function CategoryListDialogs(props: CategoryListDialogsProps): React.JSX.Element {
    const {
        settingsWidget,
        settingsWidgetName,
        widgetSettings,
        chartAvailable,
        settingsObjectName,
        settingsObjectColor,
        onCloseSettings,
        onSaveSettings,
        onDeleteWidget,
        categorySettingsCategoryId,
        categorySettingsCandidates,
        categories,
        currentCategory,
        categorySettings,
        rootCategory,
        onCloseCategorySettings,
        onSaveCategorySettings,
        customWidgetDialogCategoryId,
        onCloseCustomWidgetDialog,
        onAddCustomWidget,
        customWidgetSettingsCategoryId,
        customWidgetSettingsWidgetId,
        onCloseCustomWidgetSettings,
        onSaveCustomWidgetSettings,
        onDeleteCustomWidgetFromSettings,
        sidePanelDialogOpen,
        onCloseSidePanel,
        theme,
        settingsWidgetId,
        onWidgetGroupMove,
        getCategoryName,
        stateContext,
    } = props;

    // Build category options for default-category picker (root settings only)
    const categoryOptions = React.useMemo(() => {
        const opts: Array<{ id: string; label: string; icon?: string }> = [];
        // Add Favorites option
        opts.push({ id: '__favorites__', label: I18n.t('wm_Favorites'), icon: '⭐' });
        // Add all non-root categories
        for (const cat of categories) {
            if (String(cat.id) === rootCategory) {
                continue;
            }
            const icon = typeof cat.icon === 'string' ? cat.icon : undefined;
            opts.push({ id: String(cat.id), label: getCategoryName(cat), icon });
        }
        return opts;
    }, [categories, rootCategory, getCategoryName]);

    const Widget = settingsWidget
        ? Category.getWidgetComponent(settingsWidget.control?.type, settingsWidget.control?.states)
        : undefined;
    const isAlarmType = settingsWidget?.control?.type ? ALARM_ICON_TYPES.has(settingsWidget.control.type) : false;

    return (
        <>
            <WidgetSettingsDialog
                open={settingsWidget != null}
                widgetName={settingsWidgetName}
                settings={
                    settingsWidget
                        ? widgetSettings[String(settingsWidget.id)] ||
                          (Widget as any)?.getDefaultSettings?.() ||
                          WidgetGeneric.getDefaultSettings()
                        : WidgetGeneric.getDefaultSettings()
                }
                onClose={onCloseSettings}
                onSave={onSaveSettings}
                onDelete={onDeleteWidget}
                configSchema={(Widget as any)?.getConfigSchema?.()}
                showChart={chartAvailable}
                showAlarmFields={isAlarmType}
                showIcon={!!settingsWidget?.control?.type && !isAlarmType}
                stateContext={stateContext}
                primaryStateId={
                    settingsWidget?.control?.states
                        ? settingsWidget.control.states.find(s => s.name === 'ACTUAL')?.id ||
                          settingsWidget.control.states.find(s => s.name === 'SET')?.id ||
                          settingsWidget.control.states[0]?.id
                        : undefined
                }
                defaultHistory={props.defaultHistory}
                theme={theme}
                objectName={settingsObjectName}
                objectColor={settingsObjectColor}
                availableGroups={categorySettings[String(currentCategory.id)]?.widgetGroups}
                currentGroupId={
                    settingsWidgetId != null && categorySettings[String(currentCategory.id)]?.widgetGroups
                        ? findWidgetGroup(
                              categorySettings[String(currentCategory.id)].widgetGroups!,
                              String(settingsWidgetId),
                          )
                        : undefined
                }
                onGroupChange={
                    settingsWidgetId != null
                        ? (groupId: string) =>
                              onWidgetGroupMove(String(currentCategory.id), String(settingsWidgetId), groupId)
                        : undefined
                }
            />
            <CategorySettingsDialog
                open={categorySettingsCategoryId != null}
                stateContext={stateContext}
                categoryName={
                    categorySettingsCategoryId === rootCategory
                        ? categorySettings[rootCategory]?.name || I18n.t('wm_Settings')
                        : categorySettingsCategoryId
                          ? getCategoryName(
                                categories.find(c => String(c.id) === categorySettingsCategoryId) || currentCategory,
                            )
                          : ''
                }
                categoryId={categorySettingsCategoryId || ''}
                settings={
                    categorySettingsCategoryId
                        ? categorySettings[categorySettingsCategoryId] || DEFAULT_CATEGORY_SETTINGS
                        : DEFAULT_CATEGORY_SETTINGS
                }
                onClose={onCloseCategorySettings}
                onSave={onSaveCategorySettings}
                theme={theme}
                categoryOptions={categoryOptions}
                statusCandidates={categorySettingsCandidates}
            />
            <CustomWidgetDialog
                admin={stateContext.admin}
                open={customWidgetDialogCategoryId != null}
                onClose={onCloseCustomWidgetDialog}
                onAdd={onAddCustomWidget}
                onCreateCategory={props.onCreateCategory}
                adapterWidgets={props.adapterWidgets}
                onAddPlugin={props.onAddPluginWidget}
                language={stateContext.language}
            />
            <CustomWidgetSettingsDialog
                open={customWidgetSettingsCategoryId != null}
                widgetDef={
                    customWidgetSettingsCategoryId && customWidgetSettingsWidgetId
                        ? categorySettings[customWidgetSettingsCategoryId]?.customWidgets?.find(
                              w => w.id === customWidgetSettingsWidgetId,
                          ) || null
                        : null
                }
                onClose={onCloseCustomWidgetSettings}
                onSave={onSaveCustomWidgetSettings}
                onDelete={onDeleteCustomWidgetFromSettings}
                theme={theme}
                availableGroups={
                    customWidgetSettingsCategoryId
                        ? categorySettings[customWidgetSettingsCategoryId]?.widgetGroups
                        : undefined
                }
                currentGroupId={
                    customWidgetSettingsCategoryId &&
                    customWidgetSettingsWidgetId &&
                    categorySettings[customWidgetSettingsCategoryId]?.widgetGroups
                        ? findWidgetGroup(
                              categorySettings[customWidgetSettingsCategoryId].widgetGroups,
                              customWidgetSettingsWidgetId,
                          )
                        : undefined
                }
                onGroupChange={
                    customWidgetSettingsCategoryId && customWidgetSettingsWidgetId
                        ? (groupId: string) =>
                              onWidgetGroupMove(customWidgetSettingsCategoryId, customWidgetSettingsWidgetId, groupId)
                        : undefined
                }
                stateContext={stateContext}
            />
            <SidePanelInstallDialog
                open={sidePanelDialogOpen}
                onClose={onCloseSidePanel}
                admin={stateContext.admin}
                socket={stateContext.getSocket()}
            />
        </>
    );
}

export default CategoryListDialogs;
