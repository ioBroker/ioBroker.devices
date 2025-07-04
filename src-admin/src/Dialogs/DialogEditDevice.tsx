/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React from 'react';

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
    Box,
} from '@mui/material';

import {
    Close as IconClose,
    Check as IconCheck,
    Delete as IconDelete,
    Add as IconAdd,
    Publish as IconPublish,
    Edit as IconEdit,
    OpenInNew as IconExtended,
    HelpOutline as IconHelpOutline,
    ImportExport as ImportExportIcon,
} from '@mui/icons-material';
import { AiOutlineEdit as IconEditStates } from 'react-icons/ai';
import type { IconType } from 'react-icons';

import {
    I18n,
    Utils,
    DialogSelectID,
    IconFx as IconFunction,
    type IobTheme,
    type AdminConnection,
    DeviceTypeIcon,
    STATES_NAME_ICONS,
    extendDeviceTypeTranslation,
} from '@iobroker/adapter-react-v5';
import type { Types, DetectorState, ExternalPatternControl } from '@iobroker/type-detector';

import DialogEditProperties, { type DialogEditPropertiesState } from './DialogEditProperties';
import DialogAddState from './DialogAddState';
import DialogEditFx from './DialogEditFx';
import {
    getAddedChannelStates,
    getParentId,
    normalizeStates,
    renameMultipleEntries,
} from '../Components/helpers/utils';
import DialogEditStates from './DialogEditStates';
import type { PatternControlEx } from '../types';

