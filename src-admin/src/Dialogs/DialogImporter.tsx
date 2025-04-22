import React, { useEffect, useState } from 'react';

import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    TextField,
    ThemeProvider,
    Tooltip,
} from '@mui/material';

import { ModeEdit as IconEdit, Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import {
    I18n,
    Utils,
    Icon,
    type AdminConnection,
    type IobTheme,
    type ThemeType,
    DeviceTypeIcon,
} from '@iobroker/adapter-react-v5';
import type { Types } from '@iobroker/type-detector';

import TreeView from '../Components/TreeView';
import { useStateLocal } from '../Components/helpers/hooks/useStateLocal';
import type { ListItem, PatternControlEx } from '../types';
import { getLastPart, getParentId } from '../Components/helpers/utils';

const styles: Record<string, any> = {
    paper: {
        maxWidth: 960,
        maxHeight: 'calc(100% - 64px)',
        width: '100%',
    },
    overflowHidden: {
        display: 'flex',
        overflow: 'hidden',
        '@media screen and (max-width: 650px)': {
            overflowY: 'auto',
            padding: 10,
        },
    },
    pre: {
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        margin: 0,
    },
    divOids: {
        display: 'flex',
        width: '100%',
        '@media screen and (max-width: 650px)': {
            flexDirection: 'column',
        },
    },
    divOidField: {
        width: '100%',
        display: 'block',
        paddingTop: 7,
        paddingBottom: 7,
    },
    oidName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    flex: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        '@media screen and (max-width: 650px)': {
            overflow: 'initial',
        },
    },
    type: {
        width: '100%',
    },
    deviceWrapper: {
        display: 'flex',
        flexDirection: 'column',
        p: '4px',
        margin: '2px 10px',
        '&:hover': {
            background: '#6969694f',
            borderRadius: '4px',
        },
        '@media screen and (max-width: 650px)': {
            margin: '2px 0',
        },
    },
    fontStyle: {
        padding: '0px 8px',
        overflow: 'hidden',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        '@media screen and (max-width: 650px)': {
            fontSize: 10,
        },
    },
    fontStyleId: {
        padding: '0px 8px',
        overflow: 'hidden',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        opacity: 0.6,
        fontSize: 9,
        fontStyle: 'italic',
        '@media screen and (max-width: 650px)': {
            fontSize: 8,
        },
    },
    wrapperTitleAndId: {
        alignSelf: 'center',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflow: 'hidden',
    },
    tableIcon: {
        margin: 'auto 0',
    },
    tableIconImg: {
        width: 20,
        height: 20,
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        background: '#00000057',
        m: '10üx',
        p: '4px',
        borderRadius: '4px',
        mb: '10px',
        '@media screen and (max-width: 650px)': {
            m: 0,
        },
    },
    wrapperDevices: {
        m: '0 10px',
        '@media screen and (max-width: 650px)': {
            height: 200,
            width: '100%',
            display: 'block',
            flex: 'auto',
            m: '10px 0',
        },
    },
    wrapperItems: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
    },
    wrapperCloning: {
        backgroundColor: '#FFFFFF10',
        borderRadius: '3px',
        flex: 2,
        '@media screen and (max-width: 650px)': {
            flex: 'auto',
            overflow: 'auto',
        },
    },
    wrapperNameAndId: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
    },
    wrapperCheckbox: {
        display: 'flex',
        width: '100%',
    },
    enumsWrapper: {
        display: 'flex',
        paddingLeft: 60,
        overflow: 'hidden',
    },
    wrapperIconEnumCell: {
        display: 'flex',
        alignItems: 'center',
        margin: '0 4px',
    },
    enumIcon: {
        width: 20,
        height: 20,
    },
    nameEnumCell: {
        fontSize: 10,
        opacity: 0.7,
        ml: '4px',
        '@media screen and (max-width: 650px)': {
            fontSize: 7,
            ml: '2px',
        },
    },
    backgroundRed: {
        background: '#ff000029',
        borderRadius: 4,
    },
    dialogNewForm: {
        margin: 10,
    },
    emptyList: {
        display: 'flex',
        margin: 10,
        padding: '0 10px',
        opacity: 0.7,
        fontWeight: 'bold',
    },
    enumsStyle: {
        color: '#448dde',
        opacity: 1,
    },
    formControlLabel: {
        marginLeft: 0,
        opacity: 0.6,
        '@media screen and (max-width: 650px)': {
            '& span': {
                fontSize: 10,
            },
        },
    },
    headerWrapElement: {
        display: 'flex',
    },
    backgroundSilver: {
        opacity: 0.5,
    },
    startTheProcess: {
        opacity: 0.5,
    },
};

