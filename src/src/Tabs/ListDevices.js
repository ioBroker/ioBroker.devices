/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import IconButton from '@material-ui/core/IconButton';
import Fab from '@material-ui/core/Fab';
import CircularProgress from '@material-ui/core/CircularProgress';
import Input from '@material-ui/core/Input';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

import {MdAdd as IconAdd} from 'react-icons/md';
import {MdRefresh as IconRefresh} from 'react-icons/md';
import {MdClear as IconClear} from 'react-icons/md';
import {MdStar as IconStar} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdModeEdit as IconEdit} from 'react-icons/md';

import {FaRegFolder as IconCollapsed} from 'react-icons/fa';
import {FaRegFolderOpen as IconExpanded} from 'react-icons/fa';
import {FaICursor as IconEditName} from 'react-icons/fa';
import {FaPowerOff as IconOn} from 'react-icons/fa';
import {FaThermometerHalf as IconTemperature} from 'react-icons/fa';
import {FaLongArrowAltUp as IconUp} from 'react-icons/fa';
import {FaLongArrowAltDown as IconDown} from 'react-icons/fa';
import {FaPercentage as IconPercentage} from 'react-icons/fa';
import {FaPalette as IconColor} from 'react-icons/fa';
import {FaLightbulb as IconBulb} from 'react-icons/fa';
import {FaLockOpen as IconLock} from 'react-icons/fa';
import {FaThermometer as IconThermometer} from 'react-icons/fa';

import I18n from '@iobroker/adapter-react/i18n';
import MessageDialog from '@iobroker/adapter-react/Dialogs/Message';
import SmartDetector from '../Devices/SmartDetector';
import DialogEdit from '../Dialogs/DialogEditDevice';
import DialogNew from '../Dialogs/DialogNewDevice';
import DialogConfirm from '@iobroker/adapter-react/Dialogs/Confirm';
import SmartGeneric from '../Devices/SmartGeneric';
import Router from '@iobroker/adapter-react/Components/Router';
import Utils from '@iobroker/adapter-react/Components/Utils';
import DialogEditProperties from '../Dialogs/DialogEditProperties';
import {Types} from 'iobroker.type-detector';

import TypeIconBlinds from '../icons/Jalousie';
import TypeIconButton from '../icons/PushButton';
import {GoDeviceCameraVideo as TypeIconCamera} from 'react-icons/go';
import {FaExternalLinkSquareAlt as TypeIconURL} from 'react-icons/fa';
import {FaImage as TypeIconImage} from 'react-icons/fa';
import {FaRegLightbulb as TypeIconDimmer} from 'react-icons/fa';
import TypeIconDoor from '../icons/DoorOpened';
import TypeIconFireAlarm from '../icons/FireOn';
import TypeIconFloodAlarm from '../icons/FloodOn';
import TypeIconGate from '../icons/Gate';
import TypeIconHumidity from '../icons/Humidity';
import {FaInfoCircle as TypeIconInfo} from 'react-icons/fa';
import {FaLightbulb as TypeIconLight} from 'react-icons/fa';
import {FaLock as TypeIconLock} from 'react-icons/fa';
import {FaStreetView as TypeIconLocation} from 'react-icons/fa';
import {FaStepForward as TypeIconMedia} from 'react-icons/fa';
import TypeIconMotion from '../icons/MotionOn';

import TypeIconRGB from '../icons/RGB';
import {MdFormatColorFill as TypeIconCT} from 'react-icons/md';
import TypeIconRGBSingle from '../icons/RGB';
import {MdFormatColorFill as TypeIconHUE} from 'react-icons/md';

import {FaSlidersH as TypeIconSlider} from 'react-icons/fa';
import TypeIconSocket from '../icons/Socket';
import TypeIconTemperature from '../icons/Thermometer';
import TypeIconThermostat from '../icons/Thermostat';
import TypeIconValve from '../icons/HeatValve';
import {FaVolumeDown as TypeIconVolume} from 'react-icons/fa';
import {FaVolumeUp as TypeIconVolumeGroup} from 'react-icons/fa';
import TypeIconWindow from '../icons/WindowOpened';
import TypeIconWindowTilt from '../icons/WindowTilted';
import {WiCloudy as TypeIconWeather} from 'react-icons/wi';
import {MdWarning as TypeIconWarning} from 'react-icons/md';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';

const actionsMapping = {
    turnOn: {color: colorOn, icon: IconOn, desc: 'Turn on'},
    turnOff: {color: colorOff, icon: IconOn, desc: 'Turn off'},

    setTargetTemperature: {color: colorSet, icon: IconTemperature, desc: 'Set target temperature'},
    incrementTargetTemperature: {color: colorOn, icon: IconUp, desc: 'Increment target temperature'},
    decrementTargetTemperature: {color: colorOff, icon: IconDown, desc: 'Decrement target temperature'},

    setPercentage: {color: colorSet, icon: IconPercentage, desc: 'Set percentage'},
    incrementPercentage: {color: colorOn, icon: IconUp, desc: 'Increment percentage'},
    decrementPercentage: {color: colorOff, icon: IconDown, desc: 'Decrement percentage'},

    setColor: {color: colorSet, icon: IconColor, desc: 'Set color'},

    setColorTemperature: {color: colorSet, icon: IconBulb, desc: 'Set color temperature'},
    incrementColorTemperature: {color: colorOn, icon: IconUp, desc: 'Increment color temperature'},
    decrementColorTemperature: {color: colorOff, icon: IconDown, desc: 'Decrement color temperature'},

    getTargetTemperature: {color: colorRead, icon: IconThermometer, desc: 'Get target temperature'},
    getTemperatureReading: {color: colorRead, icon: IconThermometer, desc: 'Get actual temperature'},

    setLockState: {color: colorSet, icon: IconLock, desc: 'Set lock state'},
    getLockState: {color: colorRead, icon: IconLock, desc: 'Read lock state'},
};

