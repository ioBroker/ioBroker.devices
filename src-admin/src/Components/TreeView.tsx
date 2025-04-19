/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React from 'react';
import {
    List,
    ListItem,
    ListItemIcon,
    IconButton,
    ListItemSecondaryAction,
    Dialog,
    DialogActions,
    Button,
    TextField,
    Paper,
    Tooltip,
    DialogTitle,
} from '@mui/material';

import type { IconType } from 'react-icons';

import {
    FaFolderOpen as IconFolderOpened,
    FaFolder as IconFolder,
    FaQuestion as IconTypeGeneric,
} from 'react-icons/fa';
import {
    TiLightbulb as IconTypeLight,
    TiLightbulb as IconTypeDimmer,
    TiLightbulb as IconTypeSwitch,
} from 'react-icons/ti';
import { MdCheck as IconOK, MdCancel as IconCancel } from 'react-icons/md';
import { CreateNewFolder as CreateNewFolderIcon } from '@mui/icons-material';

import { I18n, Utils, Icon, type IobTheme, type ThemeType } from '@iobroker/adapter-react-v5';

const LEVEL_OFFSET = 14;

const styles: Record<string, any> = {
    expandButton: {
        width: 37,
        height: 37,
    },
    addButton: {
        marginBottom: 5,
    },
    list: {
        maxHeight: 400,
        overflowY: 'auto',
    },
    selected: {},
    folder: {
        cursor: 'pointer',
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 1,
        paddingRight: 0,
        userSelect: 'none',
    },
    element: {
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none',
    },
    itemIcon: {
        width: 18,
        height: 18,
        borderRadius: 2,
    },
    dialogNewForm: {
        width: 'calc(100% - 30px)',
        padding: 10,
    },
    dialogNewInput: {
        width: '100%',
    },
    dialogNew: {
        minWidth: 200,
    },
    childrenCount: {
        fontSize: 'smaller',
        opacity: 0.8,
    },
    wrapperFoldersBlock: {
        padding: 10,
        height: 'calc(100% - 20px)',
    },
    iconStyle: {
        minWidth: 25,
    },
    buttonWrapper: (theme: IobTheme): any => ({
        display: 'flex',
        top: 0,
        background: theme.palette.mode === 'light' ? '#0000000d' : '#ffffff12',
        mb: '5px',
    }),
    iconCommon: {
        marginRight: 5,
        width: 15,
        height: 15,
    },
    fontStyle: {
        fontSize: 14,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        lineHeight: 1.5,
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingRight: '30px !important',
    },
    addNewFolderTitle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        '& h2': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
    },
    displayFlex: {
        display: 'flex',
        flexDirection: 'column',
    },
};

interface TreeItem {
    id: string;
    title: string;
    icon?: string;
    color?: string;
    depth: number;
    type: ioBroker.ObjectType;
    parent: string | null;
    index: number;
    parentIndex?: number;
}

function prepareList(data: Record<string, ioBroker.Object>, root?: string): TreeItem[] {
    const result: TreeItem[] = [];
    const ids = Object.keys(data);
    root ||= '';

    // place common and global scripts at the end
    ids.sort((a, b) => {
        if (
            (a === 'script.js.common' || a === 'script.js.global') &&
            (b === 'script.js.common' || b === 'script.js.global')
        ) {
            return a > b ? 1 : -1;
        }
        if (
            a === 'script.js.common' ||
            a === 'script.js.global' ||
            b === 'script.js.common' ||
            b === 'script.js.global'
        ) {
            return 1;
        }
        return a > b ? 1 : -1;
    });

    const language = I18n.getLanguage();

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();
        result.push({
            id: ids[i],
            title: Utils.getObjectName(data, ids[i], language),
            icon: obj.common.icon || undefined,
            color: obj.common.color || undefined,
            depth: parts.length - 1,
            type: obj.type,
            parent: parts.length > 2 ? parts.join('.') : null,
            index: 0,
        });
    }

    // Place all folder-less items at start
    result.sort((a, b) => {
        // without folders => always at start
        if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
            if (a.id === b.id) {
                return 0;
            }
            return a.id > b.id ? 1 : -1;
        }
        if (!a.parent && a.type !== 'folder') {
            return -1;
        }
        if (!b.parent && b.type !== 'folder') {
            return 1;
        }
        // common and global are always at the end
        if (
            (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) &&
            (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global'))
        ) {
            if (a.id === b.id) {
                return 0;
            }
            return a.id > b.id ? 1 : -1;
        }
        if (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) {
            return 1;
        }
        if (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global')) {
            return -1;
        }
        if (a.id === b.id) {
            return 0;
        }
        return a.id > b.id ? 1 : -1;
    });

    let modified;
    const regEx = new RegExp(`^${root.replace(/\./g, '\\.')}`);
    do {
        modified = false;
        // check if all parents exist
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: root ? item.parent.replace(regEx, '') : item.parent,
                        depth: parts.length - 1,
                        type: 'folder',
                        parent: parts.length >= 2 ? parts.join('.') : null,
                        index: 0,
                    });
                    modified = true;
                }
            }
        });
    } while (modified);

    // Fill all indexes
    result.forEach((item, i) => (item.index = i));

    // Fill all parentIndex
    result.forEach(item => {
        if (item.parent) {
            const parent = result.find(it => it.id === item.parent);
            if (parent) {
                item.parentIndex = parent.index;
            }
        }
    });

    return result;
}

