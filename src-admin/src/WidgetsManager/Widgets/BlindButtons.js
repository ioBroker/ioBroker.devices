import React from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Stop } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme } from './Generic';
export class WidgetBlindButtons extends WidgetGeneric {
    stopId;
    openId;
    closeId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        this.stopId = states.find(s => s.name === 'STOP')?.id ?? null;
        this.openId = states.find(s => s.name === 'OPEN')?.id ?? null;
        this.closeId = states.find(s => s.name === 'CLOSE')?.id ?? null;
        this.state = {
            ...this.state,
            direction: 0,
        };
    }
    isTileActive() {
        return this.state.direction !== 0;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    sendOpen = (e) => {
        e.stopPropagation();
        if (this.openId) {
            void this.props.stateContext.getSocket().setState(this.openId, true);
        }
        this.setState({ direction: 1 });
    };
    sendStop = (e) => {
        e.stopPropagation();
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
        this.setState({ direction: 0 });
    };
    sendClose = (e) => {
        e.stopPropagation();
        if (this.closeId) {
            void this.props.stateContext.getSocket().setState(this.closeId, true);
        }
        this.setState({ direction: 2 });
    };
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { direction } = this.state;
        const accent = this.getAccentColor();
        if (direction === 1) {
            return React.createElement(KeyboardArrowUp, { sx: theme => ({ color: accent || theme.palette.primary.main }) });
        }
        if (direction === 2) {
            return React.createElement(KeyboardArrowDown, { sx: theme => ({ color: accent || theme.palette.primary.main }) });
        }
        return React.createElement(Stop, { sx: { color: 'text.disabled' } });
    }
    renderTileStatus() {
        const { direction } = this.state;
        const accent = this.getAccentColor();
        const text = direction === 1 ? I18n.t('wm_Open') : direction === 2 ? I18n.t('wm_Closed') : I18n.t('wm_Off');
        return (React.createElement(Typography, { variant: "caption", sx: theme => ({
                fontWeight: 500,
                color: direction !== 0 ? accent || theme.palette.primary.main : theme.palette.text.secondary,
            }) }, text));
    }
    renderTileAction() {
        const accent = this.getAccentColor();
        const { direction } = this.state;
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(IconButton, { size: "small", onClick: this.sendOpen, sx: theme => ({
                    color: direction === 1 ? accent || theme.palette.primary.main : 'text.secondary',
                }) },
                React.createElement(KeyboardArrowUp, null)),
            React.createElement(IconButton, { size: "small", onClick: this.sendStop, sx: { color: 'text.secondary' } },
                React.createElement(Stop, null)),
            React.createElement(IconButton, { size: "small", onClick: this.sendClose, sx: theme => ({
                    color: direction === 2 ? accent || theme.palette.primary.main : 'text.secondary',
                }) },
                React.createElement(KeyboardArrowDown, null))));
    }
    // 1x1 compact — three large buttons
    renderCompact() {
        const { name, direction } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const btnSx = (active) => (theme) => ({
            flex: 1,
            borderRadius: '12px',
            color: active ? accent || theme.palette.primary.main : theme.palette.text.secondary,
            backgroundColor: active ? `${accent || theme.palette.primary.main}22` : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: `${accent || theme.palette.primary.main}18` },
        });
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 'max(12px, 8cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'max(4px, 2cqi)',
                        flex: 1,
                        justifyContent: 'center',
                    } },
                    React.createElement(ButtonBase, { onClick: this.sendOpen, sx: btnSx(direction === 1) },
                        React.createElement(KeyboardArrowUp, { sx: { fontSize: 'max(28px, 18cqi)' } })),
                    React.createElement(ButtonBase, { onClick: this.sendStop, sx: btnSx(false) },
                        React.createElement(Stop, { sx: { fontSize: 'max(24px, 16cqi)' } })),
                    React.createElement(ButtonBase, { onClick: this.sendClose, sx: btnSx(direction === 2) },
                        React.createElement(KeyboardArrowDown, { sx: { fontSize: 'max(28px, 18cqi)' } }))),
                React.createElement(Box, null,
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...')))));
    }
}
export default WidgetBlindButtons;
//# sourceMappingURL=BlindButtons.js.map