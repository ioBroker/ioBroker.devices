/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React, { Component, createRef, type RefObject } from 'react';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import {
    ButtonBase,
    IconButton,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Toolbar,
    InputAdornment,
    ListItemIcon,
    TextField,
    Tooltip,
    MenuItem,
    Select,
    Box,
} from '@mui/material';

import {
    MdAdd as IconAdd,
    MdRefresh as IconRefresh,
    MdClear as IconClear,
    MdDelete as IconDelete,
    MdModeEdit as IconEdit,
} from 'react-icons/md';

import type { IconType } from 'react-icons';

import {
    FaInfoCircle as IconInfo,
    FaPowerOff as IconOn,
    FaThermometerHalf as IconTemperature,
    FaLongArrowAltUp as IconUp,
    FaLongArrowAltDown as IconDown,
    FaPercentage as IconPercentage,
    FaPalette as IconColor,
    FaLightbulb as IconBulb,
    FaLockOpen as IconLock,
    FaThermometer as IconThermometer,
    FaFolderOpen as IconFolderOpened,
    FaFolder as IconFolder,
} from 'react-icons/fa';

import { HiLink } from 'react-icons/hi';

import { FileCopy as CopyIcon, CreateNewFolder as CreateNewFolderIcon } from '@mui/icons-material';

import { Types, type ExternalPatternControl, type ExternalDetectorState } from '@iobroker/type-detector';
import {
    Icon,
    Utils,
    I18n,
    withWidth,
    Message as MessageDialog,
    Router,
    SelectWithIcon,
    type IobTheme,
    type AdminConnection,
    type ThemeType,
    Loader,
    DeviceTypeIcon,
} from '@iobroker/adapter-react-v5';

import {
    copyDevice,
    findMainStateId,
    getLastPart,
    getParentId,
    getSmartName,
    setSmartName,
} from '../Components/helpers/utils';
import type { PatternControlEx, ListItem } from '../types';
import SmartDetector from '../Devices/SmartDetector';
import DialogEdit from '../Dialogs/DialogEditDevice';
import DialogNew from '../Dialogs/DialogNewDevice';
import LocalUtils from '../Components/helpers/LocalUtils';
import DialogEditEnums from '../Dialogs/DialogEditEnums';
import DialogDeleteFolder from '../Dialogs/DialogDeleteFolder';
import DialogEditFolder from '../Dialogs/DialogEditFolder';
import TYPE_OPTIONS, { type ApplicationType, ICONS_TYPE } from '../Components/TypeOptions';
import DragWrapper from '../Components/DragWrapper';
import DropWrapper from '../Components/DropWrapper';
import DialogImporter from '../Dialogs/DialogImporter';
import { type DialogEditPropertiesState } from '../Dialogs/DialogEditProperties';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';
const colorLinkedDevices = '#2cbd1c';
const colorNativeDevices = '#F1C40F';

let actionsTranslated = false;
const actionsMapping: Record<string, { color: string; icon: IconType; desc: string }> = {
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

const TYPES_MAPPING: Record<string, 'boolean' | 'number'> = {
    button: 'boolean',
    value: 'number',
    level: 'number',
    indicator: 'boolean',
    action: 'boolean',
};

const UNSUPPORTED_TYPES = [Types.unknown];

interface InternalObject {
    common: {
        name: string;
        nondeletable?: boolean;
        color?: string | null;
        icon?: string | null | React.JSX.Element;
        noEdit?: boolean;
        showId?: boolean;
        importer?: boolean;
    };
    native?: {
        originalId?: string;
    };
    obj?: ioBroker.Object;
    type?: ioBroker.ObjectType;
    role?: string | null;
}

const prepareList = (
    data: Record<string, InternalObject>,
    root: string | null,
    objects: Record<string, ioBroker.Object>,
): ListItem[] => {
    const result: ListItem[] = [];
    const ids: string[] = Object.keys(data);
    root ||= '';

    // place common and global scripts at the end
    ids.sort();

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();

        let icon = obj.common.icon || null;
        if (icon && typeof icon === 'string' && !icon.includes('/')) {
            icon = `'../../adapter/${(obj.obj?._id || ids[i]).split('.')[0]}/${icon}`;
        }

        result.push({
            id: obj.obj?._id || ids[i],
            title: Utils.getObjectName(data as any as Record<string, ioBroker.Object>, ids[i], I18n.getLanguage()),
            icon,
            color: obj.common.color || null,
            depth: parts.length - 1,
            type: obj.type,
            role: obj.role,
            obj: obj.obj,
            noEdit: !!obj?.common.noEdit,
            showId: !!obj?.common.showId,
            importer: !!obj?.common.importer,
            originalId: obj?.native?.originalId || null,
            parent: parts.length > 2 ? parts.join('.') : null,
            // instance: obj.common?.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null,
            index: 0,
        });
    }

    // Place all folder-less items at start
    result
        .sort((a, b) => {
            if (a.title === b.title) {
                return 0;
            }
            return a.title > b.title ? 1 : -1;
        })
        .sort((a, b) => {
            if (a.id === 'alias.0.automatically_detected' && b.type === 'folder') {
                return 1;
            }
            if (b.id === 'alias.0.automatically_detected' && a.type !== 'folder') {
                return -1;
            }
            if (b.id === 'alias.0.automatically_detected' && a.type === 'folder') {
                return -1;
            }
            if (a.id === 'alias.0.linked_devices' && b.type === 'folder') {
                return 1;
            }
            if (b.id === 'alias.0.linked_devices' && a.type !== 'folder') {
                return -1;
            }
            if (b.id === 'alias.0.linked_devices' && a.type === 'folder') {
                return -1;
            }
            return 0;
        })
        .sort((a, b) => {
            if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
                if (a.title === b.title) {
                    return 0;
                }
                return a.title > b.title ? 1 : -1;
            }
            if (!a.parent && a.type !== 'folder') {
                return 1;
            }
            if (!b.parent && b.type !== 'folder') {
                return -1;
            }
            return 0;
        });

    // Fill all indexes
    result.forEach((item, i) => (item.index = i));

    let modified: boolean;
    const regEx = new RegExp(`^${root.replace(/\./g, '\\.')}`);
    do {
        modified = false;

        // check if all parents exist
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    let obj: ioBroker.Object = { common: {} } as ioBroker.Object;
                    if (item.id.startsWith('linkeddevices.')) {
                        obj = objects[getParentId(item.id)];
                    }
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: root ? item.parent.replace(regEx, '') : item.parent.split('.').pop() || '',
                        depth: parts.length - 1,
                        type: 'folder',
                        obj,
                        noEdit: false,
                        showId: false,
                        originalId: obj?.native?.originalId || null,
                        importer: false,
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

const WIDTHS = [1350, 1050, 950, 1250, 600, 500, 450];

const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';
const IS_CHROME = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

const styles: Record<string, any> = {
    tab: {
        width: '100%',
        height: '100%',
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
        height: '100%',
        overflow: 'hidden',
    },
    columnDiv: {
        height: 'calc(100% - 40px)',
        overflow: 'auto',
        minWidth: 300,
    },
    filter: {
        margin: 0,
    },
    button: {
        marginRight: 20,
    },
    buttonLinkedDevices: {
        background: '#17faff',
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
        right: 50,
    },
    devLineDelete: {
        position: 'absolute',
        top: 5,
        right: 0,
    },
    devLineName: {},
    devLineNumber: {
        display: 'inline-block',
        verticalAlign: 'middle',
        width: 15,
    },
    editedId: {
        fontStyle: 'italic',
    },
    enumLineSubName: {
        fontStyle: 'italic',
    },
    devLine: {
        height: 48,
        width: '100%',
        position: 'relative',
    },
    devLineDescription: {
        display: 'block',
        fontStyle: 'italic',
        fontSize: 12,
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
        width: 80,
    },
    devLineNameBlock: {
        display: 'inline-block',
        width: 'calc(100% - 350px)',
    },
    devModified: {
        fontStyle: 'italic',
    },
    actionIcon: {
        width: 16,
    },
    devSubLine: {
        position: 'relative',
        height: 48,
    },
    devSubLineName: {
        marginLeft: 5,
        marginTop: 14,
        display: 'inline-block',
        fontSize: 13,
        width: 'calc(100% - 400px)',
    },
    devSubSubLineName: {
        fontSize: 8,
        fontStyle: 'italic',
        display: 'block',
    },
    devSubLineByOn: {
        marginLeft: 5,
    },
    devSubLineDelete: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 0,
    },
    devSubLineEdit: {
        position: 'absolute',
        top: 12,
        right: 62,
        padding: 0,
    },
    devSubLineTypeTitle: {
        marginTop: 0,
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
    tableIconImg: {
        width: 20,
        height: 20,
    },
    tableIcon: (theme: IobTheme): any => ({
        width: 24,
        height: 24,
        display: 'flex',
        p: '2px',
        background: theme.palette.mode === 'dark' ? '#3b3b3b' : '#e0e0e0',
        borderRadius: '3px',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette.mode === 'dark' ? '#FFF' : '#000',
    }),
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
        textAlign: 'left',
    },
    headerCell: {
        fontWeight: 'bold',
    },
    tableExpandIconCell: {
        padding: 0,
        width: 40,
    },
    tableIconCell: {
        padding: 0,
        width: 40,
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
    tableGroupCell: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#FFF',
        cursor: 'pointer',
        textTransform: 'uppercase',
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
        color: '#ffffff',
    },

    enumsEdit: {
        minHeight: 20,
        minWidth: 100,
        textAlign: 'left',
        justifyContent: 'left',
        p: '3px',
        whiteSpace: 'nowrap',
        '&:hover, &$focusVisible': {
            zIndex: 1,
            opacity: 0.7,
            borderRadius: '3px',
            background: 'gray',
        },
    },
    wrapperButtonEnum: {
        maxWidth: 200,
        display: 'flex',
        overflow: 'hidden',
    },
    emptyClear: {
        width: 32,
    },
    wrapperButton: {
        display: 'flex',
        justifyContent: 'flex-end',
        width: 102,
    },
    emptyBlock: {
        width: 34,
    },
    displayFlex: {
        display: 'flex',
        alignItems: 'center',
    },
    iconCommon: {
        width: 20,
        height: 20,
        position: 'absolute',
        top: 10,
        left: 8,
        opacity: 0.8,
    },
    iconStyle: {
        position: 'relative',
        minWidth: 24,
    },
    fontStyle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 'bold',
        '@media screen and (max-width: 440px)': {
            fontSize: 11,
        },
    },
    wrapperTitleAndId: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        '@media screen and (max-width: 360px)': {
            maxWidth: 120,
        },
        '@media screen and (max-width: 440px)': {
            maxWidth: 150,
        },
        '@media screen and (max-width: 500px)': {
            maxWidth: 200,
        },
    },
    fontStyleId: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 'bold',
        fontSize: 9,
        opacity: 0.6,
        fontStyle: 'italic',
        '@media screen and (max-width: 440px)': {
            fontSize: 7,
        },
    },
    wrapperIconEnumCell: {
        display: 'flex',
        alignItems: 'center',
        marginLeft: 3,
        marginRight: 3,
    },
    enumIcon: {
        width: 16,
        height: 16,
    },
    iconInSelect: {
        marginRight: 4,
    },
    nameEnumCell: {
        marginLeft: 3,
    },
    emptyBlockFlex: {
        flexGrow: 1,
    },
    wrapperName: {
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        marginRight: 10,
        '@media screen and (max-width: 700px)': {
            marginLeft: 10,
        },
        '@media screen and (max-width: 440px)': {
            '& span': {
                display: 'none',
            },
        },
    },
    table: (theme: IobTheme): any => ({
        '& th': {
            background: theme.name === 'dark' ? '#202020' : theme.name === 'blue' ? '#22292d' : 'white',
        },
    }),
    spaceBetween: {
        justifyContent: 'space-between',
    },
    iconWrapper: {
        display: 'flex',
        alignItems: 'center',
    },
    iconStyleType: {
        width: 16,
        height: 16,
        margin: '0 3px',
    },
    emptyIcon: {
        width: 16,
        height: 16,
        margin: '0 3px',
    },
    typeCellNameAndIcon: {
        display: 'flex',
        alignItems: 'center',
    },
    iconOpen: {
        transform: 'skew(147deg, 183deg) scale(0.5) translate(-43px, 11px)',
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
            height: 37,
            background: '#ffffff36',
            pointerEvents: 'none',
        },
    },
    selected: (theme: IobTheme): any => ({
        background: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
    }),
    wrapperHeadButtons: {
        display: 'flex',
        overflowY: 'auto',
        marginRight: 'auto',
    },
    hide700: {
        '@media screen and (max-width: 700px)': {
            display: 'none',
        },
    },
    filterType: {
        minWidth: 100,
    },
    searchText: {
        color: 'orange',
    },
    textStyle: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        padding: '0 16px 0 16px',
    },
    cell: {
        paddingTop: 0,
        paddingRight: 24,
        paddingBottom: 0,
    },
    cellMobile: {
        paddingTop: 6,
        paddingRight: 24,
        paddingBottom: 6,
    },
};

