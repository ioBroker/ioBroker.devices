/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';

import {
    Button,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    TextField,
    AppBar,
    IconButton,
    LinearProgress,
    Paper,
    Tab,
    Tabs,
    Tooltip,
    Typography,
    Box,
} from '@mui/material';

import {
    Close as IconClose,
    Check as IconCheck,
    Delete as IconDelete,
    Add as IconAdd,
    Edit as IconEdit,
    OpenInNew as IconExtended,
    HelpOutline as IconHelpOutline,
    ImportExport as ImportExportIcon,
} from '@mui/icons-material';
import { AiOutlineEdit as IconEditStates } from 'react-icons/ai';

import { I18n, Utils, DialogSelectID, IconFx as IconFunction } from '@iobroker/adapter-react-v5';

import TypeIcon from '../Components/TypeIcon';
import { STATES_NAME_ICONS } from '../Components/TypeOptions';
import DialogEditProperties from './DialogEditProperties';
import DialogAddState from './DialogAddState';
import { getChannelItems } from '../Components/helpers/search';
import DialogEditStates from './DialogEditStates';

const styles = {
    header: {
        width: '100%',
        fontSize: 16,
        textTransform: 'capitalize',
        textAlign: 'center',
        paddingBottom: 20,
        color: '#000',
    },
    divOidField: {
        width: '100%',
        display: 'flex',
        alignItems: 'baseline',
        pt: '5px',
        pb: '5px',
        height: 69,
        '@media screen and (max-width: 450px)': {
            flexDirection: 'column',
        },
    },
    oidName: {
        minWidth: 100,
        display: 'block',
        flexDirection: 'column',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        mr: '8px',
        '@media screen and (max-width: 650px)': {
            fontSize: 12,
            minWidth: 60,
            marginTop: 0,
            maxWidth: 150,
            display: 'block',
            textOverflow: 'ellipsis',
        },
        '@media screen and (max-width: 450px)': {
            maxWidth: 'max-content',
        },
    },
    oidField: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
        width: '100%',
        '@media screen and (max-width: 650px)': {
            '& p': {
                fontSize: 7,
            },
            '& input': {
                fontSize: 11,
            },
        },
        '@media screen and (max-width: 450px)': {
            paddingTop: '0 !important',
        },
    },
    divOids: {
        display: 'inline-block',
        verticalAlign: 'top',
        width: '100%',
    },
    divIndicators: {
        display: 'inline-block',
        verticalAlign: 'top',
    },
    menuWrapperIcons: {
        display: 'flex',
    },
    divExtended: {
        width: 'calc(50% - 55px)',
    },
    divDialogContent: {
        fontSize: '1rem',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    buttonPen: {
        color: '#ffffff',
    },
    headerButtons: {
        textAlign: 'right',
    },
    headerButton: {
        float: 'right',
        marginLeft: 3,
    },
    enumIcon: {
        width: 24,
        height: 24,
    },
    funcDivEdit: {
        width: '100%',
    },
    funcEditName: {
        display: 'inline-block',
        width: 85,
    },
    funcEdit: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
        width: 'calc(100% - 85px)',
    },
    idEditName: {
        display: 'inline-block',
        width: 200,
    },
    idEdit: {
        width: 'calc(100% - 200px)',
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
    },
    icon: theme => ({
        color: theme.palette.mode === 'light' ? 'black' : 'white',
        display: 'inline-block',
        verticalAlign: 'middle',
        '@media screen and (max-width: 650px)': {
            '& svg': {
                width: 20,
                height: 20,
            },
            '& img': {
                width: 20,
                height: 20,
            },
        },
    }),
    deviceText: {
        verticalAlign: 'middle',
        '@media screen and (max-width: 650px)': {
            fontSize: 12,
        },
    },
    wrapperIconHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 900,
        marginTop: 5,
    },
    iconStyle: {
        marginRight: 7,
    },
    content: {
        paddingTop: 0,
    },
    wrapperItemButtons: {
        display: 'flex',
        margin: 'auto 0',
        marginLeft: 'auto',
        '@media screen and (max-width: 650px)': {
            marginLeft: 'auto',
        },
    },
    emptyButton: {
        width: 34,
        height: 34,
        '@media screen and (max-width: 650px)': {
            width: 24,
            height: 24,
        },
    },
    divOidFieldObj: {
        height: 140,
    },
    displayFlex: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
    },
    displayFlexRow: {
        display: 'flex',
    },
    stateSubCategory: {
        fontSize: 12,
        opacity: 0.6,
    },
    wrapperHeaderIndicators: {
        display: 'flex',
        padding: 30,
    },
    headerIndicatorsLine: {
        flexGrow: 1,
        borderTop: '1px solid #4dabf5',
        margin: '0 10px',
        marginTop: 11,
        opacity: 0.8,
    },
    headerIndicatorsName: {
        color: '#4dabf5',
        fontSize: 18,
    },
    wrapperOidName: {
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
    },
    wrapperOidNameIcon: {
        '@media screen and (max-width: 650px)': {
            '& svg': {
                width: 10,
                height: 10,
                marginTop: 0,
            },
            '& img': {
                width: 10,
                height: 10,
                marginTop: 0,
            },
        },
    },
    oidNameIcon: {
        marginRight: 3,
        width: 24,
        height: 24,
    },
    addedName: {
        color: '#e67e229e',
    },
    indicators: {
        color: '#4dabf5',
    },
    helperText: {
        opacity: 0.4,
    },
    titleHead: {
        '& h2': {
            textOverflow: 'ellipsis',
            overflow: 'hidden',
        },
    },
    deviceIconStyle: {
        marginTop: 4,
        marginLeft: 4,
        width: 32,
        height: 32,
    },
    wrapperButtonsAndOidField: {
        display: 'flex',
        flex: 1,
    },
    wrapperTabPanel: {
        padding: `10px 20px`,
        '@media screen and (max-width: 450px)': {
            padding: `10px 10px`,
        },
    },
    mobileWidth: {
        '@media screen and (max-width: 450px)': {
            margin: 0,
            width: 'calc(100% - 12px)',
            height: 'calc(100% - 12px)',
            maxHeight: 'calc(100% - 12px)',
        },
    },
    button: {
        height: 34,
        width: 34,
        '@media screen and (max-width: 650px)': {
            width: 24,
            height: 24,
        },
    },
};

