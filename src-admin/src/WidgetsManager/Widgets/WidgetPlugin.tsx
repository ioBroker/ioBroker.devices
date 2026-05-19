import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';

import type { ConfigItemPanel } from '@iobroker/json-config';

import type { CustomWidgetPlugin } from '../../../../packages/dm-widgets/src/index';
import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';
import { loadPluginComponent } from '../pluginLoader';

interface WidgetPluginState extends WidgetGenericState {
    PluginComp: typeof WidgetGeneric<any, any> | null;
    loading: boolean;
    error: string | null;
}

export class WidgetPlugin extends WidgetGeneric<WidgetPluginState, CustomWidgetPlugin> {
    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Plugin',
            items: {},
        };
    }

    private mounted = false;

    constructor(props: WidgetGenericProps<CustomWidgetPlugin>) {
        super(props);
        this.state = { ...this.state, PluginComp: null, loading: true, error: null };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.mounted = true;
        this.loadComponent();
    }

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps<CustomWidgetPlugin>>): void {
        if (
            prevProps.settings.pluginAdapter !== this.props.settings.pluginAdapter ||
            prevProps.settings.pluginComponent !== this.props.settings.pluginComponent ||
            prevProps.settings.pluginUrl !== this.props.settings.pluginUrl
        ) {
            this.loadComponent();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.mounted = false;
    }

    private loadComponent(): void {
        const { pluginUrl, pluginAdapter, pluginComponent } = this.props.settings;
        if (!pluginUrl || !pluginAdapter || !pluginComponent) {
            this.setState({ loading: false, error: 'Missing plugin configuration' });
            return;
        }

        this.setState({ loading: true, error: null });

        loadPluginComponent(pluginUrl, pluginAdapter, pluginComponent, this.props.stateContext.admin)
            .then(Comp => {
                if (this.mounted) {
                    this.setState({ PluginComp: Comp as any, loading: false });
                }
            })
            .catch(err => {
                if (this.mounted) {
                    this.setState({ loading: false, error: String(err?.message || err) });
                }
            });
    }

    render(): React.JSX.Element {
        const { PluginComp, loading, error } = this.state;
        const id = String(this.props.widget.id);
        const { pluginAdapter, pluginComponent } = this.props.settings;

        // Loading or error state
        if (loading || error || !PluginComp) {
            const size = this.props.settings.size;
            const isWideTall = size === '2x1';
            const isWide = size === '2x0.5';

            const content = (
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        ...(isWideTall
                            ? { position: 'absolute' as const, inset: 0 }
                            : {
                                  aspectRatio: isWide ? undefined : '1',
                                  height: isWide ? 80 : undefined,
                              }),
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, {
                            interactive: false,
                            accent: this.props.settings.color,
                            inactiveColor: this.props.settings.color,
                        }),
                        gap: 1,
                    })}
                >
                    {loading ? (
                        <CircularProgress size={24} />
                    ) : (
                        <>
                            <Extension sx={{ fontSize: 32, opacity: 0.3 }} />
                            <Typography
                                variant="caption"
                                sx={{ color: 'error.main', textAlign: 'center', px: 1 }}
                            >
                                {error || `${pluginAdapter}/${pluginComponent}`}
                            </Typography>
                        </>
                    )}
                </Box>
            );

            return (
                <Box
                    id={id}
                    sx={theme =>
                        isWideTall
                            ? WidgetGeneric.getStyleWideTall(theme)
                            : isWide
                              ? WidgetGeneric.getStyleWide(theme)
                              : WidgetGeneric.getStyleCompact(theme)
                    }
                >
                    {/* Sizer: matches 1x1 tile height for 2x1 layout */}
                    {isWideTall && <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />}
                    {content}
                </Box>
            );
        }

        // Render the loaded plugin component with full WidgetGenericProps
        const comp = (
            <PluginComp
                widget={this.props.widget}
                stateContext={this.props.stateContext}
                settings={this.props.settings}
                onOpenSettings={this.props.onOpenSettings}
                openDialogId={this.props.openDialogId}
                onOpenWidgetDialog={this.props.onOpenWidgetDialog}
                onCloseWidgetDialog={this.props.onCloseWidgetDialog}
                onHide={this.props.onHide}
            />
        );

        // Enforce correct height for 2x1 plugins via the sizer pattern
        if (this.props.settings.size === '2x1') {
            return (
                <Box
                    sx={{
                        position: 'relative',
                        gridColumn: 'span 2',
                        overflow: 'hidden',
                    }}
                >
                    {/* Sizer: one column wide with aspect-ratio 1 to match 1x1 tile height */}
                    <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            // Override plugin's own grid/aspect sizing so it fills the wrapper
                            '& > *': {
                                width: '100%',
                                height: '100%',
                                gridColumn: 'unset',
                                aspectRatio: 'unset',
                            },
                            // Override aspect ratio on plugin's inner content box
                            '& > * > *': {
                                aspectRatio: 'unset',
                                height: '100%',
                            },
                        }}
                    >
                        {comp}
                    </Box>
                </Box>
            );
        }

        return comp;
    }
}

export default WidgetPlugin;
