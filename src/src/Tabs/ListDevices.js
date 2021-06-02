/**
 * Copyright 2019-2020 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React, { Component, createRef } from 'react';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';

import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
// import Select from '@material-ui/core/Select';
// import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import ButtonBase from '@material-ui/core/ButtonBase';

import { MdAdd as IconAdd } from 'react-icons/md';
import { MdRefresh as IconRefresh } from 'react-icons/md';
import { MdClear as IconClear } from 'react-icons/md';
// import { MdStar as IconStar } from 'react-icons/md';
import { FaInfoCircle as IconInfo } from 'react-icons/fa';
import { MdDelete as IconDelete } from 'react-icons/md';
import { MdModeEdit as IconEdit } from 'react-icons/md';

// import { FaRegFolder as IconCollapsed } from 'react-icons/fa';
// import { FaRegFolderOpen as IconExpanded } from 'react-icons/fa';
import { FaPowerOff as IconOn } from 'react-icons/fa';
import { FaThermometerHalf as IconTemperature } from 'react-icons/fa';
import { FaLongArrowAltUp as IconUp } from 'react-icons/fa';
import { FaLongArrowAltDown as IconDown } from 'react-icons/fa';
import { FaPercentage as IconPercentage } from 'react-icons/fa';
import { FaPalette as IconColor } from 'react-icons/fa';
import { FaLightbulb as IconBulb } from 'react-icons/fa';
import { FaLockOpen as IconLock } from 'react-icons/fa';
import { FaThermometer as IconThermometer } from 'react-icons/fa';
// import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import { HiLink } from "react-icons/hi";

import I18n from '@iobroker/adapter-react/i18n';
import MessageDialog from '@iobroker/adapter-react/Dialogs/Message';
import SmartDetector from '../Devices/SmartDetector';
import DialogEdit from '../Dialogs/DialogEditDevice';
import DialogNew from '../Dialogs/DialogNewDevice';
// import DialogConfirm from '@iobroker/adapter-react/Dialogs/Confirm';
import SmartGeneric from '../Devices/SmartGeneric';
import Router from '@iobroker/adapter-react/Components/Router';
import Utils from '@iobroker/adapter-react/Components/Utils';
import DialogEditEnums from '../Dialogs/DialogEditEnums';
import TypeIcon from '../Components/TypeIcon';
import { Types } from 'iobroker.type-detector';
import {
    Card,
    //  FormControl,
    InputAdornment,
    // InputLabel,
    ListItemIcon, TextField, Tooltip, withWidth
} from '@material-ui/core';

import { FaFolderOpen as IconFolderOpened } from 'react-icons/fa';
import { FaFolder as IconFolder } from 'react-icons/fa';
import clsx from 'clsx';
import { deleteFolderAndDeviceCallBack } from '../Dialogs/DeleteFolder';
import DialogEditFolder from '../Dialogs/DialogEditFolder';
import Icon from '@iobroker/adapter-react/Components/Icon';
import DvrIcon from '@material-ui/icons/Dvr';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import TYPE_OPTIONS, { ICONS_TYPE } from '../Components/TypeOptions';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import DragWrapper from '../Components/DragWrapper';
import DropWrapper from '../Components/DropWrapper';
import DialogImporter from '../Dialogs/DialogImporter';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';

const actionsMapping = {
    turnOn: { color: colorOn, icon: IconOn, desc: 'Turn on' },
    turnOff: { color: colorOff, icon: IconOn, desc: 'Turn off' },

    setTargetTemperature: { color: colorSet, icon: IconTemperature, desc: 'Set target temperature' },
    incrementTargetTemperature: { color: colorOn, icon: IconUp, desc: 'Increment target temperature' },
    decrementTargetTemperature: { color: colorOff, icon: IconDown, desc: 'Decrement target temperature' },

    setPercentage: { color: colorSet, icon: IconPercentage, desc: 'Set percentage' },
    incrementPercentage: { color: colorOn, icon: IconUp, desc: 'Increment percentage' },
    decrementPercentage: { color: colorOff, icon: IconDown, desc: 'Decrement percentage' },

    setColor: { color: colorSet, icon: IconColor, desc: 'Set color' },

    setColorTemperature: { color: colorSet, icon: IconBulb, desc: 'Set color temperature' },
    incrementColorTemperature: { color: colorOn, icon: IconUp, desc: 'Increment color temperature' },
    decrementColorTemperature: { color: colorOff, icon: IconDown, desc: 'Decrement color temperature' },

    getTargetTemperature: { color: colorRead, icon: IconThermometer, desc: 'Get target temperature' },
    getTemperatureReading: { color: colorRead, icon: IconThermometer, desc: 'Get actual temperature' },

    setLockState: { color: colorSet, icon: IconLock, desc: 'Set lock state' },
    getLockState: { color: colorRead, icon: IconLock, desc: 'Read lock state' },
};

const TYPES_MAPPING = {
    button: 'boolean',
    value: 'number',
    level: 'number',
    indicator: 'boolean',
    action: 'boolean'
};

const UNSUPPORTED_TYPES = [
    Types.unknown
];

function getParentId(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(0, pos);
    } else {
        return '';
    }
}

function getLastPart(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    } else {
        return id;
    }
}

const prepareList = (data, root, objects) => {
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
            id: obj.obj?._id || ids[i],
            title: Utils.getObjectName(data, ids[i], { language: I18n.getLanguage() }),
            icon: obj.common?.icon || null,
            color: obj.common?.color || null,
            depth: parts.length - 1,
            type: obj.type,
            role: obj.role,
            obj: obj.obj,
            noEdit: !!obj?.noEdit,
            showId: !!obj?.showId,
            importer: !!obj?.importer,
            originalId: obj?.native?.originalId || null,
            parent: parts.length > 2 ? parts.join('.') : null,
            instance: obj.common?.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null
        });
    }

    // Place all folder-less items at start
    result.sort((a, b) => {
        // without folders => always at start
        // debugger
        if (a.id === "alias.0.automatically_detected" && b.type === 'folder') return 1;
        if (b.id === "alias.0.automatically_detected" && a.type !== 'folder') return -1;
        if (b.id === "alias.0.automatically_detected" && a.type === 'folder') return -1;
        if (a.id === "alias.0.linked_devices" && b.type === 'folder') return 1;
        if (b.id === "alias.0.linked_devices" && a.type !== 'folder') return -1;
        if (b.id === "alias.0.linked_devices" && a.type === 'folder') return -1;

        if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
            if (a.id === b.id) return 0;
            return a.id > b.id ? 1 : -1;
        } else if (!a.parent && a.type !== 'folder') {
            return 1;
        } else if (!b.parent && b.type !== 'folder') {
            return -1;
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
                if (a.type !== b.type) {
                    if (a.type === 'folder') return -1;
                    if (b.type === 'folder') return 1;
                    return 0;
                } else {
                    if (a.id === b.id) return 0;
                    return a.id > b.id ? 1 : -1;
                }
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

        // eslint-disable-next-line no-loop-func
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    let obj = {};
                    if (item.id.includes('linkeddevices.0')) {
                        const partsLinkedDevices = item.id.split('.');
                        partsLinkedDevices.pop();
                        obj = objects[partsLinkedDevices.join('.')]
                    }
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: root ? item.parent.replace(regEx, '') : item.parent.split('.').pop(),
                        depth: parts.length - 1,
                        type: 'folder',
                        obj: obj,
                        noEdit: !!obj?.noEdit,
                        showId: !!obj?.showId,
                        originalId: obj?.native?.originalId || null,
                        importer: !!obj?.importer,
                        parent: parts.length >= 2 ? parts.join('.') : null
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

const WIDTHS = [
    1100,
    920,
    800,
    710,
    600,
    500
];

const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';
const IS_CHROME = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

const styles = theme => ({
    tab: {
        width: '100%',
        height: '100%'
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
        height: '100%',
        overflow: 'hidden'
    },
    columnDiv: {
        height: 'calc(100% - 40px)',
        overflow: 'auto',
        minWidth: 300
    },
    filter: {
        margin: 0,
    },
    button: {
        marginRight: 20
    },
    buttonLinkedDevices: {
        background: '#17faff'
    },
    devLineExpand: {
        marginRight: 10,
    },
    devLineEnabled: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    devLineEdit: {
        position: 'absolute',
        top: 5,
        right: 50
    },
    devLineDelete: {
        position: 'absolute',
        top: 5,
        right: 0
    },
    devLineName: {

    },
    devLineNumber: {
        display: 'inline-block',
        verticalAlign: 'middle',
        width: 15,
    },
    editedId: {
        fontStyle: 'italic'
    },
    enumLineSubName: {
        fontStyle: 'italic',
    },
    devLine: {
        height: 48,
        width: '100%',
        position: 'relative'
    },
    devLineDescription: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12
    },
    devLineActions: {
        fontStyle: 'italic',
        fontSize: 12,
        paddingLeft: 50,
        display: 'inline-block',
    },
    devLineProgress: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    channelLineActions: {
        width: 80
    },
    devLineNameBlock: {
        display: 'inline-block',
        width: 'calc(100% - 350px)'
    },
    columnHeader: {
        background: theme.palette.primary.light,
        padding: 10,
        color: theme.palette.primary.contrastText
    },
    devModified: {
        fontStyle: 'italic'
    },
    actionIcon: {
        width: 16
    },

    devSubLine: {
        position: 'relative',
        height: 48
    },
    devSubLineName: {
        marginLeft: 5,
        marginTop: 14,
        display: 'inline-block',
        fontSize: 13,
        width: 'calc(100% - 400px)'
    },
    devSubSubLineName: {
        fontSize: 8,
        fontStyle: 'italic',
        display: 'block'
    },
    devSubLineByOn: {
        marginLeft: 5
    },
    devSubLineDelete: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 0
    },
    devSubLineEdit: {
        position: 'absolute',
        top: 12,
        right: 62,
        padding: 0
    },
    devSubLineTypeTitle: {
        marginTop: 0
    },
    orderSelector: {
        marginRight: 10,
    },
    paperTable: {
        width: '100%',
        height: 'calc(100% - 57px)',
        overflowX: 'hidden',
        overflowY: 'auto',
        marginTop: 5,
    },
    tableLine: {
        height: 50,
        '&:hover': {
            background: `#3399cccc !important`,
            '& *': {
                color: '#ffffff !important'
            }
        }
    },
    tableIconImg: {
        width: 20,
        height: 20,
        color: theme.palette.type === 'dark' ? '#FFF' : '#000',
    },
    tableIcon: {
        width: 32,
        height: 32,
        display: 'flex',
        padding: 2,
        background: theme.palette.type === 'dark' ? '#3b3b3b' : '#e0e0e0',
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center'
    },
    tableNameCell: {
        whiteSpace: 'nowrap',
        width: IS_CHROME ? undefined : 150,
        textOverflow: 'ellipsis',
    },
    tableSmartName: {
        fontSize: 10,
        opacity: 0.8,
    },
    tableIdCell: {
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        maxWidth: 150,
        overflow: 'hidden',
        direction: 'rtl',
        textAlign: 'left'
    },
    headerCell: {
        fontWeight: 'bold'
    },
    tableExpandIconCell: {
        padding: 0,
        width: 40,
    },
    tableIconCell: {
        padding: 0,
        width: 40
    },
    tableEditButtonCell: {
        padding: 0,
        width: 40,
    },
    buttonsCellHeader: {
        width: 90,
    },
    buttonsCell: {
        width: IS_CHROME ? undefined : 90,
        padding: '0 !important',
    },
    tableGroup: {
        background: theme.palette.secondary.main,
        borderTop: '5px solid ' + theme.palette.background.paper,
    },
    tableGroupCell: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#FFF',
        cursor: 'pointer',
        textTransform: 'uppercase'
    },
    tableExpandIcon: {
        marginRight: 5,
        marginLeft: 10,
        marginTop: 6,
        color: '#FFF',
        width: 20,
        height: 20,
        cursor: 'pointer',
    },
    tableGroupIcon: {
        height: 20,
        marginRight: 5,
        color: '#ffffff'
    },

    enumsEdit: {
        minHeight: 20,
        minWidth: 100,
        textAlign: 'left',
        justifyContent: 'left',
        padding: 3,
        '&:hover, &$focusVisible': {
            zIndex: 1,
            opacity: 0.7,
            borderRadius: 3,
            background: 'gray'
        },
    },
    enumsEditFocusVisible: {},
    wrapperIcon: {
        margin: '5px 0',
        display: 'flex'
    },
    emptyClear: {
        width: 32
    },
    icons: {
        display: 'flex',
        width: '100%'
    },
    wrapperButton: {
        marginRight: 10,
        display: 'flex',
        justifyContent: 'flex-end'
    },
    emptyBlock: {
        width: 48
    },
    displayFlex: {
        display: 'flex',
        alignItems: 'center'
    },
    iconCommon: {
        width: 20,
        height: 20,
        position: 'absolute',
        top: 10,
        left: 8,
        opacity: 0.8
    },
    iconStyle: {
        position: 'relative',
        minWidth: 36
    },
    fontStyle: {
        // maxWidth: 160,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 'bold'
    },
    wrapperTitleAndId: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    fontStyleId: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 'bold',
        fontSize: 9,
        opacity: 0.6,
        fontStyle: 'italic'
    },
    wrapperIconEnumCell: {
        display: 'flex',
        alignItems: 'center',
        marginLeft: 3,
        marginRight: 3
    },
    enumIcon: {
        width: 16,
        height: 16,
    },
    nameEnumCell: {
        marginLeft: 3
    },
    emptyBlockFlex: {
        flexGrow: 1
    },
    wrapperName: {
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        marginRight: 10
    },
    table: {
        '& th': {
            background: theme.name === 'dark' ? '#202020' : theme.name === 'blue' ? '#22292d' : 'white'
        }
    },
    spaceBetween: {
        justifyContent: 'space-between'

    },
    iconWrapper: {
        display: 'flex',
        alignItems: 'center'
    },
    iconStyleType: {
        width: 16,
        height: 16,
        margin: '0 3px'
    },
    emptyIcon: {
        width: 16,
        height: 16,
        margin: '0 3px'
    },
    typeCellNameAndIcon: {
        display: 'flex',
        alignItems: 'center'
    },
    iconOpen: {
        transform: 'skew(147deg, 183deg) scale(0.5) translate(-43px, 11px)'
    },
    hoverRow: {
        '&:hover:after': {
            width: '100%',
        },
        position: 'relative',
        transform: 'scale(1)',
        '&:after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            background: '#ffffff36',
            pointerEvents: 'none'
        }
    }
});

class ListDevices extends Component {
    constructor(props) {
        super(props);

        if (!actionsMapping.translated) {
            Object.keys(actionsMapping).forEach(a => actionsMapping[a].desc = I18n.t(actionsMapping[a].desc));
            actionsMapping.translated = true;
        }
        const location = Router.getLocation();

        let expanded = window.localStorage.getItem('Devices.expanded') || '[]';
        try {
            expanded = JSON.parse(expanded);
        } catch (e) {
            expanded = [];
        }

        let expandedIDs = window.localStorage ? window.localStorage.getItem('IDs.expanded') : '';
        try {
            expandedIDs = expandedIDs ? JSON.parse(expandedIDs) || null : null;
        } catch (e) {
            expandedIDs = null;
        }

        // if (expanded === null) {
        //     expanded = [];
        //     listItems.forEach(item =>
        //         expanded.includes(item.parent) && expanded.push(item.parent));
        // }

        this.state = {
            editId: location.dialog === 'edit' ? location.id : null,
            copyId: null,
            // deleteIndex: null,
            deleteId: '',
            editEnum: null,
            listItems: [],
            expandedIDs,

            windowWidth: window.innerWidth,
            showAddDialog: '',
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            loading: true,
            browse: false,
            expanded,
            orderBy: window.localStorage.getItem('Devices.orderBy') || 'IDs',
            lastChanged: '',
            linkeddevices: '',
            iot: '',
            iotNoCommon: false,
            showImporterDialog: null,
            showEditFolder: null,
            // onlyAliases: window.localStorage.getItem('Devices.onlyAliases') ? JSON.parse(window.localStorage.getItem('Devices.onlyAliases')) : true,
            onlyAliases: false,
            hideInfo: window.localStorage.getItem('Devices.hideInfo') ? JSON.parse(window.localStorage.getItem('Devices.hideInfo')) : true,
            updating: [],
        };

        this.inputRef = createRef();

        this.filter = window.localStorage.getItem('Devices.filter') || '';

        this.timerChanged = null;

        this.waitForUpdateID = null;

        this.objects = {};
        this.states = {};
        this.instances = [];
        this.enumObj = {};

        this.subscribes = {};
        this.onUpdateBound = this.onUpdate.bind(this);

        this.detector = new SmartDetector();
        this.patterns = this.detector.getPatterns();

        // read if linkeddevices installed
        this.props.socket.getAdapterInstances('linkeddevices')
            .catch(e => [])
            .then(linkedDevices => {
                // read if iot installed
                this.props.socket.getAdapterInstances('iot')
                    .catch(e => [])
                    .then(iot => {
                        const newState = {};
                        let changed = false;
                        // always take the first one
                        if (linkedDevices && linkedDevices.length && linkedDevices[0] && linkedDevices[0]._id) {
                            newState.linkeddevices = linkedDevices[0]._id.replace('system.adapter.', '') || '';
                            changed = true;
                        }
                        if (iot && iot.length && iot[0] && iot[0]._id) {
                            newState.iotNoCommon = iot[0].native && iot[0].native.noCommon;
                            newState.iot = iot[0]._id.replace('system.adapter.', '') || '';
                            changed = true;
                        }
                        changed && this.setState(newState);
                    });

                this.detectDevices();
            });
    }

    setStateAsync(newState) {
        return new Promise(resolve => this.setState(newState, () => resolve()));
    }

    componentDidMount() {
        window.addEventListener('resize', this.onResize, false);
        this.props.socket.subscribeObject('*', this.onObjectChanged);
        window.addEventListener('hashchange', this.onHashChange, false);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize, false);
        window.removeEventListener('hashchange', this.onHashChange, false);
        this.props.socket.unsubscribeObject('*', this.onObjectChanged);
        this.updateTimeout && clearTimeout(this.updateTimeout);
        this.updateTimeout = null;
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.resizeTimer = null;
    }

    onHashChange = () => {
        const location = Router.getLocation();
        if (location.dialog === 'edit' && location.id && location.id !== this.state.editId) {
            this.setState({ editId: location.id });
        }
    }

    onObjectChanged = (id, obj) => {
        if (this.state.loading) {
            return;
        }
        /*let changed = false;
        if (!obj) {
            if (this.objects[id]) {
                changed = true;
                delete this.objects[id];
            }
        } else {
            if (this.objects[id]) {
                if (JSON.stringify(this.objects[id]) !== JSON.stringify(obj)) {
                    this.objects[id] = obj;
                    changed = true;
                }
            } else {
                this.objects[id] = obj;
                changed = true;
            }
        }*/

        this.updateTimeout && clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(async () => {
            this.updateTimeout = null;
            await this.updateListItems();
        }, 300);
    };

    onResize = () => {
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.resizeTimer = null;
            this.setState({ windowWidth: window.innerWidth });
        }, 300);
    }

    updateListItems = async () => {
        const idsInEnums = [];

        this.enumIDs.forEach(en => {
            const e = this.enumObj[en];
            e?.common?.members && e.common.members.forEach(id =>
                !idsInEnums.includes(id) && idsInEnums.push(id));
        });

        // List all devices in aliases
        const keys = Object.keys(this.objects).sort();

        for (let i = 0; i < keys.length; i++) {
            if (keys[i] < ALIAS) continue;
            if (keys[i] > LINKEDDEVICES + '\u9999') break;

            if ((keys[i].startsWith(ALIAS) || keys[i].startsWith(LINKEDDEVICES)) && this.objects[keys[i]] && !idsInEnums.includes(keys[i])) {
                if (this.objects[keys[i]].type === 'device') {
                    idsInEnums.push(keys[i]);
                } else if (this.objects[keys[i]].type === 'channel') {
                    const parts = keys[i].split('.');
                    parts.pop();

                    const parentId = parts.join('.');
                    // if parent was not yet included
                    if (!this.objects[parentId] || !idsInEnums.includes(parentId)) {
                        idsInEnums.push(keys[i]);
                    }
                }
            }
        }

        idsInEnums.sort();

        const _usedIdsOptional = [];
        const devices = [];
        idsInEnums.forEach(id => {
            const result = this.detector.detect({ id, objects: this.objects, _usedIdsOptional, _keysOptional: keys });
            result && result.forEach(device => devices.push(device));
        });

        const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

        // find channelID for every device
        devices.map(device =>
            this.updateEnumsForOneDevice(device, funcEnums, roomsEnums));
        ///////

        const listItems = this.onObjectsGenerate(this.objects || {}, JSON.parse(JSON.stringify(devices)));
        let expandedIDs = this.state.expandedIDs;
        if (expandedIDs === null) {
            expandedIDs = [];
            listItems.forEach(item =>
                expandedIDs.includes(item.parent) && expandedIDs.push(item.parent));
        }

        await this.setStateAsync({ devices, expandedIDs, listItems });

        if (this.editCreatedId && this.objects[this.editCreatedId]) {
            const id = this.editCreatedId;
            this.editCreatedId = null;
            Router.doNavigate('list', 'edit', id);
        }
    }

    async detectDevices() {
        // read objects
        await this.setStateAsync({ browse: true });

        this.instances = await this.props.socket.getAdapters();
        this.objects = await this.props.socket.getObjects(true);
        const enums = await this.props.socket.getEnums();
        const idsInEnums = [];
        this.enumIDs = Object.keys(enums).sort();
        this.enumObj = enums;
        // collect all IDs in all enums
        this.enumIDs.forEach(en => {
            const e = enums[en];
            e?.common?.members && e.common.members.forEach(id =>
                !idsInEnums.includes(id) && idsInEnums.push(id));
        });

        // List all devices in aliases
        const keys = Object.keys(this.objects).sort();
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] < ALIAS) continue;
            if (keys[i] > LINKEDDEVICES + '\u9999') break;

            if ((keys[i].startsWith(ALIAS) || keys[i].startsWith(LINKEDDEVICES)) && this.objects[keys[i]] && !idsInEnums.includes(keys[i])) {
                if (this.objects[keys[i]].type === 'device') {
                    idsInEnums.push(keys[i]);
                } else if (this.objects[keys[i]].type === 'channel') {
                    const parts = keys[i].split('.');
                    parts.pop();

                    const parentId = parts.join('.');
                    // if parent was not yet included
                    if (!this.objects[parentId] || !idsInEnums.includes(parentId)) {
                        idsInEnums.push(keys[i]);
                    }
                }
            }
        }

        idsInEnums.sort();

        const _usedIdsOptional = [];
        const devices = [];
        idsInEnums.forEach(id => {
            const result = this.detector.detect({ id, objects: this.objects, _usedIdsOptional, _keysOptional: keys });
            result && result.forEach(device => devices.push(device));
        });

        const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

        // find channelID for every device
        devices.map(device =>
            this.updateEnumsForOneDevice(device, funcEnums, roomsEnums));

        const listItems = this.onObjectsGenerate(this.objects || {}, JSON.parse(JSON.stringify(devices)));
        let expandedIDs = this.state.expandedIDs;
        if (expandedIDs === null) {
            expandedIDs = [];
            listItems.forEach(item =>
                expandedIDs.includes(item.parent) && expandedIDs.push(item.parent));
        }

        await this.setStateAsync({ devices, expandedIDs, listItems, loading: false, browse: false });
    }

    onObjectsGenerate = (objects, devices) => {
        this.prefix = this.props.prefix || 'alias.0';
        let i = 1;
        while (objects[this.prefix + '.' + I18n.t('Device') + '_' + i]) {
            i++;
        }

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        const ids = [];

        Object.keys(objects).forEach(id => {
            if (id.startsWith(prefix) &&
                objects[id] &&
                objects[id].common &&
                (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder')) {
                let parentId;
                // getParentId
                if (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder') {
                    parentId = id;
                } else {
                    parentId = getParentId(id);
                }

                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });
        this.typesWords = {};
        Object.keys(Types)
            .filter(id => !UNSUPPORTED_TYPES.includes(id))
            .forEach(typeId => this.typesWords[typeId] = I18n.t('type-' + Types[typeId]));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a] === this.typesWords[b]) {
                return 0;
            }
            if (this.typesWords[a] > this.typesWords[b]) {
                return 1;
            } else {
                return -1;
            }
        });

        const stateIds = {};
        const language = I18n.getLanguage();
        ids.forEach(id => {
            stateIds[id] = {
                common: {
                    name: objects[id]?.type === 'folder' ? Utils.getObjectName(objects, id, { language }) : getLastPart(id),
                    nondeletable: true,
                    color: objects[id]?.common?.color || null,
                    icon: objects[id]?.common?.icon || this.searchIcon(id.channelId)
                },
                obj: objects[id],
                type: objects[id].type,
                role: objects[id].type !== 'folder' && objects[id].common ? objects[id].common.role || null : null
            };
        });

        stateIds[`${this.prefix}.automatically_detected`] = {
            common: {
                name: I18n.t('Automatically detected'),
                nondeletable: true,
                noEdit: true,
                showId: true,
            },
            type: 'folder'
        };

        let devicesArr = devices || this.state.devices;

        devicesArr = devicesArr.filter(({ channelId }) => !channelId.startsWith('alias.0') && !channelId.startsWith('linkeddevices.0'));

        devicesArr.forEach(device => {
            let parts = device.channelId.split('.');
            const name = `${parts[0]}.${parts[1]}`;
            parts = `${parts[0]}`;
            if (!stateIds[`${this.prefix}.automatically_detected.${parts}`]) {
                const instances = this.instances.find(inst => inst._id.replace('system.adapter.', '') === parts);
                stateIds[`${this.prefix}.automatically_detected.${parts}`] = {
                    common: {
                        name,
                        nondeletable: true,
                        icon: instances?.common?.extIcon || this.searchIcon(device.channelId)
                    },
                    noEdit: true,
                    importer: true,
                    showId: true,
                    // obj:instances,
                    type: 'folder'
                };
            }
        });

        devicesArr.forEach(device => {
            let parts = device.channelId.split('.');
            parts = `${parts[0]}`;
            stateIds[`${this.prefix}.automatically_detected.${parts}.${device.channelId.replace(/[\s.,%]/g, '')}`] = {
                common: {
                    name: Utils.getObjectName(objects, device.channelId, { language }),
                    nondeletable: true,
                    color: objects[device.channelId]?.common && objects[device.channelId].common.color ? objects[device.channelId].common.color : null,
                    icon: objects[device.channelId]?.common && objects[device.channelId].common.icon ? objects[device.channelId].common.icon : this.searchIcon(device.channelId)
                },
                obj: objects[device.channelId],
                type: objects[device.channelId]?.type,
                role: device.type
            }
        })

        if (this.state.linkeddevices) {
            let devicesArrLinkeddevices = devices || this.state.devices;

            devicesArrLinkeddevices = devicesArrLinkeddevices.filter(({ channelId }) => channelId.startsWith('linkeddevices.0'));
            stateIds[`${this.prefix}.linked_devices`] = {
                common: {
                    name: I18n.t('Linked devices'),
                    nondeletable: true,
                    noEdit: true,
                    showId: true,
                    icon: <HiLink style={{ color: 'black' }} className={this.props.classes.iconCommon}
                    />
                },
                type: 'folder'
            };

            devicesArrLinkeddevices.forEach(device => {
                stateIds[`${this.prefix}.linked_devices.${device.channelId.replace('linkeddevices.0.', '')}`] = {
                    common: {
                        name: Utils.getObjectName(objects, device.channelId, { language }),
                        nondeletable: true,
                        color: objects[device.channelId]?.common && objects[device.channelId].common.color ? objects[device.channelId].common.color : null,
                        icon: objects[device.channelId]?.common && objects[device.channelId].common.icon ? objects[device.channelId].common.icon : this.searchIcon(device.channelId)
                    },
                    obj: objects[device.channelId],
                    type: objects[device.channelId]?.type,
                    role: device.type
                }
            });
        }

        return prepareList(stateIds, null, this.objects);
    }

    /*onImporterObjectsGenerate = (objects, devices) => {
        this.prefix = this.props.prefix || 'alias.0';
        let i = 1;
        while (objects[this.prefix + '.' + I18n.t('Device') + '_' + i]) {
            i++;
        }

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        const ids = [];

        Object.keys(objects).forEach(id => {
            if (id.startsWith(prefix) &&
                objects[id] &&
                objects[id].common &&
                (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder')) {
                let parentId;
                // getParentId
                if (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder') {
                    parentId = id;
                } else {
                    parentId = getParentId(id);
                }

                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });
        this.typesWords = {};
        Object.keys(Types)
            .filter(id => !UNSUPPORTED_TYPES.includes(id))
            .forEach(typeId => this.typesWords[typeId] = I18n.t('type-' + Types[typeId]));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a] === this.typesWords[b]) {
                return 0;
            }
            if (this.typesWords[a] > this.typesWords[b]) {
                return 1;
            } else {
                return -1;
            }
        });

        const stateIds = {};
        const language = I18n.getLanguage();

        ids.forEach(id => {
            return stateIds[id] = {
                common: {
                    name: objects[id] && objects[id].type === 'folder' ? Utils.getObjectName(objects, id, { language }) : getLastPart(id),
                    nondeletable: true,
                    color: objects[id].common && objects[id].common.color ? objects[id].common.color : null,
                    icon: objects[id].common && objects[id].common.icon ? objects[id].common.icon : null
                },
                obj: objects[id],
                type: objects[id].type,
                role: objects[id].type !== 'folder' && objects[id].common ? objects[id].common.role || null : null
            }
        });

        stateIds[`${this.prefix}.automatically_detected`] = {
            common: {
                name: I18n.t('Automatically detected'),
                nondeletable: true
            },
            type: 'folder'
        };

        let devicesArr = devices || this.state.devices;

        devicesArr = devicesArr.filter(({ channelId }) => !channelId.startsWith('alias.0') && !channelId.startsWith('linkeddevices.0'));
        devicesArr.forEach(device => {
            stateIds[`${this.prefix}.automatically_detected.${Utils.getObjectName(objects, device.channelId, { language })}`] = {
                common: {
                    name: Utils.getObjectName(objects, device.channelId, { language }),
                    nondeletable: true,
                    color: objects[device.channelId]?.common && objects[device.channelId].common.color ? objects[device.channelId].common.color : null,
                    icon: objects[device.channelId]?.common && objects[device.channelId].common.icon ? objects[device.channelId].common.icon : null
                },
                obj: objects[device.channelId],
                type: objects[device.channelId]?.type,
                role: device.type
            }
        })

        if (this.state.linkeddevices) {
            let devicesArrLinkeddevices = devices || this.state.devices;

            devicesArrLinkeddevices = devicesArrLinkeddevices.filter(({ channelId }) => channelId.startsWith('linkeddevices.0'));
            stateIds[`${this.prefix}.linked_devices`] = {
                common: {
                    name: I18n.t('Linked devices'),
                    nondeletable: true,
                    icon: <HiLink style={{ color: 'black' }} className={this.props.classes.iconCommon}
                    />
                },
                type: 'folder'
            };
            devicesArrLinkeddevices.forEach(device => {
                stateIds[`${this.prefix}.linked_devices.${device.channelId.replace('linkeddevices.0.', '')}`] = {
                    common: {
                        name: Utils.getObjectName(objects, device.channelId, { language }),
                        nondeletable: true,
                        color: objects[device.channelId]?.common && objects[device.channelId].common.color ? objects[device.channelId].common.color : null,
                        icon: objects[device.channelId]?.common && objects[device.channelId].common.icon ? objects[device.channelId].common.icon : null
                    },
                    obj: objects[device.channelId],
                    type: objects[device.channelId]?.type,
                    role: device.type
                }
            })
        }
        return prepareList(stateIds, null, this.objects)
    }*/

    updateEnumsForOneDevice(device, funcEnums, roomsEnums) {
        funcEnums = funcEnums || this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        roomsEnums = roomsEnums || this.enumIDs.filter(id => id.startsWith('enum.rooms.'));
        if (!device) {
            return;
        }
        const stateId = device.states.find(state => state.id).id;
        let statesCount = device.states.filter(state => state.id).length;
        const pos = stateId.lastIndexOf('.');
        let channelId = stateId;
        if (pos !== -1 && (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))) {
            channelId = stateId.substring(0, pos);
            if (!this.objects[channelId] ||
                !this.objects[channelId].common ||
                (this.objects[channelId].type !== 'channel' && this.objects[channelId].type !== 'device')) {
                channelId = stateId;
            }
        }
        device.usedStates = device.states.filter(state => state.id).length;
        device.mainStateId = stateId;
        device.channelId = channelId;

        const functions = funcEnums.filter(id => {
            const obj = this.objects[id];
            return obj &&
                obj.common &&
                obj.common.members &&
                (obj.common.members.includes(device.channelId) ||
                    obj.common.members.includes(device.mainStateId));
        });

        const rooms = roomsEnums.filter(id => {
            const obj = this.objects[id];
            return obj &&
                obj.common &&
                obj.common.members &&
                (obj.common.members.includes(device.channelId) ||
                    obj.common.members.includes(device.mainStateId));
        });

        device.functions = functions;
        device.functionsNames = functions.map(id => Utils.getObjectNameFromObj(this.objects[id], null, { language: I18n.getLanguage() })).join(', ');
        device.rooms = rooms;
        device.roomsNames = rooms.map(id => Utils.getObjectNameFromObj(this.objects[id], null, { language: I18n.getLanguage() })).join(', ');
        device.name = SmartGeneric.getObjectName(this.objects, device.channelId, null, null, this.enumIDs);

        device.icon = Utils.getObjectIcon(device.channelId, this.objects[device.channelId]) || this.searchIcon(device.channelId);

        device.color = this.objects[channelId]?.common?.color || null;
        if (!device.icon) {
            const parts = device.channelId.split('.');
            parts.pop();
            const deviceId = parts.join('.');

            if (this.objects[deviceId] && (this.objects[deviceId].type === 'channel' || this.objects[deviceId].type === 'device')) {
                device.icon = Utils.getObjectIcon(deviceId, this.objects[deviceId]) || this.searchIcon(device.channelId);
            }
        }
    }

    searchIcon = (channelId) => {
        if (!this.objects) {
            return null;
        }
        let icon = null;
        if (channelId) {
            // check the parent
            if (channelId && channelId.split('.').length > 2) {
                const channelObj = this.objects[channelId];
                if (channelObj && (channelObj.type === 'channel' || channelObj.type === 'device' || channelObj.type === 'state')) {
                    if (channelObj.common?.icon) {
                        icon = channelObj.common?.icon;
                    } else {
                        // check the parent
                        const deviceId = Utils.getParentId(channelId);
                        if (deviceId && deviceId.split('.').length > 2) {
                            const arrayParent = deviceId.split('.');
                            let parentId = deviceId;
                            for (let i = 0; i < arrayParent.length - 2; i++) {
                                console.log('Get deviceId' + parentId);
                                const deviceObj = this.objects[parentId];
                                if (deviceObj && (deviceObj.type === 'channel' || deviceObj.type === 'device')) {
                                    if (deviceObj.common?.icon) {
                                        icon = deviceObj.common?.icon;
                                        break;
                                    }
                                }
                                parentId = Utils.getParentId(parentId);
                            }
                        }
                    }
                }
            }
        }

        let imagePrefix = '../..';

        const objects = this.objects;
        const cIcon = icon;
        const id = channelId;

        if (cIcon && !cIcon.startsWith('data:image/') && cIcon.includes('.')) {
            let instance;
            if (objects[id].type === 'instance' || objects[id].type === 'adapter') {
                icon = `${imagePrefix}/adapter/${objects[id].common.name}/${cIcon}`;
            } else if (id && id.startsWith('system.adapter.')) {
                instance = id.split('.', 3);
                if (cIcon[0] === '/') {
                    instance[2] += cIcon;
                } else {
                    instance[2] += '/' + cIcon;
                }
                icon = `${imagePrefix}/adapter/${instance[2]}`;
            } else {
                instance = id.split('.', 2);
                if (cIcon[0] === '/') {
                    instance[0] += cIcon;
                } else {
                    instance[0] += '/' + cIcon;
                }
                icon = `${imagePrefix}/adapter/${instance[0]}`;
            }
        }
        return icon;
    }

    addChanged(id, cb) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (!changed.includes(id)) {
            changed.push(id);
            this.setState({ changed }, () => cb && cb());
        } else {
            cb && cb();
        }
    }

    removeChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({ changed });
        }
    }

    renderMessage() {
        if (this.state.message) {
            return <MessageDialog text={this.state.message} onClose={() => this.setState({ message: '' })} />;
        } else {
            return null;
        }
    }

    onUpdate(id, state) {
        if (this.subscribes[id]) {
            this.states[id] = state;
            this.subscribes[id].forEach(elem => elem.updateState(id, state));
        }
    }

    /**
     *
     * @param {object} elem React visual element
     * @param {array} ids string or array of strings with IDs that must be subscribed or un-subscribed
     * @param {boolean} isMount true if subscribe and false if un-subscribe
     */
    /*onCollectIds(elem, ids, isMount) {
        if (typeof ids !== 'object') {
            ids = [ids];
        }

        if (isMount) {
            let newIDs = [];
            let oldIDs = [];

            ids.forEach(id => {
                if (!id) {
                    console.warn('Invalid ID!');
                    return;
                }

                if (!this.subscribes[id]) {
                    newIDs.push(id);
                } else {
                    oldIDs.push({ id, elem });
                }
                this.subscribes[id] = this.subscribes[id] || [];
                this.subscribes[id].push(elem);
            });
            if (newIDs.length) {
                newIDs.forEach(id => this.props.socket.subscribeState(id, this.onUpdateBound));
            }
            if (oldIDs.length) {
                setTimeout(() =>
                    oldIDs.forEach(item =>
                        this.states[item.id] && elem.updateState(item.id, this.states[item.id])), 0);
            }
        } else {
            let nonIDs = [];
            ids.forEach(id => {
                if (this.subscribes[id]) {
                    let pos = this.subscribes[id].indexOf(elem);
                    if (pos !== -1) {
                        this.subscribes[id].splice(pos, 1);
                    }

                    if (!this.subscribes[id].length) {
                        nonIDs.push(id);
                        delete this.subscribes[id];
                    }
                }
            });
            if (nonIDs.length) {
                nonIDs.forEach(id => this.props.socket.unsubscribeState(id, this.onUpdateBound));
            }
        }
    }*/

    onEdit(editId, e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        Router.doNavigate('list', 'edit', editId.toString());
        this.setState({ editId });
    }

    onCopy(copyId, e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        this.setState({ copyId, showAddDialog: ALIAS + '0' });
    }

    isFilteredOut(device) {
        if (this.state.orderBy === 'IDs') {
            if (this.filter &&
                // device.type !== 'folder' &&
                !Utils.getObjectNameFromObj(device.obj, I18n.getLanguage()).toLowerCase().includes(this.filter.toLowerCase()) &&
                !device.id.toLowerCase().includes(this.filter.toLowerCase())
            ) {
                return true;
            } else {
                const deviceAllparams = this.state.devices.find(el => el.channelId === device.id);
                return this.state.hideInfo && deviceAllparams && deviceAllparams.type === Types.info;
            }
        } else
            if (this.filter &&
                !device.channelId.toLowerCase().includes(this.filter) &&
                !device.name.toLowerCase().includes(this.filter)) {
                return true;
            } else {
                return !!(this.state.hideInfo && device.type === Types.info);
            }
    }

    onEditEnum(values, enums, index) {
        this.setState({ editEnum: { values, enums, index } });
    }

    renderEnumCell(names, values, enums, index) {
        const objs = values.map(id => ({
            icon: Utils.getObjectIcon(id, this.objects[id]),
            name: Utils.getObjectName(this.objects, id, { language: I18n.getLanguage() }),
            id
        }));

        return <ButtonBase
            focusRipple
            onClick={() => this.onEditEnum(values, enums, index)}
            className={this.props.classes.enumsEdit}
            focusVisibleClassName={this.props.classes.enumsEditFocusVisible}
        >{
                objs.map(obj =>
                    <div className={this.props.classes.wrapperIconEnumCell} key={obj.id}>
                        {obj.icon && <Icon className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} />}
                        <div className={this.props.classes.nameEnumCell}>{obj.name}</div>
                    </div>
                )
            }
        </ButtonBase>;
    }

    renderTypeCell(type) {
        return <div className={clsx(this.props.classes.wrapperIconEnumCell, this.props.classes.spaceBetween)}>
            <div className={this.props.classes.typeCellNameAndIcon}>
                <TypeIcon className={this.props.classes.enumIcon} type={type} />
                <div className={this.props.classes.nameEnumCell}>{I18n.t('type-' + type)}</div>
            </div>
            <div className={this.props.classes.iconWrapper}>{Object.keys(TYPE_OPTIONS[type]).map(key => TYPE_OPTIONS[type][key] ? <Icon className={this.props.classes.iconStyleType} src={ICONS_TYPE[key]} /> : <div key={key} className={this.props.classes.emptyIcon} />)}</div>
        </div>;
    }

    // renderDevice(key, index, device, funcEnums, roomsEnums) {
    //     device = device || this.state.devices[index];

    //     const classes = this.props.classes;
    //     const background = this.objects[device.channelId] && this.objects[device.channelId].common && this.objects[device.channelId].common.color;
    //     const color = Utils.invertColor(background, true);

    //     let j = 0;

    //     const smartName = this.getSmartName(this.objects[device.channelId]);

    //     return <TableRow
    //         key={key}
    //         className={classes.tableLine} padding="default" style={{ background }}>
    //         <TableCell style={{ color }} className={classes.tableExpandIconCell} />
    //         <TableCell style={{ color }} className={classes.tableIconCell}>
    //             <div className={classes.tableIcon}>
    //                 <TypeIcon style={{ color }} src={device.icon} className={classes.tableIconImg} type={device.type} />
    //             </div>
    //         </TableCell>
    //         <TableCell style={{ color }} className={classes.tableNameCell}>{device.name}{smartName !== '' ? <div className={classes.tableSmartName}>{smartName || I18n.t('disabled')}</div> : null}</TableCell>
    //         {this.state.windowWidth >= WIDTHS[4] ? <TableCell style={{ color }} className={classes.tableIdCell} title={device.channelId}>{device.channelId}</TableCell> : null}
    //         {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell style={{ color }}>{this.renderEnumCell(device.functionsNames, device.functions, funcEnums, index)}</TableCell> : null}
    //         {this.state.orderBy !== 'rooms' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell style={{ color }}>{this.renderEnumCell(device.roomsNames, device.rooms, roomsEnums, index)}</TableCell> : null}
    //         {this.state.orderBy !== 'types' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell style={{ color }}>{this.renderTypeCell(device.type)}</TableCell> : null}
    //         {this.state.windowWidth >= WIDTHS[0] ? <TableCell style={{ color }}>{device.usedStates}</TableCell> : null}
    //         <TableCell align="right" style={{ color }} className={classes.buttonsCell}>
    //             <div className={classes.wrapperButton}>
    //                 <Tooltip title={I18n.t('Edit states')}>
    //                     <IconButton
    //                         style={{ color }}
    //                         // size="small"
    //                         onClick={e => this.onEdit(device.channelId, e)}>
    //                         <IconEdit />
    //                     </IconButton>
    //                 </Tooltip>
    //                 {(device.channelId.startsWith(ALIAS) || device.channelId.startsWith(LINKEDDEVICES)) ?
    //                     <Tooltip title={I18n.t('Delete device with all states')}>
    //                         <IconButton
    //                             style={{ color }}
    //                             // size="small"
    //                             onClick={e => {
    //                                 e.stopPropagation();
    //                                 this.setState({ deleteIndex: index });
    //                             }}>
    //                             <IconDelete />
    //                         </IconButton>
    //                     </Tooltip> : <div className={classes.emptyBlock} />}
    //             </div>
    //         </TableCell>
    //     </TableRow>;
    // }

    saveExpanded(expandedIDs) {
        window.localStorage.setItem('IDs.expanded', JSON.stringify(expandedIDs || this.state.expandedIDs));
    }

    toggleExpanded(id, open) {
        const expandedIDs = this.state.expandedIDs.slice();
        const pos = expandedIDs.indexOf(id);
        if (pos === -1) {
            expandedIDs.push(id);
            expandedIDs.sort();
        } else {
            if (!open) {
                expandedIDs.splice(pos, 1);
            }
        }
        this.setState({ expandedIDs });
        this.saveExpanded(expandedIDs);
    }

    getTextStyle(item) {
        if (item.type !== 'folder') {
            return {
                //width: 130,
                // width: `calc(100% - ${this.state.width > 350 ? 210 : 165}px)`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                // flex: 'none',
                padding: '0 16px 0 16px'
            };
        } else {
            const style = {
                whiteSpace: 'nowrap',
                padding: '0 16px 0 16px'
            };
            if (item.id === this.state.selected) {
                style.fontWeight = 'bold'
            }

            return style;
        }
    }

    updateObjects = (status, id, obj) => {
        if (status === 'update') {

        } else if (status === 'delete') {
            if (this.objects[id]) {
                delete this.objects[id];
            }
        } else {
            this.objects[id] = obj;
        }
        this.updateListItems();
    }

    renderOneItem(items, item) {
        let childrenFiltered = (this.state.searchText || this.state.typeFilter) && items.filter(i => i.parent === item.id ? !this.isFilteredOut(i) : false);
        let children = items.filter(i => i.parent === item.id);
        let childrenFilter = items.filter(i => i.parent === item.id).filter(i => !this.isFilteredOut(i));
        if (this.isFilteredOut(item)) {
            if (this.filter && !childrenFilter.length) {
                return
            } else if (!this.filter) {
                return;
            }
        }

        if (item.type === 'folder' && (this.state.searchText || this.state.typeFilter) && !childrenFiltered.length) {
            return;
        }

        const depthPx = item.depth * 20 + 10;

        let title = item.title;

        if (this.state.searchText) {
            const pos = title.toLowerCase().indexOf(this.state.searchText.toLowerCase());
            if (pos !== -1) {
                title = [
                    <span key="first">{title.substring(0, pos)}</span>,
                    <span key="second" style={{ color: 'orange' }}>{title.substring(pos, pos + this.state.searchText.length)}</span>,
                    <span key="third">{title.substring(pos + this.state.searchText.length)}</span>,
                ];
            }
        }

        const style = Object.assign({
            paddingLeft: depthPx,
            // borderRadius: 3,
            cursor: item.type === 'folder' && this.state.reorder ? 'default' : 'pointer',
            opacity: item.filteredPartly ? 0.5 : 1,
        }, item.id === this.state.selected ? { background: this.props.theme.palette.secondary.dark, color: '#FFF' } : {});

        let isExpanded = false;
        if (children && children.length) {
            isExpanded = this.state.expandedIDs.includes(item.id);
        }

        let iconStyle = {};
        let countSpan = (childrenFiltered && childrenFiltered.length) || children.length ?
            <span className={this.props.classes.childrenCount}>{childrenFiltered && childrenFiltered.length !== children.length ?
                `${childrenFiltered.length}(${children.length})` :
                children.length}</span>
            : null;

        const searchStyle = {};

        if (!countSpan) {
            iconStyle.opacity = 0.5;
        }
        if (!countSpan && item.type === 'folder') {
            searchStyle.opacity = 0.5;
        }

        if (item.id === this.state.selected) {
            iconStyle.opacity = 1;
        }
        if (this.filter && childrenFilter.length && item.type === 'folder') {
            searchStyle.opacity = 0.5;
            iconStyle.opacity = 0.5;
        }
        iconStyle.color = '#448dde';
        iconStyle.width = 36;
        iconStyle.height = 36;

        let backgroundRow = null;

        if (item.id === 'alias.0.automatically_detected') {
            iconStyle.color = "#F1C40F";
            backgroundRow = "#f1c40f33";
        } else
            if (item.id === 'alias.0.linked_devices') {
                iconStyle.color = "#E67E22"
                backgroundRow = "#e67e2233";
            } else
                if ((item.id === 'alias.0.automatically_detected' || item.id === 'alias.0.linked_devices') && !countSpan) {
                    return;
                }

        const classes = this.props.classes;
        let background = null;
        let color = null;
        let index = null;

        const device = this.state.devices.find(el => el.channelId === item.id);
        const deviceIdx = this.state.devices.indexOf(device);
        const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));
        const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));

        if (device) {
            background = this.objects[device.channelId] && this.objects[device.channelId].common && this.objects[device.channelId].common.color;
            color = Utils.invertColor(background, true);
            index = this.state.devices.indexOf(device);
        } else {
            background = item.color;
            color = Utils.invertColor(background, true);
        }

        if (background && item.type === 'folder') {
            iconStyle.color = background;
            // background = null;
            // color = null;
        }

        let j = 0;
        const WrapperRow = item.type !== 'folder' ? DragWrapper : DropWrapper;
        const inner = <WrapperRow
            id={item.id}
            // style={{ background: backgroundRow }}
            updateObjects={this.updateObjects}
            objects={this.objects}
            deleteDevice={this.deleteDevice}
            onCopyDevice={this.onCopyDevice}
            openFolder={() => this.toggleExpanded(item.id, true)}
            deviceIdx={deviceIdx}
            backgroundRow={backgroundRow}
            className={this.props.classes.hoverRow}
            key={item.id || title}
            padding="default" >
            <TableCell
                colSpan={3}
                style={Object.assign({ maxWidth: 300 }, style)}
                onDoubleClick={() => this.toggleExpanded(item.id)}
                className={Utils.clsx(item.type === 'folder' ? this.props.classes.folder : this.props.classes.element, this.state.reorder && this.props.classes.reorder)}
            >
                <div className={classes.displayFlex}>
                    <ListItemIcon className={this.props.classes.iconStyle}>
                        {item.type === 'folder' ?
                            (isExpanded ?
                                <IconFolderOpened onClick={() => this.toggleExpanded(item.id)} style={iconStyle} /> :
                                <IconFolder onClick={() => this.toggleExpanded(item.id)} style={iconStyle} />)
                            :
                            <div style={{ background }} className={this.props.classes.tableIcon}>
                                <TypeIcon src={item.icon} style={{ color }} className={this.props.classes.tableIconImg} type={item.role} />
                            </div>}
                        {item.type === 'folder' && item.icon &&
                            <div className={clsx(isExpanded && this.props.classes.iconOpen)} onClick={() => this.toggleExpanded(item.id)}>
                                <Icon className={this.props.classes.iconCommon} onClick={() => this.toggleExpanded(item.id)} alt={item.type} src={item.icon} />
                            </div>}
                    </ListItemIcon>
                    <Tooltip title={<div>
                        <div>{`${I18n.t("Name")}: ${title}`}</div>
                        {!item.showId && item.id !== "alias.0.automatically_detected" && item.id !== "alias.0.linked_devices" &&
                            <div>{`${I18n.t("Id")}: ${item.id}`}</div>
                        }
                    </div>}>
                        <div className={this.props.classes.wrapperTitleAndId}>
                            <div
                                style={Object.assign(searchStyle, this.getTextStyle(item))}
                                className={clsx(item.id === this.state.selected && this.props.classes.selected, this.props.classes.fontStyle)}
                            >{title}</div>
                            {!item.showId && item.id !== "alias.0.automatically_detected" && item.id !== "alias.0.linked_devices" && <div
                                style={Object.assign(searchStyle, this.getTextStyle(item))}
                                className={clsx(item.id === this.state.selected && this.props.classes.selected, this.props.classes.fontStyleId)}
                            >{item.id}</div>}
                        </div>
                    </Tooltip>
                    {/* <ListItemSecondaryAction style={{ color: item.id === this.state.selected ? 'white' : 'inherit' }}>{countSpan}</ListItemSecondaryAction> */}
                </div>
            </TableCell>
            {/* <TableCell  /> */}
            {/* <TableCell style={{ color }} className={classes.tableNameCell}>{item.id}</TableCell> */}
            {device && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell>{this.renderEnumCell(device.functionsNames, device.functions, funcEnums, index)}</TableCell> : null}

            {device && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell>
                {this.renderEnumCell(device.roomsNames, device.rooms, roomsEnums, index)}
            </TableCell> : null}
            {device && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell>{this.renderTypeCell(device.type)}</TableCell> : null}
            {device && this.state.windowWidth >= WIDTHS[0] ? <TableCell>{device.usedStates}</TableCell> : null}
            {device && <TableCell align="right" className={classes.buttonsCell}>
                <div className={classes.wrapperButton}>
                    <Tooltip title={I18n.t('Copy device')}>
                        <IconButton
                            // size="small"
                            onClick={e => this.onCopy(item.id, e)}
                        >
                            <FileCopyIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={I18n.t('Edit states')}>
                        <IconButton
                            // size="small"
                            onClick={e => this.onEdit(item.id, e)}
                        >
                            <IconEdit />
                        </IconButton>
                    </Tooltip>
                    {(device.channelId.startsWith(ALIAS) || device.channelId.startsWith(LINKEDDEVICES)) ?
                        <Tooltip title={I18n.t('Delete device with all states')}>
                            <IconButton
                                onClick={e =>
                                    deleteFolderAndDeviceCallBack(result =>
                                        result && this.deleteDevice(index), true)}
                            >
                                <IconDelete />
                            </IconButton>
                        </Tooltip> : <div className={classes.emptyBlock} />}

                </div>
            </TableCell>}
            {!device && this.state.windowWidth >= WIDTHS[1 + j++] && <TableCell colSpan={1} />}
            {!device && this.state.windowWidth >= WIDTHS[1 + j++] && <TableCell colSpan={1} />}
            {!device && this.state.windowWidth >= WIDTHS[1 + j++] && <TableCell colSpan={1} />}
            {!device && this.state.windowWidth >= WIDTHS[0] && <TableCell colSpan={1} >{countSpan}</TableCell>}
            {!device && <TableCell align="right" className={classes.buttonsCell}>
                {item.importer &&
                    <div className={classes.wrapperButton}>
                        <Tooltip title={I18n.t('Importer')}>
                            <IconButton
                                onClick={() => this.setState({ showImporterDialog: item })}
                            >
                                <FileCopyIcon />
                            </IconButton>
                        </Tooltip>
                        <div className={classes.emptyBlock} />
                        <div className={classes.emptyBlock} />
                    </div>}
                {!item.noEdit && item.id !== "alias.0.automatically_detected" && item.id !== "alias.0.linked_devices" && <div className={classes.wrapperButton}>
                    <Tooltip title={I18n.t('Edit folder')}>
                        <IconButton
                            onClick={_ => this.setState({ showEditFolder: item.obj })}
                        // onClick={e => editFolderCallBack(item.obj, bool => {
                        //     bool && this.detectDevices(true);
                        // }, this.props.socket,
                        //     this.state.devices,
                        //     this.objects,
                        //     this.deleteDevice,
                        //     this.processTasks)}
                        >
                            <IconEdit />
                        </IconButton>
                    </Tooltip>
                    {!countSpan ?
                        <Tooltip title={I18n.t('Delete folder')}>
                            <IconButton
                                onClick={e =>
                                    deleteFolderAndDeviceCallBack(result =>
                                        result && this.props.socket.delObjects(item.id, true), false)}
                            >
                                <IconDelete />
                            </IconButton>
                        </Tooltip> : <div className={classes.emptyBlock} />}
                </div>}
            </TableCell>}
        </WrapperRow>;

        const result = [inner];

        if (isExpanded) {
            children.forEach(it => result.push(this.renderOneItem(items, it)));
        }
        return result;
    }

    renderAllItems(items, dragging) {
        const result = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item, dragging)));

        return result;
    }

    renderDevices() {
        // let result = [];
        const classes = this.props.classes;
        // const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        // const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

        // if (this.state.orderBy === 'functions' || this.state.orderBy === 'rooms') {
        //     const enums = [];
        //     for (let i = 0; i < this.enumIDs.length; i++) {
        //         const id = this.enumIDs[i];
        //         if (id.startsWith('enum.' + this.state.orderBy + '.')) {
        //             enums.push(id);

        //             // find any device for this function
        //             if (this.state.devices.find(device => !this.isFilteredOut(device) && device[this.state.orderBy].includes(id))) {
        //                 const isExpanded = this.state.expanded.includes(id);
        //                 const icon = Utils.getObjectIcon(id, this.objects[id]);

        //                 let j = 0;
        //                 // add group
        //                 result.push(<TableRow
        //                     key={id}
        //                     className={classes.tableGroup}
        //                     onClick={() => this.onToggle(id)}
        //                     padding="none"
        //                 >
        //                     <TableCell className={classes.tableExpandIconCell}>{isExpanded ? <IconExpanded className={classes.tableExpandIcon} /> : <IconCollapsed className={classes.tableExpandIcon} />}</TableCell>
        //                     <TableCell className={classes.tableIconCell}>{icon ? <img src={icon} alt="" className={classes.tableGroupIcon} /> : null}</TableCell>
        //                     <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{Utils.getObjectNameFromObj(this.objects[id], null, { language: I18n.getLanguage() })}</TableCell>
        //                     <TableCell />
        //                     {this.state.windowWidth >= WIDTHS[4] ? <TableCell /> : null}
        //                     {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                     {this.state.orderBy !== 'rooms' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                     {this.state.orderBy !== 'types' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                     {this.state.windowWidth >= WIDTHS[0] ? <TableCell /> : null}
        //                     <TableCell className={classes.buttonsCell} />
        //                 </TableRow>);

        //                 if (isExpanded) {
        //                     const devices = [];

        //                     this.state.devices.forEach((device, i) =>
        //                         device[this.state.orderBy].includes(id) && !this.isFilteredOut(device) && devices.push(this.renderDevice(id + '_' + i, i, device, funcEnums, roomsEnums)));

        //                     result.push(devices);
        //                 }
        //             }
        //         }
        //     }

        //     // No group
        //     if (this.state.devices.find(device => !this.isFilteredOut(device) && !enums.find(id => device[this.state.orderBy].includes(id)))) {
        //         let j = 0;
        //         const isExpanded = this.state.expanded.includes('no_group');
        //         // add group
        //         result.push(<TableRow
        //             key="no_group"
        //             className={classes.tableGroup}
        //             onClick={() => this.onToggle('no_group')}
        //             padding="none">
        //             <TableCell className={classes.tableExpandIconCell}>{isExpanded ? <IconExpanded className={classes.tableExpandIcon} /> : <IconCollapsed className={classes.tableExpandIcon} />}</TableCell>
        //             <TableCell className={classes.tableIconCell} />
        //             <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{I18n.t('no_group')}</TableCell>
        //             <TableCell />
        //             {this.state.windowWidth >= WIDTHS[4] ? <TableCell /> : null}
        //             {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //             {this.state.orderBy !== 'rooms' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //             {this.state.orderBy !== 'types' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //             {this.state.windowWidth >= WIDTHS[0] ? <TableCell /> : null}
        //             <TableCell className={classes.buttonsCell} />
        //         </TableRow>);

        //         if (isExpanded) {
        //             const devices = [];
        //             this.state.devices.forEach((device, i) =>
        //                 !this.isFilteredOut(device) && !enums.find(id => device[this.state.orderBy].includes(id)) && devices.push(this.renderDevice('no_group_' + i, i, device, funcEnums, roomsEnums)));

        //             result.push(devices);
        //         }
        //     }
        // } else
        //     if (this.state.orderBy === 'types') {
        //         const types = [];
        //         this.state.devices.forEach(device => !this.isFilteredOut(device) && !types.includes(device.type) && types.push(device.type));
        //         types.sort();

        //         types.forEach(type => {
        //             const isExpanded = this.state.expanded.includes(type);
        //             let j = 0;
        //             // add group
        //             result.push(<TableRow
        //                 key={type}
        //                 className={classes.tableGroup}
        //                 onClick={() => this.onToggle(type)}
        //                 padding="default"
        //             >
        //                 <TableCell className={classes.tableExpandIconCell}>{isExpanded ? <IconExpanded className={classes.tableExpandIcon} /> : <IconCollapsed className={classes.tableExpandIcon} />}</TableCell>
        //                 <TableCell className={classes.tableIconCell}><TypeIcon className={classes.tableIconImg} type={type} /></TableCell>
        //                 <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{I18n.t('type-' + type)}</TableCell>
        //                 <TableCell />
        //                 {this.state.windowWidth >= WIDTHS[4] ? <TableCell /> : null}
        //                 {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                 {this.state.orderBy !== 'rooms' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                 {this.state.orderBy !== 'types' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell /> : null}
        //                 {this.state.windowWidth >= WIDTHS[0] ? <TableCell /> : null}
        //                 <TableCell className={classes.buttonsCell} />
        //             </TableRow>);

        //             if (isExpanded) {
        //                 // find all devices for this type
        //                 const devices = [];
        //                 this.state.devices.forEach((device, i) =>
        //                     !this.isFilteredOut(device) && device.type === type && devices.push(this.renderDevice('type_' + i, i, device, funcEnums, roomsEnums)));

        //                 result.push(devices);
        //             }
        //         });
        //     } else if (this.state.orderBy === 'IDs') {
        //         result = this.renderAllItems(this.state.listItems);
        //     } else {
        //         for (let i = 0; i < this.state.devices.length; i++) {
        //             if (!this.isFilteredOut(this.state.devices[i])) {
        //                 result.push(this.renderDevice('dev_' + i, i, this.state.devices[i], funcEnums, roomsEnums));
        //             }
        //         }
        //     }

        let j = 0;

        return <Paper className={classes.paperTable}>
            <Table stickyHeader className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell className={classes.tableExpandIconCell} />
                        <TableCell className={classes.tableIconCell} />
                        <TableCell className={classes.headerCell + ' ' + classes.tableNameCell}>{I18n.t('Name')}</TableCell>
                        {/* <TableCell /> */}
                        {this.state.orderBy !== 'IDs' && this.state.windowWidth >= WIDTHS[4] ? <TableCell className={classes.headerCell}>{I18n.t('ID')}</TableCell> : null}
                        {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell className={classes.headerCell}>{I18n.t('Function')}</TableCell> : null}
                        {this.state.orderBy !== 'rooms' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell className={classes.headerCell}>{I18n.t('Room')}</TableCell> : null}
                        {this.state.orderBy !== 'types' && this.state.windowWidth >= WIDTHS[1 + j++] ? <TableCell className={classes.headerCell}>{I18n.t('Type')}</TableCell> : null}
                        {this.state.windowWidth >= WIDTHS[0] ? <TableCell style={{ width: 50 }} className={classes.headerCell}>{I18n.t('States')}</TableCell> : null}
                        <TableCell className={classes.headerCell + ' ' + classes.buttonsCellHeader} />
                    </TableRow>
                </TableHead>
                <TableBody>{this.renderAllItems(this.state.listItems)}</TableBody>
            </Table>
        </Paper>;

        //return (<div key="listDevices" className={classes.columnDiv}>{result}</div>);
    }

    onExpand(group) {
        if (!this.state.expanded.includes(group)) {
            const expanded = JSON.parse(JSON.stringify(this.state.expanded));
            expanded.push(group);
            window.localStorage.setItem('Devices.expanded', JSON.stringify(expanded));
            this.setState({ expanded });
        }
    }

    onCollapse(group) {
        const pos = this.state.expanded.indexOf(group);
        if (pos !== -1) {
            const expanded = JSON.parse(JSON.stringify(this.state.expanded));
            expanded.splice(pos, 1);
            window.localStorage.setItem('Devices.expanded', JSON.stringify(expanded));
            this.setState({ expanded });
        }
    }

    onToggle(group) {
        if (!this.state.expanded.includes(group)) {
            this.onExpand(group);
        } else {
            this.onCollapse(group);
        }
    }

    setSmartName(obj, newSmartName, language) {
        // set smartName
        language = language || I18n.getLanguage();
        if (newSmartName || newSmartName === false) {
            if (this.state.iotNoCommon) {
                const iot = this.state.iot || 'iot.0';
                obj.common.custom = obj.common.custom || {};
                obj.common.custom[iot] = obj.common.custom[iot] || {};
                obj.common.custom[iot].smartName = obj.common.custom[iot].smartName || {};
                obj.common.custom[iot].smartName[language] = newSmartName;
            } else {
                obj.common.smartName = obj.common.smartName || {};
                obj.common.smartName[language] = newSmartName;
            }
        } else {
            if (this.state.iotNoCommon) {
                const iot = this.state.iot || 'iot.0';
                if (obj.common.custom && obj.common.custom[iot]) {
                    obj.common.custom[iot].smartName[language] = '';
                }
            } else {
                if (obj.common.smartName) {
                    obj.common.smartName[language] = '';
                }
            }
        }
    }

    getSmartName(obj, language) {
        language = language || I18n.getLanguage();
        let smartName;
        if (obj &&
            obj.common &&
            obj.common.custom) {
            if (this.state.iotNoCommon) {
                const iot = this.state.iot || 'iot.0';
                if (obj.common.custom[iot] && obj.common.custom[iot].smartName) {
                    smartName = obj.common.custom[iot].smartName;
                }
            } else {
                smartName = obj.common.smartName;
            }
        }

        if (smartName && typeof smartName === 'object') {
            smartName = smartName[language] || smartName.en || '';
        }
        return smartName || '';
    }

    addToEnum = async (enumId, id) => {
        const obj = await this.props.socket.getObject(enumId);
        if (obj && obj.common) {
            obj.common.members = obj.common.members || [];
            if (!obj.common.members.includes(id)) {
                obj.common.members.push(id);
                obj.common.members.sort();
                return this.props.socket.setObject(enumId, obj);
            }
        }
    }

    removeFromEnum = async (enumId, id) => {
        const obj = await this.props.socket.getObject(enumId);

        if (obj?.common?.members) {
            const pos = obj.common.members.indexOf(id);
            if (pos !== -1) {
                obj.common.members.splice(pos, 1);
                await this.props.socket.setObject(enumId, obj);
            }
        }
    }

    processTasks = async tasks => {
        for (let t = 0; t < tasks.length; t++) {
            const task = tasks[t];

            if (task.obj) {
                if (task.enums) {
                    for (let i = 0; i < task.enums.length; i++) {
                        let enumId = task.enums[i];
                        try {
                            await this.addToEnum(enumId, task.id);
                        } catch (e) {
                            window.alert('Cannot change enum: ' + e);
                        }
                    }
                }

                try {
                    await this.props.socket.setObject(task.id, task.obj);
                } catch (e) {
                    window.alert('Cannot change object: ' + e);
                }
            } else {
                // delete
                if (task.enums) {
                    for (let i = 0; i < task.enums.length; i++) {
                        let enumId = task.enums[i];
                        try {
                            await this.removeFromEnum(enumId, task.id);
                        } catch (e) {
                            window.alert('Cannot change enum: ' + e);
                        }
                    }
                }

            }
        }
    }

    onCopyDevice = async (id, newChannelId) => {
        // if this is device not from linkeddevice or from alias
        const copyDevice = this.state.devices.find(device => device.channelId === id);

        if (!copyDevice) {
            return;
        }

        const channelId = copyDevice.channelId;
        const isAlias = channelId.startsWith('alias.') || channelId.startsWith('linkeddevices.');

        // if (!isAlias) {
        //      return;
        // }

        const channelObj = this.objects[channelId];
        const { functions, rooms, icon, states, color, type } = copyDevice;
        const tasks = [];

        const obj = {
            id: newChannelId,
            obj: {
                common: {
                    name: channelObj.common.name,
                    color,
                    desc: channelObj.common.desc,
                    role: type,
                    icon: icon && icon.startsWith('adapter/') ? `../../${icon}` : icon,
                },
                native: {},
                type: 'channel'
            },
            enums: rooms.concat(functions)
        }
        if (!obj.obj.common.color) {
            delete obj.obj.common.color;
        }

        if (!isAlias) {
            obj.obj.native.originalId = id;
        }

        tasks.push(obj);
        
        states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(this.objects[state.id]));
            obj._id = newChannelId + '.' + state.name;

            obj.native = {};

            if (!isAlias) {
                 obj.common.alias = { id: state.id };
            }
            
            tasks.push({ id: obj._id, obj });
        });

        await this.processTasks(tasks);
    }

    onEditFinished = async (data, refresh, cb) => {
        let somethingChanged = false;
        const device = this.state.devices.find(({ channelId }) => channelId === this.state.editId);
        if (data) {
            // const device = this.state.devices[this.state.editIndex];
            const channelId = device.channelId;

            if (channelId.startsWith(ALIAS)) {
                for (let s = 0; s < device.states.length; s++) {
                    const state = device.states[s];
                    const obj = this.objects[state.id];
                    if (state.id && obj && obj.common && obj.common.alias) {
                        if (data.ids[state.name] !== obj.common.alias.id ||
                            obj.common.alias.read !== data.fx[state.name].read ||
                            obj.common.alias.write !== data.fx[state.name].write) {
                            // update alias ID
                            if (!state.required && !data.ids[state.name]) {
                                // delete state
                                await this.props.socket.delObject(state.id);
                            } else {
                                // update state
                                const stateObj = this.objects[state.id];
                                stateObj.common = stateObj.common || {};
                                stateObj.common.alias = stateObj.common.alias || {};
                                stateObj.common.alias.id = data.ids[state.name];
                                if (!data.fx[state.name].read) {
                                    delete stateObj.common.alias.read;
                                } else {
                                    stateObj.common.alias.read = data.fx[state.name].read;
                                }
                                if (!data.fx[state.name].write) {
                                    delete stateObj.common.alias.write;
                                } else {
                                    stateObj.common.alias.write = data.fx[state.name].write;
                                }
                                await this.props.socket.setObject(stateObj._id, stateObj);
                            }
                        } // else nothing changed
                    } else if (data.ids[state.name]) {
                        state.id = state.id || (channelId + '.' + state.name);

                        // Object not yet exists or invalid
                        let stateObj;
                        try {
                            stateObj = await this.objects[state.id];
                        } catch (e) {

                        }
                        stateObj = stateObj || {};
                        stateObj._id = state.id;
                        stateObj.native = stateObj.native || {};
                        stateObj.type = 'state';
                        stateObj.common = stateObj.common || {};
                        const common = stateObj.common;
                        common.alias = common.alias || {};
                        common.alias.id = data.ids[state.name];
                        common.name = common.name || state.name;
                        common.role = state.defaultRole;
                        if (state.read !== undefined) {
                            common.read = state.read;
                        }
                        if (state.write !== undefined) {
                            common.write = state.write;
                        }

                        if (state.defaultStates) {
                            common.states = state.defaultStates;
                        }

                        if (data.fx[state.name].read) {
                            stateObj.common.alias.read = data.fx[state.name].read;
                        }
                        if (data.fx[state.name].write) {
                            stateObj.common.alias.write = data.fx[state.name].write;
                        }

                        common.type = state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultRole.split('.')[0]] || 'state';

                        if (state.defaultMin !== undefined) {
                            common.min = state.defaultMin;
                        } else
                            if (state.min !== undefined) {
                                common.min = 0;
                            }

                        if (state.defaultMax !== undefined) {
                            common.max = state.defaultMax;
                        } else
                            if (state.max !== undefined) {
                                common.max = 100;
                            }

                        if (state.defaultUnit) {
                            common.unit = state.defaultUnit;
                        } else if (state.unit) {
                            common.unit = state.unit;
                        }
                        somethingChanged = true;
                        await this.props.socket.setObject(stateObj._id, stateObj);
                    }
                }
            } else
                if (channelId.startsWith(LINKEDDEVICES)) {
                    for (let s = 0; s < device.states.length; s++) {
                        let state = device.states[s];
                        const obj = this.objects[state.id];
                        let attrs;
                        if (state.id && obj && obj.common && obj.common.custom && (attrs = Object.keys(obj.common.custom).filter(id => id.startsWith(LINKEDDEVICES))).length) {
                            const attr = attrs[0];
                            if (data.ids[state.name] !== obj.common.custom[attr].parentId ||
                                !obj.common.custom[attr].enabled ||
                                !obj.common.custom[attr].isLinked) {
                                // update alias ID
                                if (!state.required && !data.ids[state.name]) {
                                    // delete state
                                    await this.props.socket.delObject(state.id);
                                    somethingChanged = true;
                                } else {
                                    // update state
                                    const stateObj = this.objects[state.id];
                                    stateObj.common = stateObj.common || {};
                                    stateObj.common.custom = stateObj.common.custom || {};
                                    stateObj.common.custom[attr] = stateObj.common.custom[attr] || {};
                                    stateObj.common.custom[attr].parentId = data.ids[state.name];
                                    stateObj.common.custom[attr].enabled = true;
                                    stateObj.common.custom[attr].isLinked = true;
                                    somethingChanged = true;
                                    await this.props.socket.setObject(stateObj._id, stateObj);
                                }
                            } // else nothing changed
                        } else if (data.ids[state.name]) {
                            state.id = state.id || (channelId + '.' + state.name);

                            // Object not yet exists or invalid
                            let stateObj;
                            try {
                                stateObj = this.objects[state.id];
                            } catch (e) {

                            }
                            stateObj = stateObj || {};
                            stateObj._id = state.id;
                            stateObj.native = stateObj.native || {};
                            stateObj.type = 'state';
                            stateObj.common = stateObj.common || {};
                            const common = stateObj.common;
                            const attr = this.state.linkeddevices;
                            common.custom = common.custom || {};
                            common.custom[attr] = common.custom[attr] || {};
                            common.custom[attr].parentId = data.ids[state.name];
                            common.custom[attr].enabled = true;
                            common.custom[attr].isLinked = true;
                            common.custom[attr].parentType = 'mixed';

                            common.name = common.name || state.name;
                            common.role = state.defaultRole;

                            if (state.read !== undefined) {
                                common.read = state.read;
                            }
                            if (state.write !== undefined) {
                                common.write = state.write;
                            }

                            if (state.defaultStates) {
                                common.states = state.defaultStates;
                            }
                            common.type = state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultRole.split('.')[0]] || 'state';

                            if (state.defaultMin !== undefined) {
                                common.min = state.defaultMin;
                            } else
                                if (state.min !== undefined) {
                                    common.min = 0;
                                }

                            if (state.defaultMax !== undefined) {
                                common.max = state.defaultMax;
                            } else
                                if (state.max !== undefined) {
                                    common.max = 100;
                                }

                            if (state.defaultUnit) {
                                common.unit = state.defaultUnit;
                            } else if (state.unit) {
                                common.unit = state.unit;
                            }
                            somethingChanged = true;
                            await this.props.socket.setObject(stateObj._id, stateObj);
                        }
                    }
                }
        }

        // update expert mode if was changed
        const newState = { editId: null, expertMode: window.localStorage.getItem('Devices.expertMode') === 'true' };
        if (somethingChanged) {
            //const devices = JSON.parse(JSON.stringify(this.state.devices));
            // update enums, name
            this.updateEnumsForOneDevice(device); // TODO: here the device will be changed directly in state!
            //newState.devices = devices;
        }
        cb && cb();
        await this.setStateAsync(newState);
        refresh && (await this.detectDevices(true));
        Router.doNavigate(null, '', '');
    }

    onSaveProperties = async data => {
        let somethingChanged = false;
        const device = this.state.devices.find(({ channelId }) => channelId === this.state.editId);
        if (data) {
            const language = I18n.getLanguage();
            const channelId = device.channelId;
            const oldName = Utils.getObjectNameFromObj(this.objects[channelId], null, { language });

            let oldSmartName = this.getSmartName(this.objects[channelId], language);

            if (this.objects[channelId] && this.objects[channelId].common &&
                (oldName !== data.name ||
                    oldSmartName !== data.smartName ||
                    (this.objects[channelId].common.color || '') !== data.color ||
                    (this.objects[channelId].common.icon || '') !== data.icon)
            ) {
                // update channel
                let obj = await this.props.socket.getObject(channelId);
                obj = obj || {};
                obj.common = obj.common || {};
                if (typeof obj.common.name !== 'object') {
                    obj.common.name = { [language]: obj.common.name || '' };
                }
                obj.common.name[language] = data.name;
                // obj._id = data.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
                obj.common.role = device.type;
                obj.common.color = data.color;
                if (!data.color) {
                    delete obj.common.color;
                }
                obj.common.icon = data.icon;
                if (!data.icon) {
                    delete obj.common.icon;
                }
                obj.type = obj.type || 'channel';

                if (data.smartName === false) {
                    obj.common.smartName = false;
                } else {
                    this.setSmartName(obj, data.smartName, language);
                }
                
                await this.props.socket.setObject(obj._id, obj);
                somethingChanged = true;
            }

            if (await this.setEnumsOfDevice(channelId, data.functions, data.rooms)) {
                somethingChanged = true;
            }
        }

        if (somethingChanged) {
            const devices = JSON.parse(JSON.stringify(this.state.devices));
            // update enums, name
            this.updateEnumsForOneDevice(device);
            this.setState({ devices });
        }
    }

    renderEditDialog() {
        if (this.state.editId === null) {
            return null;
        }
        const device = this.state.devices.find(({ channelId }) => channelId === this.state.editId);
        if (!device) {
            return null;
        }
        if (!this.objects[this.state.editId]) {
            window.alert('Device not found');
            Router.doNavigate(null, '', '');
            return this.setState({ editId: null });
        }

        return <DialogEdit
            channelId={device.channelId}
            type={device.type}
            channelInfo={device}
            objects={this.objects}
            states={this.states}
            patterns={this.patterns}
            themeType={this.props.themeType}
            processTasks={this.processTasks}
            updateObjects={this.updateObjects}
            enumIDs={this.enumIDs}
            socket={this.props.socket}
            onCopyDevice={async (id, newId) => {
                await this.onCopyDevice(id, newId);
                const copiedDevice = this.state.devices.find(device => device.channelId === id);
                if (copiedDevice) {
                    await this.deleteDevice(this.state.devices.indexOf(copiedDevice));
                }
            }}
            onSaveProperties={this.onSaveProperties}
            onClose={this.onEditFinished}
        />;
    }

    async setEnumsOfDevice(channelId, functions, rooms) {
        let somethingChanged = false;

        for (let e = 0; e < this.enumIDs.length; e++) {
            const id = this.enumIDs[e];
            const members = (this.objects[id] && this.objects[id].common && this.objects[id].common.members) || [];
            // if this channel is in enum
            if (id.startsWith('enum.functions.') && functions) {
                if (functions.includes(id)) {
                    if (!members.includes(channelId)) {
                        const obj = await this.props.socket.getObject(id);
                        obj.common = obj.common || {};
                        obj.common.members = obj.common.members || [];
                        obj.common.members.push(channelId);
                        obj.common.members.sort();
                        await this.props.socket.setObject(obj._id, obj);
                        somethingChanged = true;
                    }
                } else {
                    if (members.includes(channelId)) {
                        const obj = await this.props.socket.getObject(id);
                        obj.common = obj.common || {};
                        obj.common.members = obj.common.members || [];
                        const pos = obj.common.members.indexOf(channelId);
                        if (pos !== -1) {
                            obj.common.members.splice(pos, 1);
                            obj.common.members.sort();
                            await this.props.socket.setObject(obj._id, obj);
                            somethingChanged = true;
                        }
                    }
                }
            }

            if (id.startsWith('enum.rooms.') && rooms) {
                if (rooms.includes(id)) {
                    if (!members.includes(channelId)) {
                        const obj = await this.props.socket.getObject(id)
                        obj.common = obj.common || {};
                        obj.common.members = obj.common.members || [];
                        obj.common.members.push(channelId);
                        obj.common.members.sort();
                        await this.props.socket.setObject(obj._id, obj);
                        somethingChanged = true;
                    }
                } else {
                    if (members.includes(channelId)) {
                        const obj = await this.props.socket.getObject(id);
                        obj.common = obj.common || {};
                        obj.common.members = obj.common.members || [];
                        const pos = obj.common.members.indexOf(channelId);
                        if (pos !== -1) {
                            obj.common.members.splice(pos, 1);
                            obj.common.members.sort();
                            await this.props.socket.setObject(obj._id, obj);
                            somethingChanged = true;
                        }
                    }
                }
            }
        }

        return somethingChanged;
    }

    deleteDevice = async (index, devices) => {
        devices = devices || JSON.parse(JSON.stringify(this.state.devices));
        const device = devices[index];
        if (!device) {
            return;
        }

        // remove this device from all enums
        for (let i = 0; i < this.enumIDs.length; i++) {
            const enumId = this.enumIDs[i];
            if (this.objects[enumId] && this.objects[enumId].common && this.objects[enumId].common.members) {
                if (device.states.find(state => state.id && this.objects[enumId].common.members.includes(state.id)) ||
                    this.objects[enumId].common.members.includes(device.channelId)
                ) {
                    const obj = await this.props.socket.getObject(enumId);
                    if (!obj || !obj.common || !obj.common.members) {
                        continue;
                    }
                    const members = [];

                    obj.common.members.forEach(sid => {
                        if (!device.states.find(state => state.id === sid) && sid !== device.channelId) {
                            members.push(sid);
                        }
                    });

                    if (JSON.stringify(members) !== JSON.stringify(obj.common.members)) {
                        obj.common.members = members;
                        await this.props.socket.setObject(obj._id, obj);
                    }
                }
            }
        }

        // delete all states of this device
        for (let i = 0; i < device.states.length; i++) {
            const state = device.states[i];
            if (state.id) {
                const id = state.id;
                await this.props.socket.delObject(id);
            }
        }

        if (device.channelId && device.channelId !== device.mainStateId) {
            await this.props.socket.delObject(device.channelId);
        }

        devices.splice(index, 1);

        return devices;
    }

    async createDevice(options) {
        const patterns = this.detector.getPatterns();
        let states = Object.keys(patterns).find(t => patterns[t].type === options.type);
        if (!states) {
            return await this.setStateAsync({ message: I18n.t('Unknown type!') + options.type });
        }
        states = patterns[states].states;
        if (options.states.length) {
            states = options.states;
        }
        const obj = {
            _id: options.id,
            common: {
                name: { [I18n.getLanguage()]: options.name },
                role: options.type,
                icon: options.icon,
                color: options.color,
            },
            native: {},
            type: 'channel'
        };

        // create channel
        await this.props.socket.setObject(options.id, obj);

        for (let s = 0; s < states.length; s++) {
            const state = states[s];

            if (state.required && state.defaultRole) {
                const common = {
                    name: state.name,
                    role: state.defaultRole,
                    type: state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultRole.split('.')[0]] || 'state',
                    read: state.read === undefined ? true : state.read,
                    write: state.write === undefined ? false : state.write,
                    alias: {
                        id: ''
                    }
                };
                if (state.defaultStates) {
                    common.states = state.defaultStates;
                }

                if (state.defaultMin !== undefined) {
                    common.min = state.defaultMin;
                } else
                    if (state.min !== undefined) {
                        common.min = 0;
                    }

                if (state.defaultMax !== undefined) {
                    common.max = state.defaultMax;
                } else
                    if (state.max !== undefined) {
                        common.max = 100;
                    }

                if (state.defaultUnit) {
                    common.unit = state.defaultUnit;
                } else
                    if (state.unit) {
                        common.unit = state.unit;
                    }

                const obj = {
                    _id: options.id + '.' + state.name,
                    common,
                    native: {},
                    type: 'state'
                };
                await this.props.socket.setObject(options.id + '.' + state.name, obj);
            }

            await this.setEnumsOfDevice(options.id, options.functions, options.rooms);
        }

        /*const devices = JSON.parse(JSON.stringify(this.state.devices));
        const result = this.detector.detect({ id: options.id, objects: this.objects, forceRebuildKeys: true });

        if (result) {
            for (let r = 0; r < result.length; r++) {
                this.updateEnumsForOneDevice(result[r]);
                devices.push(result[r]);
            }
        }*/

        this.editCreatedId = obj._id;
        /*await this.setStateAsync({ devices, editId: obj._id });
        Router.doNavigate('list', 'edit', obj._id);*/
    }

    renderAddDialog() {
        if (!this.state.showAddDialog) {
            return null;
        } else {
            return <DialogNew
                themeType={this.props.themeType}
                theme={this.props.theme}
                objects={this.objects}
                socket={this.props.socket}
                processTasks={this.processTasks}
                enumIDs={this.enumIDs}
                prefix={this.state.showAddDialog}
                copyDevice={this.state.copyId ? this.state.devices.find(el => el.channelId === this.state.copyId) || null : null}
                onClose={options =>
                    this.setState({ showAddDialog: '', copyId: '' }, () =>
                        options && this.createDevice(options))}
            />;
        }
    }

    renderImporterDialog = () => {
        if (!this.state.showImporterDialog) {
            return null;
        } else {
            return <DialogImporter
                item={this.state.showImporterDialog}
                socket={this.props.socket}
                devices={this.state.devices}
                objects={this.objects}
                onCopyDevice={this.onCopyDevice}
                onClose={result =>
                    this.setState({ showImporterDialog: null }, () =>
                        result && this.detectDevices(true))}
                listItems={this.state.listItems}
            />;
        }
    }

    renderEditFolder = () => {
        if (!this.state.showEditFolder) {
            return null;
        } else {
            return <DialogEditFolder
                processTasks={this.processTasks}
                deleteDevice={async (index, devices) => await this.deleteDevice(index, devices)}
                objects={this.objects}
                socket={this.props.socket}
                devices={this.state.devices}
                data={this.state.showEditFolder}
                onClose={() =>
                    this.setState({ showEditFolder: null })}
            />;
        }
    }

    // renderDeleteDialog() {
    //     if (this.state.deleteIndex === null) {
    //         return null;
    //     } else {
    //         const time = window.localStorage.getItem('DeleteDeviceTime');
    //         const fiveMin = 1000 * 60 * 5;
    //         const index = this.state.deleteIndex;
    //         if (time && new Date().getTime() - time < fiveMin) {
    //             return this.setState({ deleteIndex: null }, () => {
    //                 this.deleteDevice(index);
    //             })
    //         }
    //         return <DialogConfirm
    //             title={I18n.t('Please confirm...')}
    //             text={I18n.t('Device and all states will be deleted. Are you sure?')}
    //             onClose={result => {
    //                 const index = this.state.deleteIndex;
    //                 this.setState({ deleteIndex: null }, async () => {
    //                     if (result) {
    //                         window.localStorage.setItem('DeleteDeviceTime', new Date().getTime());
    //                         const devices = await this.deleteDevice(index);
    //                         this.setState({ devices });
    //                     }
    //                 })
    //             }}
    //         />;
    //     }
    // }

    renderEditEnumDialog() {
        if (!this.state.editEnum) {
            return null;
        } else {
            return <DialogEditEnums
                objects={this.objects}
                values={this.state.editEnum.values}
                enumIDs={this.state.editEnum.enums}
                deviceName={this.state.devices[this.state.editEnum.index].name}
                onClose={async values => {
                    if (values && JSON.stringify(values) !== JSON.stringify(this.state.editEnum.values)) {
                        if (this.state.editEnum.enums[0] && this.state.editEnum.enums[0].startsWith('enum.functions.')) {
                            await this.setEnumsOfDevice(this.state.devices[this.state.editEnum.index].channelId, values);
                        } else {
                            await this.setEnumsOfDevice(this.state.devices[this.state.editEnum.index].channelId, undefined, values);
                        }
                        const devices = JSON.parse(JSON.stringify(this.state.devices));
                        // update enums, name
                        this.updateEnumsForOneDevice(devices[this.state.editEnum.index]);
                        this.setState({ editEnum: null, devices });
                    } else {
                        this.setState({ editEnum: null });
                    }
                }}
            />;
        }
    }

    setFilter(value) {
        this.filter = value.toLowerCase();
        this.filterTimer && clearTimeout(this.filterTimer);
        this.filterTimer = setTimeout(() => {
            this.filterTimer = null;
            window.localStorage.setItem('Devices.filter', this.filter);
            this.forceUpdate();
        }, 400);
    }

    onCollapseAll() {
        this.setState({ expandedIDs: [] });
        this.saveExpanded([]);
    }

    onExpandAll() {
        const expandedIDs = [];
        this.state.listItems.forEach(item =>
            this.state.listItems.find(it => it.parent === item.id) && expandedIDs.push(item.id));
        this.setState({ expandedIDs });
        this.saveExpanded(expandedIDs);
    }

    render() {
        if (this.state.loading) {
            return <CircularProgress key="alexaProgress" />;
        } else {
            const classes = this.props.classes;
            const small = this.props.width === 'xs' || this.props.width === 'sm';

            return <DndProvider backend={!small ? HTML5Backend : TouchBackend}>
                <Card key="list" className={classes.tab}>
                    <div className={classes.wrapperIcon}>
                        <div className={classes.icons}>
                            <Tooltip title={I18n.t('Create new device with Aliases')}>
                                <IconButton onClick={() => this.setState({ showAddDialog: ALIAS + '0' })}>
                                    <IconAdd color={this.state.viewCategory ? 'primary' : 'inherit'} />
                                </IconButton>
                            </Tooltip>
                            {this.state.linkeddevices && <Tooltip title={I18n.t('Create new device with LinkedDevices')}>
                                <IconButton onClick={() => this.setState({ showAddDialog: this.state.linkeddevices })}>
                                    <IconAdd style={{ color: '#E67E22' }} />
                                </IconButton>
                            </Tooltip>}
                            <Tooltip title={I18n.t('Refresh')}>
                                <IconButton onClick={() => this.detectDevices()} disabled={this.state.browse}>
                                    {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
                                </IconButton>
                            </Tooltip>
                            {/* <Tooltip title={I18n.t('Show only aliases')}>
                        <IconButton
                            color={this.state.onlyAliases ? 'primary' : 'inherit'}
                            onClick={() => {
                                window.localStorage.setItem('Devices.onlyAliases', this.state.onlyAliases ? 'false' : 'true');
                                this.setState({ onlyAliases: !this.state.onlyAliases });
                            }}>
                            <IconStar />
                        </IconButton>
                    </Tooltip> */}
                            <Tooltip title={I18n.t('Hide info devices')}>
                                <IconButton
                                    color={this.state.hideInfo ? 'primary' : 'inherit'}
                                    onClick={() => {
                                        window.localStorage.setItem('Devices.hideInfo', this.state.hideInfo ? 'false' : 'true');
                                        this.setState({ hideInfo: !this.state.hideInfo });
                                    }}>
                                    <IconInfo />
                                </IconButton>
                            </Tooltip>

                            {this.state.orderBy === 'IDs' &&
                                <><Tooltip title={I18n.t('Expand all nodes')}>
                                    <IconButton
                                        color="primary"
                                        onClick={() => this.onExpandAll()}>
                                        <IconFolderOpened />
                                    </IconButton>
                                </Tooltip>
                                    <Tooltip title={I18n.t('Collapse all nodes')}>
                                        <IconButton
                                            color="primary"
                                            onClick={() => this.onCollapseAll()}>
                                            <IconFolder />
                                        </IconButton>
                                    </Tooltip></>
                            }

                            {/* <FormControl>
                    <InputLabel>{I18n.t('Select')}</InputLabel>
                    <Select
                        className={classes.orderSelector}
                        value={this.state.orderBy}
                        onChange={e => {
                            this.setState({ orderBy: e.target.value });
                            window.localStorage.setItem('Devices.orderBy', e.target.value);
                        }}
                    >
                        <MenuItem value='names'>{I18n.t('Names')}</MenuItem>
                        <MenuItem value='IDs'>{I18n.t('IDs')}</MenuItem>
                        <MenuItem value='functions'>{I18n.t('Functions')}</MenuItem>
                        <MenuItem value='rooms'>{I18n.t('Rooms')}</MenuItem>
                        <MenuItem value='types'>{I18n.t('Types')}</MenuItem>
                    </Select>
                </FormControl> */}
                            <div className={classes.emptyBlockFlex} />
                            <TextField
                                inputRef={this.inputRef}
                                label={I18n.t('Filter')}
                                InputLabelProps={{ shrink: true }}
                                defaultValue={this.filter}
                                onChange={e => this.setFilter(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        this.filter ? <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    this.setFilter('');
                                                    this.inputRef.current.value = '';
                                                }}
                                            >
                                                <IconClear />
                                            </IconButton>
                                        </InputAdornment> : <div className={classes.emptyClear} />
                                    ),
                                }}
                            />
                            <div className={classes.emptyBlockFlex} />
                            <div className={classes.wrapperName}>
                                <DvrIcon color={this.state.themeName !== "colored" ? "primary" : "inherit"} style={{ marginRight: 5 }} />
                                {I18n.t('Devices')}
                            </div>
                        </div>
                    </div>
                    {this.renderDevices()}
                    {this.renderMessage()}
                    {this.renderEditDialog()}
                    {this.renderAddDialog()}
                    {/* {this.renderDeleteDialog()} */}
                    {this.renderEditEnumDialog()}
                    {this.renderImporterDialog()}
                    {this.renderEditFolder()}
                </Card>
            </DndProvider>;
        }
    }
}

ListDevices.propTypes = {
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    theme: PropTypes.object,
    themeType: PropTypes.string,
};

export default withWidth()(withStyles(styles)(ListDevices));
