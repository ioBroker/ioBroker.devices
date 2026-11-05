import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';

import type { ConfigItemPanel } from '@iobroker/json-config';
import { I18n } from '@iobroker/gui-components';

import type { CustomWidgetPlugin } from '../../../../packages/dm-widgets/src/index';
import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';
import RemoveWidgetButton from './RemoveWidgetButton';
import { describePluginError, getLoadedPluginComponent, loadPluginComponent } from '../pluginLoader';

interface WidgetPluginProps extends WidgetGenericProps<CustomWidgetPlugin> {
    /** Removes the tile; only in the edit mode */
    onRemove?: () => void;
}

/** Below this width the tile shows only the name of the widget that failed and the delete button */
const NARROW = '@container (max-width: 179.98px)';

interface WidgetPluginState extends WidgetGenericState {
    PluginComp: typeof WidgetGeneric<any, any> | null;
    loading: boolean;
    error: string | null;
}

interface PluginErrorBoundaryProps {
    children: React.ReactNode;
    onError: (error: Error) => void;
}

/**
 * A plugin that was built against another React version throws while rendering and would tear
 * down the whole widget tree with it. Keep the damage inside the single tile.
 */
class PluginErrorBoundary extends React.Component<PluginErrorBoundaryProps, { failed: boolean }> {
    constructor(props: PluginErrorBoundaryProps) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error): void {
        this.props.onError(error);
    }

    render(): React.ReactNode {
        return this.state.failed ? null : this.props.children;
    }
}

export class WidgetPlugin extends WidgetGeneric<WidgetPluginState, CustomWidgetPlugin> {
    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Plugin',
            items: {},
        };
    }

    declare readonly props: Readonly<WidgetPluginProps>;

    private mounted = false;

    constructor(props: WidgetPluginProps) {
        super(props);
        // A loaded plugin renders at once. Drag & drop remounts the tile whenever it moves to another
        // slot; a loading placeholder of another size in between shifts the grid, the drag target flips
        // back and the widget is moved to and fro until React gives up (error #185).
        const { pluginAdapter, pluginComponent } = props.settings;
        const PluginComp =
            pluginAdapter && pluginComponent
                ? (getLoadedPluginComponent(pluginAdapter, pluginComponent) as typeof WidgetGeneric<any, any> | null)
                : null;
        this.state = { ...this.state, PluginComp, loading: !PluginComp, error: null };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.mounted = true;
        if (!this.state.PluginComp) {
            this.loadComponent();
        }
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
                    this.setState({ loading: false, error: describePluginError(pluginAdapter, err) });
                }
            });
    }

    private onPluginError = (error: Error): void => {
        const { pluginAdapter, pluginComponent } = this.props.settings;
        console.error(`Widget plugin "${pluginAdapter}/${pluginComponent}" crashed while rendering: ${error.message}`);
        if (this.mounted) {
            this.setState({
                PluginComp: null,
                loading: false,
                error: describePluginError(pluginAdapter || '', error),
            });
        }
    };

    render(): React.JSX.Element {
        const { PluginComp, loading, error } = this.state;
        const id = String(this.props.widget.id);
        const { pluginAdapter, pluginComponent } = this.props.settings;

        // Loading or error state
        if (loading || error || !PluginComp) {
            const size = this.props.settings.size;
            const isWideTall = size === '2x1';
            const isWide = size === '2x0.5';

            const { onRemove } = this.props;
            // The low tiles have the delete button beside the text, the square one below it
            const row = isWide || isWideTall;
            const content = (
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: row ? 'row' : 'column',
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
                            {/* With the delete button there is no room for the symbol */}
                            {row || onRemove ? null : (
                                <Extension
                                    sx={{ fontSize: 32, opacity: 0.3, flexShrink: 0, [NARROW]: { display: 'none' } }}
                                />
                            )}
                            {/* The whole error on hover; on the tile only its beginning, the URLs in it are long */}
                            <Box
                                title={error || undefined}
                                sx={{
                                    flex: row ? 1 : undefined,
                                    minWidth: 0,
                                    maxWidth: '100%',
                                    textAlign: row ? 'left' : 'center',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{ color: 'error.main', fontWeight: 500, lineHeight: 1.3 }}
                                >
                                    {I18n.t('wm_Widget cannot be loaded', `${pluginAdapter}/${pluginComponent}`)}
                                </Typography>
                                {error ? (
                                    <Typography
                                        variant="caption"
                                        component="div"
                                        sx={{
                                            color: 'text.secondary',
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                            WebkitLineClamp: isWide ? 1 : isWideTall ? 4 : 3,
                                            [NARROW]: { display: 'none' },
                                        }}
                                    >
                                        {error}
                                    </Typography>
                                ) : null}
                            </Box>
                            {onRemove ? <RemoveWidgetButton onRemove={onRemove} /> : null}
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
                    {/* The settings dialog of the tile can delete it as well */}
                    {this.renderIndicators(this.renderSettingsButton())}
                </Box>
            );
        }

        // Render the loaded plugin component with full WidgetGenericProps
        const comp = (
            <PluginErrorBoundary onError={this.onPluginError}>
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
            </PluginErrorBoundary>
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