// const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Paper
                    sx={styles.wrapperTabPanel}
                    p={3}
                >
                    <Typography component="div">{children}</Typography>
                </Paper>
            )}
        </div>
    );
}

class DialogEditDevice extends React.Component {
    constructor(props) {
        super(props);
        const ids = {};
        this.fx = {};
        const states = {};

        this.props.channelInfo.states.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj?.common?.alias) {
                    ids[state.name] = obj.common.alias.id || '';
                    this.fx[state.name] = {
                        read: obj.common.alias.read || '',
                        write: obj.common.alias.write || '',
                    };
                    if (obj.common.states) {
                        states[state.name] = JSON.parse(JSON.stringify(obj.common.states));
                    }
                } else {
                    this.fx[state.name] = { read: '', write: '' };
                }

                if (obj?.common?.custom) {
                    const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                    if (attr && attr.length && obj.common.custom[attr] && obj.common.custom[attr].parentId) {
                        ids[state.name] = obj.common.custom[attr].parentId;
                    }
                }

                if (state.defaultRole && state.defaultRole.startsWith('button')) {
                    delete this.fx[state.name].read;
                }
                if (
                    !state.write ||
                    (state.defaultRole &&
                        (state.defaultRole.startsWith('indicator') || state.defaultRole.startsWith('value')))
                ) {
                    delete this.fx[state.name].write;
                }
            } else {
                this.fx[state.name] = { read: '', write: '' };
            }
        });

        const { addedStates } = this.updateFx(this.getAddedChannelStates(), ids, states);

        this.channelId = this.props.channelInfo.channelId;
        let name = '';
        const channelObj = this.props.objects[this.channelId];

        if (channelObj?.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, { language: I18n.getLanguage() });
        }

        const indicatorsAvailable = !!this.props.channelInfo.states.filter(item => item.indicator).length;
        const indicatorsVisible =
            this.channelId.startsWith('alias.') ||
            this.channelId.startsWith('linkeddevices.') ||
            (indicatorsAvailable && !!this.props.channelInfo.states.filter(item => item.indicator && item.id).length);
        const extendedAvailable =
            indicatorsAvailable && (this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.'));

        this.state = {
            ids: ids,
            idsInit: JSON.parse(JSON.stringify(ids)),
            name,
            addedStates,
            showIndicators: indicatorsAvailable && window.localStorage.getItem('Devices.editExtended') === 'true',
            expertMode: true,
            selectIdFor: '',
            newState: false,
            selectIdPrefix: '',
            editFxFor: '',
            fxRead: '',
            fxReadOriginal: '',
            fxWrite: '',
            fxWriteOriginal: '',
            newChannelId: '',
            indicatorsVisible,
            newChannelError: false,
            startTheProcess: false,
            disabledButton: false,
            extendedAvailable,
            indicatorsAvailable,
            tab: localStorage.getItem('EditDevice.tab') ? JSON.parse(localStorage.getItem('EditDevice.tab')) || 0 : 0,
            initChangeProperties: {},
            changeProperties: {},
            editStates: null,
            states,
        };

        this.pattern =
            this.props.patterns[
                Object.keys(this.props.patterns).find(
                    type => this.props.patterns[type].type === this.props.channelInfo.type,
                )
            ];
    }

    renderEditStates() {
        if (!this.state.editStates) {
            return null;
        } else {
            return (
                <DialogEditStates
                    states={this.state.states[this.state.editStates]}
                    onClose={states => {
                        if (states) {
                            const name = this.state.editStates;
                            const newStates = JSON.parse(JSON.stringify(this.state.states));
                            newStates[name] = states;
                            let id;
                            if (this.state.ids[name]) {
                                id = this.state.ids[name];
                            } else {
                                const added = this.state.addedStates.find(item => item.name === name);
                                id = added.id;
                            }

                            this.setState({ editStates: null, states: newStates }, () =>
                                this.props.socket.getObject(id).then(obj => {
                                    obj.common.states = states;
                                    this.props.socket.setObject(obj._id, obj);
                                }),
                            );
                        } else {
                            this.setState({ editStates: null });
                        }
                    }}
                />
            );
        }
    }

    renderDialogAddState() {
        if (this.state.dialogAddState) {
            return (
                <DialogAddState
                    onClose={obj => {
                        if (
                            this.state.dialogAddState.onClose &&
                            obj &&
                            obj.common &&
                            obj.common.name !== this.state.dialogAddState.name
                        ) {
                            this.onDelete(this.state.dialogAddState.item.id);
                            const newIds = JSON.parse(JSON.stringify(this.state.ids));
                            const newValue = newIds[this.state.dialogAddState.name];
                            delete newIds[this.state.dialogAddState.name];
                            newIds[obj.common.name] = newValue;
                            this.setState({ ids: newIds, dialogAddState: null });
                        } else {
                            this.setState({ dialogAddState: null });
                        }
                    }}
                    editState={this.state.dialogAddState.editState}
                    objects={this.props.objects}
                    socket={this.props.socket}
                    channelId={this.channelId}
                    arrayStateDefault={this.props.channelInfo.states.filter(item => item.indicator && item.defaultRole)}
                />
            );
        }
        return null;
    }

    getAddedChannelStates() {
        const channelIds = getChannelItems(this.props.objects, this.props.channelInfo.channelId);

        // Add states, that could not be detected by type-detector
        return channelIds
            .filter(
                key =>
                    !this.props.channelInfo.states.find(item => item.id === key) &&
                    this.props.objects[key].type === 'state',
            )
            .map(key => {
                const objOriginal = this.props.objects[key];
                let name = objOriginal?.common?.name;
                if (name && typeof name === 'object') {
                    name = name[I18n.getLanguage()] || name.en;
                }
                return {
                    defaultRole: objOriginal?.common?.role,
                    id: objOriginal?._id,
                    noType: true,
                    name,
                    type: objOriginal?.common?.type,
                    write: objOriginal?.common?.write,
                    indicator: false,
                    required: false,
                    states: objOriginal?.common?.states
                        ? JSON.parse(JSON.stringify(objOriginal.common.states))
                        : undefined,
                };
            })
            .filter(
                item =>
                    !this.props.channelInfo.states.filter(item => item.defaultRole).find(el => el.name === item.name),
            );
    }

    updateFx(addedStates, ids, states) {
        const newIds = ids || JSON.parse(JSON.stringify(this.state.ids));
        const newStates = states || JSON.parse(JSON.stringify(this.state.states));

        addedStates.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj && obj.common && obj.common.alias) {
                    newIds[state.name] = obj.common.alias.id || '';
                    this.fx[state.name] = this.fx[state.name] || {
                        read: obj.common.alias.read || '',
                        write: obj.common.alias.write || '',
                    };
                } else {
                    this.fx[state.name] = this.fx[state.name] || { read: '', write: '' };
                }
                if (obj && obj.common && obj.common.custom) {
                    const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                    if (attr && attr.length && obj.common.custom[attr] && obj.common.custom[attr].parentId) {
                        newIds[state.name] = newIds[state.name] || obj.common.custom[attr].parentId;
                    }
                }

                if (state.defaultRole && state.defaultRole.startsWith('button')) {
                    delete this.fx[state.name].read;
                }
                if (
                    !state.write ||
                    (state.defaultRole &&
                        (state.defaultRole.startsWith('indicator') || state.defaultRole.startsWith('value')))
                ) {
                    delete this.fx[state.name].write;
                }
                if (state.states) {
                    newStates[state.name] = state.states;
                } else if (newStates[state.name]) {
                    delete newStates[state.name];
                }
            } else {
                this.fx[state.name] = this.fx[state.name] || { read: '', write: '' };
            }
        });

        return { addedStates, newIds, newStates };
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const addedStates = this.getAddedChannelStates();
        const newStates = JSON.parse(JSON.stringify(this.state.states));

        addedStates.forEach(state => {
            if (state.states) {
                newStates[state.name] = state.states;
            } else if (newStates[state.name]) {
                delete newStates[state.name];
            }
        });

        if (
            JSON.stringify(addedStates) !== JSON.stringify(this.state.addedStates) ||
            JSON.stringify(newStates) !== JSON.stringify(this.state.states)
        ) {
            const { newIds, newStates } = this.updateFx(addedStates);

            this.setState({ addedStates, ids: newIds, states: newStates });
        }
    }

    renderSelectDialog() {
        if (!this.state.selectIdFor && !this.state.newState) {
            return null;
        }
        const selected = this.state.selectIdPrefix
            ? this.state.ids[this.state.selectIdFor][this.state.selectIdPrefix]
            : this.state.ids[this.state.selectIdFor];
        return (
            <DialogSelectID
                theme={this.props.theme}
                key="selectDialog"
                imagePrefix="../.."
                socket={this.props.socket}
                dialogName="devicesEdit"
                title={
                    this.state.newState ? I18n.t('Importer state') : I18n.t('Select for "%s"', this.state.selectIdFor)
                }
                selected={selected || this.findRealDevice(this.state.selectIdPrefix)}
                statesOnly
                onOk={async id => {
                    const ids = JSON.parse(JSON.stringify(this.state.ids));
                    if (!this.state.newState) {
                        if (this.state.selectIdPrefix) {
                            ids[this.state.selectIdFor][this.state.selectIdPrefix] = id;
                        } else {
                            ids[this.state.selectIdFor] = id;
                        }
                    } else {
                        const isAlias = id.startsWith('alias.') || id.startsWith('linkeddevices.');
                        const obj = JSON.parse(JSON.stringify(this.props.objects[id]));
                        let parts = id.split('.');
                        parts = parts.pop();
                        obj._id = `${this.channelId}.${parts}`;
                        obj.native = {};
                        obj.common.name = parts;
                        if (!isAlias) {
                            obj.common.alias = { id };
                        }
                        await this.props.socket.setObject(`${this.channelId}.${parts}`, obj);
                        //const newObject = await this.props.socket.getObject(`${this.channelId}.${parts}`);
                        //this.props.objects[`${this.channelId}.${parts}`] = newObject;
                        //if (newObject.common) {
                        //    ids[newObject.common.name] = newObject?.common?.alias?.id;
                        //}
                    }
                    this.setState({ selectIdPrefix: '', selectIdFor: '', ids });
                }}
                onClose={() => this.setState({ selectIdFor: '', selectIdPrefix: '', newState: false })}
            />
        );
    }

    handleClose = () => {
        this.props.onClose && this.props.onClose(null);
    };

    updateNewState = async () => {
        const array = this.state.addedStates.filter(item => Object.keys(this.state.ids).includes(item.name));
        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            const stateObj = this.props.objects[item.id];
            stateObj.common = stateObj.common || {};
            stateObj.common.alias = stateObj.common.alias || {};
            stateObj.common.alias.id = this.state.ids[item.name];
            if (!this.fx[item.name].read) {
                delete stateObj.common.alias.read;
            } else {
                stateObj.common.alias.read = this.fx[item.name].read;
            }
            if (!this.fx[item.name].write) {
                delete stateObj.common.alias.write;
            } else {
                stateObj.common.alias.write = this.fx[item.name].write;
            }
            await this.props.socket.setObject(stateObj._id, stateObj);
        }
    };

    handleOk = async () => {
        this.setState({ startTheProcess: true });
        if (JSON.stringify(this.state.initChangeProperties) !== JSON.stringify(this.state.changeProperties)) {
            this.props.onSaveProperties && (await this.props.onSaveProperties(this.state.changeProperties));
        }
        await this.props.onClose({
            ids: this.state.ids,
            fx: this.fx,
            states: this.states,
        });
        await this.updateNewState();

        if (
            this.state.changeProperties.name &&
            this.state.initChangeProperties.name &&
            this.state.initChangeProperties.name !== this.state.changeProperties.name
        ) {
            let parts = this.channelId.split('.');
            parts.pop();
            parts = parts.join('.');
            parts = `${parts}.${this.state.changeProperties.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
            await this.props.onCopyDevice(this.channelId, parts);
        }
        this.setState({ startTheProcess: false });
    };

    showDeviceIcon() {
        return (
            <Box sx={styles.icon}>
                <TypeIcon
                    type={this.props.channelInfo.type}
                    style={{ ...styles.deviceIconStyle, color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000' }}
                />
            </Box>
        );
    }

    renderHeader() {
        const checkIndicators = this.props.channelInfo.states
            .filter(item => item.indicator && item.defaultRole)
            .find(obj => this.state.ids[obj.name]);

        return (
            <div style={styles.header}>
                <div style={{ ...styles.divOids, ...styles.headerButtons, ...styles.divExtended }} />
                <div style={styles.menuWrapperIcons}>
                    {this.state.indicatorsVisible && this.state.indicatorsAvailable && !this.state.startTheProcess && (
                        <Tooltip
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            title={I18n.t('Show hide indicators')}
                        >
                            <IconButton
                                style={{
                                    color: this.state.showIndicators ? '#4DABF5' : null,
                                    border: checkIndicators && !this.state.showIndicators ? '1px solid #4DABF5' : null,
                                }}
                                onClick={() => {
                                    window.localStorage.setItem(
                                        'Devices.editExtended',
                                        this.state.showIndicators ? 'false' : 'true',
                                    );
                                    this.setState({ showIndicators: !this.state.showIndicators });
                                }}
                            >
                                <IconExtended
                                    style={{ transform: !this.state.showIndicators ? 'rotate(180deg)' : '' }}
                                />
                            </IconButton>
                        </Tooltip>
                    )}
                    {this.state.extendedAvailable && !this.state.startTheProcess && (
                        <Tooltip
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            title={I18n.t('Add state')}
                        >
                            <IconButton
                                onClick={() =>
                                    this.setState({
                                        dialogAddState: {
                                            onClose: null,
                                            editState: null,
                                        },
                                    })
                                }
                            >
                                <IconAdd />
                            </IconButton>
                        </Tooltip>
                    )}
                    {this.state.extendedAvailable && !this.state.startTheProcess && (
                        <Tooltip
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            title={I18n.t('Import state')}
                        >
                            <IconButton
                                style={{ color: '#e67e229e' }}
                                onClick={() => this.setState({ newState: true })}
                            >
                                <IconAdd />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
        );
    }

    onDelete = async id => {
        await this.props.socket.delObject(id);
    };

    findRealDevice(prefix) {
        if (prefix) {
            return;
        }
        let realParent = Object.keys(this.state.ids).find(id => this.state.ids[id]);
        if (realParent) {
            realParent = this.state.ids[realParent];
            if (typeof realParent === 'string') {
                const parts = realParent.split('.');
                parts.pop();
                realParent = parts.join('.');
            } else if (typeof realParent === 'object') {
                realParent = Object.keys(realParent)[0];
                const parts = realParent.split('.');
                parts.pop();
                realParent = parts.join('.');
            }
        }
        return realParent || '';
    }

    renderEditFxDialog() {
        if (!this.state.editFxFor) {
            return null;
        }
        const fx = this.fx[this.state.editFxFor];

        return (
            <Dialog
                open={!0}
                key="editFxDialog"
                maxWidth="sm"
                onClose={() =>
                    this.setState({ editFxFor: '', fxRead: '', fxWrite: '', fxWriteOriginal: '', fxReadOriginal: '' })
                }
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="edit-device-dialog-title">
                    {I18n.t('Edit read/write functions')} <b>{this.state.editFxFor}</b>
                </DialogTitle>
                <DialogContent>
                    <div style={styles.divDialogContent}>
                        {fx.read !== undefined ? (
                            <div style={styles.funcDivEdit}>
                                <div style={{ ...styles.funcEditName, fontWeight: 'bold' }}>
                                    {I18n.t('Read function')}
                                </div>
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={this.state.fxRead}
                                    style={styles.funcEdit}
                                    onChange={e => this.setState({ fxRead: e.target.value })}
                                    helperText={`${I18n.t('JS function like')} "val / 5 + 21"`}
                                    margin="normal"
                                />
                            </div>
                        ) : null}
                        {fx.write !== undefined ? (
                            <div style={styles.funcDivEdit}>
                                <div style={{ ...styles.funcEditName, fontWeight: 'bold' }}>
                                    {I18n.t('Write function')}
                                </div>
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={this.state.fxWrite}
                                    helperText={`${I18n.t('JS function like')} "(val - 21) * 5"`}
                                    style={styles.funcEdit}
                                    onChange={e => this.setState({ fxWrite: e.target.value })}
                                    margin="normal"
                                />
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={
                            this.state.fxRead === this.state.fxReadOriginal &&
                            this.state.fxWrite === this.state.fxWriteOriginal
                        }
                        onClick={() => {
                            if (this.fx[this.state.editFxFor].read !== undefined) {
                                this.fx[this.state.editFxFor].read = this.state.fxRead;
                            }
                            if (this.fx[this.state.editFxFor].write !== undefined) {
                                this.fx[this.state.editFxFor].write = this.state.fxWrite;
                            }
                            this.setState({
                                editFxFor: '',
                                fxRead: '',
                                fxWrite: '',
                                fxWriteOriginal: '',
                                fxReadOriginal: '',
                            });
                        }}
                        color="primary"
                        autoFocus
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() =>
                            this.setState({
                                editFxFor: '',
                                fxRead: '',
                                fxWrite: '',
                                fxWriteOriginal: '',
                                fxReadOriginal: '',
                            })
                        }
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    onToggleTypeStates = name => {
        let stateDevice = this.state.ids[name];
        if (typeof stateDevice === 'object') {
            stateDevice = stateDevice.read;
        } else {
            stateDevice = {
                read: stateDevice,
                write: '',
            };
        }
        const newIds = JSON.parse(JSON.stringify(this.state.ids));
        newIds[name] = stateDevice;
        this.setState({ ids: newIds });
    };

    static getStateIcon(name, role) {
        // Get icon by role
        if (role.includes('humidity')) {
            return STATES_NAME_ICONS.HUMIDITY;
        }
        if (role.includes('color.temperature')) {
            return STATES_NAME_ICONS.COLOR_TEMP;
        }
        if (role.includes('temperature')) {
            return STATES_NAME_ICONS.TEMPERATURE;
        }
        if (role.includes('water')) {
            return STATES_NAME_ICONS.WATER;
        }
        if (role.includes('fire')) {
            return STATES_NAME_ICONS.FIRE;
        }
        if (role.includes('smoke')) {
            return STATES_NAME_ICONS.SMOKE;
        }
        if (role.includes('speed')) {
            return STATES_NAME_ICONS.SPEED;
        }
        if (role.includes('brightness')) {
            return STATES_NAME_ICONS.BRIGHTNESS;
        }
        if (role.includes('motion')) {
            return STATES_NAME_ICONS.MOTION;
        }
        if (role.includes('window')) {
            return STATES_NAME_ICONS.WINDOW;
        }
        return STATES_NAME_ICONS[name] || IconHelpOutline;
    }

    renderVariable(item, isAddedName, index) {
        if (!item.id && !this.channelId.startsWith('alias.') && !this.channelId.startsWith('linkeddevices.')) {
            return null;
        }
        let props = [item.type || 'any'];
        const name = item.name;
        const dName = name.replace(/\d+$/, '%d');
        // let's try to find the state that has a default role first (fixes issues with double states, for example, ON in lights).
        let pattern = this.pattern.states.find(
            state => (state.name === name || state.name === dName) && state.defaultRole,
        );
        if (!pattern) {
            pattern = this.pattern.states.find(state => state.name === name || state.name === dName);
        }
        if (item.write) props.push('write');
        if (item.read) props.push('read');
        if (pattern?.defaultRole) {
            props.push(`role=${pattern.defaultRole}`);
        } else if (item.defaultRole) {
            props.push(`role=${item.defaultRole}`);
        } else {
            pattern?.role && props.push(`role=${pattern.role.toString()}`);
        }

        if (pattern?.enums) {
            const type = this.props.channelInfo.type;
            if (type === 'dimmer' || type === 'light') {
                props.push('enum light');
            } else if (type === 'blinds' || type === 'window' || type === 'windowTilt') {
                props.push('enum window');
            } else if (type === 'door') {
                props.push('enum door');
            } else {
                props.push(`enum ${this.props.channelInfo.type}`);
            }
        }

        if (item.required) {
            props.push('required');
        }

        const role = pattern?.defaultRole || (pattern?.role && pattern?.role.toString()) || item?.defaultRole || '';
        const titleTooltip = (
            <div>
                {item.required && <div>{`${I18n.t('Required')}: true`}</div>}
                <div>{`${I18n.t('Type')}: ${item.type || 'any'}`}</div>
                <div>{`${I18n.t('Writable')}: ${!!item.write}`}</div>
                {role && (
                    <div>{`${I18n.t('Role')}: ${pattern?.defaultRole || (pattern?.role && pattern?.role.toString()) || item?.defaultRole || ''}`}</div>
                )}
            </div>
        );

        ////////////// ImportExportIcon
        const alias = this.channelId.startsWith('alias.');
        const linkedDevices = this.channelId.startsWith('linkeddevices.');

        // Get icon by role
        const IconsState = DialogEditDevice.getStateIcon(name, role);

        if (typeof this.state.ids[name] === 'object') {
            return (
                <div key={`${name}_${index}`}>
                    <Box
                        sx={styles.divOidField}
                        style={{
                            ...styles.divOidFieldObj,
                            opacity: !item.id && !this.state.ids[name] ? 0.6 : undefined,
                        }}
                    >
                        <div style={styles.displayFlex}>
                            <div style={styles.displayFlexRow}>
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={titleTooltip}
                                >
                                    <div style={styles.wrapperOidName}>
                                        <Box sx={styles.wrapperOidNameIcon}>
                                            <IconsState
                                                style={{
                                                    ...styles.oidNameIcon,
                                                    ...(isAddedName === 'add'
                                                        ? styles.addedName
                                                        : isAddedName === 'indicators'
                                                          ? styles.indicators
                                                          : undefined),
                                                }}
                                            />
                                        </Box>
                                        <Box
                                            sx={styles.oidName}
                                            style={{
                                                ...(isAddedName === 'add' ? styles.addedName : undefined),
                                                ...(isAddedName === 'indicators' ? styles.indicators : undefined),
                                                fontWeight: item.required ? 'bold' : null,
                                            }}
                                        >
                                            {(item.required ? '*' : '') + name}
                                            <div style={styles.stateSubCategory}>{I18n.t('alias_read')}</div>
                                        </Box>
                                    </div>
                                </Tooltip>
                                <div style={styles.wrapperButtonsAndOidField}>
                                    <TextField
                                        variant="standard"
                                        key={name}
                                        fullWidth
                                        disabled={(!alias && !linkedDevices) || this.state.startTheProcess}
                                        value={this.state.ids[name].read}
                                        sx={styles.oidField}
                                        style={{ paddingTop: 8 }}
                                        onChange={e => {
                                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                                            ids[name].read = e.target.value;
                                            this.setState({ ids });
                                        }}
                                        slotProps={{
                                            formHelperText: {
                                                style: styles.helperText,
                                            },
                                        }}
                                        helperText={`${props.join(', ')}`}
                                        margin="normal"
                                    />
                                    <Box sx={styles.wrapperItemButtons}>
                                        {(alias || linkedDevices) && !this.state.startTheProcess && (
                                            <Tooltip
                                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                                title={I18n.t('Select ID')}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        this.setState({ selectIdFor: name, selectIdPrefix: 'read' })
                                                    }
                                                    sx={styles.button}
                                                >
                                                    <IconEdit size="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </div>
                            </div>
                            <div style={styles.displayFlexRow}>
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={titleTooltip}
                                >
                                    <div style={styles.wrapperOidName}>
                                        <Box sx={styles.wrapperOidNameIcon}>
                                            <IconsState
                                                style={{
                                                    ...styles.oidNameIcon,
                                                    ...(isAddedName === 'add'
                                                        ? styles.addedName
                                                        : isAddedName === 'indicators'
                                                          ? styles.indicators
                                                          : undefined),
                                                }}
                                            />
                                        </Box>
                                        <Box
                                            sx={styles.oidName}
                                            style={{
                                                fontWeight: item.required ? 'bold' : null,
                                                ...(isAddedName === 'add'
                                                    ? styles.addedName
                                                    : isAddedName === 'indicators'
                                                      ? styles.indicators
                                                      : undefined),
                                            }}
                                        >
                                            {(item.required ? '*' : '') + name}
                                            <div style={styles.stateSubCategory}>{I18n.t('alias_write')}</div>
                                        </Box>
                                    </div>
                                </Tooltip>
                                <div style={styles.wrapperButtonsAndOidField}>
                                    <TextField
                                        variant="standard"
                                        key={name}
                                        fullWidth
                                        disabled={(!alias && !linkedDevices) || this.state.startTheProcess}
                                        value={this.state.ids[name].write}
                                        sx={styles.oidField}
                                        style={{ paddingTop: 8 }}
                                        onChange={e => {
                                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                                            ids[name].write = e.target.value;
                                            this.setState({ ids });
                                        }}
                                        slotProps={{
                                            formHelperText: {
                                                style: styles.helperText,
                                            },
                                        }}
                                        helperText={`${props.join(', ')}`}
                                        margin="normal"
                                    />
                                    <Box sx={styles.wrapperItemButtons}>
                                        {(alias || linkedDevices) && !this.state.startTheProcess && (
                                            <Tooltip
                                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                                title={I18n.t('Select ID')}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        this.setState({ selectIdFor: name, selectIdPrefix: 'write' })
                                                    }
                                                    sx={styles.button}
                                                >
                                                    <IconEdit size="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </div>
                            </div>
                        </div>
                        <Box sx={styles.wrapperItemButtons}>
                            {(alias || linkedDevices) && !this.state.startTheProcess && (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Use one state for read and write')}
                                >
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => this.onToggleTypeStates(name)}
                                        sx={styles.button}
                                    >
                                        <ImportExportIcon size="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {(this.state.ids[name].read || this.state.ids[name].write) &&
                            alias &&
                            this.state.ids[name] &&
                            !this.state.startTheProcess ? (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Edit convert functions')}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            this.setState({
                                                editFxFor: name,
                                                fxRead: this.fx[name]?.read || '',
                                                fxWrite: this.fx[name]?.write || '',
                                                fxReadOriginal: this.fx[name]?.read || '',
                                                fxWriteOriginal: this.fx[name]?.write || '',
                                            })
                                        }
                                        sx={styles.button}
                                    >
                                        <IconFunction size="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : item.noType ? (
                                ''
                            ) : (
                                <Box sx={styles.emptyButton} />
                            )}
                            {isAddedName === 'add' && (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Edit state')}
                                >
                                    <IconButton
                                        size="small"
                                        sx={{ ...styles.addedName, ...styles.button }}
                                        onClick={() =>
                                            this.setState({
                                                dialogAddState: { onClose: true, editState: item.id, item, name: name },
                                            })
                                        }
                                    >
                                        <IconEdit size="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {this.state.states[name] && !this.state.startTheProcess && (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Edit states')}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => this.setState({ editStates: name })}
                                        sx={styles.button}
                                    >
                                        <IconEditStates size="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {item.noType && !this.state.startTheProcess && (
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title={I18n.t('Delete state')}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => this.onDelete(item.id)}
                                        sx={styles.button}
                                    >
                                        <IconDelete size="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>
                </div>
            );
        }

        return (
            <Box
                key={`${name}_${index}`}
                sx={styles.divOidField}
                style={!item.id && !this.state.ids[name] ? { opacity: 0.6 } : {}}
            >
                <Tooltip
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                    title={titleTooltip}
                >
                    <div style={styles.wrapperOidName}>
                        <Box sx={styles.wrapperOidNameIcon}>
                            <IconsState
                                style={{
                                    ...styles.oidNameIcon,
                                    ...(isAddedName === 'add'
                                        ? styles.addedName
                                        : isAddedName === 'indicators'
                                          ? styles.indicators
                                          : undefined),
                                }}
                            />
                        </Box>
                        <Box
                            sx={styles.oidName}
                            style={{
                                fontWeight: item.required ? 'bold' : null,
                                ...(isAddedName === 'add'
                                    ? styles.addedName
                                    : isAddedName === 'indicators'
                                      ? styles.indicators
                                      : undefined),
                            }}
                        >
                            {(item.required ? '*' : '') + name}
                        </Box>
                    </div>
                </Tooltip>
                <div style={styles.wrapperButtonsAndOidField}>
                    <TextField
                        variant="standard"
                        fullWidth
                        disabled={(!alias && !linkedDevices) || this.state.startTheProcess}
                        value={alias || linkedDevices ? this.state.ids[name] || '' : item.id || ''}
                        sx={styles.oidField}
                        style={{ paddingTop: 8 }}
                        onChange={e => {
                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                            ids[name] = e.target.value;
                            this.setState({ ids });
                        }}
                        slotProps={{
                            formHelperText: {
                                style: styles.helperText,
                            },
                        }}
                        helperText={props.join(', ')}
                        margin="normal"
                    />
                    <Box sx={styles.wrapperItemButtons}>
                        {(alias || linkedDevices) && !this.state.startTheProcess && (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Select ID')}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => this.setState({ selectIdFor: name })}
                                    sx={styles.button}
                                >
                                    <IconEdit />
                                </IconButton>
                            </Tooltip>
                        )}

                        {(alias || linkedDevices) && !this.state.startTheProcess && (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Use different states for read and write')}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => this.onToggleTypeStates(name)}
                                    sx={styles.button}
                                >
                                    <ImportExportIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {alias && this.state.ids[name] && !this.state.startTheProcess ? (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Edit convert functions')}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        this.setState({
                                            editFxFor: name,
                                            fxRead: this.fx[name]?.read || '',
                                            fxWrite: this.fx[name]?.write || '',
                                            fxReadOriginal: this.fx[name]?.read || '',
                                            fxWriteOriginal: this.fx[name]?.write || '',
                                        })
                                    }
                                    sx={styles.button}
                                >
                                    <IconFunction />
                                </IconButton>
                            </Tooltip>
                        ) : item.noType ? (
                            ''
                        ) : (
                            <Box sx={styles.emptyButton} />
                        )}

                        {isAddedName === 'add' && (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Edit state')}
                            >
                                <IconButton
                                    size="small"
                                    sx={{ ...styles.addedName, ...styles.button }}
                                    onClick={() =>
                                        this.setState({
                                            dialogAddState: { onClose: true, editState: item.id, item, name: name },
                                        })
                                    }
                                >
                                    <IconEdit />
                                </IconButton>
                            </Tooltip>
                        )}

                        {this.state.states[name] && !this.state.startTheProcess && (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Edit states')}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => this.setState({ editStates: name })}
                                    sx={styles.button}
                                >
                                    <IconEditStates />
                                </IconButton>
                            </Tooltip>
                        )}

                        {item.noType && !this.state.startTheProcess && (
                            <Tooltip
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                title={I18n.t('Delete state')}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => this.onDelete(item.id)}
                                    sx={styles.button}
                                >
                                    <IconDelete />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </div>
            </Box>
        );
    }

    renderVariables() {
        return (
            <div
                key="vars"
                style={styles.divOids}
            >
                {this.props.channelInfo.states
                    .filter(item => !item.indicator && item.defaultRole)
                    .map((item, i) => this.renderVariable(item, 'def', i))}
                {this.state.extendedAvailable &&
                    this.state.addedStates.map((item, i) => this.renderVariable(item, 'add', i))}
                {this.state.indicatorsVisible && this.state.showIndicators && this.state.indicatorsAvailable && (
                    <div style={styles.wrapperHeaderIndicators}>
                        <div style={styles.headerIndicatorsLine} />
                        <div style={styles.headerIndicatorsName}>{I18n.t('Indicators')}</div>
                        <div style={styles.headerIndicatorsLine} />
                    </div>
                )}
                {this.state.indicatorsVisible &&
                    this.state.showIndicators &&
                    this.state.indicatorsAvailable &&
                    this.props.channelInfo.states
                        .filter(item => item.indicator && item.defaultRole)
                        .map(item => this.renderVariable(item, 'indicators'))}
            </div>
        );
    }

    a11yProps(index) {
        return {
            id: `scrollable-auto-tab-${index}`,
            'aria-controls': `scrollable-auto-tabpanel-${index}`,
        };
    }

    render() {
        return (
            <Dialog
                key="editDialog"
                open={!0}
                maxWidth="md"
                fullWidth
                sx={{ '& .MuiDialog-paper': styles.mobileWidth }}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                {this.renderSelectDialog()}
                {this.renderEditFxDialog()}
                <DialogTitle
                    sx={styles.titleHead}
                    id="edit-device-dialog-title"
                >
                    {I18n.t('Edit device')} <b>{this.channelId}</b>
                </DialogTitle>
                <DialogContent style={styles.content}>
                    <AppBar
                        style={{ top: 0 }}
                        position="sticky"
                        color="default"
                    >
                        {this.state.startTheProcess && <LinearProgress />}
                        <div style={styles.wrapperIconHead}>
                            <div style={styles.iconStyle}>{this.showDeviceIcon()}</div>
                            <Box
                                component="span"
                                sx={styles.deviceText}
                            >
                                {I18n.t(`type-${this.props.channelInfo.type}`)}
                            </Box>
                        </div>
                        <Tabs
                            value={this.state.tab}
                            onChange={(_, newTab) =>
                                this.setState({ tab: newTab }, () => localStorage.setItem('EditDevice.tab', newTab))
                            }
                            indicatorColor="primary"
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="scrollable auto tabs example"
                        >
                            <Tab
                                disabled={this.state.startTheProcess}
                                label={I18n.t('General')}
                                {...this.a11yProps(0)}
                            />
                            <Tab
                                disabled={this.state.startTheProcess}
                                label={I18n.t('States')}
                                {...this.a11yProps(1)}
                            />
                        </Tabs>
                    </AppBar>
                    <TabPanel
                        value={this.state.tab}
                        index={0}
                    >
                        <DialogEditProperties
                            channelId={this.props.channelId}
                            disabled={this.state.startTheProcess}
                            type={this.props.type}
                            iot={this.props.iot}
                            iotNoCommon={this.props.iotNoCommon}
                            objects={this.props.objects}
                            patterns={this.props.patterns}
                            enumIDs={this.props.enumIDs}
                            socket={this.props.socket}
                            changeProperties={this.state.changeProperties}
                            onChange={(state, initState, disabledButton) => {
                                if (initState) {
                                    // TODO unclear! why immediately after setstate the settings are reset
                                    return this.setState(
                                        {
                                            initChangeProperties: initState,
                                            changeProperties: initState,
                                            disabledButton: false,
                                        },
                                        () => this.setState({ changeProperties: state, disabledButton }),
                                    );
                                } else {
                                    this.setState({ changeProperties: state, disabledButton });
                                }
                            }}
                        />
                    </TabPanel>
                    <TabPanel
                        value={this.state.tab}
                        index={1}
                    >
                        <div style={styles.divDialogContent}>
                            {this.renderHeader()}
                            {this.renderVariables()}
                        </div>
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={
                            (JSON.stringify(this.state.initChangeProperties) ===
                                JSON.stringify(this.state.changeProperties) &&
                                JSON.stringify(this.state.ids) === JSON.stringify(this.state.idsInit)) ||
                            this.state.disabledButton ||
                            this.state.startTheProcess
                        }
                        onClick={async () => await this.handleOk()}
                        startIcon={<IconCheck />}
                        color="primary"
                    >
                        {I18n.t('Save')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        disabled={this.state.startTheProcess}
                        onClick={this.handleClose}
                        startIcon={<IconClose />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
                {this.renderEditStates()}
                {this.renderDialogAddState()}
            </Dialog>
        );
    }
}

DialogEditDevice.propTypes = {
    channelId: PropTypes.string,
    onClose: PropTypes.func,
    patterns: PropTypes.object,
    channelInfo: PropTypes.object,
    objects: PropTypes.object,
    enumIDs: PropTypes.array,
    states: PropTypes.object,
    socket: PropTypes.object,
    themeType: PropTypes.string,
    theme: PropTypes.object,
    onCopyDevice: PropTypes.func,
    onSaveProperties: PropTypes.func,
};

export default DialogEditDevice;
