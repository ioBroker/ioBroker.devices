import React from 'react';
import { Box, Typography } from '@mui/material';
import { People } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
export class WidgetPresence extends WidgetGeneric {
    static getConfigSchema() {
        return {
            type: 'panel',
            label: 'wm_Presence',
            items: {
                name: { type: 'text', label: 'wm_Name', default: '' },
                widgetIcon: { type: 'component', subType: 'iconSelect', label: 'wm_Icon' },
                presenceStateId: { type: 'objectId', label: 'wm_Presence state' },
                invert: { type: 'checkbox', label: 'wm_Invert', default: false },
                absentMode: {
                    type: 'select',
                    label: 'wm_Absent mode',
                    options: [
                        { value: 'dim', label: 'wm_absent_dim' },
                        { value: 'hide', label: 'wm_absent_hide' },
                    ],
                    default: 'dim',
                },
            },
        };
    }
    presenceHandler = null;
    timerInterval = null;
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            present: false,
            lastChange: null,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        this.subscribe();
        // Update "time ago" display every 60 seconds
        this.timerInterval = setInterval(() => {
            if (this.state.lastChange != null) {
                this.forceUpdate();
            }
        }, 60_000);
    }
    componentDidUpdate(prev) {
        if (prev.settings.presenceStateId !== this.props.settings.presenceStateId) {
            this.unsubscribe();
            this.subscribe();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unsubscribe();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    subscribe() {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.props.settings.presenceStateId) {
            this.presenceHandler = (_id, state) => {
                const raw = !!state?.val;
                const present = this.props.settings.invert ? !raw : raw;
                const lc = state?.lc ?? null;
                this.setState({ present, lastChange: lc });
            };
            ctx.getState(this.props.settings.presenceStateId, this.presenceHandler);
        }
    }
    unsubscribe() {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.presenceHandler && this.props.settings.presenceStateId) {
            ctx.removeState(this.props.settings.presenceStateId, this.presenceHandler);
            this.presenceHandler = null;
        }
    }
    renderCompact() {
        const { present, lastChange } = this.state;
        const { widgetIcon, absentMode, color } = this.props.settings;
        const isEditing = !!this.props.onOpenSettings;
        const dimmed = !present && absentMode === 'dim';
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const icon = this.props.stateContext.getImagePath(widgetIcon);
        return (React.createElement(Box, { sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    aspectRatio: '1',
                    position: 'relative',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, present, {
                        interactive: false,
                        accent: color,
                        inactiveColor: color,
                    }),
                    ...(dimmed && {
                        opacity: 0.35,
                        filter: 'grayscale(100%)',
                    }),
                    // In hide mode + editing, show faded
                    ...(!present &&
                        absentMode === 'hide' &&
                        isEditing && {
                        opacity: 0.25,
                    }),
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'max(48px, 35cqi)',
                        '& img': { width: '1em !important', height: '1em !important' },
                    } }, widgetIcon ? (React.createElement(Icon, { src: icon, style: {
                        width: 'max(48px, 35cqi)',
                        height: 'max(48px, 35cqi)',
                        color: present ? color || '#4caf50' : '#888',
                    } })) : (React.createElement(People, { sx: { fontSize: 'inherit', color: present ? color || '#4caf50' : '#888' } }))),
                React.createElement(Box, { sx: { width: '100%', px: 'max(8px, 5cqi)', pb: 'max(6px, 4cqi)' } },
                    React.createElement(Typography, { variant: "body2", noWrap: true, sx: {
                            fontWeight: 600,
                            fontSize: 'max(0.75rem, 4cqi)',
                            lineHeight: 1.3,
                        } }, this.props.settings.name || I18n.t('wm_Presence')),
                    lastChange != null && (React.createElement(Typography, { variant: "caption", sx: {
                            opacity: 0.6,
                            fontSize: 'max(0.6rem, 3cqi)',
                            display: 'block',
                            lineHeight: 1.2,
                        } }, this.fromNow(lastChange)))))));
    }
    render() {
        const { present } = this.state;
        const { absentMode } = this.props.settings;
        const isEditing = !!this.props.onOpenSettings;
        const id = String(this.props.widget.id);
        // Hide completely if absent and mode is 'hide' (but always show in edit mode)
        if (!present && absentMode === 'hide' && !isEditing) {
            this.props.onHide(id, true);
            return React.createElement(React.Fragment, null);
        }
        this.props.onHide(id, false);
        return super.render();
    }
}
//# sourceMappingURL=Presence.js.map