const TYPES_MAPPING = {
    button: 'boolean',
    value: 'number',
    level: 'number',
    indicator: 'boolean',
    action: 'boolean'
};

const WIDTHS = [
    1100,
    920,
    800,
    710,
    600,
    500
];

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
        margin: 0
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
    devLineNumber:{
        display: 'inline-block',
        verticalAlign: 'middle',
        width: 15,
    },
    editedId: {
        fontStyle: 'italic'
    },
    enumLineSubName:{
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
    devSubSubLineName:  {
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
        height: 'calc(100% - 50px)',
        overflowX: 'hidden',
        overflowY: 'auto',
    },
    tableLine: {
        //cursor: 'pointer',
        height: 50,
        '&:hover': {
            background: theme.palette.secondary.main,
            color: '#ffffff !important'
        }
    },
    tableIcon: {
        width: 40,
        height: 40,
        display: 'inline-block',
        padding: 2,
        background: '#e0e0e0',
        borderRadius: 3,
        '& img': {
            height: 32,
            width: 32,
            marginLeft: 4,
            verticalAlign: 'middle',
        }
    },
    tableNameCell: {
        whiteSpace: 'nowrap',
        width: 150,
        textOverflow: 'ellipsis',
    },
    tableIdCell: {
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        maxWidth: 150,
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
        width: 90,
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
    }
});

