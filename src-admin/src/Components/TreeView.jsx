/**
 * Copyright 2019-2020 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
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

import { FaFolderOpen as IconFolderOpened, FaFolder as IconFolder } from 'react-icons/fa';
import {
    TiLightbulb as IconTypeLight,
    TiLightbulb as IconTypeDimmer,
    TiLightbulb as IconTypeSwitch,
} from 'react-icons/ti';
import { FaQuestion as IconTypeGeneric } from 'react-icons/fa';
import {
    MdKeyboardArrowRight as IconExpand,
    MdExpandMore as IconCollapse,
    MdCheck as IconOK,
    MdCancel as IconCancel,
} from 'react-icons/md';
import { CreateNewFolder as CreateNewFolderIcon } from '@mui/icons-material';

import { I18n, Utils, Icon } from '@iobroker/adapter-react-v5';

const LEVEL_OFFSET = 14;

const styles = {
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
    buttonWrapper: theme => ({
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

const prepareList = (data, root) => {
    const result = [];
    const ids = Object.keys(data);
    root = root || '';

    // place common and global scripts at the end
    ids.sort((a, b) => {
        if (
            (a === 'script.js.common' || a === 'script.js.global') &&
            (b === 'script.js.common' || b === 'script.js.global')
        ) {
            return a > b ? 1 : -1;
        } else if (
            a === 'script.js.common' ||
            a === 'script.js.global' ||
            b === 'script.js.common' ||
            b === 'script.js.global'
        ) {
            return 1;
        } else {
            return a > b ? 1 : -1;
        }
    });

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();
        result.push({
            id: ids[i],
            title: Utils.getObjectName(data, ids[i], { language: I18n.getLanguage() }),
            icon: obj.common.icon || null,
            color: obj.common.color || null,
            depth: parts.length - 1,
            type: obj.type,
            parent: parts.length > 2 ? parts.join('.') : null,
            instance: obj.common.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null,
        });
    }

    // Place all folder-less items at start
    result.sort((a, b) => {
        // without folders => always at start
        if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
            if (a.id === b.id) return 0;
            return a.id > b.id ? 1 : -1;
        } else if (!a.parent && a.type !== 'folder') {
            return -1;
        } else if (!b.parent && b.type !== 'folder') {
            return 1;
        } else {
            // common and global are always at the end
            if (
                (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) &&
                (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global'))
            ) {
                if (a.id === b.id) return 0;
                return a.id > b.id ? 1 : -1;
            } else if (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) {
                return 1;
            } else if (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global')) {
                return -1;
            } else {
                if (a.id === b.id) return 0;
                return a.id > b.id ? 1 : -1;
            }
        }
    });

    // Fill all index
    result.forEach((item, i) => (item.index = i));

    let modified;
    const regEx = new RegExp('^' + root.replace(/\./g, '\\.'));
    do {
        modified = false;
        // check if all parents exists

        // eslint-disable-next-line no-loop-func
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
                    });
                    modified = true;
                }
            }
        });
    } while (modified);

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
};

const images = {
    dimmer: IconTypeDimmer,
    light: IconTypeLight,
    socket: IconTypeSwitch,
    def: IconTypeGeneric,
};

class TreeView extends React.Component {
    constructor(props) {
        super(props);
        let expanded = window.localStorage ? window.localStorage.getItem('TreeView.expanded') : '';
        try {
            expanded = expanded ? JSON.parse(expanded) || null : null;
        } catch (e) {
            expanded = null;
        }
        const listItems = prepareList(props.objects || {});

        if (expanded === null) {
            expanded = [];
            listItems.forEach(item => expanded.includes(item.parent) && expanded.push(item.parent));
        }

        this.state = {
            listItems,
            expanded,
            theme: this.props.theme,
            selected: this.props.selected || (listItems[0] && listItems[0].id) || '',
            renaming: null,
            deleting: null,
            errorText: '',
            width: this.props.width || 300,
            filterMenuOpened: false,
            addNew: false,
            addNewName: '',
            typeFilter: window.localStorage ? window.localStorage.getItem('TreeView.typeFilter') || '' : '', // lamp, window, ...
            searchText: window.localStorage ? window.localStorage.getItem('TreeView.searchText') || '' : '',
        };

        this.theme = this.props.theme || 'light';

        const newExp = this.ensureSelectedIsVisible();
        if (newExp) {
            this.state.expanded = newExp;
        }
        // debounce search process
        this.filterTimer = null;
        // setTimeout(() => this.props.onSelect && this.props.onSelect(this.state.selected), 200);
    }

    handleOk() {
        this.props.onClose && this.props.onClose();
    }

    static getDerivedStateFromProps(props, state) {
        let changed = false;
        const newState = {};
        if (props.objects) {
            const listItems = prepareList(props.objects || {});
            if (JSON.stringify(listItems) !== JSON.stringify(state.listItems)) {
                state.listItems = listItems;
                changed = true;
            }
        }

        return changed ? newState : null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.selected !== this.props.selected) {
            this.setState({ selected: this.props.selected });
        }
    }

    generateId = () => {
        if (!this.state.addNewName) {
            return true;
        }
        let parts = `${this.state.selected}.${this.state.addNewName.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        return parts;
    };

    renderNewItemDialog() {
        // const id = this.state.addNew ? `${this.state.addNew.id}.${this.state.addNewName.replace(FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}` : null;
        const error = this.generateId() === true ? true : this.props.objects[this.generateId()];
        return (
            <Dialog
                key="newDialog"
                onClose={() => this.setState({ addNew: null })}
                open={!!this.state.addNew}
                style={styles.dialogNew}
            >
                <DialogTitle sx={styles.addNewFolderTitle}>
                    {I18n.t('Add new folder to "%s"', this.state.addNew && this.state.addNew.title)}
                </DialogTitle>
                <form
                    style={styles.dialogNewForm}
                    noValidate
                    autoComplete="off"
                >
                    <TextField
                        variant="standard"
                        onKeyPress={async ev => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                ev.stopPropagation();

                                if (this.state.addNewName) {
                                    const id = this.state.selected;
                                    await this.props.onAddNew(this.state.addNewName, this.state.addNew.id);
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
                            await this.props.onAddNew(this.state.addNewName, this.state.addNew.id);
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

    ensureSelectedIsVisible(selected, expanded) {
        expanded = JSON.parse(JSON.stringify(expanded || this.state.expanded));
        selected = selected || this.state.selected;
        let changed = false;
        // ensure that the item is visible
        let el = typeof selected === 'object' ? selected : this.state.listItems.find(it => it.id === selected);
        do {
            // eslint-disable-next-line
            el = el && el.parent && this.state.listItems.find(it => it.id === el.parent);
            if (el) {
                if (!expanded.includes(el.id)) {
                    expanded.push(el.id);
                    changed = true;
                }
            }
        } while (el);
        return changed && expanded;
    }

    onCollapseAll() {
        this.setState({ expanded: [] });
        this.saveExpanded([]);
    }

    onExpandAll() {
        const expanded = [];
        this.state.listItems.forEach(item => {
            if (this.state.listItems.find(it => it.parent === item.id)) {
                expanded.push(item.id);
            }
        });
        this.setState({ expanded });
        this.saveExpanded(expanded);
    }

    saveExpanded(expanded) {
        window.localStorage.setItem('TreeView.expanded', JSON.stringify(expanded || this.state.expanded));
    }

    toggleExpanded(id, onlyOpen) {
        if (this.props.disabled) {
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

    isFilteredOut(item) {
        return false;
    }

    getTextStyle(item) {
        if (item.type !== 'folder') {
            return {
                //width: 130,
                width: `calc(100% - ${this.state.width > 350 ? 210 : 165}px)`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                flex: 'none',
                padding: '0 16px 0 0',
            };
        } else {
            const style = {
                whiteSpace: 'nowrap',
                padding: '0 16px 0 0',
            };

            if (item.id === this.state.selected) {
                style.fontWeight = 'bold';
            }

            return style;
        }
    }

    renderFolderButtons(item, children, isExpanded) {
        if (children && children.length) {
            return (
                <IconButton
                    style={styles.expandButton}
                    onClick={isExpanded ? e => this.onCollapse(item.id, e) : e => this.onExpand(item.id, e)}
                >
                    {isExpanded ? <IconCollapse fontSize="small" /> : <IconExpand fontSize="small" />}
                </IconButton>
            );
        } else {
            return <div style={styles.expandButton} />;
        }
    }

    onClick(item, e) {
        if (this.props.disabled) {
            return;
        }
        // window.localStorage.setItem('TreeView.selected', item.id);
        this.setState({ selected: item.id });
        this.props.onSelect(item.id);
    }

    renderOneItem(items, item) {
        let childrenFiltered =
            (this.state.searchText || this.state.typeFilter) &&
            items.filter(i => (i.parent === item.id ? !this.isFilteredOut(i) : false));
        let children = items.filter(i => i.parent === item.id);

        if (this.isFilteredOut(item)) {
            return;
        }

        if (item.type === 'folder' && (this.state.searchText || this.state.typeFilter) && !childrenFiltered.length) {
            return;
        }

        const depthPx = item.depth * LEVEL_OFFSET + 10;

        let title = item.title;

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
                cursor: item.type === 'folder' && this.state.reorder ? 'default' : 'pointer',
                opacity: item.filteredPartly ? 0.5 : 1,
            },
            item.id === this.state.selected
                ? { background: this.props.theme.palette.secondary.dark, color: '#FFF' }
                : {},
        );

        let isExpanded = false;
        if (children && children.length) {
            isExpanded = this.state.expanded.includes(item.id);
        }

        let iconStyle = {};
        let countSpan =
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

        const inner = (
            <ListItem
                key={item.id}
                style={style}
                onDoubleClick={() => this.toggleExpanded(item.id)}
                className={Utils.clsx(
                    item.type === 'folder' ? this.props.classes.folder : this.props.classes.element,
                    this.state.reorder && this.props.classes.reorder,
                )}
                onClick={e => this.onClick(item, e)}
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
                            src={images[item.type] || images.def}
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
                    style={this.getTextStyle(item)}
                    className={Utils.clsx(
                        item.id === this.state.selected && this.props.classes.selected,
                        this.props.classes.fontStyle,
                    )}
                >
                    {title}
                </div>
                <ListItemSecondaryAction style={{ color: item.id === this.state.selected ? 'white' : 'inherit' }}>
                    {countSpan}
                </ListItemSecondaryAction>
            </ListItem>
        );

        const result = [inner];

        if (isExpanded) {
            children.forEach(it => result.push(this.renderOneItem(items, it)));
        }
        return result;
    }

    renderAllItems(items, dragging) {
        const result = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item, dragging)));

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

    renderAddButton() {
        return (
            <Paper
                sx={styles.buttonWrapper}
                position="sticky"
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

    renderTree() {
        return this.renderAllItems(this.state.listItems);
    }

    render() {
        return (
            <Paper
                className={Utils.clsx(
                    this.props.classes.wrapperFoldersBlock,
                    this.props.displayFlex && this.props.classes.displayFlex,
                )}
            >
                {this.renderAddButton()}
                {this.renderTree()}
                {this.renderNewItemDialog()}
            </Paper>
        );
    }
}

TreeView.propTypes = {
    objects: PropTypes.object,
    onSelect: PropTypes.func,
    selected: PropTypes.string,
    theme: PropTypes.object,
    themeType: PropTypes.string,
    root: PropTypes.string,
    onAddNew: PropTypes.func,
    disabled: PropTypes.bool,
};

export default TreeView;