interface ListDevicesProps {
    adapterName: string;
    socket: AdminConnection;
    theme: IobTheme;
    themeType: ThemeType;
    prefix?: string;
    width: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

interface ListDevicesState {
    editId: string | null;
    copyId: string;
    // deleteIndex: null,
    deleteId: string;
    editEnum: { values: string[]; enums: string[]; index: number } | null;
    listItems: ListItem[];
    expandedIDs: string[] | null;

    windowWidth: number;
    showAddDialog: string;
    showConfirmation: string;
    changed: string[];
    devices: PatternControlEx[];
    message: string;
    loading: boolean;
    browse: boolean;
    expanded: string[];
    lastChanged: string;
    linkeddevices: `linkeddevices.${number}` | '';
    filter: {
        func: string;
        room: string;
        type: Types | '_' | '';
        text: string;
        noInfo: boolean;
    };
    selected: string;
    iotInstance: string;
    iotNoCommon: boolean;
    showImporterDialog: ListItem | null;
    showEditFolder?: ioBroker.Object;
    newFolder: boolean;
    onlyAliases: boolean;
    updating: string[];

    deleteFolderAndDevice: null | { id: string; device?: false } | { index: number; device: true };
}

const isTouchDevice = (): boolean => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - legacy property
        navigator.msMaxTouchPoints > 0
    );
};

class ListDevices extends Component<ListDevicesProps, ListDevicesState> {
    private readonly inputRef: RefObject<HTMLInputElement>;

    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;
    private deleteTimeout: ReturnType<typeof setTimeout> | null = null;
    private filterTimer: ReturnType<typeof setTimeout> | null = null;

    private enumIDs: string[];

    private objects: Record<string, ioBroker.Object>;

    private instances: ioBroker.AdapterObject[];

    private enumObj: Record<string, ioBroker.EnumObject>;

    private prefix: string;

    private typesWords: Partial<Record<Types, string>> = {};

    private filter: string;

    private editCreatedId: string | null;

    private readonly patterns: {
        [type: string]: ExternalPatternControl;
    };

    private funcEnums: string[];

    private roomsEnums: string[];

    private readonly detector: SmartDetector;

    private isTouchDevice: boolean = isTouchDevice();

    constructor(props: ListDevicesProps) {
        super(props);

        if (!actionsTranslated) {
            Object.keys(actionsMapping).forEach(a => (actionsMapping[a].desc = I18n.t(actionsMapping[a].desc)));
            actionsTranslated = true;
        }
        const location = Router.getLocation();

        const expandedStr = window.localStorage.getItem('Devices.expanded') || '[]';
        let expanded: string[];
        try {
            expanded = JSON.parse(expandedStr);
        } catch {
            expanded = [];
        }

        const expandedIDsStr = window.localStorage ? window.localStorage.getItem('IDs.expanded') : '';
        let expandedIDs: string[] | null;
        try {
            expandedIDs = expandedIDsStr ? JSON.parse(expandedIDsStr) || null : null;
        } catch {
            expandedIDs = null;
        }

        const selected = window.localStorage.getItem('Devices.selected') || '';
        if (expandedIDs && selected) {
            // be sure that the selected element is visible
            const parts = selected.split('.');
            let id = `${parts[0]}.${parts[1]}`;
            for (let i = 2; i < parts.length; i++) {
                id += `.${parts[i]}`;
                if (!expandedIDs.includes(id)) {
                    expandedIDs.push(id);
                }
            }
            expandedIDs.sort();
        }

        this.state = {
            editId: location.dialog === 'edit' ? location.id : null,
            copyId: '',
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
            lastChanged: '',
            linkeddevices: '',
            filter: {
                func: window.localStorage.getItem('Devices.filter.func') || '',
                room: window.localStorage.getItem('Devices.filter.room') || '',
                type: (window.localStorage.getItem('Devices.filter.type') as Types | '_') || '',
                text: window.localStorage.getItem('Devices.filter.text') || '',
                noInfo: window.localStorage.getItem('Devices.filter.noInfo') !== 'false',
            },
            selected,
            iotInstance: '',
            iotNoCommon: false,
            showImporterDialog: null,
            newFolder: false,
            onlyAliases: false,
            updating: [],
            deleteFolderAndDevice: null,
        };

        this.inputRef = createRef();

        this.objects = {};
        this.instances = [];
        this.enumObj = {};

        this.filter = this.state.filter.text;

        this.detector = new SmartDetector();
        this.patterns = SmartDetector.getPatterns();

        // read if linkeddevices installed
        void this.props.socket
            .getAdapterInstances('linkeddevices')
            .catch(() => [] as ioBroker.InstanceObject[])
            .then(linkedDevices => {
                // read if iot installed
                void this.props.socket
                    .getAdapterInstances('iot')
                    .catch(() => [] as ioBroker.InstanceObject[])
                    .then(iot => {
                        const newState: Partial<ListDevicesState> = {};
                        let changed = false;
                        let linkedDeviceInstance = linkedDevices.find(it => it?._id && it?.common?.enabled);
                        linkedDeviceInstance ||= linkedDevices.find(it => it?._id);
                        // always take the first one
                        if (linkedDeviceInstance?._id) {
                            newState.linkeddevices =
                                (linkedDeviceInstance._id.replace(
                                    'system.adapter.',
                                    '',
                                ) as `linkeddevices.${number}`) || '';
                            changed = true;
                        }

                        // take first enabled
                        let iotInstance = iot.find(it => it?._id && it?.common?.enabled);
                        iotInstance ||= iot.find(it => it?._id);

                        // Read iot instance
                        if (iotInstance?._id) {
                            newState.iotNoCommon = iotInstance.native?.noCommon;
                            newState.iotInstance = iotInstance._id.replace('system.adapter.', '') || '';
                            changed = true;
                        }
                        if (changed) {
                            this.setState(newState as ListDevicesState);
                        }
                    });

                void this.detectDevices();
            });
    }

    setStateAsync(newState: Partial<ListDevicesState>): Promise<void> {
        return new Promise<void>(resolve => this.setState(newState as ListDevicesState, () => resolve()));
    }