const images: Record<string, IconType> = {
    dimmer: IconTypeDimmer,
    light: IconTypeLight,
    socket: IconTypeSwitch,
    def: IconTypeGeneric,
};

interface TreeViewProps {
    objects: Record<string, ioBroker.Object>;
    onSelect: (id: string) => void;
    selected?: string;
    theme: IobTheme;
    themeType: ThemeType;
    root?: string;
    onAddNew?: (name: string, parentId: string) => Promise<void>;
    disabled?: boolean;
    displayFlex?: boolean;
    width?: number;
}

interface TreeViewState {
    listItems: any[];
    expanded: string[];
    selected: string | undefined;
    renaming: null | string;
    deleting: null | string;
    errorText: string;
    width: number;
    filterMenuOpened: boolean;
    addNew: null | TreeItem;
    addNewName: string;
    typeFilter: string;
    searchText: string;
}

export default class TreeView extends React.Component<TreeViewProps, TreeViewState> {
    constructor(props: TreeViewProps) {
        super(props);
        const expandedStr = window.localStorage ? window.localStorage.getItem('TreeView.expanded') : '';
        let expanded: null | string[];
        try {
            expanded = expandedStr ? JSON.parse(expandedStr) || null : null;
        } catch {
            expanded = null;
        }
        const listItems = prepareList(props.objects || {});

        if (expanded === null) {
            expanded = [];
            listItems.forEach(item => item.parent && expanded!.includes(item.parent) && expanded!.push(item.parent));
        }

        this.state = {
            listItems,
            expanded,
            selected: this.props.selected || (listItems[0] && listItems[0].id) || '',
            renaming: null,
            deleting: null,
            errorText: '',
            width: this.props.width || 300,
            filterMenuOpened: false,
            addNew: null,
            addNewName: '',
            typeFilter: window.localStorage ? window.localStorage.getItem('TreeView.typeFilter') || '' : '', // lamp, window, ...
            searchText: window.localStorage ? window.localStorage.getItem('TreeView.searchText') || '' : '',
        };

        const newExp = this.ensureSelectedIsVisible();
        if (newExp) {
            Object.assign(this.state, { expanded: newExp });
        }
    }

    static getDerivedStateFromProps(props: TreeViewProps, state: TreeViewState): Partial<TreeViewState> | null {
        let changed = false;
        const newState: Partial<TreeViewState> = {};
        if (props.objects) {
            const listItems = prepareList(props.objects || {});
            if (JSON.stringify(listItems) !== JSON.stringify(state.listItems)) {
                state.listItems = listItems;
                changed = true;
            }
        }

        return changed ? newState : null;
    }

    componentDidUpdate(prevProps: TreeViewProps): void {
        if (prevProps.selected !== this.props.selected) {
            this.setState({ selected: this.props.selected });
        }
    }