const styles: Record<string, any> = {
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
    icon: (theme: IobTheme): any => ({
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
        opacity: 0.8,
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

interface AddedState {
    defaultRole?: string;
    id: string;
    noType: boolean;
    name: string;
    type: ioBroker.CommonType;
    write?: boolean;
    read?: boolean;
    indicator: boolean;
    required: boolean;
    states?: { [value: string]: string };
}

// const FORBIDDEN_CHARS = /[\][*,;'"`<>\\?]/g;

function TabPanel(props: {
    children: React.ReactNode;
    value: number | null;
    index: number;
    style?: React.CSSProperties;
    paperStyle?: React.CSSProperties;
}): React.JSX.Element {
    const { children, value, index } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            style={props.style}
        >
            {value === index && (
                <Paper
                    style={{
                        padding: 24,
                        ...props.paperStyle,
                    }}
                    sx={styles.wrapperTabPanel}
                >
                    {children}
                </Paper>
            )}
        </div>
    );
}

interface DialogEditDeviceProps {
    theme: IobTheme;
    socket: AdminConnection;
    objects: Record<string, ioBroker.Object>;
    patterns: {
        [type: string]: ExternalPatternControl;
    };
    enumIDs: string[];
    iotNoCommon: boolean;
    iotInstance: string;
    channelId: string;
    type: Types;
    channelInfo: PatternControlEx;
    onClose: (
        data: null | {
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
        },
        channelInfo?: PatternControlEx,
    ) => void;
    onSaveProperties: (properties: DialogEditPropertiesState, channelInfo: PatternControlEx) => Promise<void>;
    onCopyDevice: (id: string, newChannelId: string) => Promise<void>;
}

interface DialogEditDeviceState {
    ids: Record<
        string,
        | string
        | {
              read: string;
              write: string;
          }
    >;
    idsInit: string;
    statesInit: string;
    fxInit: string;
    name: string;
    addedStates: AddedState[];
    showIndicators: boolean;
    expertMode: boolean;
    selectIdFor: string;
    newState: boolean;
    selectIdPrefix: 'read' | 'write' | '';
    editFxFor: string;
    fxRead: string;
    fxReadOriginal: string;
    fxWrite: string;
    fxWriteOriginal: string;
    newChannelId: string;
    indicatorsVisible: boolean;
    newChannelError: boolean;
    startTheProcess: boolean;
    disabledButton: boolean;
    extendedAvailable: boolean;
    indicatorsAvailable: boolean;
    tab: number | null;
    initChangeProperties: DialogEditPropertiesState;
    changeProperties: DialogEditPropertiesState;
    editStates: string | null;
    states: Record<string, { [value: string]: string } | undefined>;
    dialogAddState: {
        editState: string | null;
        name?: string;
        item?: DetectorState | AddedState;
        onClose: boolean | null;
    } | null;
    channelInfo: PatternControlEx;
}

class DialogEditDevice extends React.Component<DialogEditDeviceProps, DialogEditDeviceState> {
    private readonly fx: Record<string, { read?: string; write?: string }>;
    private readonly channelId: string;
    private pattern: ExternalPatternControl;

    constructor(props: DialogEditDeviceProps) {
        super(props);
        this.fx = {};
        const ids: Record<string, string | { read: string; write: string }> = {};
        const states: Record<string, { [value: string]: string } | undefined> = {};

        // Process multiple states
        const channelInfo: PatternControlEx = JSON.parse(JSON.stringify(props.channelInfo));

        renameMultipleEntries(channelInfo, props.objects);

        // States of the state (common.states)
        this.getStatesInformation(ids, states, channelInfo);

        const { addedStates } = this.updateFx(getAddedChannelStates(channelInfo, props.objects), ids, states);

        // Load types translations
        extendDeviceTypeTranslation();

        this.channelId = channelInfo.channelId;
        let name = '';
        const channelObj = props.objects[this.channelId];

        if (channelObj?.common) {
            name = Utils.getObjectNameFromObj(channelObj, null, { language: I18n.getLanguage() });
        }

        const indicatorsAvailable = !!channelInfo.states.filter(item => item.indicator).length;
        const indicatorsVisible =
            this.channelId.startsWith('alias.') ||
            this.channelId.startsWith('linkeddevices.') ||
            (indicatorsAvailable && !!channelInfo.states.filter(item => item.indicator && item.id).length);

        const extendedAvailable =
            indicatorsAvailable && (this.channelId.startsWith('alias.') || this.channelId.startsWith('linkeddevices.'));

        this.state = {
            ids,
            idsInit: JSON.stringify(ids),
            statesInit: JSON.stringify(states),
            fxInit: JSON.stringify(this.fx),
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
            tab: localStorage.getItem('EditDevice.tab') ? JSON.parse(localStorage.getItem('EditDevice.tab')!) || 0 : 0,
            initChangeProperties: {},
            changeProperties: {},
            editStates: null,
            states,
            dialogAddState: null,
            channelInfo,
        };

        this.pattern =
            props.patterns[Object.keys(props.patterns).find(type => props.patterns[type].type === channelInfo.type)!];
    }

    componentDidMount(): void {
        if (this.state.indicatorsVisible && this.state.indicatorsAvailable && !this.state.showIndicators) {
            const checkIndicators = this.state.channelInfo.states
                .filter(item => item.indicator && item.defaultRole)
                .find(obj => this.state.ids[obj.name]);

            if (checkIndicators) {
                this.setState({ showIndicators: true });
            }
        }
    }

    renderEditStates(): React.JSX.Element | null {
        if (!this.state.editStates) {
            return null;
        }
        return (
            <DialogEditStates
                states={this.state.states[this.state.editStates]}
                onClose={(states: { [value: string]: string } | undefined) => {
                    if (states) {
                        const name = this.state.editStates!;
                        const newStates: Record<string, { [value: string]: string } | undefined> = JSON.parse(
                            JSON.stringify(this.state.states),
                        );
                        newStates[name] = states;
                        this.setState({ editStates: null, states: newStates });
                    } else {
                        this.setState({ editStates: null });
                    }
                }}
            />
        );
    }

    renderDialogAddState(): React.JSX.Element | null {
        if (this.state.dialogAddState) {
            const processed: string[] = [];
            const arrayStateDefault = this.state.channelInfo.states.filter(item => {
                if (item.indicator && item.defaultRole && !processed.includes(item.name)) {
                    processed.push(item.name);
                    return true;
                }
                return false;
            });

            return (
                <DialogAddState
                    onClose={async (obj?: ioBroker.StateObject): Promise<void> => {
                        if (!obj) {
                            this.setState({ dialogAddState: null });
                            return;
                        }
                        const objName = obj?.common?.name;
                        let oldName: string;
                        if (typeof objName === 'object') {
                            oldName =
                                objName[I18n.getLanguage()] ||
                                objName.en ||
                                objName[Object.keys(objName)[0] as ioBroker.Languages] ||
                                '';
                        } else {
                            oldName = '';
                        }

                        if (this.state.dialogAddState!.onClose && oldName !== this.state.dialogAddState!.name) {
                            await this.onDelete(this.state.dialogAddState!.item!.id);
                            const newIds: Record<
                                string,
                                | string
                                | {
                                      read: string;
                                      write: string;
                                  }
                            > = JSON.parse(JSON.stringify(this.state.ids));

                            const newValue = newIds[this.state.dialogAddState!.name!];
                            delete newIds[this.state.dialogAddState!.name!];
                            newIds[oldName] = newValue;
                            this.setState({ ids: newIds, dialogAddState: null });
                        } else {
                            this.setState({ dialogAddState: null });
                        }
                    }}
                    editState={this.state.dialogAddState.editState}
                    objects={this.props.objects}
                    socket={this.props.socket}
                    channelId={this.channelId}
                    arrayStateDefault={arrayStateDefault}
                />
            );
        }
        return null;
    }

    processOneItem(
        state: {
            id: string;
            name: string;
            defaultRole?: string;
            write?: boolean;
        },
        ids: Record<string, string | { read: string; write: string }>,
        states: Record<string, { [value: string]: string } | undefined>,
    ): void {
        if (state.id) {
            const obj = this.props.objects[state.id];
            if (obj?.common?.alias) {
                ids[state.name] = obj.common.alias.id || '';
                this.fx[state.name] = {
                    read: obj.common.alias.read || '',
                    write: obj.common.alias.write || '',
                };
                if (obj.common.states) {
                    states[state.name] = normalizeStates(obj.common.states);
                }
            } else {
                this.fx[state.name] = { read: '', write: '' };
                if (states[state.name]) {
                    delete states[state.name];
                }
            }

            if (obj?.common?.custom) {
                const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                if (attr?.length && obj.common.custom[attr[0]] && obj.common.custom[attr[0]].parentId) {
                    ids[state.name] = obj.common.custom[attr[0]].parentId;
                }
            }

            if (state.defaultRole?.startsWith('button')) {
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
            if (states[state.name]) {
                delete states[state.name];
            }
        }
    }

    getStatesInformation(
        ids: Record<string, string | { read: string; write: string }>,
        states: Record<string, { [value: string]: string } | undefined>,
        _channelInfo?: PatternControlEx,
    ): void {
        const channelInfo = _channelInfo || this.state.channelInfo;
        const processed: string[] = [];
        channelInfo.states.forEach(state => {
            if (!processed.includes(state.name) || state.id) {
                processed.push(state.name);
                this.processOneItem(state, ids, states);
            }
        });
    }

    updateFx(
        addedStates: AddedState[],
        ids?: Record<string, { read: string; write: string } | string>,
        states?: Record<string, { [value: string]: string } | undefined>,
    ): {
        addedStates: AddedState[];
        newIds: Record<string, { read: string; write: string } | string>;
        newStates: Record<string, { [value: string]: string }>;
    } {
        const newIds: Record<string, { read: string; write: string } | string> =
            ids || JSON.parse(JSON.stringify(this.state.ids));
        const newStates: Record<string, { [value: string]: string }> =
            states || JSON.parse(JSON.stringify(this.state.states));

        addedStates.forEach(state => {
            if (state.id) {
                const obj = this.props.objects[state.id];
                if (obj?.common?.alias) {
                    newIds[state.name] = obj.common.alias.id || '';
                    this.fx[state.name] ||= {
                        read: obj.common.alias.read || '',
                        write: obj.common.alias.write || '',
                    };
                } else {
                    this.fx[state.name] ||= { read: '', write: '' };
                }
                if (obj?.common?.custom) {
                    const attr = Object.keys(obj.common.custom).filter(id => id.startsWith('linkeddevices.'));
                    if (attr?.length && obj.common.custom[attr[0]] && obj.common.custom[attr[0]].parentId) {
                        newIds[state.name] = newIds[state.name] || obj.common.custom[attr[0]].parentId;
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

    UNSAFE_componentWillReceiveProps(): void {
        const addedStates = getAddedChannelStates(this.state.channelInfo, this.props.objects);
        const newStates: Record<string, { [value: string]: string }> = JSON.parse(JSON.stringify(this.state.states));

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

    renderSelectDialog(): React.JSX.Element | null {
        if (!this.state.selectIdFor && !this.state.newState) {
            return null;
        }
        const selected: string =
            this.state.selectIdPrefix && typeof this.state.ids[this.state.selectIdFor] === 'object'
                ? (this.state.ids[this.state.selectIdFor] as { read: string; write: string })[this.state.selectIdPrefix]
                : (this.state.ids[this.state.selectIdFor] as string);

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
                onOk={async _id => {
                    const id = Array.isArray(_id) ? _id[0] : _id;
                    if (!id) {
                        return;
                    }

                    const ids: Record<
                        string,
                        | string
                        | {
                              read: string;
                              write: string;
                          }
                    > = JSON.parse(JSON.stringify(this.state.ids));
                    if (!this.state.newState) {
                        if (this.state.selectIdPrefix && typeof ids[this.state.selectIdFor] === 'object') {
                            (ids[this.state.selectIdFor] as { read: string; write: string })[
                                this.state.selectIdPrefix
                            ] = id;
                        } else {
                            ids[this.state.selectIdFor] = id;
                        }
                    } else {
                        const isAlias = id.startsWith('alias.') || id.startsWith('linkeddevices.');
                        const obj: ioBroker.StateObject = JSON.parse(JSON.stringify(this.props.objects[id]));
                        const parts = id.split('.');
                        const lastPart = parts.pop() || '';
                        obj._id = `${this.channelId}.${lastPart}`;
                        obj.native = {};
                        obj.common.name = lastPart;
                        if (!isAlias) {
                            obj.common.alias = { id };
                        }
                        await this.props.socket.setObject(`${this.channelId}.${lastPart}`, obj);
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

    handleClose = (): void => {
        this.props.onClose(null);
    };

    updateNewState = async (): Promise<void> => {
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

    handleOk = async (): Promise<void> => {
        this.setState({ startTheProcess: true });
        if (
            JSON.stringify(this.state.initChangeProperties) !== JSON.stringify(this.state.changeProperties) &&
            this.props.onSaveProperties
        ) {
            await this.props.onSaveProperties(this.state.changeProperties, this.state.channelInfo);
        }

        this.props.onClose(
            {
                ids: this.state.ids,
                fx: this.fx,
                states: this.state.states,
            },
            this.state.channelInfo,
        );

        await this.updateNewState();

        if (
            this.state.changeProperties.name &&
            this.state.initChangeProperties.name &&
            this.state.initChangeProperties.name !== this.state.changeProperties.name
        ) {
            const parts = this.channelId.split('.');
            parts.pop();
            let lastPart = parts.join('.');
            lastPart = `${lastPart}.${this.state.changeProperties.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
            await this.props.onCopyDevice(this.channelId, lastPart);
        }
        this.setState({ startTheProcess: false });
    };

    showDeviceIcon(): React.JSX.Element {
        return (
            <Box sx={styles.icon}>
                <DeviceTypeIcon
                    type={this.state.channelInfo.type}
                    style={{
                        ...styles.deviceIconStyle,
                        color: this.props.theme.palette.mode === 'dark' ? '#FFFFFF' : '#000',
                    }}
                />
            </Box>
        );
    }

    renderHeader(): React.JSX.Element {
        const checkIndicators = this.state.channelInfo.states
            .filter(item => item.indicator && item.defaultRole)
            .find(obj => this.state.ids[obj.name]);

        return (
            <div
                style={{
                    width: '100%',
                    fontSize: 16,
                    textTransform: 'capitalize',
                    textAlign: 'center',
                    color: '#000',
                }}
            >
                <div style={styles.menuWrapperIcons}>
                    {this.state.indicatorsVisible && this.state.indicatorsAvailable && !this.state.startTheProcess && (
                        <Tooltip
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            title={I18n.t('Show hide indicators')}
                        >
                            <IconButton
                                style={{
                                    color: this.state.showIndicators ? '#4DABF5' : undefined,
                                    border:
                                        checkIndicators && !this.state.showIndicators ? '1px solid #4DABF5' : undefined,
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
                                <IconPublish />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
        );
    }

    onDelete = async (id: string): Promise<void> => {
        await this.props.socket.delObject(id);
    };

    findRealDevice(prefix: string): string {
        if (prefix) {
            return '';
        }
        // take the first non-empty element in ids
        let realParent: string | undefined | { read: string; write: string } = Object.keys(this.state.ids).find(
            id => this.state.ids[id],
        );
        if (realParent) {
            realParent = this.state.ids[realParent];
            if (typeof realParent === 'string') {
                const parts = realParent.split('.');
                parts.pop();
                realParent = getParentId(realParent);
            } else if (typeof realParent === 'object') {
                realParent = Object.keys(realParent)[0];
                realParent = getParentId(realParent);
            }
        }
        return realParent || '';
    }

    renderEditFxDialog(): React.JSX.Element | null {
        if (!this.state.editFxFor) {
            return null;
        }

        return (
            <DialogEditFx
                socket={this.props.socket}
                aliasId={this.state.ids[this.state.editFxFor]}
                editFxFor={`${this.props.channelId}.${this.state.editFxFor}`}
                fxRead={this.fx[this.state.editFxFor]?.read}
                fxWrite={this.fx[this.state.editFxFor]?.write}
                onClose={(result: { read?: string; write?: string }): void => {
                    if (result) {
                        this.fx[this.state.editFxFor] = { read: result.read, write: result.write };
                    }
                    this.setState({ editFxFor: '' });
                }}
            />
        );
    }

    onToggleTypeStates = (name: string): void => {
        let stateDevice = this.state.ids[name];
        if (typeof stateDevice === 'object') {
            stateDevice = stateDevice.read;
        } else {
            stateDevice = {
                read: stateDevice,
                write: '',
            };
        }
        const newIds: Record<string, string | { read: string; write: string }> = JSON.parse(
            JSON.stringify(this.state.ids),
        );
        newIds[name] = stateDevice;
        this.setState({ ids: newIds });
    };

    static getStateIcon(name: string, role: string): IconType {
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

    renderVariable(
        item: DetectorState | AddedState,
        isAddedName: 'add' | 'indicators' | 'def',
        index: number,
    ): React.JSX.Element | null {
        if (!item.id && !this.channelId.startsWith('alias.') && !this.channelId.startsWith('linkeddevices.')) {
            return null;
        }
        const props = [item.type || 'any'];
        const name = item.name;
        const dName = name.replace(/\d+$/, '%d');
        // let's try to find the state that has a default role first (fixes issues with double states, for example, ON in lights).
        let pattern = this.pattern.states.find(
            state => (state.name === name || state.name === dName) && state.defaultRole,
        );
        if (!pattern) {
            pattern = this.pattern.states.find(state => state.name === name || state.name === dName);
        }
        if (item.write) {
            props.push('write');
        }
        if (item.read) {
            props.push('read');
        }
        if (pattern?.defaultRole) {
            props.push(`role=${pattern.defaultRole}`);
        } else if (item.defaultRole) {
            props.push(`role=${item.defaultRole}`);
        } else {
            pattern?.role && props.push(`role=${pattern.role.toString()}`);
        }

        if (pattern?.enums) {
            const type = this.state.channelInfo.type;
            if (type === 'dimmer' || type === 'light') {
                props.push('enum light');
            } else if (type === 'blind' || type === 'window' || type === 'windowTilt') {
                props.push('enum window');
            } else if (type === 'door') {
                props.push('enum door');
            } else {
                props.push(`enum ${this.state.channelInfo.type}`);
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
            // { read: string; write: string }
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
                                        sx={{
                                            '& .MuiFormHelperText-root': styles.helperText,
                                            ...styles.oidField,
                                        }}
                                        style={{ paddingTop: 8 }}
                                        onChange={e => {
                                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                                            ids[name].read = e.target.value;
                                            this.setState({ ids });
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
                                                    <IconEdit />
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
                                        sx={{
                                            '& .MuiFormHelperText-root': styles.helperText,
                                            ...styles.oidField,
                                        }}
                                        style={{ paddingTop: 8 }}
                                        onChange={e => {
                                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                                            ids[name].write = e.target.value;
                                            this.setState({ ids });
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
                                                    <IconEdit />
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
                                        <ImportExportIcon />
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
                                        onClick={() => this.setState({ editFxFor: name })}
                                        sx={styles.button}
                                    >
                                        <IconFunction />
                                    </IconButton>
                                </Tooltip>
                            ) : (item as AddedState).noType ? (
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
                                                dialogAddState: { onClose: true, editState: item.id, item, name },
                                            })
                                        }
                                    >
                                        <IconEdit />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {this.state.states[name] && !this.state.startTheProcess && this.state.ids[name] && (
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
                            {(item as AddedState).noType && !this.state.startTheProcess && (
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
                        sx={{
                            '& .MuiFormHelperText-root': styles.helperText,
                            ...styles.oidField,
                        }}
                        style={{ paddingTop: 8 }}
                        onChange={e => {
                            const ids = JSON.parse(JSON.stringify(this.state.ids));
                            ids[name] = e.target.value;
                            this.setState({ ids });
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
                        ) : (item as AddedState).noType ? (
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
                                            dialogAddState: { onClose: true, editState: item.id, item, name },
                                        })
                                    }
                                >
                                    <IconEdit />
                                </IconButton>
                            </Tooltip>
                        )}

                        {this.state.states[name] && !this.state.startTheProcess && this.state.ids[name] && (
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

                        {(item as AddedState).noType && !this.state.startTheProcess && (
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

    renderVariables(): React.JSX.Element {
        const processed: string[] = [];
        return (
            <div
                key="vars"
                style={{
                    display: 'inline-block',
                    verticalAlign: 'top',
                    width: 'calc(100% - 24px)',
                    height: 'calc(100% - 52px)',
                    overflow: 'auto',
                    paddingRight: 24,
                    paddingBottom: 12,
                }}
            >
                {this.state.channelInfo.states
                    .filter(item => !item.indicator && item.defaultRole && (!processed.includes(item.name) || item.id))
                    .map((item, i) => {
                        processed.push(item.name);
                        return this.renderVariable(item, 'def', i);
                    })}

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
                    this.state.channelInfo.states
                        .filter(
                            item => item.indicator && item.defaultRole && (!processed.includes(item.name) || item.id),
                        )
                        .map((item, i) => {
                            processed.push(item.name);
                            return this.renderVariable(item, 'indicators', i);
                        })}
            </div>
        );
    }

    static a11yProps(index: number): { id: string; 'aria-controls': string } {
        return {
            id: `scrollable-auto-tab-${index}`,
            'aria-controls': `scrollable-auto-tabpanel-${index}`,
        };
    }

    render(): React.JSX.Element {
        const okDisabled =
            (JSON.stringify(this.state.initChangeProperties) === JSON.stringify(this.state.changeProperties) &&
                JSON.stringify(this.state.states) === this.state.statesInit &&
                JSON.stringify(this.fx) === this.state.fxInit &&
                JSON.stringify(this.state.ids) === this.state.idsInit) ||
            this.state.disabledButton ||
            this.state.startTheProcess;

        return (
            <Dialog
                key="editDialog"
                open={!0}
                maxWidth="md"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        height: '100%',
                        ...styles.mobileWidth,
                    },
                }}
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
                <DialogContent style={{ paddingTop: 0, overflow: 'hidden' }}>
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
                                {I18n.t(`type-${this.state.channelInfo.type}`)}
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
                                {...DialogEditDevice.a11yProps(0)}
                            />
                            <Tab
                                disabled={this.state.startTheProcess}
                                label={I18n.t('States')}
                                {...DialogEditDevice.a11yProps(1)}
                            />
                        </Tabs>
                    </AppBar>
                    {this.state.tab === 0 ? (
                        <TabPanel
                            value={this.state.tab}
                            index={0}
                            style={{ height: 'calc(100% - 90px)', overflow: 'auto' }}
                        >
                            <DialogEditProperties
                                channelId={this.props.channelId}
                                channelInfo={this.state.channelInfo}
                                disabled={this.state.startTheProcess}
                                type={this.props.type}
                                iotInstance={this.props.iotInstance}
                                iotNoCommon={this.props.iotNoCommon}
                                objects={this.props.objects}
                                enumIDs={this.props.enumIDs}
                                socket={this.props.socket}
                                changeProperties={this.state.changeProperties}
                                onChange={(state, initState, disabledButton) => {
                                    if (initState) {
                                        // TODO unclear! why immediately after setstate the settings are reset
                                        this.setState(
                                            {
                                                initChangeProperties: initState,
                                                changeProperties: initState,
                                                disabledButton: false,
                                            },
                                            () =>
                                                this.setState({
                                                    changeProperties: state,
                                                    disabledButton: !!disabledButton,
                                                }),
                                        );
                                    } else {
                                        this.setState({ changeProperties: state, disabledButton: !!disabledButton });
                                    }
                                }}
                            />
                        </TabPanel>
                    ) : null}
                    {this.state.tab === 1 ? (
                        <TabPanel
                            value={this.state.tab}
                            index={1}
                            style={{ height: 'calc(100% - 90px)', overflow: 'hidden' }}
                            paperStyle={{
                                height: 'calc(100% - 24px)',
                                overflow: 'hidden',
                                padding: '12px 0 0 24px',
                            }}
                        >
                            <div style={{ ...styles.divDialogContent, overflow: 'hidden', height: '100%' }}>
                                {this.renderHeader()}
                                {this.renderVariables()}
                            </div>
                        </TabPanel>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={okDisabled}
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
                        {okDisabled ? I18n.t('Close') : I18n.t('Cancel')}
                    </Button>
                </DialogActions>
                {this.renderEditStates()}
                {this.renderDialogAddState()}
            </Dialog>
        );
    }
}

export default DialogEditDevice;