    componentDidMount(): void {
        window.addEventListener('resize', this.onResize, false);
        void this.props.socket.subscribeObject('*', this.onObjectChanged);
        window.addEventListener('hashchange', this.onHashChange, false);

        setTimeout(() => {
            const el = document.getElementById(`td_${this.state.selected}`);
            el?.scrollIntoView({ block: 'center' });
        }, 300);
    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', this.onResize, false);
        window.removeEventListener('hashchange', this.onHashChange, false);
        void this.props.socket.unsubscribeObject('*', this.onObjectChanged);
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }
        if (this.deleteTimeout) {
            clearTimeout(this.deleteTimeout);
            this.deleteTimeout = null;
        }
        if (this.filterTimer) {
            clearTimeout(this.filterTimer);
            this.filterTimer = null;
        }
    }

    onHashChange = (): void => {
        const location = Router.getLocation();
        if (location.dialog === 'edit' && location.id && location.id !== this.state.editId) {
            this.setState({ editId: location.id });
        }
    };

    onSelect(selected: string): void {
        this.setState({ selected });
        window.localStorage.setItem('Devices.selected', selected);
    }

    disabledButtons(): boolean {
        return (
            this.state.selected.startsWith('alias.0.automatically_detected') ||
            this.state.selected.startsWith('alias.0.linked_devices') ||
            (!!this.state.selected && !this.state.selected.startsWith('alias.0'))
        );
    }

    onObjectChanged = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (this.state.loading) {
            return;
        }

        if (!obj) {
            if (this.objects[id]) {
                delete this.objects[id];
            }
        } else {
            this.objects[id] = obj;
        }

        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(async () => {
            this.updateTimeout = null;
            await this.updateListItems();
        }, 400);
    };

    onResize = (): void => {
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            this.resizeTimer = null;
            this.setState({ windowWidth: window.innerWidth });
        }, 300);
    };

    updateListItems = async (): Promise<void> => {
        const idsInEnums: string[] = [];

        this.enumIDs.forEach(en => {
            const e = this.enumObj[en];
            e?.common?.members?.forEach(id => !idsInEnums.includes(id) && idsInEnums.push(id));
        });

        // List all devices in aliases
        const keys = Object.keys(this.objects).sort();

        const END = `${LINKEDDEVICES}\u9999`;
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] < ALIAS) {
                // go to the next
            } else if (keys[i] > END) {
                break;
            } else if (
                (keys[i].startsWith(ALIAS) || keys[i].startsWith(LINKEDDEVICES)) &&
                this.objects[keys[i]] &&
                !idsInEnums.includes(keys[i])
            ) {
                if (this.objects[keys[i]].type === 'device') {
                    idsInEnums.push(keys[i]);
                } else if (this.objects[keys[i]].type === 'channel') {
                    const parentId = getParentId(keys[i]);
                    // if parent was not yet included
                    if (!this.objects[parentId] || !idsInEnums.includes(parentId)) {
                        idsInEnums.push(keys[i]);
                    }
                }
            }
        }

        idsInEnums.sort();

        const _usedIdsOptional: string[] = [];
        const devices: PatternControlEx[] = [];
        idsInEnums.forEach(id => {
            const result = this.detector.detect({
                id,
                objects: this.objects,
                _usedIdsOptional,
                _keysOptional: keys,
                ignoreCache: true,
            });
            result?.forEach(device => devices.push(device as PatternControlEx));
        });

        this.funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        this.roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

        // find channelID for every device
        devices.map(device => this.updateEnumsForOneDevice(device, this.funcEnums, this.roomsEnums));

        const listItems = this.onObjectsGenerate(
            this.objects || {},
            JSON.parse(JSON.stringify(devices)) as PatternControlEx[],
        );

        let expandedIDs: string[] | null = this.state.expandedIDs;
        if (expandedIDs === null) {
            expandedIDs = [];
            listItems.forEach(
                item => item.parent && expandedIDs!.includes(item.parent) && expandedIDs!.push(item.parent),
            );
        }

        this.applyFilter(listItems, devices);

        await this.setStateAsync({ devices, expandedIDs, listItems, loading: false, browse: false });

        if (this.editCreatedId && this.objects[this.editCreatedId]) {
            const id = this.editCreatedId;
            this.editCreatedId = null;
            Router.doNavigate('list', 'edit', id);
        }
    };

    async detectDevices(): Promise<void> {
        // read objects
        await this.setStateAsync({ browse: true });

        this.instances = await this.props.socket.getAdapters();
        this.objects = await this.props.socket.getObjects(true);
        const enums = await this.props.socket.getEnums();
        this.enumIDs = Object.keys(enums).sort();
        this.enumObj = enums;

        await this.updateListItems();
    }

    onObjectsGenerate = (objects: Record<string, ioBroker.Object>, devices: PatternControlEx[]): ListItem[] => {
        this.prefix = this.props.prefix || 'alias.0';

        const keys = Object.keys(objects).sort();

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        const ids: string[] = [];

        for (let j = 0; j < keys.length; j++) {
            const id = keys[j];
            if (id < prefix) {
                // skip all before prefix
            } else if (
                id.startsWith(prefix) &&
                objects[id]?.common &&
                (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder')
            ) {
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
            } else if (id > `${prefix}\u9999`) {
                // stop after prefix
                break;
            }
        }

        this.typesWords = {};

        Object.keys(Types)
            .filter(id => !UNSUPPORTED_TYPES.includes(id as Types))
            .forEach(typeId => (this.typesWords[typeId as Types] = I18n.t(`type-${Types[typeId as Types]}`)));

        const stateIds: Record<string, InternalObject> = {};
        const language = I18n.getLanguage();

        ids.forEach(id => {
            let icon = objects[id]?.common?.icon || this.searchIcon(id);
            if (icon && !icon.includes('/')) {
                // add adapter prefix
                const parts = id.split('.');
                icon = `'../../adapter/${parts[0]}/${icon}`;
            }

            stateIds[id] = {
                common: {
                    name: objects[id]?.type === 'folder' ? Utils.getObjectName(objects, id, language) : getLastPart(id),
                    nondeletable: true,
                    color: objects[id]?.common?.color || undefined,
                    icon,
                },
                obj: objects[id],
                type: objects[id].type,
                role: objects[id].type !== 'folder' && objects[id].common ? objects[id].common.role || null : null,
            };
        });

        stateIds[`${this.prefix}.automatically_detected`] = {
            common: {
                name: I18n.t('Automatically detected'),
                nondeletable: true,
                noEdit: true,
                showId: true,
            },
            type: 'folder',
        };

        const devicesArr = (devices || this.state.devices).filter(
            ({ channelId }) => !channelId.startsWith('alias.0') && !channelId.startsWith('linkeddevices.0'),
        );

        devicesArr.forEach(device => {
            const [adapter, instance] = device.channelId.split('.');
            const name = `${adapter}-${instance}`;
            if (!stateIds[`${this.prefix}.automatically_detected.${name}`]) {
                const instances = this.instances.find(inst => inst._id.replace('system.adapter.', '') === adapter);
                stateIds[`${this.prefix}.automatically_detected.${name}`] = {
                    common: {
                        name,
                        nondeletable: true,
                        icon: instances?.common?.extIcon || this.searchIcon(device.channelId),
                        noEdit: true,
                        showId: true,
                        importer: true,
                    },
                    // obj: instances,
                    type: 'folder',
                };
            }
        });

        devicesArr.forEach(device => {
            const [adapter, instance] = device.channelId.split('.');
            const name = `${adapter}-${instance}`;
            stateIds[`${this.prefix}.automatically_detected.${name}.${device.channelId.replace(/[\s.,%]/g, '')}`] = {
                common: {
                    name: Utils.getObjectName(objects, device.channelId, language),
                    nondeletable: true,
                    color: objects[device.channelId]?.common?.color || undefined,
                    icon: objects[device.channelId]?.common?.icon || this.searchIcon(device.channelId),
                },
                obj: objects[device.channelId],
                type: objects[device.channelId]?.type,
                role: device.type,
            };
        });

        if (this.state.linkeddevices) {
            let devicesArrLinkeddevices = devices || this.state.devices;

            devicesArrLinkeddevices = devicesArrLinkeddevices.filter(({ channelId }) =>
                channelId.startsWith('linkeddevices.0'),
            );

            stateIds[`${this.prefix}.linked_devices`] = {
                common: {
                    name: I18n.t('Linked devices'),
                    nondeletable: true,
                    noEdit: true,
                    showId: true,
                    icon: <HiLink style={{ ...styles.iconCommon, color: 'black' }} />,
                },
                type: 'folder',
            };

            devicesArrLinkeddevices.forEach(device => {
                let icon = objects[device.channelId]?.common?.icon
                    ? objects[device.channelId].common.icon
                    : this.searchIcon(device.channelId);
                if (icon && !icon.includes('/')) {
                    // add adapter prefix
                    const parts = device.channelId.split('.');
                    icon = `../../adapter/${parts[0]}/${icon}`;
                }

                stateIds[`${this.prefix}.linked_devices.${device.channelId.replace('linkeddevices.0.', '')}`] = {
                    common: {
                        name: Utils.getObjectName(objects, device.channelId, language),
                        nondeletable: true,
                        color: objects[device.channelId]?.common?.color || undefined,
                        icon,
                    },
                    obj: objects[device.channelId],
                    type: objects[device.channelId]?.type,
                    role: device.type,
                };
            });
        }

        return prepareList(stateIds, null, objects);
    };

    updateEnumsForOneDevice(device: PatternControlEx, funcEnums?: string[], roomsEnums?: string[]): void {
        funcEnums ||= this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        roomsEnums ||= this.enumIDs.filter(id => id.startsWith('enum.rooms.'));
        if (!device) {
            return;
        }
        const mainStateId = findMainStateId(device);

        if (mainStateId) {
            const statesCount = device.states.filter(state => state.id).length;
            let channelId = mainStateId;
            if (
                mainStateId.includes('.') &&
                (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))
            ) {
                channelId = getParentId(mainStateId);
                if (
                    !this.objects[channelId]?.common ||
                    (this.objects[channelId].type !== 'channel' &&
                        this.objects[channelId].type !== 'device' &&
                        this.objects[channelId].type !== 'folder')
                ) {
                    channelId = mainStateId;
                }
            }

            device.channelId = channelId;
        } else {
            // Should never happen!!
            throw new Error(`Device without main state: ${JSON.stringify(device)}`);
        }

        const functions = funcEnums.filter(id => {
            const obj = this.objects[id];
            return (
                obj?.common?.members &&
                (obj.common.members.includes(device.channelId) ||
                    (mainStateId && obj.common.members.includes(mainStateId)))
            );
        });

        const rooms = roomsEnums.filter(id => {
            const obj = this.objects[id];
            return (
                obj?.common?.members &&
                (obj.common.members.includes(device.channelId) ||
                    (mainStateId && obj.common.members.includes(mainStateId)))
            );
        });

        device.functions = functions;
        device.functionsNames = functions
            .map(id => Utils.getObjectNameFromObj(this.objects[id], null, { language: I18n.getLanguage() }))
            .join(', ');
        device.rooms = rooms;
        device.roomsNames = rooms
            .map(id => Utils.getObjectNameFromObj(this.objects[id], null, { language: I18n.getLanguage() }))
            .join(', ');
        device.name = LocalUtils.getObjectName(this.objects, device.channelId, null, null, this.enumIDs);

        device.icon =
            Utils.getObjectIcon(device.channelId, this.objects[device.channelId]) || this.searchIcon(device.channelId);

        device.color = this.objects[device.channelId]?.common?.color || null;

        if (!device.icon) {
            const parts = device.channelId.split('.');
            parts.pop();
            const deviceId = parts.join('.');

            if (
                this.objects[deviceId] &&
                (this.objects[deviceId].type === 'channel' || this.objects[deviceId].type === 'device')
            ) {
                device.icon =
                    Utils.getObjectIcon(deviceId, this.objects[deviceId]) || this.searchIcon(device.channelId);
            }
        }
        // all new created or modified objects will be reported to onObjectChange and there is no need to update
    }

    searchIcon = (channelId: string): string | null => {
        if (!this.objects) {
            return null;
        }
        let icon = null;
        if (channelId) {
            // check the parent
            if (channelId && channelId.split('.').length > 2) {
                const channelObj = this.objects[channelId];
                if (
                    channelObj &&
                    (channelObj.type === 'channel' || channelObj.type === 'device' || channelObj.type === 'state')
                ) {
                    if (channelObj.common?.icon) {
                        icon = channelObj.common?.icon;
                    } else {
                        // check the parent
                        const deviceId = getParentId(channelId);
                        if (deviceId && deviceId.split('.').length > 2) {
                            const arrayParent = deviceId.split('.');
                            let parentId: string | null = deviceId;
                            for (let i = 0; i < arrayParent.length - 2; i++) {
                                if (parentId) {
                                    const deviceObj = this.objects[parentId];
                                    if (deviceObj && (deviceObj.type === 'channel' || deviceObj.type === 'device')) {
                                        if (deviceObj.common?.icon) {
                                            icon = deviceObj.common?.icon;
                                            break;
                                        }
                                    }
                                    parentId = getParentId(parentId);
                                }
                            }
                        }
                    }
                }
            }
        }

        const imagePrefix = '../..';

        const objects = this.objects;
        const cIcon = icon;
        const id = channelId;

        if (cIcon?.includes('.') && !cIcon.includes('data:image/')) {
            let instance;
            if (objects[id].type === 'instance' || objects[id].type === 'adapter') {
                icon = `${imagePrefix}/adapter/${objects[id].common.name}/${cIcon}`;
            } else if (id && id.startsWith('system.adapter.')) {
                instance = id.split('.', 3);
                if (cIcon[0] === '/') {
                    instance[2] += cIcon;
                } else {
                    instance[2] += `/${cIcon}`;
                }
                icon = `${imagePrefix}/adapter/${instance[2]}`;
            } else {
                instance = id.split('.', 2);
                if (cIcon[0] === '/') {
                    instance[0] += cIcon;
                } else {
                    instance[0] += `/${cIcon}`;
                }
                icon = `${imagePrefix}/adapter/${instance[0]}`;
            }
        }
        return icon;
    };

    renderMessage(): React.JSX.Element | null {
        if (this.state.message) {
            return (
                <MessageDialog
                    text={this.state.message}
                    onClose={() => this.setState({ message: '' })}
                />
            );
        }
        return null;
    }

    onEdit(editId: string, e?: React.MouseEvent<HTMLButtonElement>): void {
        e?.preventDefault();
        e?.stopPropagation();
        Router.doNavigate('list', 'edit', editId);
        this.setState({ editId });
    }

    onCopy(copyId: string, e?: React.MouseEvent<HTMLButtonElement>): void {
        e?.preventDefault();
        e?.stopPropagation();
        this.setState({ copyId, showAddDialog: `${ALIAS}0` });
    }

    onEditEnum(values: string[], enums: string[], index: number): void {
        this.setState({ editEnum: { values, enums, index } });
    }

    renderEnumCell(values: string[], enums: string[], index: number): React.JSX.Element {
        const objs = values.map(id => ({
            icon: Utils.getObjectIcon(id, this.objects[id]),
            name: Utils.getObjectName(this.objects, id, I18n.getLanguage()),
            id,
        }));

        const content = objs.map(obj => (
            <div
                style={styles.wrapperIconEnumCell}
                key={obj.id}
            >
                {obj.icon && (
                    <Icon
                        style={styles.enumIcon}
                        src={obj.icon}
                        alt={obj.id}
                    />
                )}
                <div style={styles.nameEnumCell}>{obj.name}</div>
            </div>
        ));

        return (
            <Tooltip
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                title={content}
            >
                <ButtonBase
                    focusRipple
                    onClick={() => this.onEditEnum(values, enums, index)}
                    sx={styles.enumsEdit}
                >
                    <div style={styles.wrapperButtonEnum}>
                        {objs.map(obj => (
                            <div
                                style={styles.wrapperIconEnumCell}
                                key={obj.id}
                            >
                                {obj.icon && (
                                    <Icon
                                        style={styles.enumIcon}
                                        src={obj.icon}
                                        alt={obj.id}
                                    />
                                )}
                                <div style={styles.nameEnumCell}>{obj.name}</div>
                            </div>
                        ))}
                    </div>
                </ButtonBase>
            </Tooltip>
        );
    }

    static renderTypeCell(type: Types): React.JSX.Element {
        return (
            <div style={{ ...styles.wrapperIconEnumCell, ...styles.spaceBetween }}>
                <div style={styles.typeCellNameAndIcon}>
                    <DeviceTypeIcon
                        style={styles.enumIcon}
                        type={type}
                    />
                    <div style={styles.nameEnumCell}>{I18n.t(`type-${type}`)}</div>
                </div>
                <div style={styles.iconWrapper}>
                    {TYPE_OPTIONS[type]
                        ? Object.keys(TYPE_OPTIONS[type]).map(key =>
                              TYPE_OPTIONS[type][key as ApplicationType] ? (
                                  <Icon
                                      key={key}
                                      style={styles.iconStyleType}
                                      src={ICONS_TYPE[key as ApplicationType]}
                                      title={I18n.t('Supported by "%s"', key)}
                                  />
                              ) : (
                                  <div
                                      key={key}
                                      style={styles.emptyIcon}
                                  />
                              ),
                          )
                        : null}
                </div>
            </div>
        );
    }

    static saveExpanded(expandedIDs: string[]): void {
        window.localStorage.setItem('IDs.expanded', JSON.stringify(expandedIDs));
    }

    toggleExpanded(id: string, open?: boolean): void {
        const expandedIDs = (this.state.expandedIDs || []).slice();
        const pos = expandedIDs.indexOf(id);
        if (pos === -1) {
            expandedIDs.push(id);
            expandedIDs.sort();
        } else if (!open) {
            expandedIDs.splice(pos, 1);
        }
        this.setState({ expandedIDs });
        ListDevices.saveExpanded(expandedIDs);
    }

    applyFilter(
        listItems: ListItem[],
        devices?: PatternControlEx[],
        filter?: {
            func: string;
            room: string;
            type: Types | '_' | '';
            text: string;
            noInfo: boolean;
        },
    ): void {
        filter ||= this.state.filter;
        devices ||= this.state.devices;

        let setState: boolean | undefined;
        if (!listItems) {
            listItems = JSON.parse(JSON.stringify(this.state.listItems));
            setState = true;
        }

        // hasVisibleChildren
        // visible
        listItems.forEach(item => {
            const device = devices.find(el => el.channelId === item.id);
            item.visible = true;

            if (device) {
                if (filter.type && device.type !== filter.type) {
                    item.visible = false;
                } else if (filter.room && !device.rooms.includes(filter.room)) {
                    item.visible = false;
                } else if (filter.func && !device.functions.includes(filter.func)) {
                    item.visible = false;
                } else if (filter.noInfo && device.type === 'info') {
                    item.visible = false;
                }
            }

            if (
                item.visible &&
                filter.text &&
                !item.title.includes(filter.text) &&
                !item.id.toLowerCase().includes(filter.text)
            ) {
                item.visible = false;
            }
        });

        const someFilterActive = filter.type || filter.func || filter.room || filter.text;

        let someChanges = false;
        const folders = listItems.filter(item => item.type === 'folder');
        do {
            someChanges = false;
            for (let f = 0; f < folders.length; f++) {
                const item = folders[f];
                item.hasVisibleChildren = listItems.filter(_item => _item.parent === item.id && _item.visible).length;
                if (someFilterActive && !item.hasVisibleChildren && item.visible) {
                    item.visible = false;
                    someChanges = true;
                }
            }
        } while (someChanges);

        if (setState) {
            this.setState({ listItems });
        }
    }

    renderDeleteDialog(): React.JSX.Element | null {
        if (this.state.deleteFolderAndDevice) {
            const time = parseInt(
                window.localStorage.getItem(
                    this.state.deleteFolderAndDevice.device ? 'DeleteDeviceTime' : 'DeleteFolderTime',
                ) || '0',
                10,
            );
            if (time && Date.now() - time < 5 * 60_000) {
                const deleteFolderAndDevice: { id: string; device?: false } | { index: number; device: true } =
                    JSON.parse(JSON.stringify(this.state.deleteFolderAndDevice));
                this.deleteTimeout ||= setTimeout(
                    _deleteFolderAndDevice => {
                        this.deleteTimeout = null;
                        const newState: Partial<ListDevicesState> = { deleteFolderAndDevice: null };
                        if (
                            this.state.selected === (_deleteFolderAndDevice as { id: string; device?: false }).id ||
                            ((_deleteFolderAndDevice as { index: number; device: true }).index !== undefined &&
                                this.state.devices[(_deleteFolderAndDevice as { index: number; device: true }).index] &&
                                this.state.devices[(_deleteFolderAndDevice as { index: number; device: true }).index]
                                    .channelId === this.state.selected)
                        ) {
                            newState.selected = '';
                            window.localStorage.removeItem('Devices.selected');
                        }
                        this.setState(newState as ListDevicesState, () => {
                            if (_deleteFolderAndDevice.device) {
                                void this.deleteDevice(_deleteFolderAndDevice.index);
                            } else {
                                void this.props.socket.delObjects(_deleteFolderAndDevice.id, true);
                            }
                        });
                    },
                    50,
                    deleteFolderAndDevice,
                );

                return null;
            }

            return (
                <DialogDeleteFolder
                    onClose={(result, suppressQuestion) => {
                        const newState: Partial<ListDevicesState> = { deleteFolderAndDevice: null };
                        if (result) {
                            if (suppressQuestion) {
                                window.localStorage.setItem(
                                    this.state.deleteFolderAndDevice!.device ? 'DeleteDeviceTime' : 'DeleteFolderTime',
                                    Date.now().toString(),
                                );
                            }

                            if (
                                this.state.selected ===
                                    (this.state.deleteFolderAndDevice as { id: string; device?: false }).id ||
                                ((this.state.deleteFolderAndDevice as { index: number; device: true }).index !==
                                    undefined &&
                                    this.state.devices[
                                        (this.state.deleteFolderAndDevice as { index: number; device: true }).index
                                    ] &&
                                    this.state.devices[
                                        (this.state.deleteFolderAndDevice as { index: number; device: true }).index
                                    ].channelId === this.state.selected)
                            ) {
                                newState.selected = '';
                                window.localStorage.removeItem('Devices.selected');
                            }

                            if ((this.state.deleteFolderAndDevice as { index: number; device: true }).device) {
                                void this.deleteDevice(
                                    (this.state.deleteFolderAndDevice as { index: number; device: true }).index,
                                );
                            } else {
                                void this.props.socket.delObjects(
                                    (this.state.deleteFolderAndDevice as { id: string; device?: false }).id,
                                    true,
                                );
                            }
                        }
                        this.setState(newState as ListDevicesState);
                    }}
                    device={!!this.state.deleteFolderAndDevice.device}
                />
            );
        }
        return null;
    }

    renderOneItem(items: ListItem[], item: ListItem, idx: number): (React.JSX.Element | null)[] | null {
        if (!item.visible && !item.hasVisibleChildren) {
            return null;
        }

        const children: ListItem[] = items.filter(i => i.parent === item.id);

        let isExpanded = false;
        if (children.length) {
            isExpanded = !!this.state.expandedIDs?.includes(item.id);
        }

        const depthPx = item.depth * (this.state.windowWidth <= WIDTHS[6] ? 8 : 20) + 10;

        let title: string | React.JSX.Element[] = item.title;
        let searchId: string | React.JSX.Element[] = item.id;

        if (this.state.filter.text) {
            let pos = title.toLowerCase().indexOf(this.state.filter.text);
            if (pos !== -1) {
                title = [
                    <span key="0">{title.substring(0, pos)}</span>,
                    <span
                        key="1"
                        style={styles.searchText}
                    >
                        {title.substring(pos, pos + this.state.filter.text.length)}
                    </span>,
                    <span key="2">{title.substring(pos + this.state.filter.text.length)}</span>,
                ];
            }

            pos = searchId.toLowerCase().indexOf(this.state.filter.text);
            if (pos !== -1) {
                searchId = [
                    <span key="0">{searchId.substring(0, pos)}</span>,
                    <span
                        key="1"
                        style={styles.searchText}
                    >
                        {searchId.substring(pos, pos + this.state.filter.text.length)}
                    </span>,
                    <span key="2">{searchId.substring(pos + this.state.filter.text.length)}</span>,
                ];
            }
        }

        const style = {
            paddingLeft: depthPx,
            cursor: 'pointer',
            opacity: item.visible ? 1 : 0.5,
        };

        const iconStyle: React.CSSProperties = {};
        const countSpan = children.length ? (
            <span style={styles.childrenCount}>
                {children.length !== item.hasVisibleChildren
                    ? `${item.hasVisibleChildren} (${children.length})`
                    : children.length}
            </span>
        ) : null;

        const searchStyle: React.CSSProperties = {};

        if (!countSpan) {
            iconStyle.opacity = 0.5;
        }
        if (!countSpan && item.type === 'folder') {
            searchStyle.opacity = 0.5;
        }

        if (item.hasVisibleChildren && !item.visible) {
            searchStyle.opacity = 0.5;
            iconStyle.opacity = 0.5;
        }

        iconStyle.color = '#448dde';
        iconStyle.width = 36;
        iconStyle.height = 36;

        let backgroundRow = null;

        if ((item.id === 'alias.0.automatically_detected' || item.id === 'alias.0.linked_devices') && !countSpan) {
            return null;
        }
        if (item.id === 'alias.0.automatically_detected') {
            iconStyle.color = colorNativeDevices;
            backgroundRow = `${colorNativeDevices}33`;
        } else if (item.id === 'alias.0.linked_devices') {
            iconStyle.color = colorLinkedDevices;
            backgroundRow = `${colorLinkedDevices}33`;
        }

        let background: string | undefined | null;
        let color: string | undefined;
        let index: number | null = null;

        const device = this.state.devices.find(el => el.channelId === item.id)!;
        const deviceIdx = this.state.devices.indexOf(device);
        const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));
        const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));

        if (device) {
            background = this.objects[device.channelId]?.common?.color;
            color = Utils.invertColor(background || '', true);
            index = this.state.devices.indexOf(device);
        } else {
            background = item.color;
            color = Utils.invertColor(background || '', true);
        }

        if (background && item.type === 'folder') {
            iconStyle.color = background;
        }

        let j = 0;
        const WrapperRow = item.type === 'folder' ? DropWrapper : DragWrapper;
        const inner = (
            <WrapperRow
                id={item.id}
                objects={this.objects}
                deleteDevice={this.deleteDevice}
                onCopyDevice={this.onCopyDevice}
                openFolder={() => this.toggleExpanded(item.id, true)}
                deviceIdx={deviceIdx}
                backgroundRow={backgroundRow}
                sx={Utils.getStyle(
                    this.props.theme,
                    styles.hoverRow,
                    this.state.selected === item.id && styles.selected,
                )}
                key={item.id || (typeof title === 'string' ? title : idx.toString())}
                onClick={() => this.onSelect(item.id)}
            >
                <TableCell
                    id={`td_${item.id}`}
                    colSpan={3}
                    size="small"
                    onDoubleClick={() => this.toggleExpanded(item.id)}
                    style={{
                        maxWidth: 300,
                        ...(this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile),
                        ...style,
                    }}
                >
                    <div style={styles.displayFlex}>
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
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('You can drag & drop device')}
                                >
                                    <Box
                                        style={{ background: background || undefined }}
                                        sx={styles.tableIcon}
                                    >
                                        <DeviceTypeIcon
                                            src={item.icon}
                                            style={{ ...styles.tableIconImg, color }}
                                            type={item.role as Types}
                                        />
                                    </Box>
                                </Tooltip>
                            )}
                            {item.type === 'folder' && item.icon && (
                                <div
                                    style={isExpanded ? styles.iconOpen : undefined}
                                    onClick={() => this.toggleExpanded(item.id)}
                                >
                                    <Icon
                                        style={styles.iconCommon}
                                        alt={item.type}
                                        src={item.icon}
                                    />
                                </div>
                            )}
                        </ListItemIcon>
                        <Tooltip
                            title={
                                <div>
                                    <div>
                                        <span style={{ marginRight: 8 }}>{I18n.t('Name')}:</span>
                                        {title}
                                    </div>
                                    {!item.showId &&
                                        item.id !== 'alias.0.automatically_detected' &&
                                        item.id !== 'alias.0.linked_devices' && (
                                            <div>{`${I18n.t('Id')}: ${item.id}`}</div>
                                        )}
                                </div>
                            }
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        >
                            <Box sx={styles.wrapperTitleAndId}>
                                <Box
                                    style={{ ...styles.textStyle, ...searchStyle }}
                                    sx={styles.fontStyle}
                                >
                                    {title}
                                </Box>
                                {!item.showId &&
                                    item.id !== 'alias.0.automatically_detected' &&
                                    item.id !== 'alias.0.linked_devices' && (
                                        <Box
                                            style={{ ...styles.textStyle, ...searchStyle }}
                                            sx={styles.fontStyleId}
                                        >
                                            {searchId}
                                        </Box>
                                    )}
                            </Box>
                        </Tooltip>
                    </div>
                </TableCell>
                {device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        size="small"
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                    >
                        {this.renderEnumCell(device.functions, funcEnums, index!)}
                    </TableCell>
                ) : null}

                {device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        size="small"
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                    >
                        {this.renderEnumCell(device.rooms, roomsEnums, index!)}
                    </TableCell>
                ) : null}

                {device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        size="small"
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                    >
                        {ListDevices.renderTypeCell(device.type)}
                    </TableCell>
                ) : null}
                {device && this.state.windowWidth >= WIDTHS[0] ? (
                    <TableCell style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}>
                        {device.states.filter(state => state.id).length}
                    </TableCell>
                ) : null}
                {device && (
                    <TableCell
                        align="right"
                        size="small"
                        style={{
                            ...(this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile),
                            ...styles.buttonsCell,
                        }}
                    >
                        <div style={styles.wrapperButton}>
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Copy device')}
                            >
                                <IconButton
                                    size="small"
                                    style={styles.emptyBlock}
                                    onClick={e => this.onCopy(item.id, e)}
                                >
                                    <CopyIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Edit states')}
                            >
                                <IconButton
                                    size="small"
                                    style={styles.emptyBlock}
                                    onClick={e => this.onEdit(item.id, e)}
                                >
                                    <IconEdit />
                                </IconButton>
                            </Tooltip>
                            {device.channelId.startsWith(ALIAS) || device.channelId.startsWith(LINKEDDEVICES) ? (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Delete device with all states')}
                                >
                                    <IconButton
                                        style={styles.emptyBlock}
                                        size="small"
                                        onClick={() =>
                                            this.setState({ deleteFolderAndDevice: { index: index!, device: true } })
                                        }
                                    >
                                        <IconDelete />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <div style={styles.emptyBlock} />
                            )}
                        </div>
                    </TableCell>
                )}
                {!device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                        size="small"
                        colSpan={1}
                    />
                ) : null}
                {!device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                        size="small"
                        colSpan={1}
                    />
                ) : null}
                {!device && this.state.windowWidth >= WIDTHS[1 + j++] ? (
                    <TableCell
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                        size="small"
                        colSpan={1}
                    />
                ) : null}
                {!device && this.state.windowWidth >= WIDTHS[0] ? (
                    <TableCell
                        style={this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile}
                        size="small"
                        colSpan={1}
                    >
                        {countSpan}
                    </TableCell>
                ) : null}
                {!device ? (
                    <TableCell
                        size="small"
                        align="right"
                        style={{
                            ...styles.buttonsCell,
                            ...(this.state.windowWidth > WIDTHS[2] ? styles.cell : styles.cellMobile),
                        }}
                    >
                        {item.importer && (
                            <div style={styles.wrapperButton}>
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Importer')}
                                >
                                    <IconButton
                                        style={styles.emptyBlock}
                                        size="small"
                                        onClick={() => this.setState({ showImporterDialog: item })}
                                    >
                                        <CopyIcon />
                                    </IconButton>
                                </Tooltip>
                                <div style={styles.emptyBlock} />
                                <div style={styles.emptyBlock} />
                            </div>
                        )}
                        {!item.noEdit &&
                            item.id !== 'alias.0.automatically_detected' &&
                            item.id !== 'alias.0.linked_devices' && (
                                <div style={styles.wrapperButton}>
                                    <Tooltip
                                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                        title={I18n.t('Edit folder')}
                                    >
                                        <IconButton
                                            style={styles.emptyBlock}
                                            size="small"
                                            onClick={_ => this.setState({ showEditFolder: item.obj })}
                                        >
                                            <IconEdit />
                                        </IconButton>
                                    </Tooltip>
                                    {!countSpan ? (
                                        <Tooltip
                                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                            title={I18n.t('Delete folder')}
                                        >
                                            <IconButton
                                                style={styles.emptyBlock}
                                                size="small"
                                                onClick={() =>
                                                    this.setState({ deleteFolderAndDevice: { id: item.id } })
                                                }
                                            >
                                                <IconDelete />
                                            </IconButton>
                                        </Tooltip>
                                    ) : (
                                        <div style={styles.emptyBlock} />
                                    )}
                                </div>
                            )}
                    </TableCell>
                ) : null}
            </WrapperRow>
        );

        const result: (React.JSX.Element | null)[] = [inner];

        if (isExpanded) {
            if (!children.length && item.id === 'alias.0.automatically_detected') {
                // Add text about enums
                result.push(
                    <TableRow key="automatically_detected_info">
                        <TableCell />
                        <TableCell colSpan={3}>{I18n.t('auto_detected_empty_info')}</TableCell>
                    </TableRow>,
                );
            } else {
                children.forEach((it: ListItem, i: number) =>
                    result.push(this.renderOneItem(items, it, i) as any as React.JSX.Element | null),
                );
            }
        }
        return result;
    }

    changeFilter(
        func: undefined | string,
        room?: string,
        type?: Types | '_' | '',
        text?: string,
        noInfo?: boolean,
    ): void {
        const filter: {
            func: string;
            room: string;
            type: Types | '_' | '';
            text: string;
            noInfo: boolean;
        } = JSON.parse(JSON.stringify(this.state.filter));
        if (func !== undefined) {
            filter.func = func === '_' ? '' : func;
            window.localStorage.setItem('Devices.filter.func', filter.func);
        }
        if (room !== undefined) {
            filter.room = room === '_' ? '' : room;
            window.localStorage.setItem('Devices.filter.room', filter.room);
        }
        if (type !== undefined) {
            filter.type = type === '_' ? '' : type;
            window.localStorage.setItem('Devices.filter.type', filter.type);
        }
        if (text !== undefined) {
            filter.text = text.toLowerCase();
            window.localStorage.setItem('Devices.filter.text', filter.text);
        }
        if (noInfo !== undefined) {
            filter.noInfo = noInfo;
            window.localStorage.setItem('Devices.filter.noInfo', filter.noInfo ? 'true' : 'false');
        }

        const listItems = this.state.listItems; //JSON.parse(JSON.stringify(this.state.listItems));
        this.applyFilter(listItems, undefined, filter);
        this.setState({ /*listItems,*/ filter });
    }

    renderAllItems(items: ListItem[]): React.JSX.Element[] {
        return items
            .filter(item => !item.parent)
            .map((item: ListItem, i: number) => this.renderOneItem(items, item, i) as any as React.JSX.Element);
    }

    renderHeaderType(): React.JSX.Element {
        const noInfo = this.state.filter.noInfo;
        const preResult: Types[] = [];
        this.state.devices.forEach(
            el => (!noInfo || el.type !== 'info') && !preResult.includes(el.type) && preResult.push(el.type),
        );
        const result: { value: Types; label: string }[] = preResult.map(type => ({
            value: type,
            label: I18n.t(`type-${type}`),
        }));

        result.sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0));

        return (
            <Select
                variant="standard"
                value={this.state.filter.type || '_'}
                onChange={e => this.changeFilter(undefined, undefined, e.target.value as Types | '_' | '')}
            >
                <MenuItem value={'_'}>
                    <span style={{ color: this.props.themeType === 'dark' ? '#FFFFFF40' : '#00000040' }}>
                        {I18n.t('Type')}
                    </span>
                </MenuItem>
                {result.map(item => (
                    <MenuItem
                        key={item.value}
                        value={item.value}
                    >
                        <DeviceTypeIcon
                            style={{ ...styles.enumIcon, ...styles.iconInSelect }}
                            type={item.value}
                        />
                        {item.label}
                    </MenuItem>
                ))}
            </Select>
        );
    }

    renderHeaderFunction(): React.JSX.Element | string {
        if (!this.funcEnums) {
            return I18n.t('Function');
        }
        const list = this.funcEnums.map(id => this.objects[id] as ioBroker.EnumObject).filter(o => o);
        list.unshift({
            _id: '_',
            common: {
                name: I18n.t('Function'),
                color: this.props.themeType === 'dark' ? '#FFFFFF40' : '#00000040',
            },
            native: {},
            type: 'enum',
        });

        return (
            <SelectWithIcon
                t={I18n.t}
                dense
                style={{ width: '100%' }}
                lang={I18n.getLanguage()}
                themeType={this.props.themeType}
                value={this.state.filter.func || '_'}
                list={list}
                onChange={text => this.changeFilter(text)}
            />
        );
    }

    renderHeaderRoom(): React.JSX.Element | string {
        if (!this.roomsEnums) {
            return I18n.t('Room');
        }
        const list: ioBroker.EnumObject[] = this.roomsEnums
            .map(id => this.objects[id] as ioBroker.EnumObject)
            .filter(o => o);

        list.unshift({
            _id: '_',
            common: {
                name: I18n.t('Room'),
                color: this.props.themeType === 'dark' ? '#FFFFFF40' : '#00000040',
            },
            type: 'enum',
            native: {},
        });

        return (
            <SelectWithIcon
                t={I18n.t}
                dense
                style={{ width: '100%' }}
                lang={I18n.getLanguage()}
                themeType={this.props.themeType}
                value={this.state.filter.func || '_'}
                list={list}
                onChange={text => this.changeFilter(text)}
            />
        );
    }

    renderDevices(): React.JSX.Element {
        let j = 0;

        return (
            <Paper style={styles.paperTable}>
                <Table
                    stickyHeader
                    sx={styles.table}
                    size="small"
                >
                    <TableHead>
                        <TableRow>
                            <TableCell style={styles.tableExpandIconCell} />
                            <TableCell style={styles.tableIconCell} />
                            <TableCell style={{ ...styles.headerCell, ...styles.tableNameCell }}>
                                {I18n.t('Name')}
                            </TableCell>
                            {this.state.windowWidth >= WIDTHS[1 + j++] ? (
                                <TableCell style={styles.headerCell}>{this.renderHeaderFunction()}</TableCell>
                            ) : null}
                            {this.state.windowWidth >= WIDTHS[1 + j++] ? (
                                <TableCell style={styles.headerCell}>{this.renderHeaderRoom()}</TableCell>
                            ) : null}
                            {this.state.windowWidth >= WIDTHS[1 + j++] ? (
                                <TableCell style={styles.headerCell}>{this.renderHeaderType()}</TableCell>
                            ) : null}
                            {this.state.windowWidth >= WIDTHS[0] ? (
                                <TableCell style={{ ...styles.headerCell, width: 50 }}>{I18n.t('States')}</TableCell>
                            ) : null}
                            <TableCell style={{ ...styles.headerCell, ...styles.buttonsCellHeader }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>{this.renderAllItems(this.state.listItems)}</TableBody>
                </Table>
            </Paper>
        );
    }

    onCopyDevice = async (id: string, newChannelId: string): Promise<void> => {
        // if this is a device not from linkeddevices or from alias
        const deviceToCopy = this.state.devices.find(device => device.channelId === id);

        if (deviceToCopy) {
            await copyDevice(newChannelId, {
                socket: this.props.socket,
                objects: this.objects,
                deviceToCopy: deviceToCopy,
            });
        }
    };

    onEditFinished = async (
        data: {
            ids: Record<
                string,
                | string
                | {
                      read: string;
                      write: string;
                  }
            >;
            fx: Record<string, { read?: string; write?: string }>;
            states: Record<string, { [value: string]: string } | undefined>;
        } | null,
        channelInfo?: PatternControlEx,
    ): Promise<void> => {
        let somethingChanged = false;
        const device = channelInfo || this.state.devices.find(({ channelId }) => channelId === this.state.editId)!;
        if (data) {
            // const device = this.state.devices[this.state.editIndex];
            const channelId = device.channelId;

            if (channelId.startsWith(ALIAS)) {
                const processed: string[] = [];
                for (let s = 0; s < device.states.length; s++) {
                    const state = device.states[s];
                    // If a state with the same name already processed, ignore it
                    if (processed.includes(state.name)) {
                        continue;
                    }
                    processed.push(state.name);

                    const obj = state.id ? await this.props.socket.getObject(state.id) : null;
                    if (obj?.common?.alias) {
                        if (
                            data.ids[state.name] !== obj.common.alias.id ||
                            obj.common.alias.read !== data.fx[state.name].read ||
                            obj.common.alias.write !== data.fx[state.name].write
                        ) {
                            // update alias ID
                            if (!state.required && !data.ids[state.name]) {
                                // delete state
                                await this.props.socket.delObject(state.id);
                            } else {
                                // update state
                                const stateObj: ioBroker.StateObject | null | undefined =
                                    (await this.props.socket.getObject(state.id)) as
                                        | ioBroker.StateObject
                                        | null
                                        | undefined;

                                if (stateObj) {
                                    stateObj.common ||= {} as ioBroker.StateCommon;
                                    if (stateObj.common.alias) {
                                        stateObj.common.alias.id = data.ids[state.name];
                                    } else {
                                        stateObj.common.alias = { id: data.ids[state.name] };
                                    }
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

                                    // Update states of state
                                    if (data.states[state.name]) {
                                        stateObj.common.states = data.states[state.name];
                                    }

                                    await this.props.socket.setObject(stateObj._id, stateObj);
                                }
                            }
                        } // else nothing changed
                    } else if (data.ids[state.name]) {
                        state.id ||= `${channelId}.${state.name}`;

                        // Object not yet exists or invalid
                        let stateObj: ioBroker.StateObject | null | undefined;
                        try {
                            stateObj = (await this.props.socket.getObject(state.id)) as
                                | ioBroker.StateObject
                                | null
                                | undefined;
                        } catch {
                            // ignore
                        }
                        stateObj ||= {} as ioBroker.StateObject;
                        stateObj._id = state.id;
                        stateObj.native ||= {};
                        stateObj.type = 'state';
                        stateObj.common ||= {} as ioBroker.StateCommon;

                        const common = stateObj.common;
                        if (common.alias) {
                            common.alias.id = data.ids[state.name];
                        } else {
                            common.alias = { id: data.ids[state.name] };
                        }
                        if (!common.name) {
                            // Take as name the full path without alias.0, so the user understands what state it is
                            common.name = state.id.replace(/^alias\.0\./, '').replace(/^linkeddevices\.0\./, '');

                            // Replace dots with spaces and make the first letter of every word big
                            common.name = common.name
                                .replace(/_/g, ' ')
                                .replace(/\./g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .replace(/(^|\s)\S/g, l => l.toUpperCase());
                        }

                        common.role = state.defaultRole || 'state';

                        if (state.read !== undefined) {
                            common.read = state.read;
                        } else if (common.read !== undefined) {
                            common.read = true;
                        }
                        if (state.write !== undefined) {
                            common.write = state.write;
                        } else if (common.write !== undefined) {
                            common.write = true;
                        }

                        if (state.defaultStates) {
                            common.states = state.defaultStates;
                        }

                        if (data.fx[state.name].read) {
                            stateObj.common.alias!.read = data.fx[state.name].read;
                        }
                        if (data.fx[state.name].write) {
                            stateObj.common.alias!.write = data.fx[state.name].write;
                        }

                        common.type = state.type
                            ? typeof state.type === 'object'
                                ? state.type[0]
                                : state.type
                            : TYPES_MAPPING[state.defaultRole?.split('.')[0] || ''] || 'mixed';

                        /*if (state.defaultMin !== undefined) {
                            common.min = state.defaultMin;
                        } else */
                        if (state.min !== undefined) {
                            common.min = 0;
                        }

                        /*if (state.defaultMax !== undefined) {
                            common.max = state.defaultMax;
                        } else */
                        if (state.max !== undefined) {
                            common.max = 100;
                        }

                        if (state.defaultUnit) {
                            common.unit = state.defaultUnit;
                        } else if (state.unit) {
                            common.unit = state.unit;
                        }
                        somethingChanged = true;

                        // Update states of state
                        if (data.states[state.name]) {
                            common.states = data.states[state.name];
                        }

                        await this.props.socket.setObject(stateObj._id, stateObj);
                    }
                }
            } else if (channelId.startsWith(LINKEDDEVICES)) {
                const processed: string[] = [];
                for (let s = 0; s < device.states.length; s++) {
                    const state = device.states[s];
                    // If a state with the same name already processed, ignore it
                    if (processed.includes(state.name)) {
                        continue;
                    }
                    processed.push(state.name);
                    const obj = state.id
                        ? ((await this.props.socket.getObject(state.id)) as ioBroker.StateObject | null | undefined)
                        : null;
                    let attrs;
                    if (
                        state.id &&
                        obj?.common?.custom &&
                        (attrs = Object.keys(obj.common.custom).filter(id => id.startsWith(LINKEDDEVICES))).length
                    ) {
                        const attr = attrs[0];
                        if (
                            data.ids[state.name] !== obj.common.custom[attr].parentId ||
                            !obj.common.custom[attr].enabled ||
                            !obj.common.custom[attr].isLinked
                        ) {
                            // update alias ID
                            if (!state.required && !data.ids[state.name]) {
                                // delete state
                                await this.props.socket.delObject(state.id);
                                somethingChanged = true;
                            } else {
                                // update state
                                obj.common ||= {} as ioBroker.StateCommon;
                                obj.common.custom ||= {};
                                obj.common.custom[attr] ||= {};
                                obj.common.custom[attr].parentId = data.ids[state.name];
                                obj.common.custom[attr].enabled = true;
                                obj.common.custom[attr].isLinked = true;
                                somethingChanged = true;
                                await this.props.socket.setObject(obj._id, obj);
                            }
                        } // else nothing changed
                    } else if (data.ids[state.name]) {
                        state.id = state.id || `${channelId}.${state.name}`;

                        // Object not yet exists or invalid
                        let stateObj: ioBroker.StateObject | null | undefined;
                        try {
                            stateObj = (await this.props.socket.getObject(state.id)) as
                                | ioBroker.StateObject
                                | null
                                | undefined;
                        } catch {
                            // ignore
                        }
                        stateObj ||= {} as ioBroker.StateObject;
                        stateObj._id = state.id;
                        stateObj.native ||= {};
                        stateObj.type = 'state';
                        stateObj.common ||= {} as ioBroker.StateCommon;

                        const common = stateObj.common;
                        const attr = this.state.linkeddevices;
                        common.custom ||= {};
                        common.custom[attr] ||= {};
                        common.custom[attr].parentId = data.ids[state.name];
                        common.custom[attr].enabled = true;
                        common.custom[attr].isLinked = true;
                        common.custom[attr].parentType = 'mixed';

                        common.name ||= state.name;
                        common.role = state.defaultRole || 'state';

                        if (state.read !== undefined) {
                            common.read = state.read;
                        } else if (common.read !== undefined) {
                            common.read = true;
                        }
                        if (state.write !== undefined) {
                            common.write = state.write;
                        } else if (common.write !== undefined) {
                            common.write = true;
                        }

                        if (state.defaultStates) {
                            common.states = state.defaultStates;
                        }
                        common.type = state.type
                            ? typeof state.type === 'object'
                                ? state.type[0]
                                : state.type
                            : TYPES_MAPPING[state.defaultRole?.split('.')[0] || ''] || 'mixed';

                        /*if (state.defaultMin !== undefined) {
                            common.min = state.defaultMin;
                        } else */
                        if (state.min !== undefined) {
                            common.min = 0;
                        }

                        /*if (state.defaultMax !== undefined) {
                            common.max = state.defaultMax;
                        } else */
                        if (state.max !== undefined) {
                            common.max = 100;
                        }

                        if (state.defaultUnit) {
                            common.unit = state.defaultUnit;
                        } else if (state.unit) {
                            common.unit = state.unit;
                        }

                        // Update states of state
                        if (data.states[state.name]) {
                            stateObj.common.states = data.states[state.name];
                        }

                        somethingChanged = true;
                        await this.props.socket.setObject(stateObj._id, stateObj);
                    }
                }
            }

            if (somethingChanged) {
                // update enums, name
                this.updateEnumsForOneDevice(device);
            }
        }

        await this.setStateAsync({ editId: null });
        Router.doNavigate(null, '', '');
    };

    onSaveProperties = async (data: DialogEditPropertiesState, channelInfo: PatternControlEx): Promise<void> => {
        let somethingChanged = false;
        const device = channelInfo || this.state.devices.find(({ channelId }) => channelId === this.state.editId);
        if (data && device) {
            const language = I18n.getLanguage();
            const channelId = device.channelId;
            const oldName = Utils.getObjectNameFromObj(this.objects[channelId], language);
            let mainStateObj: ioBroker.StateObject | null | undefined;
            let oldSmartName: string | false | undefined | null;

            // Find mainStateID anew
            const mainStateId = findMainStateId(device);

            if (mainStateId) {
                mainStateObj = (await this.props.socket.getObject(mainStateId)) as
                    | ioBroker.StateObject
                    | null
                    | undefined;
                if (mainStateObj) {
                    oldSmartName = getSmartName(mainStateObj, this.state.iotNoCommon, this.state.iotInstance, language);
                }
            }
            if (
                this.objects[channelId]?.common &&
                (oldName !== data.name ||
                    oldSmartName !== data.smartName ||
                    (this.objects[channelId].common.color || '') !== data.color ||
                    (this.objects[channelId].common.icon || '') !== data.icon)
            ) {
                // update channel
                let obj: ioBroker.Object | null | undefined = await this.props.socket.getObject(channelId);
                obj ||= {} as ioBroker.Object;
                obj.common ||= {} as ioBroker.ObjectCommon;
                obj.native ||= {};

                if (!obj.common.name || typeof obj.common.name !== 'object') {
                    obj.common.name = { [language]: data.name } as ioBroker.StringOrTranslated;
                } else {
                    obj.common.name[language] = data.name || '';
                }
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
                obj.type ||= 'channel';

                if (mainStateObj && oldSmartName !== data.smartName) {
                    setSmartName(
                        mainStateObj,
                        data.smartName,
                        this.state.iotNoCommon,
                        this.state.iotInstance,
                        language,
                    );
                    await this.props.socket.setObject(mainStateObj._id, mainStateObj);
                }

                await this.props.socket.setObject(obj._id, obj);
                somethingChanged = true;
            }

            if (await this.setEnumsOfDevice(channelId, data.functions, data.rooms)) {
                somethingChanged = true;
            }
        }

        if (somethingChanged) {
            const devices: PatternControlEx[] = JSON.parse(JSON.stringify(this.state.devices));
            this.setState({ devices }, () => {
                // update enums, name
                if (device) {
                    this.updateEnumsForOneDevice(device);
                }
            });
        }
    };

    renderEditDialog(): React.JSX.Element | null {
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
            this.setState({ editId: null });
            return null;
        }

        return (
            <DialogEdit
                channelId={device.channelId}
                type={device.type}
                channelInfo={device}
                objects={this.objects}
                patterns={this.patterns}
                theme={this.props.theme}
                enumIDs={this.enumIDs}
                iotInstance={this.state.iotInstance}
                iotNoCommon={this.state.iotNoCommon}
                socket={this.props.socket}
                onCopyDevice={async (id, newId) => {
                    await this.onCopyDevice(id, newId);
                    const copiedDevice = this.state.devices.find(device => device.channelId === id);
                    if (copiedDevice) {
                        await this.deleteDevice(this.state.devices.indexOf(copiedDevice));
                    }
                }}
                onSaveProperties={(data, channelInfo) => this.onSaveProperties(data, channelInfo)}
                onClose={(data, channelInfo) => this.onEditFinished(data, channelInfo)}
            />
        );
    }

    async setEnumsOfDevice(channelId: string, functions?: string[], rooms?: string[]): Promise<boolean> {
        let somethingChanged = false;

        for (let e = 0; e < this.enumIDs.length; e++) {
            const id = this.enumIDs[e];
            const members = this.objects[id]?.common?.members || [];
            // if this channel is in enum
            if (id.startsWith('enum.functions.') && functions) {
                if (functions.includes(id)) {
                    if (!members.includes(channelId)) {
                        const obj: ioBroker.EnumObject | null | undefined = (await this.props.socket.getObject(id)) as
                            | ioBroker.EnumObject
                            | null
                            | undefined;
                        if (obj) {
                            obj.common ||= {} as ioBroker.EnumCommon;
                            obj.common.members ||= [];
                            obj.common.members.push(channelId);
                            obj.common.members.sort();
                            await this.props.socket.setObject(obj._id, obj);
                            somethingChanged = true;
                        }
                    }
                } else {
                    if (members.includes(channelId)) {
                        const obj: ioBroker.EnumObject | null | undefined = (await this.props.socket.getObject(id)) as
                            | ioBroker.EnumObject
                            | null
                            | undefined;
                        if (obj) {
                            obj.common ||= {} as ioBroker.EnumCommon;
                            obj.common.members ||= [];
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

            if (id.startsWith('enum.rooms.') && rooms) {
                if (rooms.includes(id)) {
                    if (!members.includes(channelId)) {
                        const obj: ioBroker.EnumObject | null | undefined = (await this.props.socket.getObject(id)) as
                            | ioBroker.EnumObject
                            | null
                            | undefined;
                        if (obj) {
                            obj.common ||= {} as ioBroker.EnumCommon;
                            obj.common.members ||= [];
                            obj.common.members.push(channelId);
                            obj.common.members.sort();
                            await this.props.socket.setObject(obj._id, obj);
                            somethingChanged = true;
                        }
                    }
                } else {
                    if (members.includes(channelId)) {
                        const obj: ioBroker.EnumObject | null | undefined = (await this.props.socket.getObject(id)) as
                            | ioBroker.EnumObject
                            | null
                            | undefined;
                        if (obj) {
                            obj.common ||= {} as ioBroker.EnumCommon;
                            obj.common.members ||= [];
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
        }

        return somethingChanged;
    }

    deleteDevice = async (index: number, devices?: PatternControlEx[]): Promise<PatternControlEx[]> => {
        const _devices: PatternControlEx[] = devices || JSON.parse(JSON.stringify(this.state.devices));
        const device = _devices[index];
        if (!device) {
            return _devices;
        }

        // remove this device from all enums
        for (let i = 0; i < this.enumIDs.length; i++) {
            const enumId = this.enumIDs[i];
            if (this.objects[enumId]?.common?.members) {
                if (
                    device.states.find(state => state.id && this.objects[enumId].common.members.includes(state.id)) ||
                    this.objects[enumId].common.members.includes(device.channelId)
                ) {
                    const obj: ioBroker.EnumObject | null | undefined = (await this.props.socket.getObject(enumId)) as
                        | ioBroker.EnumObject
                        | null
                        | undefined;
                    if (!obj?.common?.members) {
                        continue;
                    }
                    const members: string[] = [];

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

        const mainStateId = findMainStateId(device);

        if (device.channelId && mainStateId && device.channelId !== mainStateId) {
            await this.props.socket.delObject(device.channelId);
        }

        _devices.splice(index, 1);
        return _devices;
    };

    async createDevice(options: {
        id: string;
        type: string;
        icon: string;
        color?: string;
        name: string;
        states: ExternalDetectorState[];
        functions?: string[];
        rooms?: string[];
    }): Promise<void> {
        const patterns = SmartDetector.getPatterns();
        const statesName = Object.keys(patterns).find(t => patterns[t].type === options.type);
        if (!statesName) {
            return await this.setStateAsync({ message: I18n.t('Unknown type!') + options.type });
        }
        let states: ExternalDetectorState[] = patterns[statesName].states;
        if (options.states.length) {
            states = options.states;
        }

        // try to find channelRole
        const role = states.find(item => item.defaultChannelRole);

        const obj: ioBroker.ChannelObject = {
            _id: options.id,
            common: {
                name: { [I18n.getLanguage()]: options.name } as ioBroker.StringOrTranslated,
                role: role?.defaultChannelRole || options.type,
                icon: options.icon,
                color: options.color,
            },
            native: {},
            type: 'channel',
        };

        // create a channel
        await this.props.socket.setObject(options.id, obj);

        for (let s = 0; s < states.length; s++) {
            const state = states[s];

            if (state.required && state.defaultRole) {
                const common: ioBroker.StateCommon = {
                    name: state.name,
                    role: state.defaultRole,
                    type: state.type
                        ? typeof state.type === 'object'
                            ? state.type[0]
                            : state.type
                        : TYPES_MAPPING[state.defaultRole.split('.')[0]] || 'mixed',
                    read: state.read === undefined ? true : state.read,
                    write: state.write === undefined ? false : state.write,
                    alias: {
                        id: '',
                    },
                };
                if (state.defaultStates) {
                    common.states = state.defaultStates;
                }

                /*if (state.defaultMin !== undefined) {
                    common.min = state.defaultMin;
                } else */
                if (state.min !== undefined) {
                    common.min = 0;
                }

                /*if (state.defaultMax !== undefined) {
                    common.max = state.defaultMax;
                } else */
                if (state.max !== undefined) {
                    common.max = 100;
                }

                if (state.defaultUnit) {
                    common.unit = state.defaultUnit;
                } else if (state.unit) {
                    common.unit = state.unit;
                }

                const obj: ioBroker.StateObject = {
                    _id: `${options.id}.${state.name}`,
                    common,
                    native: {},
                    type: 'state',
                };
                await this.props.socket.setObject(`${options.id}.${state.name}`, obj);
            }

            await this.setEnumsOfDevice(options.id, options.functions, options.rooms);
        }

        this.editCreatedId = obj._id;
    }

    renderAddDialog(): React.JSX.Element | null {
        if (!this.state.showAddDialog) {
            return null;
        }

        const deviceToCopy = this.state.copyId
            ? this.state.devices.find(el => el.channelId === this.state.copyId) || null
            : null;

        return (
            <DialogNew
                themeType={this.props.themeType}
                detector={this.detector}
                objects={this.objects}
                enumIDs={this.enumIDs}
                selected={this.state.selected}
                prefix={this.state.showAddDialog}
                socket={this.props.socket}
                deviceToCopy={deviceToCopy}
                noInfo={this.state.filter.noInfo}
                toggleInfo={() =>
                    this.changeFilter(undefined, undefined, undefined, undefined, !this.state.filter.noInfo)
                }
                onClose={options =>
                    this.setState({ showAddDialog: '', copyId: '' }, () => {
                        if (options) {
                            void this.createDevice(options);
                        }
                    })
                }
            />
        );
    }

    renderImporterDialog = (): React.JSX.Element | null => {
        if (!this.state.showImporterDialog) {
            return null;
        }
        return (
            <DialogImporter
                theme={this.props.theme}
                themeType={this.props.themeType}
                item={this.state.showImporterDialog}
                socket={this.props.socket}
                devices={this.state.devices}
                objects={this.objects}
                onCopyDevice={this.onCopyDevice}
                onClose={() => this.setState({ showImporterDialog: null })}
                listItems={this.state.listItems}
            />
        );
    };

    renderEditFolder = (): React.JSX.Element | null => {
        if (!this.state.showEditFolder && !this.state.newFolder) {
            return null;
        }
        return (
            <DialogEditFolder
                deleteDevice={this.deleteDevice}
                objects={this.objects}
                socket={this.props.socket}
                devices={this.state.devices}
                data={this.state.showEditFolder}
                selected={this.disabledButtons() ? undefined : this.state.selected}
                newFolder={this.state.newFolder}
                onClose={() => this.setState({ showEditFolder: undefined, newFolder: false })}
            />
        );
    };

    renderEditEnumDialog(): React.JSX.Element | null {
        if (!this.state.editEnum) {
            return null;
        }
        return (
            <DialogEditEnums
                objects={this.objects}
                values={this.state.editEnum.values}
                enumIDs={this.state.editEnum.enums}
                deviceName={this.state.devices[this.state.editEnum.index].name}
                onClose={async values => {
                    if (values && JSON.stringify(values) !== JSON.stringify(this.state.editEnum!.values)) {
                        if (this.state.editEnum!.enums[0]?.startsWith('enum.functions.')) {
                            await this.setEnumsOfDevice(
                                this.state.devices[this.state.editEnum!.index].channelId,
                                values,
                            );
                        } else {
                            await this.setEnumsOfDevice(
                                this.state.devices[this.state.editEnum!.index].channelId,
                                undefined,
                                values,
                            );
                        }
                        const devices = JSON.parse(JSON.stringify(this.state.devices));
                        // update enums, name
                        this.updateEnumsForOneDevice(devices[this.state.editEnum!.index]);
                        this.setState({ editEnum: null, devices });
                    } else {
                        this.setState({ editEnum: null });
                    }
                }}
            />
        );
    }

    setFilter(value: string): void {
        this.filter = value.toLowerCase();
        if (this.filterTimer) {
            clearTimeout(this.filterTimer);
        }
        this.filterTimer = setTimeout(() => {
            this.filterTimer = null;
            this.changeFilter(undefined, undefined, undefined, this.filter);
        }, 400);
    }

    onCollapseAll(): void {
        this.setState({ expandedIDs: [] });
        ListDevices.saveExpanded([]);
    }

    onExpandAll(): void {
        const expandedIDs: string[] = [];
        this.state.listItems.forEach(
            item => this.state.listItems.find(it => it.parent === item.id) && expandedIDs.push(item.id),
        );
        this.setState({ expandedIDs });
        ListDevices.saveExpanded(expandedIDs);
    }

    renderToolbar(): React.JSX.Element {
        const disabledButtons = this.disabledButtons();

        return (
            <Toolbar variant="dense">
                <div style={styles.wrapperHeadButtons}>
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={I18n.t('Create new device with Aliases')}
                    >
                        <div>
                            <IconButton
                                disabled={disabledButtons}
                                onClick={() => this.setState({ showAddDialog: `${ALIAS}0` })}
                            >
                                <IconAdd />
                            </IconButton>
                        </div>
                    </Tooltip>
                    {this.state.linkeddevices && (
                        <Tooltip
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            title={I18n.t('Create new device with LinkedDevices')}
                        >
                            <IconButton onClick={() => this.setState({ showAddDialog: this.state.linkeddevices })}>
                                <IconAdd style={{ color: colorLinkedDevices }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={I18n.t('Refresh')}
                    >
                        <IconButton
                            onClick={() => this.detectDevices()}
                            disabled={this.state.browse}
                        >
                            {this.state.browse ? <CircularProgress size={20} /> : <IconRefresh />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={I18n.t('Hide info devices')}
                    >
                        <IconButton
                            color={this.state.filter.noInfo ? 'inherit' : 'primary'}
                            onClick={() =>
                                this.changeFilter(undefined, undefined, undefined, undefined, !this.state.filter.noInfo)
                            }
                        >
                            <IconInfo />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={disabledButtons ? I18n.t('Create new folder in root') : I18n.t('Create new folder')}
                    >
                        <IconButton
                            color={disabledButtons ? 'secondary' : 'primary'}
                            onClick={_ => this.setState({ newFolder: true })}
                        >
                            <CreateNewFolderIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={I18n.t('Expand all nodes')}
                    >
                        <IconButton
                            color="primary"
                            onClick={() => this.onExpandAll()}
                        >
                            <IconFolderOpened />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        title={I18n.t('Collapse all nodes')}
                    >
                        <IconButton
                            color="primary"
                            onClick={() => this.onCollapseAll()}
                        >
                            <IconFolder />
                        </IconButton>
                    </Tooltip>
                </div>
                <TextField
                    variant="standard"
                    margin="dense"
                    inputRef={this.inputRef}
                    placeholder={I18n.t('Filter')}
                    defaultValue={this.filter}
                    sx={styles.hide700}
                    onChange={e => this.setFilter(e.target.value)}
                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                        input: {
                            endAdornment: this.filter ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            this.setFilter('');
                                            if (this.inputRef.current) {
                                                this.inputRef.current.value = '';
                                            }
                                        }}
                                    >
                                        <IconClear />
                                    </IconButton>
                                </InputAdornment>
                            ) : (
                                <div style={styles.emptyClear} />
                            ),
                        },
                    }}
                />
                <div style={styles.emptyBlockFlex} />
                <Box sx={styles.wrapperName}>
                    <img
                        src="./devices.svg"
                        color="primary"
                        alt="logo"
                        style={{ marginRight: 5, width: 32, height: 32 }}
                    />
                    <span>{I18n.t('Devices')}</span>
                </Box>
            </Toolbar>
        );
    }

    renderContent(): React.JSX.Element {
        return (
            <div style={styles.tab}>
                {this.renderMessage()}
                {this.renderEditDialog()}
                {this.renderAddDialog()}
                {this.renderEditEnumDialog()}
                {this.renderImporterDialog()}
                {this.renderEditFolder()}
                {this.renderDeleteDialog()}

                {this.renderToolbar()}

                {this.renderDevices()}
            </div>
        );
    }

    render(): React.JSX.Element {
        if (this.state.loading) {
            return <Loader themeType={this.props.themeType} />;
        }
        // Do not allow to move elements on touch devices, as scroll could be misunderstood as reordering
        if (this.isTouchDevice) {
            return this.renderContent();
        }

        const small = this.props.width === 'xs' || this.props.width === 'sm';

        return <DndProvider backend={!small ? HTML5Backend : TouchBackend}>{this.renderContent()}</DndProvider>;
    }
}

export default withWidth()(ListDevices);
