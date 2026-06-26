import React from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';
import Category from './Category';
import WidgetSettingsDialog from './WidgetSettingsDialog';
import CategorySettingsDialog, { DEFAULT_CATEGORY_SETTINGS } from './CategorySettingsDialog';
import CustomWidgetDialog from './CustomWidgetDialog';
import CustomWidgetSettingsDialog from './CustomWidgetSettingsDialog';
import { findWidgetGroup } from './groupUtils';
import SidePanelInstallDialog from './SidePanelInstallDialog';
import WidgetGeneric from './Widgets/Generic';
/** Widget types where the icon is stored in `common.icon` and iconActive in `common.custom` */
const ALARM_ICON_TYPES = new Set([
    Types.floodAlarm,
    Types.fireAlarm,
    Types.motion,
    Types.window,
    Types.door,
    Types.warning,
]);
function CategoryListDialogs(props) {
    const { settingsWidget, settingsWidgetName, widgetSettings, chartAvailable, settingsObjectName, settingsObjectColor, onCloseSettings, onSaveSettings, onDeleteWidget, categorySettingsCategoryId, categories, currentCategory, categorySettings, rootCategory, onCloseCategorySettings, onSaveCategorySettings, customWidgetDialogCategoryId, onCloseCustomWidgetDialog, onAddCustomWidget, customWidgetSettingsCategoryId, customWidgetSettingsWidgetId, onCloseCustomWidgetSettings, onSaveCustomWidgetSettings, onDeleteCustomWidgetFromSettings, sidePanelDialogOpen, onCloseSidePanel, theme, settingsWidgetId, onWidgetGroupMove, getCategoryName, stateContext, } = props;
    // Build category options for default-category picker (root settings only)
    const categoryOptions = React.useMemo(() => {
        const opts = [];
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
    return (React.createElement(React.Fragment, null,
        React.createElement(WidgetSettingsDialog, { open: settingsWidget != null, widgetName: settingsWidgetName, settings: settingsWidget
                ? widgetSettings[String(settingsWidget.id)] ||
                    Widget?.getDefaultSettings?.() ||
                    WidgetGeneric.getDefaultSettings()
                : WidgetGeneric.getDefaultSettings(), onClose: onCloseSettings, onSave: onSaveSettings, onDelete: onDeleteWidget, configSchema: Widget?.getConfigSchema?.(), showChart: chartAvailable, showAlarmFields: isAlarmType, showIcon: !!settingsWidget?.control?.type && !isAlarmType, stateContext: stateContext, primaryStateId: settingsWidget?.control?.states
                ? settingsWidget.control.states.find(s => s.name === 'ACTUAL')?.id ||
                    settingsWidget.control.states.find(s => s.name === 'SET')?.id ||
                    settingsWidget.control.states[0]?.id
                : undefined, defaultHistory: props.defaultHistory, theme: theme, objectName: settingsObjectName, objectColor: settingsObjectColor, availableGroups: categorySettings[String(currentCategory.id)]?.widgetGroups, currentGroupId: settingsWidgetId != null && categorySettings[String(currentCategory.id)]?.widgetGroups
                ? findWidgetGroup(categorySettings[String(currentCategory.id)].widgetGroups, String(settingsWidgetId))
                : undefined, onGroupChange: settingsWidgetId != null
                ? (groupId) => onWidgetGroupMove(String(currentCategory.id), String(settingsWidgetId), groupId)
                : undefined }),
        React.createElement(CategorySettingsDialog, { open: categorySettingsCategoryId != null, stateContext: stateContext, categoryName: categorySettingsCategoryId === rootCategory
                ? categorySettings[rootCategory]?.name || I18n.t('wm_Settings')
                : categorySettingsCategoryId
                    ? getCategoryName(categories.find(c => String(c.id) === categorySettingsCategoryId) || currentCategory)
                    : '', categoryId: categorySettingsCategoryId || '', settings: categorySettingsCategoryId
                ? categorySettings[categorySettingsCategoryId] || DEFAULT_CATEGORY_SETTINGS
                : DEFAULT_CATEGORY_SETTINGS, onClose: onCloseCategorySettings, onSave: onSaveCategorySettings, theme: theme, categoryOptions: categoryOptions }),
        React.createElement(CustomWidgetDialog, { admin: stateContext.admin, open: customWidgetDialogCategoryId != null, onClose: onCloseCustomWidgetDialog, onAdd: onAddCustomWidget, onCreateCategory: props.onCreateCategory, adapterWidgets: props.adapterWidgets, onAddPlugin: props.onAddPluginWidget, language: stateContext.language }),
        React.createElement(CustomWidgetSettingsDialog, { open: customWidgetSettingsCategoryId != null, widgetDef: customWidgetSettingsCategoryId && customWidgetSettingsWidgetId
                ? categorySettings[customWidgetSettingsCategoryId]?.customWidgets?.find(w => w.id === customWidgetSettingsWidgetId) || null
                : null, onClose: onCloseCustomWidgetSettings, onSave: onSaveCustomWidgetSettings, onDelete: onDeleteCustomWidgetFromSettings, theme: theme, availableGroups: customWidgetSettingsCategoryId
                ? categorySettings[customWidgetSettingsCategoryId]?.widgetGroups
                : undefined, currentGroupId: customWidgetSettingsCategoryId &&
                customWidgetSettingsWidgetId &&
                categorySettings[customWidgetSettingsCategoryId]?.widgetGroups
                ? findWidgetGroup(categorySettings[customWidgetSettingsCategoryId].widgetGroups, customWidgetSettingsWidgetId)
                : undefined, onGroupChange: customWidgetSettingsCategoryId && customWidgetSettingsWidgetId
                ? (groupId) => onWidgetGroupMove(customWidgetSettingsCategoryId, customWidgetSettingsWidgetId, groupId)
                : undefined, stateContext: stateContext }),
        React.createElement(SidePanelInstallDialog, { open: sidePanelDialogOpen, onClose: onCloseSidePanel, admin: stateContext.admin, socket: stateContext.getSocket() })));
}
export default CategoryListDialogs;
//# sourceMappingURL=CategoryListDialogs.js.map