function RenderNewItemDialog(props: {
    object?: ListItem;
    open: boolean;
    onClose: (name?: string) => void;
    checkDeviceInObjects: (name: string, id: string) => boolean;
}): React.JSX.Element {
    const { object, onClose, open, checkDeviceInObjects } = props;
    const [name, setName] = useState(object?.title || '');
    const error: boolean = !name || !!(object && checkDeviceInObjects(name, object.id));

    useEffect(() => {
        if (object && name !== object.title) {
            setName(object.title);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [object]);

    return (
        <Dialog
            key="newDialog"
            onClose={() => onClose()}
            open={open}
        >
            <DialogTitle>{I18n.t('Edit name "%s"', name)}</DialogTitle>
            <form
                style={styles.dialogNewForm}
                autoComplete="off"
            >
                <TextField
                    variant="standard"
                    onKeyUp={ev => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();

                            if (name && !error) {
                                onClose(name);
                            } else {
                                onClose();
                            }
                        }
                    }}
                    error={!!error}
                    autoFocus
                    fullWidth
                    label={I18n.t('Name')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </form>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={!!error || object?.title === name}
                    onClick={() => onClose(name)}
                    startIcon={<IconCheck />}
                    color="primary"
                >
                    {I18n.t('Apply')}
                </Button>
                <Button
                    color="grey"
                    variant="contained"
                    onClick={() => onClose()}
                    startIcon={<IconClose />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function DialogImporter(props: {
    onClose: () => void;
    item: ListItem;
    socket: AdminConnection;
    devices: PatternControlEx[];
    objects: Record<string, ioBroker.Object>;
    listItems: ListItem[];
    onCopyDevice: (fromId: string, toId: string) => Promise<void>;
    theme: IobTheme;
    themeType: ThemeType;
}): React.JSX.Element {
    const { onClose, item, socket, devices, objects, listItems, onCopyDevice, theme, themeType } = props;
    const [arrayDevice, setArrayDevice] = useState<ListItem[]>([]);
    const [openEdit, setOpenEdit] = useState<ListItem | undefined>(undefined);
    const [cloningMethod, setCloningMethod] = useStateLocal('flat', 'importer.cloningMethod');
    const [idsFolder, setSdsFolder] = useState<Record<string, ioBroker.FolderObject>>({});
    const [selectFolder, setSelectFolder] = useState('alias.0');
    const [checkedSelect, setCheckedSelect] = useState<string[]>([]);
    const [skipElement, setSkipElement] = useState(true);
    const [startTheProcess, setStartTheProcess] = useState(false);

    useEffect(() => {
        const ids: string[] = [];

        const prefix = 'alias.0';
        Object.keys(objects).forEach(id => {
            if (
                id.startsWith(prefix) &&
                objects[id]?.common &&
                (objects[id].type === 'channel' || objects[id].type === 'device' || objects[id].type === 'folder')
            ) {
                let parentId;
                // getParentId
                if (objects[id].type === 'folder') {
                    parentId = id;
                } else {
                    parentId = getParentId(id);
                }

                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });

        const stateIds: Record<string, ioBroker.FolderObject> = {};
        const language = I18n.getLanguage();
        ids.forEach(
            id =>
                (stateIds[id] = {
                    _id: id,
                    common: {
                        name:
                            objects[id]?.type === 'folder'
                                ? Utils.getObjectName(objects, id, language)
                                : getLastPart(id),
                        nondeletable: true,
                        color: objects[id].common?.color || undefined,
                        icon: objects[id].common?.icon || undefined,
                    },
                    type: 'folder',
                    native: {},
                }),
        );

        stateIds[prefix] = {
            _id: prefix,
            common: {
                name: I18n.t('Root'),
                nondeletable: true,
            },
            type: 'folder',
            native: {},
        };

        setSdsFolder(stateIds);
    }, [objects, listItems]);

    useEffect(() => {
        const originalIds = listItems.filter(el => el?.obj?.native?.originalId).map(el => el.obj?.native.originalId);

        const newArray = listItems.filter(device => device.parent === item.id && !originalIds.includes(device.id));
        setArrayDevice(newArray);
        const selectId: string[] = newArray.map(device => device.id);
        setCheckedSelect(selectId);
    }, [item.id, item.parent, listItems]);

    const addNewFolder = async (
        dataFolder:
            | {
                  name: string;
                  color?: string;
                  icon?: string;
              }
            | {
                  objName: ioBroker.StringOrTranslated;
                  color?: string;
                  icon?: string;
              },
        id: string,
    ): Promise<void> => {
        const obj: ioBroker.FolderObject = {
            _id: id,
            common: {
                name: (
                    dataFolder as {
                        objName: ioBroker.StringOrTranslated;
                        color?: string;
                        icon?: string;
                    }
                ).objName
                    ? (
                          dataFolder as {
                              objName: ioBroker.StringOrTranslated;
                              color?: string;
                              icon?: string;
                          }
                      ).objName
                    : ({
                          [I18n.getLanguage()]: (
                              dataFolder as {
                                  name: string;
                                  color?: string;
                                  icon?: string;
                              }
                          ).name,
                      } as ioBroker.StringOrTranslated),
                color: dataFolder.color,
                icon: dataFolder.icon,
            },
            native: {},
            type: 'folder',
        };

        await socket.setObject(id, obj);
    };

    const addDevice = async (id: string, el: ListItem): Promise<void> => {
        const newId = `${id}.${el.title.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        await onCopyDevice(el.id, newId);
    };

    const checkDeviceInObjects = (name: string, id: string): boolean => {
        const device = devices.find(device => id === device.channelId);
        let newId = `${selectFolder}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        if (cloningMethod === 'rooms') {
            if (device?.rooms.length) {
                newId = `${selectFolder}.${device.rooms[0].replace('enum.rooms.', '')}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
            }
        } else if (cloningMethod === 'functions') {
            if (device?.functions.length) {
                newId = `${selectFolder}.${device.functions[0].replace('enum.functions.', '')}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
            }
        }
        return !!objects[newId];
    };

    const checkEnumsScip = (id: string): boolean => {
        const device = devices.find(device => id === device.channelId);

        if (cloningMethod === 'rooms' && skipElement) {
            return !device?.rooms.length;
        }
        if (cloningMethod === 'functions' && skipElement) {
            return !device?.functions.length;
        }
        return false;
    };

    const arrayDeviceFunction = async (): Promise<void> => {
        for (let s = 0; s < arrayDevice.length; s++) {
            const el = arrayDevice[s];
            if (!checkedSelect.includes(el.id) || checkDeviceInObjects(el.title, el.id) || checkEnumsScip(el.id)) {
                continue;
            }
            let newId = `${selectFolder}`;
            const device = devices.find(device => el.id === device.channelId);

            if (cloningMethod === 'rooms') {
                if (device?.rooms.length) {
                    newId = `${newId}.${device.rooms[0].replace('enum.rooms.', '')}`;
                    if (!objects[newId]) {
                        const newObjFolder = objects[device.rooms[0]];
                        await addNewFolder(
                            {
                                objName: newObjFolder.common.name,
                                color: newObjFolder.common.color,
                                icon: newObjFolder.common.icon,
                            },
                            newId,
                        );
                        await addDevice(newId, el);
                        continue;
                    }
                }
            } else if (cloningMethod === 'functions') {
                if (device?.functions.length) {
                    newId = `${newId}.${device.functions[0].replace('enum.functions.', '')}`;
                    if (!objects[newId]) {
                        const newObjFolder = objects[device.functions[0]];
                        await addNewFolder(
                            {
                                objName: newObjFolder.common.name,
                                color: newObjFolder.common.color,
                                icon: newObjFolder.common.icon,
                            },
                            newId,
                        );
                        await addDevice(newId, el);
                        continue;
                    }
                }
            }

            await addDevice(newId, el);
        }
    };

    const onChangeCopy = async (): Promise<void> => {
        if (!objects[selectFolder] && selectFolder !== 'alias.0') {
            const lastPart = getLastPart(selectFolder);
            await addNewFolder(
                {
                    name: lastPart.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_'),
                    color: undefined,
                    icon: undefined,
                },
                selectFolder,
            );
        }
        await arrayDeviceFunction();
    };

    const generateFolders = (): string => {
        switch (cloningMethod) {
            case 'flat':
                return '';
            case 'rooms':
                return `.{${I18n.t('rooms')}}`;
            case 'functions':
                return `.{${I18n.t('functions')}}`;
            default:
                return '';
        }
    };

    const renderEnumCell = (id: string, name: 'functions' | 'rooms'): React.JSX.Element[] | null => {
        const device = devices.find(device => id === device.channelId);
        if (!device || (device && !device[name])) {
            return null;
        }
        return device[name]
            .map(id => ({
                icon: Utils.getObjectIcon(id, objects[id]),
                name: Utils.getObjectName(objects, id, I18n.getLanguage()),
                id,
            }))
            .map(obj => (
                <div
                    style={{ ...styles.wrapperIconEnumCell, ...(name === 'rooms' ? styles.enumsStyle : undefined) }}
                    key={obj.id}
                >
                    {obj.icon && (
                        <Icon
                            style={styles.enumIcon}
                            src={obj.icon}
                            alt={obj.id}
                        />
                    )}
                    <Box style={styles.nameEnumCell}>{obj.name}</Box>
                </div>
            ));
    };

    return (
        <ThemeProvider theme={theme}>
            <Dialog
                onClose={() => onClose()}
                open={!0}
                sx={{ '& .MuiDialog-paper': styles.paper }}
            >
                <DialogTitle>
                    {I18n.t('Importer')} {item.title} → {selectFolder}
                    {generateFolders()}
                </DialogTitle>
                <DialogContent
                    sx={styles.overflowHidden}
                    dividers
                >
                    <RenderNewItemDialog
                        object={openEdit}
                        checkDeviceInObjects={checkDeviceInObjects}
                        onClose={name => {
                            if (name) {
                                const indexDevice = openEdit ? arrayDevice.indexOf(openEdit) : -1;
                                if (indexDevice !== -1) {
                                    const newDevice = JSON.parse(JSON.stringify(openEdit));
                                    const newArrayDevice = JSON.parse(JSON.stringify(arrayDevice));
                                    newDevice.title = name;
                                    newArrayDevice[indexDevice] = newDevice;
                                    setArrayDevice(newArrayDevice);
                                }
                            }
                            setOpenEdit(undefined);
                        }}
                        open={!!openEdit}
                    />
                    <Box sx={styles.divOids}>
                        <Box
                            sx={{ ...styles.flex, ...styles.wrapperDevices }}
                            style={startTheProcess ? styles.startTheProcess : undefined}
                        >
                            <TreeView
                                themeType={themeType}
                                theme={theme}
                                objects={idsFolder}
                                onAddNew={async (name: string, parentId: string): Promise<void> =>
                                    await addNewFolder(
                                        { name, icon: undefined, color: undefined },
                                        `${parentId}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`,
                                    )
                                }
                                onSelect={(id: string): void => setSelectFolder(id)}
                                selected={selectFolder}
                                displayFlex
                                disabled={startTheProcess}
                            />
                        </Box>

                        <Box sx={{ ...styles.flex, ...styles.wrapperCloning }}>
                            {startTheProcess && <LinearProgress />}
                            <Box sx={styles.header}>
                                <div
                                    style={{
                                        ...styles.headerWrapElement,
                                        ...(startTheProcess ? styles.startTheProcess : undefined),
                                    }}
                                >
                                    <Checkbox
                                        disabled={!arrayDevice.length || startTheProcess}
                                        checked={
                                            arrayDevice.length === checkedSelect.length ||
                                            (arrayDevice.length !== checkedSelect.length && checkedSelect.length !== 0)
                                        }
                                        indeterminate={
                                            arrayDevice.length !== checkedSelect.length && checkedSelect.length !== 0
                                        }
                                        onChange={() => {
                                            if (arrayDevice.length === checkedSelect.length) {
                                                setCheckedSelect([]);
                                            } else {
                                                const selectId = arrayDevice.map(device => device.id);
                                                setCheckedSelect(selectId);
                                            }
                                        }}
                                    />
                                    <FormControl
                                        style={styles.type}
                                        variant="standard"
                                    >
                                        <InputLabel>{I18n.t('cloning method')}</InputLabel>
                                        <Select
                                            variant="standard"
                                            fullWidth
                                            disabled={!arrayDevice.length || startTheProcess}
                                            value={cloningMethod}
                                            onChange={e => {
                                                setCloningMethod(e.target.value);
                                            }}
                                        >
                                            <MenuItem value={'flat'}>{I18n.t('flat')}</MenuItem>
                                            <MenuItem value={'rooms'}>{I18n.t('rooms')}</MenuItem>
                                            <MenuItem value={'functions'}>{I18n.t('functions')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                                {cloningMethod !== 'flat' && (
                                    <FormControlLabel
                                        sx={styles.formControlLabel}
                                        control={
                                            <Checkbox
                                                checked={skipElement}
                                                onChange={() => setSkipElement(!skipElement)}
                                            />
                                        }
                                        label={I18n.t('do not export devices without category')}
                                    />
                                )}
                            </Box>
                            <div
                                style={{
                                    ...styles.wrapperItems,
                                    ...(startTheProcess ? styles.startTheProcess : undefined),
                                }}
                            >
                                {!arrayDevice.length && (
                                    <div style={styles.emptyList}>{I18n.t('The list of devices to copy is empty')}</div>
                                )}
                                {arrayDevice.map(device => (
                                    <Box
                                        sx={styles.deviceWrapper}
                                        style={{
                                            ...(checkDeviceInObjects(device.title, device.id)
                                                ? styles.backgroundRed
                                                : undefined),
                                            ...(checkEnumsScip(device.id) ? styles.backgroundSilver : undefined),
                                        }}
                                        key={device.id}
                                    >
                                        <div style={styles.wrapperNameAndId}>
                                            <div style={styles.wrapperCheckbox}>
                                                <Checkbox
                                                    disabled={
                                                        checkDeviceInObjects(device.title, device.id) ||
                                                        checkEnumsScip(device.id) ||
                                                        startTheProcess
                                                    }
                                                    checked={checkedSelect.indexOf(device.id) !== -1}
                                                    onChange={() => {
                                                        const newArray = JSON.parse(JSON.stringify(checkedSelect));
                                                        const indexCurrent = checkedSelect.indexOf(device.id);
                                                        if (indexCurrent !== -1) {
                                                            newArray.splice(indexCurrent, 1);
                                                            setCheckedSelect(newArray);
                                                        } else {
                                                            newArray.push(device.id);
                                                            setCheckedSelect(newArray);
                                                        }
                                                    }}
                                                />
                                                <div style={styles.tableIcon}>
                                                    <DeviceTypeIcon
                                                        src={device.icon}
                                                        style={styles.tableIconImg}
                                                        type={device.role as Types}
                                                    />
                                                </div>
                                                <div style={styles.wrapperTitleAndId}>
                                                    <Box style={styles.fontStyle}>{device.title}</Box>
                                                    <Box style={styles.fontStyleId}>{device.id}</Box>
                                                </div>
                                                <Tooltip
                                                    title={I18n.t('Edit')}
                                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                                >
                                                    <div>
                                                        <IconButton
                                                            onClick={() => setOpenEdit(device)}
                                                            disabled={startTheProcess}
                                                        >
                                                            <IconEdit />
                                                        </IconButton>
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div style={styles.enumsWrapper}>
                                            {renderEnumCell(device.id, 'functions')}
                                            {renderEnumCell(device.id, 'rooms')}
                                            {/* {checkDeviceInObjects(device.title, device.id)} */}
                                        </div>
                                    </Box>
                                ))}
                            </div>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        autoFocus
                        disabled={!checkedSelect.length || startTheProcess}
                        onClick={async () => {
                            setStartTheProcess(true);
                            await onChangeCopy();
                            onClose();
                        }}
                        startIcon={<IconCheck />}
                        color="primary"
                    >
                        {I18n.t('Import')}
                    </Button>
                    <Button
                        variant="contained"
                        disabled={startTheProcess}
                        onClick={() => onClose()}
                        startIcon={<IconClose />}
                        color="grey"
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}