    generateId = (): string | true => {
        if (!this.state.addNewName) {
            return true;
        }
        return `${this.state.selected}.${this.state.addNewName.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
    };

    renderNewItemDialog(): React.JSX.Element {
        const id = this.generateId();

        const error = id === true ? true : this.props.objects[id];
        return (
            <Dialog
                key="newDialog"
                onClose={() => this.setState({ addNew: null })}
                open={!!this.state.addNew}
                style={styles.dialogNew}
            >
                <DialogTitle sx={styles.addNewFolderTitle}>
                    {I18n.t('Add new folder to "%s"', this.state.addNew?.title)}
                </DialogTitle>
                <form
                    style={styles.dialogNewForm}
                    noValidate
                    autoComplete="off"
                >
                    <TextField
                        variant="standard"
                        onKeyUp={async ev => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                ev.stopPropagation();

                                if (this.state.addNewName) {
                                    const id = this.state.selected;
                                    if (this.props.onAddNew) {
                                        await this.props.onAddNew(this.state.addNewName, this.state.addNew!.id);
                                    }
                                    this.toggleExpanded(id, true);
                                    this.setState({ addNew: null, addNewName: '' });
                                } else {
                                    this.setState({ addNew: null, addNewName: '' });
                                }
                            }
                        }}
                        error={!!error}
                        style={styles.dialogNewInput}
                        autoFocus
                        label={I18n.t('Folder name')}
                        value={this.state.addNewName}
                        onChange={e => this.setState({ addNewName: e.target.value })}
                    />
                </form>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!!error}
                        onClick={async () => {
                            const id = this.state.selected;
                            if (this.props.onAddNew) {
                                await this.props.onAddNew(this.state.addNewName, this.state.addNew!.id);
                            }
                            this.toggleExpanded(id, true);
                            this.setState({ addNew: null, addNewName: '' });
                        }}
                        startIcon={<IconOK />}
                        color="primary"
                    >
                        {I18n.t('Add')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.setState({ addNew: null, addNewName: '' })}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    ensureSelectedIsVisible(selected?: string | TreeItem, expanded?: string[]): string[] | null {
        const _expanded: string[] = JSON.parse(JSON.stringify(expanded || this.state.expanded));
        const _selected: string | TreeItem | undefined = selected || this.state.selected;
        let changed = false;
        // ensure that the item is visible
        let el: TreeItem | undefined =
            typeof _selected === 'object' ? _selected : this.state.listItems.find(it => it.id === _selected);
        do {
            el = el?.parent && this.state.listItems.find(it => it.id === el!.parent);
            if (el) {
                if (!_expanded.includes(el.id)) {
                    _expanded.push(el.id);
                    changed = true;
                }
            }
        } while (el);

        return changed ? _expanded : null;
    }

    onCollapseAll(): void {
        this.setState({ expanded: [] });
        this.saveExpanded([]);
    }

    onExpandAll(): void {
        const expanded: string[] = [];
        this.state.listItems.forEach(item => {
            if (this.state.listItems.find(it => it.parent === item.id)) {
                expanded.push(item.id);
            }
        });
        this.setState({ expanded });
        this.saveExpanded(expanded);
    }

    saveExpanded(expanded?: string[]): void {
        window.localStorage.setItem('TreeView.expanded', JSON.stringify(expanded || this.state.expanded));
    }

    toggleExpanded(id: string | undefined, onlyOpen?: boolean): void {
        if (this.props.disabled || !id) {
            return;
        }
        const expanded = this.state.expanded.slice();
        const pos = expanded.indexOf(id);
        if (pos === -1) {
            expanded.push(id);
            expanded.sort();
        } else {
            if (!onlyOpen) {
                expanded.splice(pos, 1);
            }
        }

        this.setState({ expanded });
        this.saveExpanded(expanded);
    }

    isFilteredOut(_item: TreeItem): boolean {
        return false;
    }

    getTextStyle(item: TreeItem): React.CSSProperties {
        if (item.type !== 'folder') {
            return {
                //width: 130,
                width: `calc(100% - ${this.state.width > 350 ? 210 : 165}px)`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                flex: 'none',
                padding: '0 16px 0 0',
            };
        }

        const style: React.CSSProperties = {
            whiteSpace: 'nowrap',
            padding: '0 16px 0 0',
        };

        if (item.id === this.state.selected) {
            style.fontWeight = 'bold';
        }

        return style;
    }

    onClick(item: TreeItem): void {
        if (this.props.disabled) {
            return;
        }
        // window.localStorage.setItem('TreeView.selected', item.id);
        this.setState({ selected: item.id });
        this.props.onSelect(item.id);
    }

    renderOneItem(items: TreeItem[], item: TreeItem): (React.JSX.Element | null)[] | null {
        const childrenFiltered =
            (this.state.searchText || this.state.typeFilter) &&
            items.filter(i => (i.parent === item.id ? !this.isFilteredOut(i) : false));
        const children = items.filter(i => i.parent === item.id);

        if (this.isFilteredOut(item)) {
            return null;
        }

        if (item.type === 'folder' && (this.state.searchText || this.state.typeFilter) && !childrenFiltered.length) {
            return null;
        }

        const depthPx = item.depth * LEVEL_OFFSET + 10;

        let title: string | React.JSX.Element[] = item.title;

        if (this.state.searchText) {
            const pos = title.toLowerCase().indexOf(this.state.searchText.toLowerCase());
            if (pos !== -1) {
                title = [
                    <span key="first">{title.substring(0, pos)}</span>,
                    <span
                        key="second"
                        style={{ color: 'orange' }}
                    >
                        {title.substring(pos, pos + this.state.searchText.length)}
                    </span>,
                    <span key="third">{title.substring(pos + this.state.searchText.length)}</span>,
                ];
            }
        }

        const style = Object.assign(
            {
                paddingLeft: depthPx,
                borderRadius: 3,
                cursor: 'pointer',
            },
            item.id === this.state.selected
                ? { background: this.props.theme.palette.secondary.dark, color: '#FFF' }
                : {},
        );

        let isExpanded = false;
        if (children && children.length) {
            isExpanded = this.state.expanded.includes(item.id);
        }

        const iconStyle: React.CSSProperties = {};
        const countSpan =
            (childrenFiltered && childrenFiltered.length) || children.length ? (
                <span style={styles.childrenCount}>
                    {childrenFiltered && childrenFiltered.length !== children.length
                        ? `${childrenFiltered.length}(${children.length})`
                        : children.length}
                </span>
            ) : null;

        if (!countSpan) {
            iconStyle.opacity = 0.5;
        }
        if (item.id === this.state.selected) {
            iconStyle.opacity = 1;
        }
        iconStyle.color = '#448dde';

        if (item.color) {
            iconStyle.color = item.color;
        }

        const MyIconType = images[item.type] || images.def;
        let icon: React.JSX.Element | null = null;
        if (MyIconType) {
            icon = <MyIconType />;
        }

        const inner = (
            <ListItem
                key={item.id}
                style={{
                    ...style,
                    ...(item.type === 'folder' ? styles.folder : styles.element),
                }}
                onDoubleClick={() => this.toggleExpanded(item.id)}
                onClick={() => this.onClick(item)}
            >
                <ListItemIcon style={styles.iconStyle}>
                    {item.type === 'folder' ? (
                        isExpanded ? (
                            <IconFolderOpened
                                onClick={() => this.toggleExpanded(item.id)}
                                style={iconStyle}
                            />
                        ) : (
                            <IconFolder
                                onClick={() => this.toggleExpanded(item.id)}
                                style={iconStyle}
                            />
                        )
                    ) : (
                        <Icon
                            style={styles.itemIcon}
                            alt={item.type}
                            src={icon}
                        />
                    )}
                </ListItemIcon>
                {item.icon && (
                    <Icon
                        style={styles.iconCommon}
                        alt={item.type}
                        src={item.icon}
                    />
                )}
                <div
                    style={{
                        ...this.getTextStyle(item),
                        ...(item.id === this.state.selected ? styles.selected : undefined),
                        ...styles.fontStyle,
                    }}
                >
                    {title}
                </div>
                <ListItemSecondaryAction style={{ color: item.id === this.state.selected ? 'white' : 'inherit' }}>
                    {countSpan}
                </ListItemSecondaryAction>
            </ListItem>
        );

        const result: (React.JSX.Element | null)[] = [inner];

        if (isExpanded) {
            children.forEach(it => result.push(this.renderOneItem(items, it) as any as React.JSX.Element));
        }
        return result;
    }

    renderAllItems(items: TreeItem[]): React.JSX.Element {
        const result: (React.JSX.Element | null)[] = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item) as any as React.JSX.Element));

        return (
            <List
                key="list"
                dense
                disablePadding
                style={styles.list}
            >
                {result}
            </List>
        );
    }

    renderAddButton(): React.JSX.Element {
        return (
            <Paper
                sx={styles.buttonWrapper}
                color="default"
            >
                {this.props.onAddNew && (
                    <Tooltip
                        title={I18n.t('Create new folder')}
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                    >
                        <div>
                            <IconButton
                                color="primary"
                                disabled={this.props.disabled}
                                onClick={() =>
                                    this.setState({
                                        addNew: this.state.listItems.find(it => it.id === this.state.selected),
                                    })
                                }
                            >
                                <CreateNewFolderIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                )}
                <Tooltip
                    title={I18n.t('Expand all nodes')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <div>
                        <IconButton
                            color="primary"
                            disabled={this.props.disabled}
                            onClick={() => this.onExpandAll()}
                        >
                            <IconFolderOpened />
                        </IconButton>
                    </div>
                </Tooltip>
                <Tooltip
                    title={I18n.t('Collapse all nodes')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <div>
                        <IconButton
                            color="primary"
                            disabled={this.props.disabled}
                            onClick={() => this.onCollapseAll()}
                        >
                            <IconFolder />
                        </IconButton>
                    </div>
                </Tooltip>
            </Paper>
        );
    }

    render(): React.JSX.Element {
        return (
            <Paper
                style={{
                    ...styles.wrapperFoldersBlock,
                    ...(this.props.displayFlex ? styles.displayFlex : undefined),
                }}
            >
                {this.renderAddButton()}
                {this.renderAllItems(this.state.listItems)}
                {this.renderNewItemDialog()}
            </Paper>
        );
    }
}
