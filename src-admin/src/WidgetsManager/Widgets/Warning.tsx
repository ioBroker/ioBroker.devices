import React from 'react';
import { Box, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { type GenericWidgetSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';

/** Settings for alarm/sensor widgets: Warning, FireAlarm, FloodAlarm, Motion, Window, Door */
export interface AlarmWidgetSettings extends GenericWidgetSettings {
    hideWhenOk?: boolean;
}

/** Warning level colors: 0 = none/green, 1 = minor/yellow, 2 = moderate/orange, 3 = severe/red, 4+ = extreme/dark red */
const LEVEL_COLORS = ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#b71c1c'];

function getLevelColor(level: number): string {
    if (level <= 0) {
        return LEVEL_COLORS[0];
    }
    if (level >= LEVEL_COLORS.length) {
        return LEVEL_COLORS[LEVEL_COLORS.length - 1];
    }
    return LEVEL_COLORS[level];
}

interface WidgetWarningState extends WidgetGenericState {
    level: number;
    title: string | null;
    info: string | null;
    start: string | null;
    end: string | null;
}

export class WidgetWarning extends WidgetGeneric<WidgetWarningState, AlarmWidgetSettings> {
    private readonly levelId: string | null;
    private readonly titleId: string | null;
    private readonly infoId: string | null;
    private readonly startId: string | null;
    private readonly endId: string | null;

    constructor(props: WidgetGenericProps<AlarmWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;

        this.levelId = states.find(s => s.name === 'LEVEL')?.id ?? null;
        this.titleId = states.find(s => s.name === 'TITLE')?.id ?? null;
        this.infoId = states.find(s => s.name === 'INFO')?.id ?? null;
        this.startId = states.find(s => s.name === 'START')?.id ?? null;
        this.endId = states.find(s => s.name === 'END')?.id ?? null;

        this.state = {
            ...this.state,
            level: 0,
            title: null,
            info: null,
            start: null,
            end: null,
        };
    }

    static getDefaultSettings(): AlarmWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            hideWhenOk: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.levelId) {
            this.props.stateContext.getState(this.levelId, this.onLevelChange);
        }
        if (this.titleId) {
            this.props.stateContext.getState(this.titleId, this.onTitleChange);
        }
        if (this.infoId) {
            this.props.stateContext.getState(this.infoId, this.onInfoChange);
        }
        if (this.startId) {
            this.props.stateContext.getState(this.startId, this.onStartChange);
        }
        if (this.endId) {
            this.props.stateContext.getState(this.endId, this.onEndChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.levelId) {
            this.props.stateContext.removeState(this.levelId, this.onLevelChange);
        }
        if (this.titleId) {
            this.props.stateContext.removeState(this.titleId, this.onTitleChange);
        }
        if (this.infoId) {
            this.props.stateContext.removeState(this.infoId, this.onInfoChange);
        }
        if (this.startId) {
            this.props.stateContext.removeState(this.startId, this.onStartChange);
        }
        if (this.endId) {
            this.props.stateContext.removeState(this.endId, this.onEndChange);
        }
    }

    private onLevelChange = (_id: string, state: ioBroker.State): void => {
        const level = Math.round(Number(state.val) || 0);
        if (level !== this.state.level) {
            this.setState({ level });
        }
    };

    private onTitleChange = (_id: string, state: ioBroker.State): void => {
        const title = state.val != null ? String(state.val) : null;
        if (title !== this.state.title) {
            this.setState({ title });
        }
    };

    private onInfoChange = (_id: string, state: ioBroker.State): void => {
        const info = state.val != null ? String(state.val) : null;
        if (info !== this.state.info) {
            this.setState({ info });
        }
    };

    private onStartChange = (_id: string, state: ioBroker.State): void => {
        const start = state.val != null ? String(state.val) : null;
        if (start !== this.state.start) {
            this.setState({ start });
        }
    };

    private onEndChange = (_id: string, state: ioBroker.State): void => {
        const end = state.val != null ? String(state.val) : null;
        if (end !== this.state.end) {
            this.setState({ end });
        }
    };

    protected getAccentColor(): string | undefined {
        if (this.state.level > 0) {
            return super.getAccentColor() || getLevelColor(this.state.level);
        }
        return super.getAccentColor();
    }

    protected isTileActive(): boolean {
        return this.state.level > 0;
    }

    protected renderTileIcon(): React.JSX.Element {
        const { level } = this.state;
        const color = getLevelColor(level);

        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon =
            level > 0 ? this.props.settings?.iconActive || this.props.settings?.icon : this.props.settings?.icon;
        if (customIcon) {
            return (
                <Icon
                    src={customIcon}
                    style={{
                        width: '1em',
                        height: '1em',
                        color: level > 0 ? color : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        return (
            <WarningIcon
                sx={{
                    color: level > 0 ? color : 'text.disabled',
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { level, title } = this.state;
        const color = getLevelColor(level);

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: level > 0 ? color : 'success.main',
                        transition: 'color 0.25s ease',
                    }}
                >
                    {level > 0
                        ? title || this.props.settings?.textActive || I18n.t('wm_Warning')
                        : this.props.settings?.text || I18n.t('wm_OK')}
                </Typography>
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { level, title, start, end } = this.state;
        const color = getLevelColor(level);

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: level > 0 ? color : 'success.main',
                    }}
                >
                    {level > 0
                        ? title || this.props.settings?.textActive || I18n.t('wm_Warning')
                        : this.props.settings?.text || I18n.t('wm_OK')}
                </Typography>
                {start || end ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                        {start && end ? `${start} – ${end}` : start || end}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    render(): React.JSX.Element {
        if (this.props.settings?.hideWhenOk && this.state.level <= 0) {
            if (!this.props.onOpenSettings) {
                return (
                    <div
                        data-wm-hidden
                        style={{ display: 'none' }}
                    />
                );
            }
            return <Box sx={{ opacity: 0.5 }}>{super.render()}</Box>;
        }
        return super.render();
    }
}

export default WidgetWarning;
