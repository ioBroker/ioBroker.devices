import React, { Component } from 'react';
import { Box, type Theme, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';
import * as Icons from '@mui/icons-material';

import type StateContext from '../StateContext';
import type { StateChangeListener } from '../StateContext';
import WidgetGeneric, { getTileStyles, formatFloat } from './Generic';

interface ColorLevel {
    value: number;
    color: string;
}

interface IconDef {
    stateId: string;
    icon: string;
    color: string;
}

interface WidgetUniversalProps {
    id: string;
    language: ioBroker.Languages;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    stateId?: string;
    secondaryStateId?: string;
    opacityStateId?: string;
    opacityFalse?: number;
    opacityTrue?: number;
    colorLevels?: ColorLevel[];
    icons?: IconDef[];
    stateContext?: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
    isFloatComma?: boolean;
}

interface WidgetUniversalState {
    value: number | null;
    unit: string;
    secondaryValue: number | null;
    secondaryUnit: string;
    opacity: number;
    iconStates: boolean[];
}

export class WidgetUniversal extends Component<WidgetUniversalProps, WidgetUniversalState> {
    private primaryHandler: StateChangeListener | null = null;
    private secondaryHandler: StateChangeListener | null = null;
    private opacityHandler: StateChangeListener | null = null;
    private iconHandlers: (StateChangeListener | null)[] = [];

    constructor(props: WidgetUniversalProps) {
        super(props);
        this.state = {
            value: null,
            unit: '',
            secondaryValue: null,
            secondaryUnit: '',
            opacity: 1,
            iconStates: [false, false, false],
        };
    }

    componentDidMount(): void {
        this.subscribe();
    }

    componentDidUpdate(prev: WidgetUniversalProps): void {
        if (
            prev.stateId !== this.props.stateId ||
            prev.secondaryStateId !== this.props.secondaryStateId ||
            prev.opacityStateId !== this.props.opacityStateId ||
            prev.icons !== this.props.icons
        ) {
            this.unsubscribe();
            this.subscribe();
        }
    }

    componentWillUnmount(): void {
        this.unsubscribe();
    }

    private subscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }

        // Primary value
        if (this.props.stateId) {
            this.primaryHandler = (_id, state) => {
                const val = state?.val;
                this.setState({ value: val != null ? Number(val) : null });
            };
            ctx.getState(this.props.stateId, this.primaryHandler);
            // Get unit from object
            void ctx.getObject<ioBroker.StateObject>(this.props.stateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ unit: obj.common.unit });
                }
            });
        }

        // Secondary value
        if (this.props.secondaryStateId) {
            this.secondaryHandler = (_id, state) => {
                const val = state?.val;
                this.setState({ secondaryValue: val != null ? Number(val) : null });
            };
            ctx.getState(this.props.secondaryStateId, this.secondaryHandler);
            void ctx.getObject<ioBroker.StateObject>(this.props.secondaryStateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ secondaryUnit: obj.common.unit });
                }
            });
        }

        // Opacity
        if (this.props.opacityStateId) {
            this.opacityHandler = (_id, state) => {
                const val = state?.val;
                if (typeof val === 'boolean') {
                    this.setState({
                        opacity: val ? (this.props.opacityTrue ?? 1) : (this.props.opacityFalse ?? 0),
                    });
                } else if (val != null) {
                    // Will compute properly once we have min/max from object
                    this.computeNumericOpacity(Number(val));
                }
            };
            ctx.getState(this.props.opacityStateId, this.opacityHandler);
            // Store min/max for numeric opacity calculation
            void ctx.getObject<ioBroker.StateObject>(this.props.opacityStateId).then(obj => {
                const common = obj?.common;
                this.opacityMeta = {
                    min: common?.min,
                    max: common?.max,
                    type: common?.type,
                };
            });
        }

        // Icons (up to 3)
        const icons = (this.props.icons || []).slice(0, 3);
        this.iconHandlers = icons.map((iconDef, idx) => {
            if (!iconDef.stateId) {
                return null;
            }
            const handler: StateChangeListener = (_id, state) => {
                this.setState(prev => {
                    const iconStates = [...prev.iconStates];
                    iconStates[idx] = !!state?.val;
                    return { iconStates };
                });
            };
            ctx.getState(iconDef.stateId, handler);
            return handler;
        });
    }

    private opacityMeta: { min?: number; max?: number; type?: string } = {};

    private computeNumericOpacity(val: number): void {
        const { min, max } = this.opacityMeta;
        let opacity: number;
        if (min != null && max != null && max !== min) {
            opacity = Math.max(0, Math.min(1, (val - min) / (max - min)));
        } else {
            // Assume 0-1 range
            opacity = Math.max(0, Math.min(1, val));
        }
        this.setState({ opacity });
    }

    private unsubscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.primaryHandler && this.props.stateId) {
            ctx.removeState(this.props.stateId, this.primaryHandler);
            this.primaryHandler = null;
        }
        if (this.secondaryHandler && this.props.secondaryStateId) {
            ctx.removeState(this.props.secondaryStateId, this.secondaryHandler);
            this.secondaryHandler = null;
        }
        if (this.opacityHandler && this.props.opacityStateId) {
            ctx.removeState(this.props.opacityStateId, this.opacityHandler);
            this.opacityHandler = null;
        }
        const icons = (this.props.icons || []).slice(0, 3);
        for (let i = 0; i < this.iconHandlers.length; i++) {
            const handler = this.iconHandlers[i];
            if (handler && icons[i]?.stateId) {
                ctx.removeState(icons[i].stateId, handler);
            }
        }
        this.iconHandlers = [];
    }

    private getValueColor(): string | undefined {
        const { value } = this.state;
        const levels = this.props.colorLevels;
        if (value == null || !levels?.length) {
            return this.props.color || undefined;
        }
        const sorted = [...levels].sort((a, b) => a.value - b.value);
        for (const lvl of sorted) {
            if (value <= lvl.value) {
                return lvl.color;
            }
        }
        return sorted[sorted.length - 1].color;
    }

    private formatValue(val: number): string {
        if (Math.abs(val) >= 1000) {
            return formatFloat(val, 0, this.props.isFloatComma);
        }
        if (Math.abs(val) >= 10) {
            return formatFloat(val, 1, this.props.isFloatComma);
        }
        return formatFloat(val, 1, this.props.isFloatComma);
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
                    this.props.onOpenSettings!(this.props.id);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.id);
                    }
                }}
                sx={WidgetGeneric.getSettingButtonStyle()}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    static renderIcon(iconDef: IconDef, active: boolean): React.JSX.Element | null {
        if (!active || !iconDef.icon) {
            return null;
        }
        const IconComp = (Icons as Record<string, React.ComponentType<{ sx?: object }>>)[iconDef.icon];
        if (!IconComp) {
            return null;
        }
        return <IconComp sx={{ fontSize: 18, color: iconDef.color || 'text.primary' }} />;
    }

    render(): React.JSX.Element | null {
        const { opacity, value, unit, secondaryValue, secondaryUnit, iconStates } = this.state;

        // If opacity is 0, hide completely
        if (opacity <= 0) {
            return null;
        }

        const valueColor = this.getValueColor();
        const icons = (this.props.icons || []).slice(0, 3);
        const activeIcons = icons.filter((_, i) => iconStates[i]);

        return (
            <Box
                sx={theme => ({
                    ...WidgetGeneric.getStyleCompact(theme),
                    opacity: opacity < 1 ? opacity : undefined,
                    transition: 'opacity 0.3s ease',
                })}
            >
                <Box
                    sx={(theme: Theme) => ({
                        ...getTileStyles(theme, false, this.props.color, false),
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        p: 1.5,
                        containerType: 'inline-size',
                    })}
                >
                    {this.renderSettingsButton()}

                    {/* Secondary value — upper right */}
                    {secondaryValue != null ? (
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                fontSize: '11cqi',
                                lineHeight: 1,
                                color: 'text.secondary',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {this.formatValue(secondaryValue)}
                            {secondaryUnit ? (
                                <Typography
                                    component="span"
                                    sx={{ fontSize: '0.75em', ml: 0.25, opacity: 0.7 }}
                                >
                                    {secondaryUnit}
                                </Typography>
                            ) : null}
                        </Typography>
                    ) : null}

                    {/* Icon indicators — upper left */}
                    {activeIcons.length > 0 ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                display: 'flex',
                                gap: 0.5,
                            }}
                        >
                            {icons.map((iconDef, i) => (
                                <React.Fragment key={i}>
                                    {WidgetUniversal.renderIcon(iconDef, iconStates[i])}
                                </React.Fragment>
                            ))}
                        </Box>
                    ) : null}

                    {/* Primary value — center */}
                    {value != null ? (
                        <Typography
                            sx={{
                                fontSize: '32cqi',
                                fontWeight: 700,
                                lineHeight: 1,
                                color: valueColor,
                                textAlign: 'center',
                            }}
                        >
                            {this.formatValue(value)}
                            {unit ? (
                                <Typography
                                    component="span"
                                    sx={{ fontSize: '0.45em', fontWeight: 400, ml: 0.5, opacity: 0.7 }}
                                >
                                    {unit}
                                </Typography>
                            ) : null}
                        </Typography>
                    ) : (
                        <Typography sx={{ fontSize: '28cqi', color: 'text.disabled' }}>—</Typography>
                    )}
                </Box>
            </Box>
        );
    }
}
