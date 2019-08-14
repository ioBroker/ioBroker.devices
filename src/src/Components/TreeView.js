/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Utils from '@iobroker/adapter-react/Components/Utils';

import {FaFolderOpen as IconFolderOpened} from 'react-icons/fa';
import {FaFolder as IconFolder} from 'react-icons/fa';
import {TiLightbulb as IconTypeLight} from 'react-icons/ti'
import {TiLightbulb as IconTypeDimmer} from 'react-icons/ti'
import {TiLightbulb as IconTypeSwitch} from 'react-icons/ti'
import {FaQuestion as IconTypeGeneric} from 'react-icons/fa'
import {MdUnfoldMore as IconExpandAll} from 'react-icons/md';
import {MdUnfoldLess as IconCollapseAll} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdExpandMore as IconCollapse} from 'react-icons/md';
import {MdKeyboardArrowRight as IconExpand} from 'react-icons/md';
import {MdClose as IconClear} from 'react-icons/md';
import {MdCreateNewFolder as IconAddFolder} from 'react-icons/md';
import {MdSearch as IconFind} from 'react-icons/md';

import I18n from '@iobroker/adapter-react/i18n';
import Theme from '@iobroker/adapter-react/Theme';

const styles = theme => ({
    expandButton: {
        width: 37,
        height: 37
    },
    selected: Theme.colors[theme.palette.type].selected,
    folder: {
        background: theme.palette.type === 'dark' ? '#6a6a6a' : '#e2e2e2',
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none'
    },
    element: {
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none'
    },
    itemIcon: {
        width: 18,
        height: 18,
        borderRadius: 2
    },

});

const prepareList = (data, root) => {
    const result = [];
    const ids = Object.keys(data);
    root = root || '';

    // place common and global scripts at the end
    ids.sort((a, b) => {
        if ((a === 'script.js.common' || a === 'script.js.global') && (b === 'script.js.common' || b === 'script.js.global')) {
            return a > b ? 1 : -1;
        } else if (a === 'script.js.common' || a === 'script.js.global' || b === 'script.js.common' || b === 'script.js.global') {
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
            title: Utils.getObjectName(data, ids[i], {language: I18n.getLanguage()}),
            depth: parts.length - 2,
            type: obj.type,
            parent: parts.length > 2 ? parts.join('.') : null,
            instance: obj.common.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null
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
            if ((a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) &&
                (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global'))) {
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
    result.forEach((item, i) => item.index = i);

    let modified;
    const regEx = new RegExp('^' + root.replace(/\./g, '\\.'));
    do {
        modified = false;
        // check if all parents exists
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: root ? item.parent.replace(regEx, '') : item.parent,
                        depth: parts.length - 2,
                        type: 'folder',
                        parent: parts.length > 2 ? parts.join('.') : null
                    });
                    modified = true;
                }
            }
        });
    } while(modified);

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
    'dimmer': IconTypeDimmer,
    'light': IconTypeLight,
    'socket': IconTypeSwitch,
    def: IconTypeGeneric,
};

