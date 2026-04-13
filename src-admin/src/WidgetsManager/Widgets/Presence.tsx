import React, { Component } from 'react';
import { Box, Typography } from '@mui/material';
import { People, Settings } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import type { ConfigItemPanel } from '@iobroker/json-config';

import type StateContext from '../StateContext';
import type { StateChangeListener } from '../StateContext';
import WidgetGeneric, { getTileStyles } from './Generic';
import type { CustomWidgetBase } from '@iobroker/dm-widgets';

export interface WidgetPresenceSettings extends CustomWidgetBase {
    /** Icon URL/data-URI (from icon picker) */
    widgetIcon?: string;
    /** State ID for presence boolean */
    presenceStateId?: string;
    /** Invert presence logic (true = away) */
    invert?: boolean;
    /** How to show absent: 'hide' completely hides, 'dim' shows grey/dimmed */
    absentMode?: 'hide' | 'dim';
}

interface WidgetPresenceProps {
    settings: WidgetPresenceSettings;
    stateContext: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
}

interface WidgetPresenceState {
    present: boolean;
    lastChange: number | null;
}

export class WidgetPresence extends Component<WidgetPresenceProps, WidgetPresenceState> {
    static getConfigSchema(): ConfigItemPanel {
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
                color: { type: 'color', label: 'wm_Active color' },
            },
        };
    }

    private presenceHandler: StateChangeListener | null = null;
    private timerInterval: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetPresenceProps) {
        super(props);
        this.state = {
            present: false,
            lastChange: null,
        };
    }

    componentDidMount(): void {
        this.subscribe();
        // Update "time ago" display every 60 seconds
        this.timerInterval = setInterval(() => {
            if (this.state.lastChange != null) {
                this.forceUpdate();
            }
        }, 60_000);
    }

    componentDidUpdate(prev: WidgetPresenceProps): void {
        if (prev.settings.presenceStateId !== this.props.settings.presenceStateId) {
            this.unsubscribe();
            this.subscribe();
        }
    }

    componentWillUnmount(): void {
        this.unsubscribe();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private subscribe(): void {
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

    private unsubscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.presenceHandler && this.props.settings.presenceStateId) {
            ctx.removeState(this.props.settings.presenceStateId, this.presenceHandler);
            this.presenceHandler = null;
        }
    }

    static formatTimeAgo(lc: number): string {
        const now = Date.now();
        const diffMs = now - lc;
        if (diffMs < 0) {
            return I18n.t('wm_just_now');
        }

        const diffMin = Math.floor(diffMs / 60_000);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMin < 1) {
            return I18n.t('wm_just_now');
        }
        if (diffMin < 60) {
            return `${diffMin} min`;
        }
        if (diffHours < 24) {
            return `${diffHours}h`;
        }
        return `${diffDays}d`;
    }

    private renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={e => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.settings.id);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.settings.id);
                    }
                }}
                sx={WidgetGeneric.getSettingButtonStyle()}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    render(): React.JSX.Element | null {
        const { present, lastChange } = this.state;
        const { widgetIcon, absentMode, color } = this.props.settings;
        const isEditing = !!this.props.onOpenSettings;

        // Hide completely if absent and mode is 'hide' (but always show in edit mode)
        if (!present && absentMode === 'hide' && !isEditing) {
            return null;
        }

        const dimmed = !present && absentMode === 'dim';

        return (
            <Box sx={theme => WidgetGeneric.getStyleCompact(theme)}>
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        position: 'relative',
                        overflow: 'hidden',
                        ...getTileStyles(theme, present, color, false),
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
                    })}
                >
                    {/* Icon */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'max(48px, 35cqi)',
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {widgetIcon ? (
                            <Icon
                                src={widgetIcon}
                                style={{
                                    width: 'max(48px, 35cqi)',
                                    height: 'max(48px, 35cqi)',
                                    color: present ? (color || '#4caf50') : '#888',
                                }}
                            />
                        ) : (
                            <People sx={{ fontSize: 'inherit', color: present ? (color || '#4caf50') : '#888' }} />
                        )}
                    </Box>
                    {/* Name + last change */}
                    <Box sx={{ width: '100%', px: 'max(8px, 5cqi)', pb: 'max(6px, 4cqi)' }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{
                                fontWeight: 600,
                                fontSize: 'max(0.75rem, 4cqi)',
                                lineHeight: 1.3,
                            }}
                        >
                            {this.props.settings.name || I18n.t('wm_Presence')}
                        </Typography>
                        {lastChange != null && (
                            <Typography
                                variant="caption"
                                sx={{
                                    opacity: 0.6,
                                    fontSize: 'max(0.6rem, 3cqi)',
                                    display: 'block',
                                    lineHeight: 1.2,
                                }}
                            >
                                {WidgetPresence.formatTimeAgo(lastChange)}
                            </Typography>
                        )}
                    </Box>
                    {this.renderSettingsButton()}
                </Box>
            </Box>
        );
    }
}
