import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';
import WidgetGeneric, {} from './Generic';
import { loadPluginComponent } from '../pluginLoader';
export class WidgetPlugin extends WidgetGeneric {
    static getConfigSchema() {
        return {
            type: 'panel',
            label: 'wm_Plugin',
            items: {},
        };
    }
    mounted = false;
    constructor(props) {
        super(props);
        this.state = { ...this.state, PluginComp: null, loading: true, error: null };
    }
    componentDidMount() {
        super.componentDidMount();
        this.mounted = true;
        this.loadComponent();
    }
    componentDidUpdate(prevProps) {
        if (prevProps.settings.pluginAdapter !== this.props.settings.pluginAdapter ||
            prevProps.settings.pluginComponent !== this.props.settings.pluginComponent ||
            prevProps.settings.pluginUrl !== this.props.settings.pluginUrl) {
            this.loadComponent();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.mounted = false;
    }
    loadComponent() {
        const { pluginUrl, pluginAdapter, pluginComponent } = this.props.settings;
        if (!pluginUrl || !pluginAdapter || !pluginComponent) {
            this.setState({ loading: false, error: 'Missing plugin configuration' });
            return;
        }
        this.setState({ loading: true, error: null });
        loadPluginComponent(pluginUrl, pluginAdapter, pluginComponent, this.props.stateContext.admin)
            .then(Comp => {
            if (this.mounted) {
                this.setState({ PluginComp: Comp, loading: false });
            }
        })
            .catch(err => {
            if (this.mounted) {
                this.setState({ loading: false, error: String(err?.message || err) });
            }
        });
    }
    render() {
        const { PluginComp, loading, error } = this.state;
        const id = String(this.props.widget.id);
        const { pluginAdapter, pluginComponent } = this.props.settings;
        // Loading or error state
        if (loading || error || !PluginComp) {
            const size = this.props.settings.size;
            const isWideTall = size === '2x1';
            const isWide = size === '2x0.5';
            const content = (React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    ...(isWideTall
                        ? { position: 'absolute', inset: 0 }
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
                }) }, loading ? (React.createElement(CircularProgress, { size: 24 })) : (React.createElement(React.Fragment, null,
                React.createElement(Extension, { sx: { fontSize: 32, opacity: 0.3 } }),
                React.createElement(Typography, { variant: "caption", sx: { color: 'error.main', textAlign: 'center', px: 1 } }, error || `${pluginAdapter}/${pluginComponent}`)))));
            return (React.createElement(Box, { id: id, sx: theme => isWideTall
                    ? WidgetGeneric.getStyleWideTall(theme)
                    : isWide
                        ? WidgetGeneric.getStyleWide(theme)
                        : WidgetGeneric.getStyleCompact(theme) },
                isWideTall && React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
                content));
        }
        // Render the loaded plugin component with full WidgetGenericProps
        const comp = (React.createElement(PluginComp, { widget: this.props.widget, stateContext: this.props.stateContext, settings: this.props.settings, onOpenSettings: this.props.onOpenSettings, openDialogId: this.props.openDialogId, onOpenWidgetDialog: this.props.onOpenWidgetDialog, onCloseWidgetDialog: this.props.onCloseWidgetDialog, onHide: this.props.onHide }));
        // Enforce correct height for 2x1 plugins via the sizer pattern
        if (this.props.settings.size === '2x1') {
            return (React.createElement(Box, { sx: {
                    position: 'relative',
                    gridColumn: 'span 2',
                    overflow: 'hidden',
                } },
                React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
                React.createElement(Box, { sx: {
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
                    } }, comp)));
        }
        return comp;
    }
}
export default WidgetPlugin;
//# sourceMappingURL=WidgetPlugin.js.map