class TreeView extends React.Component {
    constructor(props) {
        super(props);
        let expanded = window.localStorage ? window.localStorage.getItem('TreeView.expanded') : '[]';
        try {
            expanded = JSON.parse(expanded) || [];
        } catch (e) {
            expanded = [];
        }

        this.state = {
            listItems: prepareList(props.objects || {}),
            expanded: expanded,
            theme: this.props.theme,
            selected: this.props.selected || null,
            renaming: null,
            deleting: null,
            errorText: '',
            width: this.props.width || 300,
            filterMenuOpened: false,
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
    }
    handleOk() {
        this.props.onClose && this.props.onClose();
    };

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
                if (expanded.indexOf(el.id) === -1) {
                    expanded.push(el.id);
                    changed = true;
                }
            }
        } while (el);
        return changed && expanded;
    }

    onCollapseAll() {
        this.setState({expanded: []});
        this.saveExpanded([]);
    }

    onExpandAll() {
        const expanded = [];
        this.state.listItems.forEach(item => {
            if (this.state.listItems.find(it => it.parent === item.id)) {
                expanded.push(item.id);
            }
        });
        this.setState({expanded});
        this.saveExpanded(expanded);
    }

    saveExpanded(expanded) {
        window.localStorage.setItem('TreeView.expanded', JSON.stringify(expanded || this.state.expanded));
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
                padding: '0 16px 0 0'
            };
        } else {
            return {
                whiteSpace: 'nowrap',
                padding: '0 16px 0 0'
            };
        }
    }

    renderFolderButtons(item, children, isExpanded) {
        if (children && children.length) {
            return (
                <IconButton className={this.props.classes.expandButton}
                            onClick={isExpanded ? e => this.onCollapse(item.id, e) : e => this.onExpand(item.id, e)}>
                    {isExpanded ? (<IconCollapse fontSize="small"/>) : (<IconExpand fontSize="small"/>)}
                </IconButton>
            );
        } else {
            return (<div className={this.props.classes.expandButton}/>);
        }
    }

    onClick(item, e) {
        this.setState({selected: item.id});
        this.props.onSelect && this.props.onSelect(item.id);
    }

    renderOneItem(items, item) {
        let childrenFiltered = (this.state.searchText || this.state.typeFilter) && items.filter(i => i.parent === item.id ? !this.isFilteredOut(i) : false);
        let children = items.filter(i => i.parent === item.id);

        if (this.isFilteredOut(item)) {
            return;
        }

        if (item.type === 'folder' && (this.state.searchText || this.state.typeFilter) && !childrenFiltered.length) {
            return;
        }

        const depthPx = item.depth * Theme.treeView.depthOffset;

        let title = item.title;

        if (this.state.searchText) {
            const pos = title.toLowerCase().indexOf(this.state.searchText.toLowerCase());
            if (pos !== -1) {
                title = [
                    (<span key="first">{title.substring(0, pos)}</span>),
                    (<span key="second" style={{color: 'orange'}}>{title.substring(pos, pos + this.state.searchText.length)}</span>),
                    (<span key="third">{title.substring(pos + this.state.searchText.length)}</span>),
                ];
            }
        }

        const style = Object.assign({
            marginLeft: depthPx,
            cursor: item.type === 'folder' && this.state.reorder ? 'default' : 'inherit',
            opacity: item.filteredPartly ? 0.5 : 1,
            width: `calc(100% - ${depthPx}px)`
        }, item.id === this.state.selected ? Theme.colors[this.theme].selected : {});

        let isExpanded = false;
        if (children && children.length) {
            isExpanded = this.state.expanded.indexOf(item.id) !== -1;
        }

        let iconStyle = {};

        const inner =
            (<ListItem
                key={item.id}
                style={style}
                className={(item.type === 'folder' ? this.props.classes.folder : this.props.classes.element) + ' ' + (this.state.reorder ? this.props.classes.reorder : '')}
                onClick={e => this.onClick(item, e)}
            >
                {/*this.renderFolderButtons(item, children, isExpanded)*/}
                <ListItemIcon>{item.type === 'folder' ? (isExpanded ? (<IconFolderOpened style={iconStyle}/>) : (<IconFolder style={iconStyle}/>)) : (
                    <img className={this.props.classes.itemIcon} alt={item.type} src={images[item.type] || images.def}/>)}</ListItemIcon>
                <ListItemText
                    classes={{primary: item.id === this.state.selected ? this.props.classes.selected : undefined}}
                    style={this.getTextStyle(item)} primary={(<span>{title}{(childrenFiltered && childrenFiltered.length) || children.length ? (<span className={this.props.classes.childrenCount}>{childrenFiltered && childrenFiltered.length !== children.length ? `${childrenFiltered.length}(${children.length})` : children.length}</span>) : null}</span>)}/>
                {/*<ListItemSecondaryAction>{this.renderItemButtons(item, children)}</ListItemSecondaryAction>*/}
            </ListItem>);

        const result = [inner];

        if (children && this.state.expanded.indexOf(item.id) !== -1) {
            children.forEach(it => result.push(this.renderOneItem(items, it)));
        }
        return result;
    }

    renderAllItems(items, dragging) {
        const result = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item, dragging)));

        return (<List dense={true} disablePadding={true}>{result}</List>);
    }

    renderTree() {
        return this.renderAllItems(this.state.listItems);
    }

    render() {
        return [
            this.renderTree()
        ];
    }
}

TreeView.propTypes = {
    objects: PropTypes.object,
    onSelect: PropTypes.func,
    selected: PropTypes.string,
    theme: PropTypes.string,
    root: PropTypes.string,
};

export default withStyles(styles)(TreeView);