const typesIcons = {
    [Types.blind]: TypeIconBlinds,
    [Types.button]: TypeIconButton,
    [Types.camera]: TypeIconCamera,
    [Types.url]: TypeIconURL,
    [Types.image]: TypeIconImage,
    [Types.dimmer]: TypeIconDimmer,
    [Types.door]: TypeIconDoor,
    [Types.fireAlarm]: TypeIconFireAlarm,
    [Types.floodAlarm]: TypeIconFloodAlarm,
    [Types.gate]: TypeIconGate,
    [Types.humidity]: TypeIconHumidity,
    [Types.info]: TypeIconInfo,
    [Types.light]: TypeIconLight,
    [Types.lock]: TypeIconLock,
    [Types.location]: TypeIconLocation,
    [Types.media]: TypeIconMedia,
    [Types.motion]: TypeIconMotion,
    [Types.rgb]: TypeIconRGB,
    [Types.ct]: TypeIconCT,
    [Types.rgbSingle]: TypeIconRGBSingle,
    [Types.hue]: TypeIconHUE,
    [Types.slider]: TypeIconSlider,
    [Types.socket]: TypeIconSocket,
    [Types.temperature]: TypeIconTemperature,
    [Types.thermostat]: TypeIconThermostat,
    [Types.valve]: TypeIconValve,
    [Types.volume]: TypeIconVolume,
    [Types.volumeGroup]: TypeIconVolumeGroup,
    [Types.window]: TypeIconWindow,
    [Types.windowTilt]: TypeIconWindowTilt,
    [Types.weatherCurrent]: TypeIconWeather,
    [Types.weatherForecast]: TypeIconWeather,
    [Types.warning]: TypeIconWarning,
};

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

        this.state = {
            editIndex: location.dialog === 'edit' ? location.id : null,
            editPropIndex: location.dialog === 'props' ? location.id : null,
            deleteIndex: null,
            deleteId: '',

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
            onlyAliases: window.localStorage.getItem('Devices.onlyAliases') === 'true',
        };

        this.filter = window.localStorage.getItem('Devices.filter') || '';

        this.timerChanged = null;

        this.waitForUpdateID = null;

        this.objects = {};
        this.states = {};

        this.subscribes = {};
        this.onUpdateBound = this.onUpdate.bind(this);

        this.detector = new SmartDetector();
        this.patterns = this.detector.getPatterns();

        // read if linkeddevices installed
        this.props.socket.getAdapterInstances('linkeddevices')
            .catch(e => [])
            .then(list => {
                if (list && list.length && list[0] && list[0]._id) {
                    this.setState({linkeddevices: list[0]._id.replace('system.adapter.', '') || ''})
                }

                this.detectDevices();
            });

        this.onReiseBound = this.onResize.bind(this);
    }

    componentDidMount() {
        window.addEventListener('resize', this.onReiseBound);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onReiseBound);
    }

    onResize() {
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.resizeTimer = null;
            this.setState({windowWidth: window.innerWidth});
        }, 300);
    }

    detectDevices() {
        // read objects
        this.setState({browse: true});

        this.props.socket.getObjects(true)
            .then(objects => {
                this.objects = objects;
                // read enums
                return this.props.socket.getEnums();
            })
            .then(enums => {
                const idsInEnums = [];
                this.enumIDs = Object.keys(enums).sort();

                // collect all IDs in all enums
                this.enumIDs.forEach(en => {
                    const e = enums[en];
                    e.common && e.common.members && e.common.members.forEach(id =>
                        idsInEnums.indexOf(id) === -1 && idsInEnums.push(id));
                });

                // List all devices in aliases
                const keys = Object.keys(this.objects).sort();
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i] < 'alias.') continue;
                    if (keys[i] > 'linkeddevices.\u9999') break;

                    if ((keys[i].startsWith('alias.') || keys[i].startsWith('linkeddevices.')) && this.objects[keys[i]] && idsInEnums.indexOf(keys[i]) === -1) {
                        if (this.objects[keys[i]].type === 'device') {
                            idsInEnums.push(keys[i]);
                        } else if (this.objects[keys[i]].type === 'channel') {
                            const parts = keys[i].split('.');
                            parts.pop();

                            const parentId = parts.join('.');
                            // if parent was not yet included
                            if (!this.objects[parentId] || idsInEnums.indexOf(parentId) === -1) {
                                idsInEnums.push(keys[i]);
                            }
                        }
                    }
                }

                idsInEnums.sort();

                const _usedIdsOptional  = [];
                const devices = [];
                idsInEnums.forEach(id => {
                    const result = this.detector.detect({id, objects: this.objects, _usedIdsOptional, _keysOptional: keys});
                    result && result.forEach(device => devices.push(device));
                });

                const funcEnums = this.enumIDs.filter(id => id.startsWith('enum.functions.'));
                const roomsEnums = this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

                // find channelID for every device
                devices.forEach(device => this.updateEnumsForOneDevice(device, funcEnums, roomsEnums));

                this.setState({devices, loading: false, browse: false});
            });
    }

    updateEnumsForOneDevice(device, funcEnums, roomsEnums) {
        funcEnums = funcEnums || this.enumIDs.filter(id => id.startsWith('enum.functions.'));
        roomsEnums = roomsEnums || this.enumIDs.filter(id => id.startsWith('enum.rooms.'));

        const stateId = device.states.find(state => state.id).id;
        let statesCount = device.states.filter(state => state.id).length;
        const pos = stateId.lastIndexOf('.');
        let channelId = stateId;
        if (pos !== -1 && (statesCount > 1 || channelId.startsWith('alias.') || channelId.startsWith('linkeddevices.'))) {
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
                (obj.common.members.indexOf(device.channelId) !== -1 ||
                    obj.common.members.indexOf(device.mainStateId) !== -1);
        });

        const rooms = roomsEnums.filter(id => {
            const obj = this.objects[id];
            return obj &&
                obj.common &&
                obj.common.members &&
                (obj.common.members.indexOf(device.channelId) !== -1 ||
                    obj.common.members.indexOf(device.mainStateId) !== -1);
        });

        device.functions = functions;
        device.functionsNames = functions.map(id => Utils.getObjectNameFromObj(this.objects[id], null, {language: I18n.getLanguage()})).join(', ');
        device.rooms = rooms;
        device.roomsNames = rooms.map(id => Utils.getObjectNameFromObj(this.objects[id], null, {language: I18n.getLanguage()})).join(', ');
        device.name = SmartGeneric.getObjectName(this.objects, device.channelId, null, null, this.enumIDs);

        device.icon = Utils.getObjectIcon(device.channelId, this.objects[device.channelId]);
        if (!device.icon) {
            const parts = device.channelId.split('.');
            parts.pop();
            const deviceId = parts.join('.');

            if (this.objects[deviceId] && (this.objects[deviceId].type === 'channel' || this.objects[deviceId].type === 'device')) {
                device.icon = Utils.getObjectIcon(deviceId, this.objects[deviceId]);
            }
        }
    }

    addChanged(id, cb) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        if (changed.indexOf(id) === -1) {
            changed.push(id);
            this.setState({changed}, () => cb && cb());
        } else {
            cb && cb();
        }
    }

    removeChanged(id) {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        const pos = changed.indexOf(id);

        if (pos !== -1) {
            changed.splice(pos, 1);
            this.setState({changed});
        }
    }

    renderMessage() {
        if (this.state.message) {
            return (<MessageDialog text={this.state.message} onClose={() => this.setState({message: ''})}/>);
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
    onCollectIds(elem, ids, isMount) {
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
                    oldIDs.push({id, elem});
                }
                this.subscribes[id] = this.subscribes[id] || [];
                this.subscribes[id].push(elem);
            });
            if (newIDs.length) {
                newIDs.forEach(id => this.props.socket.subscribeState(id, this.onUpdateBound));
            }
            if (oldIDs.length) {
                setTimeout(() => oldIDs.forEach(item => this.states[item.id] && elem.updateState(item.id, this.states[item.id])), 0);
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
    }

    onEdit(editIndex, e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        Router.doNavigate('list', 'edit', editIndex.toString());
        this.setState({editIndex});
    }

    onEditProps(editPropIndex, e) {
        e && e.preventDefault();
        e && e.stopPropagation();
        Router.doNavigate('list', 'props', editPropIndex.toString());
        this.setState({editPropIndex});
    }

    isFilteredOut(device) {
        if (this.filter &&
            device.channelId.toLowerCase().indexOf(this.filter) === -1 &&
            device.name.toLowerCase().indexOf(this.filter) === -1) {
            return true;
        }

        return this.state.onlyAliases && !device.channelId.startsWith('alias.') && !device.channelId.startsWith('linkeddevices.');
    }

    renderDevice(key, index, device) {
        device = device || this.state.devices[index];

        const classes = this.props.classes;
        const background = this.objects[device.channelId] && this.objects[device.channelId].common && this.objects[device.channelId].common.color;
        const color = Utils.isUseBright(background, this.props.theme === 'dark') ? '#FFF' : '#000';

        let j = 0;
        const Icon = device.icon ? null : typesIcons[device.type] || null;

        return (<TableRow
            key={key}
            className={classes.tableLine} padding="default" style={{background, color}}>
            <TableCell className={classes.tableExpandIconCell}/>
            <TableCell className={classes.tableIconCell}>
                <div className={classes.tableIcon}>{device.icon ? <img src={device.icon} alt=""/> : Icon && (<Icon style={{marginTop: 4, marginLeft: 4, width: 32, height: 32, color: '#FFF'}}/>)}</div>
            </TableCell>
            <TableCell className={classes.tableNameCell}>{device.name}</TableCell>
            <TableCell>
                <Fab style={{float: 'right'}} size="small" aria-label="Edit" title={I18n.t('Edit name and other properties')} onClick={e => this.onEditProps(index, e)}><IconEditName /></Fab>
            </TableCell>
            {this.state.windowWidth >= WIDTHS[4] ? (<TableCell className={classes.tableIdCell}>{device.channelId}</TableCell>) : null}
            {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell>{device.functionsNames}</TableCell>) : null}
            {this.state.orderBy !== 'rooms'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell>{device.roomsNames}</TableCell>) : null}
            {this.state.orderBy !== 'types'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell>{device.type}</TableCell>) : null}
            {this.state.windowWidth >= WIDTHS[0] ? (<TableCell>{device.usedStates}</TableCell>) : null}
            <TableCell className={classes.buttonsCell}>
                <Fab size="small" aria-label="Edit" title={I18n.t('Edit states')} onClick={e => this.onEdit(index, e)}><IconEdit /></Fab>
                {device.channelId.startsWith('alias.') || device.channelId.startsWith('linkeddevices.') ?
                    (<Fab size="small" style={{marginLeft: 5}} aria-label="Delete" title={I18n.t('Delete device with all states')} onClick={e => {
                        e.stopPropagation();
                        this.setState({deleteIndex: index});
                    }}><IconDelete /></Fab>) :
                    null}
            </TableCell>
        </TableRow>);
    }

    renderDevices() {
        const result = [];
        const classes = this.props.classes;

        if (this.state.orderBy === 'functions' || this.state.orderBy === 'rooms') {
            const enums = [];
            for (let i = 0; i < this.enumIDs.length; i++) {
                const id = this.enumIDs[i];
                if (id.startsWith('enum.' + this.state.orderBy + '.')) {
                    enums.push(id);

                    // find any device for this function
                    if (this.state.devices.find(device => !this.isFilteredOut(device) && device[this.state.orderBy].indexOf(id) !== -1)) {
                        const isExpanded = this.state.expanded.indexOf(id) !== -1;
                        const icon = Utils.getObjectIcon(id, this.objects[id]);

                        let j = 0;
                        // add group
                        result.push(
                            (<TableRow
                                key={id}
                                className={classes.tableGroup}
                                onClick={() => this.onToggle(id)}
                                padding="none">
                                <TableCell className={classes.tableExpandIconCell}>{isExpanded ? ((<IconExpanded className={classes.tableExpandIcon}/>)) : ((<IconCollapsed className={classes.tableExpandIcon}/>))}</TableCell>
                                <TableCell className={classes.tableIconCell}>{icon ? (<img src={icon} alt="" className={classes.tableGroupIcon}/>) : null}</TableCell>
                                <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{Utils.getObjectNameFromObj(this.objects[id], null, {language: I18n.getLanguage()})}</TableCell>
                                <TableCell/>
                                {this.state.windowWidth >= WIDTHS[4] ? (<TableCell/>) : null}
                                {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                                {this.state.orderBy !== 'rooms'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                                {this.state.orderBy !== 'types'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                                {this.state.windowWidth >= WIDTHS[0] ? (<TableCell/>) : null}
                                <TableCell className={classes.buttonsCellHeader}/>
                            </TableRow>)
                        );

                        if (isExpanded) {
                            const devices = [];

                            this.state.devices.forEach((device, i) =>
                                device[this.state.orderBy].indexOf(id) !== -1 && !this.isFilteredOut(device) && devices.push(this.renderDevice(id + '_' + i, i, device)));

                            result.push(devices);
                        }
                    }
                }
            }

            // No group
            if (this.state.devices.find(device => !this.isFilteredOut(device) && !enums.find(id => device[this.state.orderBy].indexOf(id) !== -1))) {
                let j = 0;
                const isExpanded = this.state.expanded.indexOf('no_group') !== -1;
                // add group
                result.push((<TableRow
                    key="no_group"
                    className={classes.tableGroup}
                    onClick={() => this.onToggle('no_group')}
                    padding="none">
                    <TableCell className={classes.tableExpandIconCell}>{isExpanded ? ((<IconExpanded className={classes.tableExpandIcon}/>)) : ((<IconCollapsed className={classes.tableExpandIcon}/>))}</TableCell>
                    <TableCell className={classes.tableIconCell}/>
                    <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{I18n.t('no_group')}</TableCell>
                    <TableCell/>
                    {this.state.windowWidth >= WIDTHS[4] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'rooms'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'types'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.windowWidth >= WIDTHS[0] ? (<TableCell/>) : null}
                    <TableCell className={classes.buttonsCellHeader}/>
                </TableRow>));

                if (isExpanded) {
                    const devices = [];
                    this.state.devices.forEach((device, i) =>
                        !this.isFilteredOut(device) && !enums.find(id => device[this.state.orderBy].indexOf(id) !== -1) && devices.push(this.renderDevice('no_group_' + i, i, device)));

                    result.push(devices);
                }
            }
        } else
        if (this.state.orderBy === 'types') {
            const types = [];
            this.state.devices.forEach(device => !this.isFilteredOut(device) && types.indexOf(device.type) === -1 && types.push(device.type));
            types.sort();

            types.forEach(type => {
                const isExpanded = this.state.expanded.indexOf(type) !== -1;
                let j = 0;
                const Icon = typesIcons[type];
                // add group
                result.push((<TableRow
                    key={type}
                    className={classes.tableGroup}
                    onClick={() => this.onToggle(type)}
                    padding="default">
                    <TableCell className={classes.tableExpandIconCell}>{isExpanded ? ((<IconExpanded className={classes.tableExpandIcon}/>)) : ((<IconCollapsed className={classes.tableExpandIcon}/>))}</TableCell>
                    <TableCell className={classes.tableIconCell}><Icon style={{marginTop: 4, width: 32, height: 32, color: '#FFF'}}/></TableCell>
                    <TableCell className={classes.tableGroupCell + ' ' + classes.tableNameCell}>{I18n.t('type-' + type)}</TableCell>
                    <TableCell/>
                    {this.state.windowWidth >= WIDTHS[4] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'rooms'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.orderBy !== 'types'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell/>) : null}
                    {this.state.windowWidth >= WIDTHS[0] ? (<TableCell/>) : null}
                    <TableCell className={classes.buttonsCellHeader}/>
                </TableRow>));

                if (isExpanded) {
                    // find all devices for this type
                    const devices = [];
                    this.state.devices.forEach((device, i) =>
                        !this.isFilteredOut(device) && device.type === type && devices.push(this.renderDevice('type_' + i, i, device)));

                    result.push(devices);
                }
            });
        } else {
            for (let i = 0; i < this.state.devices.length; i++) {
                if (!this.isFilteredOut(this.state.devices[i])) {
                    result.push(this.renderDevice('dev_' + i, i, this.state.devices[i]));
                }
            }
        }

        let j = 0;

        return (<Paper className={classes.paperTable}>
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell className={classes.tableExpandIconCell}/>
                        <TableCell className={classes.tableIconCell}/>
                        <TableCell className={classes.headerCell + ' ' + classes.tableNameCell}>Name</TableCell>
                        <TableCell/>
                        {this.state.windowWidth >= WIDTHS[4] ? (<TableCell className={classes.headerCell}>ID</TableCell>) : null}
                        {this.state.orderBy !== 'functions' && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell className={classes.headerCell}>Function</TableCell>) : null}
                        {this.state.orderBy !== 'rooms'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell className={classes.headerCell}>Room</TableCell>) : null}
                        {this.state.orderBy !== 'types'     && this.state.windowWidth >= WIDTHS[1 + j++] ? (<TableCell className={classes.headerCell}>Type</TableCell>) : null}
                        {this.state.windowWidth >= WIDTHS[0] ? (<TableCell className={classes.headerCell}>States</TableCell>) : null}
                        <TableCell className={classes.headerCell + ' ' + classes.buttonsCellHeader}/>
                    </TableRow>
                </TableHead>
                <TableBody>{result}</TableBody>
            </Table>
        </Paper>);

        //return (<div key="listDevices" className={classes.columnDiv}>{result}</div>);
    }

    onExpand(group) {
        if (this.state.expanded.indexOf(group) === -1) {
            const expanded = JSON.parse(JSON.stringify(this.state.expanded));
            expanded.push(group);
            window.localStorage.setItem('Devices.expanded', JSON.stringify(expanded));
            this.setState({expanded});
        }
    }

    onCollapse(group) {
        const pos = this.state.expanded.indexOf(group);
        if (pos !== -1) {
            const expanded = JSON.parse(JSON.stringify(this.state.expanded));
            expanded.splice(pos, 1);
            window.localStorage.setItem('Devices.expanded', JSON.stringify(expanded));
            this.setState({expanded});
        }
    }

    onToggle(group) {
        if (this.state.expanded.indexOf(group) === -1) {
            this.onExpand(group);
        } else {
            this.onCollapse(group);
        }
    }

    renderEditDialog() {
        if (this.state.editIndex === null) return null;

        if (!this.state.devices[this.state.editIndex]) {
            window.alert('Device not found');
            Router.doNavigate(null, '', '');
            return this.setState({editIndex: null});
        }

        return (<DialogEdit
            channelInfo={this.state.devices[this.state.editIndex]}
            objects={this.objects}
            states={this.states}
            patterns={this.patterns}
            enumIDs={this.enumIDs}
            socket={this.props.socket}
            onClose={data => {
                const promises = [];
                if (data) {
                    const device = this.state.devices[this.state.editIndex];
                    const channelId = device.channelId;
                    const oldName = Utils.getObjectNameFromObj(this.objects[channelId], null, {language: I18n.getLanguage()});

                    if (this.objects[channelId] && this.objects[channelId].common &&
                        (oldName !== data.name ||
                         (this.objects[channelId].common.color || '') !== data.color ||
                         (this.objects[channelId].common.icon  || '') !== data.icon)
                    ) {
                        // update channel
                        promises.push(
                            this.props.socket.getObject(channelId)
                                .then(obj => {
                                    obj = obj || {};
                                    obj.common = obj.common || {};
                                    if (typeof obj.common.name !== 'object') {
                                        obj.common.name = {[I18n.getLanguage()]: obj.common.name || ''};
                                    }
                                    obj.common.name[I18n.getLanguage()] = data.name;
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
                                    this.objects[channelId] = obj;

                                    return this.props.socket.setObject(obj._id, obj);
                                }));
                    }

                    this.enumIDs.forEach(id => {
                        const members = (this.objects[id] && this.objects[id].common && this.objects[id].common.members) || [];
                        // if this channel is in enum
                        if (id.startsWith('enum.functions.')) {
                            if (data.functions.indexOf(id) !== -1) {
                                if (members.indexOf(channelId) === -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                obj.common.members.push(channelId);
                                                obj.common.members.sort();
                                                return this.props.socket.setObject(obj._id, obj);
                                            }));
                                }
                            } else {
                                if (members.indexOf(channelId) !== -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                const pos = obj.common.members.indexOf(channelId);
                                                if (pos !== -1) {
                                                    obj.common.members.splice(pos, 1);
                                                    obj.common.members.push(channelId);
                                                    obj.common.members.sort();
                                                    return this.props.socket.setObject(obj._id, obj);
                                                }
                                                return Promise.resolve();
                                            }));
                                }
                            }
                        }

                        if (id.startsWith('enum.rooms.')) {
                            if (data.rooms.indexOf(id) !== -1) {
                                if (members.indexOf(channelId) === -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                obj.common.members.push(channelId);
                                                obj.common.members.sort();
                                                return this.props.socket.setObject(obj._id, obj);
                                            }));
                                }
                            } else {
                                if (members.indexOf(channelId) !== -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                const pos = obj.common.members.indexOf(channelId);
                                                if (pos !== -1) {
                                                    obj.common.members.splice(pos, 1);
                                                    obj.common.members.push(channelId);
                                                    obj.common.members.sort();
                                                    return this.props.socket.setObject(obj._id, obj);
                                                }
                                                return Promise.resolve();
                                            }));
                                }
                            }
                        }
                    });

                    device.states.forEach(state => {
                        const obj = this.objects[state.id];
                        if (state.id && obj && obj.common && obj.common.alias) {
                            if (data.ids[state.name] !== obj.common.alias.id ||
                                obj.common.alias.read  !== data.fx[state.name].read ||
                                obj.common.alias.write !== data.fx[state.name].write) {
                                // update alias ID
                                if (!state.required && !data.ids[state.name]) {
                                    // delete state
                                    delete this.objects[state.id];
                                    promises.push(this.props.socket.delObject(state.id));
                                } else {
                                    // update state
                                    promises.push(
                                        this.props.socket.getObject(state.id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.alias = obj.common.alias || {};
                                                obj.common.alias.id = data.ids[state.name];
                                                if (!data.fx[state.name].read) {
                                                    delete obj.common.alias.read;
                                                } else {
                                                    obj.common.alias.read = data.fx[state.name].read;
                                                }
                                                if (!data.fx[state.name].write) {
                                                    delete obj.common.alias.write;
                                                } else {
                                                    obj.common.alias.write = data.fx[state.name].write;
                                                }
                                                obj.common.alias.id = data.ids[state.name];
                                                return this.props.socket.setObject(obj._id, obj);
                                            }));
                                }
                            } // else nothing changed
                        } else if (data.ids[state.name]) {
                            state.id = state.id || (channelId + '.' + state.name);

                            // Object not yet exists or invalid
                            promises.push(
                                this.props.socket.getObject(state.id)
                                    .catch(err => null)
                                    .then(obj => {
                                        obj = obj || {};
                                        obj._id = state.id;
                                        obj.native = obj.native || {};
                                        obj.type = 'state';
                                        obj.common = obj.common || {};
                                        const common = obj.common;
                                        common.alias = common.alias || {};
                                        common.alias.id = data.ids[state.name];
                                        common.name = common.name || state.name;
                                        common.role = state.defaultRole;
                                        if (data.fx[state.name].read) {
                                            obj.common.alias.read = data.fx[state.name].read;
                                        }
                                        if (data.fx[state.name].write) {
                                            obj.common.alias.write = data.fx[state.name].write;
                                        }

                                        common.type = state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultRole.split('.')[0]] || 'state';

                                        if (state.min) {
                                            common.min = 0;
                                        }
                                        if (state.max) {
                                            common.min = 100;
                                        }
                                        if (state.unit) {
                                            common.unit = state.unit;
                                        }
                                        this.objects[obj._id] = obj;
                                        return this.props.socket.setObject(obj._id, obj);
                                    }));
                        }
                    });
                }

                const somethingChanged = !!promises.length;

                Promise.all(promises)
                    .then(() => {
                        if (somethingChanged) {
                            const devices = JSON.parse(JSON.stringify(this.state.devices));
                            // update enums, name
                            this.updateEnumsForOneDevice(devices[this.state.editIndex]);
                            this.setState({editIndex: null, devices});
                        } else {
                            this.setState({editIndex: null});
                        }
                    });

                Router.doNavigate(null, '', '');
            }}
        />);
    }

    renderEditPropDialog() {
        if (this.state.editPropIndex === null) return null;

        if (!this.state.devices[this.state.editPropIndex]) {
            window.alert('Device not found');
            Router.doNavigate(null, '', '');
            return this.setState({editPropIndex: null});
        }

        return (<DialogEditProperties
            channelId={this.state.devices[this.state.editPropIndex].channelId}
            type={this.state.devices[this.state.editPropIndex].type}
            objects={this.objects}
            patterns={this.patterns}
            enumIDs={this.enumIDs}
            socket={this.props.socket}
            onClose={data => {
                const promises = [];
                if (data) {
                    const device = this.state.devices[this.state.editPropIndex];
                    const channelId = device.channelId;
                    const oldName = Utils.getObjectNameFromObj(this.objects[channelId], null, {language: I18n.getLanguage()});

                    if (this.objects[channelId] && this.objects[channelId].common &&
                        (oldName !== data.name ||
                            (this.objects[channelId].common.color || '') !== data.color ||
                            (this.objects[channelId].common.icon  || '') !== data.icon)
                    ) {
                        // update channel
                        promises.push(
                            this.props.socket.getObject(channelId)
                                .then(obj => {
                                    obj = obj || {};
                                    obj.common = obj.common || {};
                                    if (typeof obj.common.name !== 'object') {
                                        obj.common.name = {[I18n.getLanguage()]: obj.common.name || ''};
                                    }
                                    obj.common.name[I18n.getLanguage()] = data.name;
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
                                    this.objects[channelId] = obj;

                                    return this.props.socket.setObject(obj._id, obj);
                                }));
                    }

                    this.enumIDs.forEach(id => {
                        const members = (this.objects[id] && this.objects[id].common && this.objects[id].common.members) || [];
                        // if this channel is in enum
                        if (id.startsWith('enum.functions.')) {
                            if (data.functions.indexOf(id) !== -1) {
                                if (members.indexOf(channelId) === -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                obj.common.members.push(channelId);
                                                obj.common.members.sort();
                                                return this.props.socket.setObject(obj._id, obj);
                                            }));
                                }
                            } else {
                                if (members.indexOf(channelId) !== -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                const pos = obj.common.members.indexOf(channelId);
                                                if (pos !== -1) {
                                                    obj.common.members.splice(pos, 1);
                                                    obj.common.members.push(channelId);
                                                    obj.common.members.sort();
                                                    return this.props.socket.setObject(obj._id, obj);
                                                }
                                                return Promise.resolve();
                                            }));
                                }
                            }
                        }

                        if (id.startsWith('enum.rooms.')) {
                            if (data.rooms.indexOf(id) !== -1) {
                                if (members.indexOf(channelId) === -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                obj.common.members.push(channelId);
                                                obj.common.members.sort();
                                                return this.props.socket.setObject(obj._id, obj);
                                            }));
                                }
                            } else {
                                if (members.indexOf(channelId) !== -1) {
                                    promises.push(
                                        this.props.socket.getObject(id)
                                            .then(obj => {
                                                this.objects[obj._id] = obj;
                                                obj.common = obj.common || {};
                                                obj.common.members = obj.common.members || [];
                                                const pos = obj.common.members.indexOf(channelId);
                                                if (pos !== -1) {
                                                    obj.common.members.splice(pos, 1);
                                                    obj.common.members.push(channelId);
                                                    obj.common.members.sort();
                                                    return this.props.socket.setObject(obj._id, obj);
                                                }
                                                return Promise.resolve();
                                            }));
                                }
                            }
                        }
                    });
                }

                const somethingChanged = !!promises.length;

                Promise.all(promises)
                    .then(() => {
                        if (somethingChanged) {
                            const devices = JSON.parse(JSON.stringify(this.state.devices));
                            // update enums, name
                            this.updateEnumsForOneDevice(devices[this.state.editPropIndex]);
                            this.setState({editPropIndex: null, devices});
                        } else {
                            this.setState({editPropIndex: null});
                        }
                    });

                Router.doNavigate(null, '', '');
            }}
        />);
    }

    deleteDevice(index, cb) {
        // remove each state from all enums
        // delete each state
        // remove channel from all enums
        // delete channel
        const device = this.state.devices[index];
        if (!device) return cb && cb();
        const promises = [];
        this.enumIDs.forEach(enumId => {
            if (this.objects[enumId] && this.objects[enumId].common && this.objects[enumId].common.members) {
                if (device.states.find(state => state.id && this.objects[enumId].common.members.includes(state.id)) ||
                    this.objects[enumId].common.members.includes(device.channelId)
                ) {
                    promises.push(this.props.socket.getObject(enumId)
                        .catch(err => null)
                        .then(obj => {
                            if (!obj || !obj.common || !obj.common.members) return;

                            const members = [];
                            obj.common.members.forEach(sid => {
                                if (!device.states.find(state => state.id === sid) && sid !== device.channelId) {
                                    members.push(sid);
                                }
                            });
                            if (JSON.stringify(members) !== JSON.stringify(obj.common.members)) {
                                obj.common.members = members;
                                this.objects[obj._id] = obj;
                                return this.props.socket.setObject(obj._id, obj);
                            }
                        }));
                }
            }
        });

        device.states.forEach(state => {
            if (state.id) {
                const id = state.id;
                promises.push(this.props.socket.delObject(id)
                    .catch(err => null)
                    .then(() => {
                        delete this.objects[id];
                        console.log(`${id} deleted`);
                    }));
            }
        });
        device.channelId && device.channelId !== device.mainStateId && promises.push(this.props.socket.delObject(device.channelId)
            .catch(err => null)
            .then(() => {
                delete this.objects[device.channelId];
                console.log(`${device.channelId} deleted`);
            }));

        Promise.all(promises)
            .then(() => {
                let devices = JSON.parse(JSON.stringify(this.state.devices));
                devices.splice(index, 1);
                this.setState({devices}, cb);
            });
    }

    createDevice(options) {
        const patterns = this.detector.getPatterns();
        let states = Object.keys(patterns).find(t => patterns[t].type === options.type);
        if (!states) {
            return this.setState({message: I18n.t('Unknown type!') + options.type});
        }
        states = patterns[states].states;
        const obj = {
            _id: options.id,
            common: {
                name: {[I18n.getLanguage()]: options.name},
                role: options.type,
            },
            native: {},
            type: 'channel'
        };

        this.objects[obj._id] = obj;
        // create channel
        this.props.socket.setObject(options.id, obj).then(() => {
            const promises = [];

            states.forEach(state => {
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
                    if (state.min) {
                        common.min = 0;
                    }
                    if (state.max) {
                        common.min = 100;
                    }
                    if (state.unit) {
                        common.unit = state.unit;
                    }
                    const obj = {
                        _id: options.id + '.' + state.name,
                        common,
                        native: {},
                        type: 'state'
                    };
                    this.objects[obj._id] = obj;
                    promises.push(this.props.socket.setObject(options.id + '.' + state.name, obj));
                }
            });

            Promise.all(promises)
                .then(() => {
                    const devices = JSON.parse(JSON.stringify(this.state.devices));
                    const result = this.detector.detect({id: options.id, objects: this.objects});

                    result && result.forEach(device => {
                        this.updateEnumsForOneDevice(device);
                        devices.push(device);
                    });
                    Router.doNavigate('list', 'edit', devices.length - 1);
                    this.setState({devices, editIndex: devices.length - 1});
                });
        });
    }

    renderAddDialog() {
        if (!this.state.showAddDialog) return null;
        return (<DialogNew
            theme={this.props.theme}
            objects={this.objects}
            prefix={this.state.showAddDialog}
            onClose={options => {
                this.setState({showAddDialog: ''});
                options && this.createDevice(options);
            }}
        />);
    }

    renderDeleteDialog() {
        if (this.state.deleteIndex === null) return;
        return (<DialogConfirm
            title={I18n.t('Please confirm...')}
            text={I18n.t('Device and all states will be deleted. Are you sure?')}
            onClose={result => {
                const index = this.state.deleteIndex;
                this.setState({deleteIndex: null}, () =>
                    result && this.deleteDevice(index))}
            }
        />);
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

    render() {
        if (this.state.loading) {
            return (<CircularProgress  key="alexaProgress" />);
        }
        const classes = this.props.classes;

        return (
            <div key="list" className={classes.tab}>
                <Fab size="small" color="secondary" aria-label="Add" title={I18n.t('Create new device with Aliases')} className={classes.button} onClick={() => this.setState({showAddDialog: 'alias.0'})}><IconAdd /></Fab>
                {this.state.linkeddevices ? (<Fab size="small" color="secondary" aria-label="Add" title={I18n.t('Create new device with LinkedDevices')} className={classes.button + ' ' + classes.buttonLinkedDevices} onClick={() => this.setState({showAddDialog: this.state.linkeddevices})}><IconAdd /></Fab>) : null}
                <Fab size="small" color="primary" aria-label="Refresh" className={classes.button}
                      onClick={() => this.detectDevices()} disabled={this.state.browse}>{this.state.browse ? (<CircularProgress size={20} />) : (<IconRefresh/>)}</Fab>
                <Fab size="small" aria-label="Filter aliases"
                     title={I18n.t('Show only aliases')}
                     style={this.state.onlyAliases ? {background: 'orange'} : {}}
                     className={classes.button}
                     onClick={() => {
                         window.localStorage.setItem('Devices.onlyAliases', this.state.onlyAliases ? 'false' : 'true');
                         this.setState({onlyAliases: !this.state.onlyAliases});
                     }}><IconStar/></Fab>
                <Select
                    className={classes.orderSelector}
                    value={this.state.orderBy}
                    onChange={e => {
                        this.setState({orderBy: e.target.value});
                        window.localStorage.setItem('Devices.orderBy', e.target.value);
                    }}
                    >
                    <MenuItem value='names'>{I18n.t('Names')}</MenuItem>
                    <MenuItem value='IDs'>{I18n.t('IDs')}</MenuItem>
                    <MenuItem value='functions'>{I18n.t('Functions')}</MenuItem>
                    <MenuItem value='rooms'>{I18n.t('Rooms')}</MenuItem>
                    <MenuItem value='types'>{I18n.t('Types')}</MenuItem>
                </Select>
                <Input
                    placeholder={I18n.t('Filter')}
                    className={classes.filter}
                    defaultValue={this.filter}
                    onChange={e => this.setFilter(e.target.value)}
                />
                <IconButton aria-label="Clear" className={classes.button} onClick={() => this.setFilter('')}><IconClear fontSize="large" /></IconButton>
                {this.renderDevices()}
                {this.renderMessage()}
                {this.renderEditDialog()}
                {this.renderEditPropDialog()}
                {this.renderAddDialog()}
                {this.renderDeleteDialog()}
            </div>
        );
    }
}

ListDevices.propTypes = {
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    theme: PropTypes.string,
};

export default withStyles(styles)(ListDevices);