import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import IconButton from '@material-ui/core/IconButton';
import Utils from '@iobroker/adapter-react/Components/Utils'
import Fab from '@material-ui/core/Fab';
import CircularProgress from '@material-ui/core/CircularProgress';
import Input from '@material-ui/core/Input';

import {MdAdd as IconAdd} from 'react-icons/md';
import {MdRefresh as IconRefresh} from 'react-icons/md';
import {MdClear as IconClear} from 'react-icons/md';
import {MdStar as IconStar} from 'react-icons/md';

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
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import SmartDetector from '../Devices/SmartDetector';
import SmartTile from '../Devices/SmartTile';
import DialogEdit from '../Dialogs/DialogEditDevice';
import DialogNew from '../Dialogs/DialogNewDevice';
import SmartGeneric from '../Devices/SmartGeneric';
import Router from '@iobroker/adapter-react/Components/Router';

const colorOn = '#aba613';
const colorOff = '#444';
const colorSet = '#00c6ff';
const colorRead = '#00bc00';
const CHANGED_COLOR = '#e7000040';
const DEFAULT_CHANNEL_COLOR = '#e9e9e9';
const LAST_CHANGED_COLOR = '#b4ffbe';

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


        this.state = {
            editIndex: location.dialog === 'edit' ? location.id : null,
            deleteId: '',

            showAddDialog: location.dialog === 'add',
            showConfirmation: '',
            changed: [],
            devices: [],
            message: '',
            loading: true,
            browse: false,
            expanded: [],
            lastChanged: '',
            onlyAliases: window.localStorage.getItem('Devices.onlyAliases') === 'true'
        };

        this.filter = window.localStorage.getItem('Devices.filter') || '';

        this.timerChanged = null;
        this.browseTimer = null;
        this.browseTimerCount = 0;
        this.editedSmartName = '';

        this.waitForUpdateID = null;


        this.objects = {};
        this.states = {};

        this.subscribes = {};
        this.onUpdateBound = this.onUpdate.bind(this);

        this.detector = new SmartDetector();
        this.patterns = this.detector.getPatterns();
        this.detectDevices();
    }

    detectDevices() {
        // read objects
        this.props.socket.getObjects()
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
                    if (e.common && e.common.members) {
                        e.common.members.forEach(id => {
                            if (idsInEnums.indexOf(id) === -1) {
                                idsInEnums.push(id);
                            }
                        });
                    }
                });

                // List all devices in aliases
                const keys = Object.keys(this.objects).sort();
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i] < 'alias.') continue;
                    if (keys[i] > 'alias.\u9999') break;
                    if (this.objects[keys[i]] && idsInEnums.indexOf(keys[i]) === -1) {
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

                this.setState({devices, loading: false});
            });
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

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return (<DialogSelectID
                key="dialogSelectID1"
                prefix={'../..'}
                connection={this.props.socket}
                selected={''}
                statesOnly={true}
                onClose={() => this.setState({showSelectId: false})}
                onOk={(selected, name) => {
                    this.setState({showSelectId: false});

                    this.props.socket.getObject(selected)
                        .then(obj => {
                            if (obj) {
                                const name = Utils.getObjectNameFromObj(obj, null, {language: I18n.getLanguage()});
                                Utils.updateSmartName(obj, (name || I18n.t('Device name')).replace(/[-_.]+/g, ' '), undefined, undefined, this.props.adapterName + '.' + this.props.instance, this.props.native.noCommon);
                                this.addChanged(obj._id);
                                this.waitForUpdateID = obj._id;

                                if (this.state.lastChanged !== obj._id) {
                                    this.setState({lastChanged: obj._id});
                                    this.timerChanged && clearTimeout(this.timerChanged);
                                    this.timerChanged = setTimeout(() => {
                                        this.setState({lastChanged: ''});
                                        this.timerChanged = null;
                                    }, 30000);
                                }

                                this.props.socket.setObject(obj._id, obj)
                                    .then(() => this.informInstance(obj._id))
                                    .catch(err => this.setState({message: err}));
                            } else {
                                this.setState({message: I18n.t('Invalid ID')});
                            }
                        });
                }}
            />);
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

    renderDevice(index) {
        if (this.filter) {
            const stateId = this.state.devices[index] && this.state.devices[index].states.find(state => state.id).id;
            if (stateId.toLowerCase().indexOf(this.filter) === -1) {
                const name = SmartGeneric.getObjectName(this.objects, stateId, null, null, this.enumIDs);
                if (name.toLowerCase().indexOf(this.filter) === -1) {
                    return null;
                }
            }
        }
        if (this.state.onlyAliases) {
            const stateId = this.state.devices[index].states.find(state => state.id).id;
            if (!stateId.startsWith('alias.')) {
                return null;
            }
        }

        return (<SmartTile
                key={'device' + index}
                objects={this.objects}
                states={this.states}
                channelInfo={this.state.devices[index]}
                onClick={e => this.onEdit(index, e)}
                editMode={false}
                enumNames={this.enumIDs}
                onCollectIds={(elem, ids, isMount) => this.onCollectIds(elem, ids, isMount)}
            />);
    }

    renderDevices() {
        const result = [];
        for (let i = 0; i < this.state.devices.length; i++) {
            result.push(this.renderDevice(i));
        }
        return (<div key="listDevices" className={this.props.classes.columnDiv}>{result}</div>);
    }

    renderEditDialog() {
        if (this.state.editIndex === null) return null;
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
                    const channelInfo = this.state.devices[this.state.editIndex];

                    const id = channelInfo.states.find(state => state.id).id;
                    const parts = id.split('.');
                    parts.pop();
                    const channelId = parts.join('.');

                    if (this.objects[channelId] && this.objects[channelId].common && this.objects[channelId].common.name !== data.name) {
                        // update channel
                        promises.push(
                            this.props.socket.getObject(channelId)
                                .then(obj => {
                                    obj = obj || {};
                                    obj.common = obj.common || {};
                                    obj.common.name = data.name;
                                    obj.common.role = channelInfo.type;
                                    obj.type = 'channel';
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

                    channelInfo.states.forEach(state => {
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

                                        common.type = state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultType.split('.')[0]] || 'state';

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

                Promise.all(promises)
                    .then(() => this.setState({editIndex: null}));

                Router.doNavigate(null, '', '');
            }}
        />);
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
                name: options.name,
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
                        type: state.type ? (typeof state.type === 'object' ? state.type[0] : state.type) : TYPES_MAPPING[state.defaultType.split('.')[0]] || 'state',
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
                    result && result.forEach(device => devices.push(device));
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
            onClose={options => {
                this.setState({showAddDialog: false});
                options && this.createDevice(options);
            }}
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

        return (
            <div key="list" className={this.props.classes.tab}>
                <Fab size="small" color="secondary" aria-label="Add" className={this.props.classes.button} onClick={() => this.setState({showAddDialog: true})}><IconAdd /></Fab>
                <Fab size="small" color="primary" aria-label="Refresh" className={this.props.classes.button}
                      onClick={() => this.browse(true)} disabled={this.state.browse}>{this.state.browse ? (<CircularProgress size={20} />) : (<IconRefresh/>)}</Fab>
                <Fab size="small" aria-label="Filter aliases"
                     title={I18n.t('Show only aliases')}
                     style={this.state.onlyAliases ? {background: 'orange'} : {}}
                     className={this.props.classes.button}
                     onClick={() => {
                         window.localStorage.setItem('Devices.onlyAliases', this.state.onlyAliases ? 'false' : 'true');
                         this.setState({onlyAliases: !this.state.onlyAliases});
                     }}><IconStar/></Fab>

                <Input
                    placeholder={I18n.t('Filter')}
                    className={this.props.classes.filter}
                    defaultValue={this.filter}
                    onChange={e => this.setFilter(e.target.value)}
                />
                <IconButton aria-label="Clear" className={this.props.classes.button} onClick={() => this.setFilter('')}><IconClear fontSize="large" /></IconButton>
                {this.renderDevices()}
                {this.renderMessage()}
                {this.getSelectIdDialog()}
                {this.renderEditDialog()}
                {this.renderAddDialog()}
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