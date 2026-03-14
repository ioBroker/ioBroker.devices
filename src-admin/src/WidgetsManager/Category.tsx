import React, { Component } from 'react';

import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { ArrowBack, ChevronRight, MeetingRoom } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import type { CategoryInfo, WidgetInfo } from '../../../src/widget-utils';
import { type WidgetGenericProps, type WidgetSettings, WidgetSwitch, WidgetDimmer, WidgetTemperature, WidgetMotion } from './Widgets';
import type StateContext from './StateContext';

interface CategoryProps {
    category: CategoryInfo;
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    language: ioBroker.Languages;
    stateContext: StateContext;
    onNavigate: (category: CategoryInfo) => void;
    widgetSettings: Record<string, WidgetSettings>;
    onOpenSettings?: (widgetId: string | number) => void;
}

interface CategoryState {
    names: { [categoryId: string]: string };
    icons: { [categoryId: string]: string };
    colors: { [categoryId: string]: string };
}

export default class Category extends Component<CategoryProps, CategoryState> {
    private internalValues: {
        names: { [categoryId: string]: string };
        icons: { [categoryId: string]: string };
        colors: { [categoryId: string]: string };
    } = {
        names: {},
        icons: {},
        colors: {},
    };
    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            names: {},
            icons: {},
            colors: {},
        };
    }

    private get widgets(): WidgetInfo[] {
        return this.props.widgets.filter(w => w.parent === this.props.category.id);
    }

    private get subCategories(): CategoryInfo[] {
        return this.props.categories.filter(c => c.parent === this.props.category.id);
    }

    readCategorySettings(
        category: CategoryInfo,
        state: {
            names: { [categoryId: string]: string };
            icons: { [categoryId: string]: string };
            colors: { [categoryId: string]: string };
        },
    ): void {
        if (category.name && typeof category.name === 'object') {
            if ((category.name as ioBroker.Translated).en) {
                state.names[category.id] = this.getText(category.name as ioBroker.Translated);
            } else if ((category.name as { objectId: string; property: string }).objectId) {
                this.props.stateContext.getObjectProperty(
                    (category.name as { objectId: string; property: string }).objectId,
                    (category.name as { objectId: string; property: string }).property,
                    this.onNameChange,
                );
            }
        } else {
            state.names[category.id] = category.name || '';
        }

        if (category.icon && typeof category.icon === 'object') {
            if ((category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onIconChange,
                );
            }
        } else if (typeof category.icon === 'string') {
            state.icons[category.id] = category.icon;
        }

        if (category.color && typeof category.color === 'object') {
            if ((category.color as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (category.color as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onColorChange,
                );
            }
        } else if (typeof category.color === 'string') {
            state.colors[category.id] = category.color;
        }
    }

    componentDidMount(): void {
        this.internalValues = {
            names: {},
            icons: {},
            colors: {},
        };
        this.readCategorySettings(this.props.category, this.internalValues);
        this.subCategories.forEach(c => this.readCategorySettings(c, this.internalValues));
        this.setState({ ...this.internalValues });
    }

    onNameChange = (id: string, property: string, value: ioBroker.StringOrTranslated): void => {
        const text = this.getText(value);
        const struct = this.props.category.name as { objectId: string; property: string };
        let changed = false;
        if (this.props.category.name && typeof this.props.category.name === 'object' && struct.objectId) {
            if (
                struct.objectId === id &&
                struct.property === property &&
                text !== this.internalValues.names[this.props.category.id]
            ) {
                this.internalValues.names[this.props.category.id] = text;
                changed = true;
            }
        }

        this.subCategories.forEach(c => {
            if (c.name && typeof c.name === 'object') {
                const struct = c.name as { objectId: string; property: string };
                if (
                    struct.objectId === id &&
                    struct.property === property &&
                    text !== this.internalValues.names[c.id]
                ) {
                    this.internalValues.names[c.id] = text;
                    changed = true;
                }
            }
        });

        if (changed) {
            this.setState({ names: this.internalValues.names });
        }
    };

    onColorChange = (id: string, state: ioBroker.State): void => {
        let changed = false;

        if (this.props.category.color && typeof this.props.category.color === 'object') {
            const struct = this.props.category.color as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let color = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    color = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    color = (state.val as string) || '';
                }
                if (color !== this.internalValues.colors[this.props.category.id]) {
                    this.internalValues.colors[this.props.category.id] = color;
                    changed = true;
                }
            }
        }

        this.subCategories.forEach(c => {
            if (c.color && typeof c.color === 'object') {
                const struct = c.color as { stateId?: string; mapping?: Record<string | number, string> };
                if (struct.stateId === id) {
                    let color = '';
                    if (struct.mapping && struct.mapping[state.val as string]) {
                        color = struct.mapping[state.val as string];
                    } else if (state.val !== undefined && state.val !== null) {
                        color = (state.val as string) || '';
                    }
                    if (color !== this.internalValues.colors[c.id]) {
                        this.internalValues.colors[c.id] = color;
                        changed = true;
                    }
                }
            }
        });

        if (changed) {
            this.setState({ colors: this.internalValues.colors });
        }
    };

    onIconChange = (id: string, state: ioBroker.State): void => {
        let changed = false;

        if (this.props.category.icon && typeof this.props.category.icon === 'object') {
            const struct = this.props.category.icon as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let iconValue = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    iconValue = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    iconValue = (state.val as string) || '';
                }
                if (iconValue !== this.internalValues.icons[this.props.category.id]) {
                    this.internalValues.icons[this.props.category.id] = iconValue;
                    changed = true;
                }
            }
        }

        this.subCategories.forEach(c => {
            if (c.icon && typeof c.icon === 'object') {
                const struct = c.icon as { stateId?: string; mapping?: Record<string | number, string> };
                if (struct.stateId === id) {
                    let iconValue = '';
                    if (struct.mapping && struct.mapping[state.val as string]) {
                        iconValue = struct.mapping[state.val as string];
                    } else if (state.val !== undefined && state.val !== null) {
                        iconValue = (state.val as string) || '';
                    }
                    if (iconValue !== this.internalValues.icons[c.id]) {
                        this.internalValues.icons[c.id] = iconValue;
                        changed = true;
                    }
                }
            }
        });

        if (changed) {
            this.setState({ icons: this.internalValues.icons });
        }
    };

    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    renderWidget(widget: WidgetInfo): React.JSX.Element {
        let Widget: React.ComponentType<WidgetGenericProps> | undefined;
        if (widget.control && widget.control.type === Types.socket) {
            Widget = WidgetSwitch;
        } else if (widget.control && widget.control.type === Types.dimmer) {
            Widget = WidgetDimmer;
        } else if (widget.control && widget.control.type === Types.temperature) {
            Widget = WidgetTemperature;
        } else if (widget.control && widget.control.type === Types.motion) {
            Widget = WidgetMotion;
        }

        if (!Widget) {
            return <div key={widget.id}>{I18n.t('wm_Unknown type')}</div>;
        }
        const settings = this.props.widgetSettings[String(widget.id)];
        return (
            <Widget
                key={widget.id}
                stateContext={this.props.stateContext}
                widget={widget}
                language={this.props.language}
                settings={settings}
                onOpenSettings={this.props.onOpenSettings}
            />
        );
    }

    renderCategoryTile(category: CategoryInfo): React.JSX.Element {
        const icon = this.state.icons[category.id];
        const name = this.state.names[category.id] ?? '...';
        const deviceCount = this.props.widgets.filter(w => w.parent === category.id).length;

        return (
            <ButtonBase
                key={category.id}
                component="div"
                onClick={() => this.props.onNavigate(category)}
                sx={theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    gridColumn: '1 / -1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    p: 2,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                })}
            >
                {icon ? (
                    <Icon
                        src={icon}
                        style={{ width: 28, height: 28, flexShrink: 0 }}
                    />
                ) : (
                    <MeetingRoom
                        sx={theme => ({
                            fontSize: 28,
                            color: theme.palette.primary.main,
                            flexShrink: 0,
                        })}
                    />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {name}
                    </Typography>
                    {deviceCount > 0 ? (
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {deviceCount === 1
                                ? I18n.t('wm_one_device')
                                : I18n.t('wm_n_devices', deviceCount.toString())}
                        </Typography>
                    ) : null}
                </Box>

                <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0 }} />
            </ButtonBase>
        );
    }

    render(): React.JSX.Element {
        const parentCategory = this.props.category.parent
            ? this.props.categories.find(c => String(c.id) === String(this.props.category.parent))
            : undefined;

        const hasItems = this.subCategories.length > 0 || this.widgets.length > 0;

        return (
            <Box
                key={this.props.category.id}
                sx={{ p: 1 }}
            >
                {/* Room header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 0.5 }}>
                    {parentCategory ? (
                        <IconButton
                            size="small"
                            onClick={() => this.props.onNavigate(parentCategory)}
                            sx={{ ml: -1 }}
                        >
                            <ArrowBack />
                        </IconButton>
                    ) : null}
                    {this.state.icons[this.props.category.id] ? (
                        <Icon
                            src={this.state.icons[this.props.category.id]}
                            style={{ width: 28, height: 28 }}
                        />
                    ) : null}
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700 }}
                    >
                        {this.state.names[this.props.category.id] ?? '...'}
                    </Typography>
                </Box>

                {/* Unified grid: subcategories + widgets */}
                {hasItems ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 1.5,
                        }}
                    >
                        {this.subCategories.map(c => this.renderCategoryTile(c))}
                        {this.widgets.map(w => this.renderWidget(w))}
                    </Box>
                ) : null}
            </Box>
        );
    }
}
