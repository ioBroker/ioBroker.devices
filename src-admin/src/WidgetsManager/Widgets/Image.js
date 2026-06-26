import React from 'react';
import { Box, Typography } from '@mui/material';
import { BrokenImage } from '@mui/icons-material';
import WidgetGeneric, { isNeumorphicTheme, } from './Generic';
export class WidgetImage extends WidgetGeneric {
    urlId;
    refreshTimer = null;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const urlState = states.find(s => s.name === 'URL');
        this.urlId = urlState?.id ?? null;
        this.state = {
            ...this.state,
            url: null,
            tick: 0,
        };
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            refreshInterval: 0,
            appendTimestamp: false,
        };
    }
    static getConfigSchema() {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    refreshInterval: {
                        type: 'number',
                        label: 'wm_Refresh interval',
                        default: 0,
                        min: 0,
                        help: 'wm_Refresh interval help',
                    },
                    appendTimestamp: {
                        type: 'checkbox',
                        label: 'wm_Append timestamp',
                        default: false,
                    },
                },
            },
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.urlId) {
            this.props.stateContext.getState(this.urlId, this.onUrlChange);
        }
        this.setupRefreshTimer();
    }
    componentDidUpdate(prevProps) {
        const prevInterval = prevProps.settings?.refreshInterval ?? 0;
        const newInterval = this.props.settings?.refreshInterval ?? 0;
        if (prevInterval !== newInterval) {
            this.setupRefreshTimer();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.urlId) {
            this.props.stateContext.removeState(this.urlId, this.onUrlChange);
        }
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    setupRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        const interval = this.props.settings?.refreshInterval ?? 0;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => {
                this.setState(prev => ({ tick: prev.tick + 1 }));
            }, interval * 1000);
        }
    }
    onUrlChange = (_id, state) => {
        const url = state.val != null ? String(state.val) : null;
        if (url !== this.state.url) {
            this.setState({ url });
        }
    };
    /** Build the display URL, optionally appending a cache-busting timestamp */
    getDisplayUrl() {
        const { url } = this.state;
        if (!url) {
            return null;
        }
        const appendTs = this.props.settings?.appendTimestamp;
        if (!appendTs) {
            return url;
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}ts=${Date.now()}`;
    }
    isTileActive() {
        return !!this.state.url;
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return React.createElement(BrokenImage, { sx: { color: 'text.disabled' } });
    }
    // --- 1x1 compact: image fills the tile ---
    renderCompact() {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    position: 'relative',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 0,
                }) },
                displayUrl ? (React.createElement(Box, { component: "img", src: displayUrl, sx: {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '16px',
                    } })) : (React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    } },
                    React.createElement(BrokenImage, { sx: { fontSize: 48, color: 'text.disabled' } }))),
                indicators,
                React.createElement(Box, { sx: {
                        position: 'relative',
                        zIndex: 1,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        borderRadius: '0 0 16px 16px',
                        px: 'max(12px, 8cqi)',
                        py: 'max(8px, 5cqi)',
                    } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            color: '#fff',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...')))));
    }
    // --- 2x0.5 wide: image on left, name on right ---
    renderWide() {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    width: '100%',
                    height: 80,
                    position: 'relative',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 0,
                }) },
                React.createElement(Box, { sx: {
                        width: 80,
                        height: 80,
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: '16px 0 0 16px',
                    } }, displayUrl ? (React.createElement(Box, { component: "img", src: displayUrl, sx: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    } })) : (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } },
                    React.createElement(BrokenImage, { sx: { fontSize: 32, color: 'text.disabled' } })))),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0, px: 2 } },
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: { fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' } }, this.props.settings?.name || name || '...'),
                        indicators)))));
    }
    // --- 2x1 wideTall: large image ---
    renderWideTall() {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 0,
                }) },
                displayUrl ? (React.createElement(Box, { component: "img", src: displayUrl, sx: {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '16px',
                    } })) : (React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    } },
                    React.createElement(BrokenImage, { sx: { fontSize: 64, color: 'text.disabled' } }))),
                indicators,
                React.createElement(Box, { sx: {
                        position: 'relative',
                        zIndex: 1,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        borderRadius: '0 0 16px 16px',
                        px: 2,
                        py: 1.5,
                    } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: {
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            color: '#fff',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        } }, this.props.settings?.name || name || '...')))));
    }
}
export default WidgetImage;
//# sourceMappingURL=Image.js.map