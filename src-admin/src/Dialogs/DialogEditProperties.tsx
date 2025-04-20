/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import React, { Component } from 'react';

import { TextField, Select, MenuItem, Switch, FormControlLabel, Checkbox, Box } from '@mui/material';

import { I18n, Utils, Icon, type AdminConnection } from '@iobroker/adapter-react-v5';

import UploadImage from '../Components/UploadImage';
import { findMainStateId, getParentId, getSmartName } from '../Components/helpers/utils';
import type { PatternControlEx } from '../types';

const styles: Record<string, any> = {
    divOidField: {
        width: '100%',
        display: 'block',
        paddingTop: 7,
        paddingBottom: 7,
    },
    oidName: {
        fontSize: 14,
        fontWeight: 'bold',
        '@media screen and (max-width: 650px)': {
            fontSize: 11,
        },
    },
    oidField: {
        display: 'inline-block',
        marginTop: 0,
        marginBottom: 0,
        '@media screen and (max-width: 650px)': {
            '& input': {
                fontSize: 12,
            },
            '& p': {
                fontSize: 7,
            },
        },
    },
    colorButton: {
        marginLeft: 5,
        '&>div': {
            width: '100%',
        },
        '@media screen and (max-width: 650px)': {
            marginLeft: 0,
        },
    },
    divOids: {
        display: 'inline-block',
        width: '100%',
        verticalAlign: 'top',
    },
    divIndicators: {
        display: 'inline-block',
        width: 'calc(50% - 55px)',
        verticalAlign: 'top',
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
    enumIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    renderValueWrapper: {
        display: 'flex',
    },
    preImage: {
        '@media screen and (max-width: 650px)': {
            '& img': {
                width: 14,
                height: 14,
                marginRight: '5px',
            },
            '& svg': {
                width: 14,
                height: 14,
                marginRight: '5px',
            },
        },
    },
    renderValueCurrent: {
        display: 'flex',
        alignItems: 'center',
        marginRight: '10px',
        '@media screen and (max-width: 650px)': {
            fontSize: 12,
            '& img': {
                width: 14,
                height: 14,
                marginRight: '5px',
            },
            '& svg': {
                width: 14,
                height: 14,
                marginRight: '5px',
            },
            '& div': {
                width: 14,
                height: 14,
                marginRight: '5px',
            },
        },
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
    tableIconImg: {
        marginTop: 4,
        marginLeft: 4,
        width: 32,
        height: 32,
        color: '#888',
    },
    disableSwitch: {
        '& .Mui-checked .MuiSwitch-thumb': {
            background: '#ffb3ce',
        },
    },
    disableSwitchLabel: {
        '& .MuiFormControlLabel-label': {
            fontSize: '0.75rem',
            opacity: 0.6,
        },
        '@media screen and (max-width: 650px)': {
            '& span': {
                fontSize: 11,
            },
        },
    },
    dropZone: {
        textAlign: 'left',
        marginTop: 16,
    },
    wrapperColorFields: {
        display: 'flex',
        width: '100%',
        '@media screen and (max-width: 650px)': {
            flexDirection: 'column',
        },
    },
};

export interface DialogEditPropertiesState {
    color?: string;
    icon?: string;
    functions?: string[];
    rooms?: string[];
    name?: string;
    initName?: string;
    smartName?: string | false;
    open?: Record<string, boolean>;
}

interface DialogEditPropertiesProps {
    onChange: (
        data: DialogEditPropertiesState,
        initState?: false | DialogEditPropertiesState,
        nameError?: boolean,
    ) => void;
    changeProperties: DialogEditPropertiesState;
    type: string;
    /** iot instance */
    iotInstance: string;
    /** If pro or net */
    iotNoCommon: boolean;
    channelId: string;
    objects: Record<string, ioBroker.Object>;
    enumIDs: string[];
    socket: AdminConnection;
    disabled?: boolean;
    channelInfo: PatternControlEx;
}

class DialogEditProperties extends Component<DialogEditPropertiesProps, DialogEditPropertiesState> {
    private readonly smartNameAvailable: boolean;

    constructor(props: DialogEditPropertiesProps) {
        super(props);

        let name = '';
        const channelObj: ioBroker.ChannelObject | undefined = this.props.objects[this.props.channelId] as
            | ioBroker.ChannelObject
            | undefined;

        const mainStateId = findMainStateId(this.props.channelInfo);

        const mainStateObj: ioBroker.StateObject | undefined = mainStateId
            ? (this.props.objects[mainStateId] as ioBroker.StateObject | undefined)
            : undefined;

        if (channelObj?.common) {
            const objName = Utils.getObjectNameFromObj(channelObj, I18n.getLanguage());
            if (objName === undefined) {
                if (typeof channelObj.common.name === 'string') {
                    name = channelObj.common.name;
                } else {
                    name =
                        channelObj.common.name[I18n.getLanguage()] ||
                        channelObj.common.name.en ||
                        channelObj.common.name[Object.keys(channelObj.common.name)[0] as ioBroker.Languages] ||
                        '';
                }
            } else {
                name = objName;
            }
        }

        const functions = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.functions.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj?.common?.members?.includes(this.props.channelId);
        });

        const rooms = this.props.enumIDs.filter(id => {
            if (!id.startsWith('enum.rooms.')) {
                return false;
            }
            const obj = this.props.objects[id];
            return obj?.common?.members?.includes(this.props.channelId);
        });

        // ;common.custom[adapter.namespace].smartName
        const smartName = mainStateObj
            ? getSmartName(mainStateObj, this.props.iotNoCommon, this.props.iotInstance)
            : undefined;

        this.smartNameAvailable = !!mainStateObj;

        this.state = Object.keys(this.props.changeProperties).length
            ? this.props.changeProperties
            : {
                  color: channelObj?.common?.color,
                  icon: channelObj?.common?.icon,
                  functions,
                  rooms,
                  name,
                  initName: name,
                  smartName,
                  open: {},
              };
    }

    componentDidMount(): void {
        if (!Object.keys(this.props.changeProperties).length) {
            this.props.onChange(this.state, this.state);
        }
    }

    componentDidUpdate(_prevProps: DialogEditPropertiesProps, prevState: DialogEditPropertiesState): void {
        if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
            this.props.onChange(this.state, false, !!this.checkedName());
        }
    }

    renderSelectEnum(name: 'functions' | 'rooms'): React.JSX.Element {
        const enums = this.props.enumIDs.filter(id => id.startsWith(`enum.${name}.`));
        const language = I18n.getLanguage();
        const objs = enums.map(id => ({
            name: Utils.getObjectName(this.props.objects, id, language),
            icon: Utils.getObjectIcon(id, this.props.objects[id]),
            id,
        }));

        return (
            <Select
                variant="standard"
                sx={styles.oidField}
                value={this.state[name]}
                fullWidth
                multiple
                open={!!this.state.open?.[name]}
                onClick={() => this.setState({ open: { [name]: !this.state.open?.[name] } })}
                disabled={this.props.disabled}
                onClose={() => this.state[name] && this.setState({ open: { [name]: false } })}
                renderValue={arrId => {
                    const newArr = arrId.map(id => ({
                        name: Utils.getObjectName(this.props.objects, id, language),
                        icon: Utils.getObjectIcon(id, this.props.objects[id]),
                        id,
                    }));

                    return (
                        <div style={styles.renderValueWrapper}>
                            {newArr.map(obj => (
                                <Box
                                    sx={styles.renderValueCurrent}
                                    key={`${obj.id}-render`}
                                >
                                    {obj.icon ? (
                                        <Icon
                                            style={styles.enumIcon}
                                            src={obj.icon}
                                            alt={obj.id}
                                        />
                                    ) : (
                                        <Box sx={styles.enumIcon} />
                                    )}
                                    {obj.name}
                                </Box>
                            ))}
                        </div>
                    );
                }}
                onChange={e => this.setState({ [name]: e.target.value, open: { [name]: false } })}
            >
                {objs.map(obj => (
                    <MenuItem
                        key={obj.id}
                        value={obj.id}
                    >
                        <Checkbox checked={this.state[name]?.includes(obj.id)} />
                        <Box sx={styles.preImage}>
                            {obj.icon ? (
                                <Icon
                                    style={styles.enumIcon}
                                    src={obj.icon}
                                    alt={obj.id}
                                />
                            ) : (
                                <div style={styles.enumIcon} />
                            )}
                        </Box>
                        {obj.name}
                    </MenuItem>
                ))}
            </Select>
        );
    }

    checkedName = (): ioBroker.Object | undefined | boolean => {
        if (!this.state.name) {
            return true;
        }
        if (this.state.name === this.state.initName) {
            return false;
        }
        const parentId = `${getParentId(this.props.channelId)}.${this.state.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        return this.props.objects[parentId];
    };

    renderProperties(): React.JSX.Element {
        const { disabled } = this.props;
        return (
            <div style={styles.divOids}>
                <div style={styles.divOidField}>
                    <Box sx={styles.oidName}>{I18n.t('Name')}</Box>
                    <TextField
                        variant="standard"
                        key="_name"
                        fullWidth
                        disabled={disabled}
                        value={this.state.name || ''}
                        error={!!this.checkedName()}
                        sx={styles.oidField}
                        onChange={e => this.setState({ name: e.target.value })}
                        margin="normal"
                    />
                </div>
                {this.smartNameAvailable ? (
                    <div style={styles.divOidField}>
                        <Box sx={styles.oidName}>{I18n.t('Disable smart')}</Box>
                        <FormControlLabel
                            sx={styles.disableSwitchLabel}
                            control={
                                <Switch
                                    sx={styles.disableSwitch}
                                    disabled={disabled}
                                    checked={this.state.smartName === false}
                                    color="secondary"
                                    onChange={e => this.setState({ smartName: e.target.checked ? false : undefined })}
                                />
                            }
                            label={I18n.t('Hide this name from smart assistance')}
                        />
                    </div>
                ) : null}
                {this.smartNameAvailable && this.state.smartName !== false ? (
                    <div style={styles.divOidField}>
                        <Box sx={styles.oidName}>{I18n.t('Smart name')}</Box>
                        <TextField
                            variant="standard"
                            key="_smartName"
                            fullWidth
                            disabled={disabled}
                            placeholder={this.state.name!.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ') || ''}
                            value={this.state.smartName || ''}
                            sx={styles.oidField}
                            helperText={I18n.t('This name will use be in smart assistance. (optional)')}
                            onChange={e =>
                                this.setState({ smartName: e.target.value.replace(/[-^#_%&{}!?()§"'`+*~/\\]/g, ' ') })
                            }
                            margin="normal"
                        />
                    </div>
                ) : null}
                <div style={styles.divOidField}>
                    <Box sx={styles.oidName}>{I18n.t('Function')}</Box>
                    {this.renderSelectEnum('functions')}
                </div>
                <div style={styles.divOidField}>
                    <Box sx={styles.oidName}>{I18n.t('Room')}</Box>
                    {this.renderSelectEnum('rooms')}
                </div>
                <div style={styles.divOidField}>
                    <Box sx={styles.oidName}>{I18n.t('Color')}</Box>
                    <Box sx={styles.wrapperColorFields}>
                        <TextField
                            variant="standard"
                            key="_color"
                            fullWidth
                            disabled={disabled}
                            value={this.state.color || ''}
                            onChange={e => this.setState({ color: e.target.value })}
                        />
                        <TextField
                            variant="standard"
                            key="_color1"
                            type="color"
                            style={{ width: 40 }}
                            disabled={disabled}
                            value={this.state.color || ''}
                            sx={{ ...styles.oidField, ...styles.colorButton }}
                            onChange={e => this.setState({ color: e.target.value })}
                            margin="normal"
                        />
                    </Box>
                </div>
                <UploadImage
                    crop={false}
                    disabled={!!disabled}
                    style={styles.dropZone}
                    icon={this.state.icon || ''}
                    onChange={(base64: string): void => this.setState({ icon: base64 })}
                />
            </div>
        );
    }

    render(): React.JSX.Element {
        return <div style={styles.divDialogContent}>{this.renderProperties()}</div>;
    }
}

export default DialogEditProperties;
