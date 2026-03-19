import React from 'react';
import { I18n, type Connection, type IobTheme } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import type { CategoryInfo, CustomWidgetDef, CustomWidgetType, WidgetInfo } from '../../../src/widget-utils';
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from './Widgets';
import WidgetSettingsDialog from './WidgetSettingsDialog';
import CategorySettingsDialog, { DEFAULT_CATEGORY_SETTINGS, type CategorySettings } from './CategorySettingsDialog';
import CustomWidgetDialog from './CustomWidgetDialog';
import CustomWidgetSettingsDialog from './CustomWidgetSettingsDialog';
import { findWidgetGroup } from './groupUtils';
import SidePanelInstallDialog from './SidePanelInstallDialog';

/** Widget types where iconInactive is stored in `common.icon` and iconActive in `common.custom` */
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
    widgetSettings: Record<string, WidgetSettings>;
    chartAvailable: boolean;
    settingsObjectName: string;
    settingsObjectColor: string;
    onCloseSettings: () => void;
    onSaveSettings: (settings: WidgetSettings) => void;
    onDeleteWidget: () => void;

    // --- Category settings dialog ---
    categorySettingsCategoryId: string | null;
    categories: CategoryInfo[];
    currentCategory: CategoryInfo;
    categorySettings: Record<string, CategorySettings>;
    rootCategory: string;
    onCloseCategorySettings: () => void;
    onSaveCategorySettings: (settings: CategorySettings) => void;
    selectedInstance: string;

    // --- Custom widget dialog ---
    customWidgetDialogCategoryId: string | null;
    onCloseCustomWidgetDialog: () => void;
    onAddCustomWidget: (type: CustomWidgetType) => void;

    // --- Custom widget settings dialog ---
    customWidgetSettingsCategoryId: string | null;
    customWidgetSettingsWidgetId: string | null;
    onCloseCustomWidgetSettings: () => void;
    onSaveCustomWidgetSettings: (def: CustomWidgetDef) => void;
    onDeleteCustomWidgetFromSettings: () => void;

    // --- Side panel dialog ---
    sidePanelDialogOpen: boolean;
    onCloseSidePanel: () => void;
    admin: boolean;

    // --- Shared ---
    socket: Connection;
    theme: IobTheme;
    settingsWidgetId: string | number | null;
    onWidgetGroupMove: (categoryId: string, widgetId: string, groupId: string) => void;
    getCategoryName: (category: CategoryInfo) => string;
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
        categories,
        currentCategory,
        categorySettings,
        rootCategory,
        onCloseCategorySettings,
        onSaveCategorySettings,
        selectedInstance,
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
        admin,
        socket,
        theme,
        settingsWidgetId,
        onWidgetGroupMove,
        getCategoryName,
    } = props;

    return (
        <>
            <WidgetSettingsDialog
                open={settingsWidget != null}
                widgetName={settingsWidgetName}
                settings={
                    settingsWidget
                        ? widgetSettings[String(settingsWidget.id)] || DEFAULT_WIDGET_SETTINGS
                        : DEFAULT_WIDGET_SETTINGS
                }
                onClose={onCloseSettings}
                onSave={onSaveSettings}
                onDelete={onDeleteWidget}
                showChart={chartAvailable}
                showBlindType={settingsWidget?.control?.type === Types.blind}
                showPin={settingsWidget?.control?.type === Types.lock}
                showHideWhenOk={
                    settingsWidget?.control?.type === Types.floodAlarm ||
                    settingsWidget?.control?.type === Types.fireAlarm ||
                    settingsWidget?.control?.type === Types.warning
                }
                showCoordinates={
                    settingsWidget?.control?.type === Types.location ||
                    settingsWidget?.control?.type === Types.locationOne
                }
                showMarkerIcon={
                    settingsWidget?.control?.type === Types.location ||
                    settingsWidget?.control?.type === Types.locationOne
                }
                showMapTheme={
                    settingsWidget?.control?.type === Types.location ||
                    settingsWidget?.control?.type === Types.locationOne
                }
                showSliderType={
                    settingsWidget?.control?.type === Types.slider || settingsWidget?.control?.type === Types.percentage
                }
                showWideSliderStyle={
                    settingsWidget?.control?.type === Types.dimmer ||
                    settingsWidget?.control?.type === Types.volume ||
                    settingsWidget?.control?.type === Types.slider ||
                    settingsWidget?.control?.type === Types.percentage
                }
                showAnimation={
                    settingsWidget?.control?.type === Types.info &&
                    !!settingsWidget?.control?.states.some(
                        s => s.name === 'ACTUAL' && /value\.fill|level\.tank|tank/i.test(s.stateRole || ''),
                    )
                }
                showOnBrightness={
                    settingsWidget != null &&
                    [Types.rgbSingle, Types.rgbwSingle, Types.rgb, Types.hue, Types.cie, Types.ct].includes(
                        settingsWidget.control?.type,
                    ) &&
                    settingsWidget.control.states.some(
                        s => s.name === 'SET' || s.name === 'ACTUAL' || s.name === 'DIMMER' || s.name === 'BRIGHTNESS',
                    ) &&
                    !settingsWidget.control.states.some(s => s.name === 'ON_SET' || s.name === 'ON')
                }
                showAlarmTexts={
                    settingsWidget?.control?.type === Types.floodAlarm
                        ? { activeDefault: I18n.t('wm_Flood'), inactiveDefault: I18n.t('wm_Dry') }
                        : settingsWidget?.control?.type === Types.fireAlarm
                          ? { activeDefault: I18n.t('wm_Fire'), inactiveDefault: I18n.t('wm_OK') }
                          : settingsWidget?.control?.type === Types.motion
                            ? { activeDefault: I18n.t('wm_Motion'), inactiveDefault: I18n.t('wm_Clear') }
                            : settingsWidget?.control?.type === Types.window
                              ? { activeDefault: I18n.t('wm_Open'), inactiveDefault: I18n.t('wm_Closed') }
                              : settingsWidget?.control?.type === Types.door
                                ? { activeDefault: I18n.t('wm_Open'), inactiveDefault: I18n.t('wm_Closed') }
                                : settingsWidget?.control?.type === Types.warning
                                  ? {
                                        activeDefault: I18n.t('wm_Warning'),
                                        inactiveDefault: I18n.t('wm_OK'),
                                    }
                                  : undefined
                }
                showAlarmIcons={
                    settingsWidget?.control?.type === Types.floodAlarm ||
                    settingsWidget?.control?.type === Types.fireAlarm ||
                    settingsWidget?.control?.type === Types.motion ||
                    settingsWidget?.control?.type === Types.window ||
                    settingsWidget?.control?.type === Types.door ||
                    settingsWidget?.control?.type === Types.warning
                }
                showIcon={!!settingsWidget?.control?.type && !ALARM_ICON_TYPES.has(settingsWidget.control.type)}
                showRefreshInterval={settingsWidget?.control?.type === Types.image}
                socket={socket}
                theme={theme}
                admin={admin}
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
                socket={socket}
                instance={selectedInstance}
                theme={theme}
                admin={admin}
            />
            <CustomWidgetDialog
                open={customWidgetDialogCategoryId != null}
                onClose={onCloseCustomWidgetDialog}
                onAdd={onAddCustomWidget}
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
                socket={socket}
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
            />
            <SidePanelInstallDialog
                open={sidePanelDialogOpen}
                onClose={onCloseSidePanel}
                admin={admin}
                socket={socket}
            />
        </>
    );
}

export default CategoryListDialogs;
