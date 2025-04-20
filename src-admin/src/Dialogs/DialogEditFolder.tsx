import React, { useEffect, useState } from 'react';

import {
    Button,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    Checkbox,
    FormControlLabel,
    TextField,
    ThemeProvider,
} from '@mui/material';

import { Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import { I18n, Utils, Theme, type AdminConnection } from '@iobroker/adapter-react-v5';

import UploadImage from '../Components/UploadImage';
import type { PatternControlEx } from '../types';
import { copyDevice, getParentId } from '../Components/helpers/utils';

const styles: Record<string, React.CSSProperties> = {
    paper: {
        maxWidth: 600,
        width: '100%',
    },
    overflowHidden: {
        display: 'flex',
    },
    pre: {
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        margin: 0,
    },
    divOids: {
        display: 'inline-block',
        width: '100%',
        verticalAlign: 'top',
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
};

const emptyObj: ioBroker.FolderObject = {
    _id: '',
    common: {
        name: '',
        color: undefined,
        icon: undefined,
    },
    native: {},
    type: 'folder',
};

function DialogEditFolder(props: {
    onClose: (changed?: boolean) => void;
    data?: ioBroker.Object;
    socket: AdminConnection;
    devices: PatternControlEx[];
    objects: Record<string, ioBroker.Object>;
    deleteDevice: (index: number, devices?: PatternControlEx[]) => Promise<PatternControlEx[]>;
    selected?: string;
    newFolder?: boolean;
}): React.JSX.Element {
    const { onClose, data, socket, devices, objects, deleteDevice, selected, newFolder } = props;
    const [dataEdit, setDataEdit] = useState(newFolder ? emptyObj : JSON.parse(JSON.stringify(data)));
    const [arrayObjects, setArrayObjects] = useState<
        (ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject)[]
    >([]);
    const [name, setName] = useState(
        Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()) === 'undefined'
            ? dataEdit.common.name[Object.keys(dataEdit.common.name)[0]]
            : Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()),
    );
    const [startTheProcess, setStartTheProcess] = useState(false);

    const checkIdSelected = (newPart?: string): string | undefined => {
        newPart ||= selected;
        if (newPart && objects[newPart]?.type && objects[newPart]?.type !== 'folder') {
            return checkIdSelected(getParentId(newPart));
        }
        return newPart?.startsWith('alias.0') ? newPart : 'alias.0';
    };

    const [newId, setId] = useState(newFolder ? checkIdSelected() : data!._id);
    const [rootCheck, setRootCheck] = useState<string | undefined>(newId === 'alias.0' ? 'alias.0' : undefined);

    useEffect(() => {
        const idsObject = data?._id
            ? Object.keys(objects)
                  .filter(el => el === data._id || el.startsWith(`${data._id}.`))
                  .filter(
                      id =>
                          objects[id].type === 'folder' ||
                          objects[id].type === 'channel' ||
                          objects[id].type === 'device',
                  )
                  .map(id => objects[id] as ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject)
            : [];

        setArrayObjects(idsObject);
    }, [data?._id, objects]);

    function getNonEmptyName(obj: ioBroker.Object): string {
        const lang = I18n.getLanguage();
        const name = Utils.getObjectNameFromObj(obj, lang);
        if (name) {
            return name;
        }
        if (obj?.common?.name && typeof obj.common.name === 'object') {
            return (
                obj.common.name[lang] ||
                obj.common.name.en ||
                obj.common.name[Object.keys(obj.common.name)[0] as ioBroker.Languages] ||
                ''
            );
        }
        return (obj?.common?.name as string) || '';
    }

    const addNewFolder = async (
        dataFolder: {
            name: ioBroker.StringOrTranslated;
            color: string | undefined;
            icon: string | undefined;
        },
        id: string,
    ): Promise<void> => {
        const obj: ioBroker.FolderObject = {
            _id: id,
            common: {
                name:
                    typeof dataFolder.name === 'string'
                        ? ({ [I18n.getLanguage()]: dataFolder.name } as ioBroker.StringOrTranslated)
                        : dataFolder.name,
                color: dataFolder.color,
                icon: dataFolder.icon,
            },
            native: {},
            type: 'folder',
        };
        await socket.setObject(id, obj);
    };

    const getIdFromName = (obj?: ioBroker.Object): string => {
        obj ||= dataEdit;

        if (!obj?.common?.name) {
            return data!._id;
        }

        let name: string;
        if (typeof obj.common.name !== 'string') {
            name =
                obj.common.name[I18n.getLanguage()] ||
                obj.common.name.en ||
                obj.common.name[Object.keys(obj?.common?.name)[0] as ioBroker.Languages] ||
                '';
        } else {
            name = obj.common.name;
        }

        let parentId: string;
        if (newFolder) {
            parentId = newId!;
        } else {
            parentId = getParentId(data!._id);
        }
        return `${parentId}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
    };

    const onChangeCopy = async (): Promise<void> => {
        let newDevices: PatternControlEx[] = JSON.parse(JSON.stringify(devices));

        const parentId = `${getParentId(data!._id)}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;

        let deleteFolderID = '';
        for (let i = 0; i < arrayObjects.length; i++) {
            const el = arrayObjects[i];
            const newId = el._id.replace(data!._id, parentId);
            if (el.type === 'folder') {
                await addNewFolder(data!._id === el._id ? dataEdit.common : el.common, newId);
                deleteFolderID = el._id;
            } else {
                const device = newDevices.find(device => el._id === device.channelId);
                if (device?.channelId) {
                    await copyDevice(newId, {
                        socket: this.props.socket,
                        objects: this.props.objects,
                        deviceToCopy: device,
                        channelObj: el,
                    });

                    newDevices = await deleteDevice(newDevices.indexOf(device));
                }
            }
        }

        // Delete folder and all object
        deleteFolderID && (await socket.delObjects(deleteFolderID, true));
    };

    const onCloseLocal = async (changed?: boolean): Promise<void> => {
        if (!startTheProcess && changed) {
            setStartTheProcess(true);
            if (newFolder) {
                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                newDataEdit._id = `${newId}.${name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
                await socket.setObject(newDataEdit._id, newDataEdit);
            } else {
                // If name and ID were changed
                if (getNonEmptyName(dataEdit) !== getNonEmptyName(data!)) {
                    await onChangeCopy();
                } else if (JSON.stringify(dataEdit) !== JSON.stringify(data)) {
                    await socket.setObject(dataEdit._id, dataEdit);
                }
            }
        }

        onClose();
    };

    const id = getIdFromName();

    return (
        <ThemeProvider theme={Theme(Utils.getThemeName())}>
            <Dialog
                onClose={() => onCloseLocal()}
                open={!0}
                sx={{ '& .MuiDialog-paper': styles.paper }}
            >
                <DialogTitle>
                    {I18n.t(!newFolder ? 'Edit folder %s' : 'Add new folder %s', newId)}
                    {name && newFolder ? `.${name}` : ''}
                </DialogTitle>
                <DialogContent
                    style={styles.overflowHidden}
                    dividers
                >
                    <div style={styles.divOids}>
                        {newFolder && (
                            <FormControlLabel
                                disabled={rootCheck === newId}
                                control={
                                    <Checkbox
                                        checked={!!rootCheck}
                                        onChange={() => {
                                            let newRootCheck: string | undefined;
                                            let newRoot = rootCheck;
                                            if (!rootCheck) {
                                                newRootCheck = newId;
                                                newRoot = 'alias.0';
                                            }
                                            setRootCheck(newRootCheck);
                                            setId(newRoot);
                                        }}
                                    />
                                }
                                label={I18n.t('Add to root')}
                            />
                        )}
                        <div style={styles.divOidField}>
                            <div style={styles.oidName}>{I18n.t('Name')}</div>
                            <TextField
                                variant="standard"
                                key="_name"
                                fullWidth
                                autoFocus
                                onKeyUp={ev => {
                                    if (ev.key === 'Enter') {
                                        // if (dataEdit.common.name && JSON.stringify(dataEdit) !== JSON.stringify(data)) {
                                        //     cb(dataEdit);
                                        // } else {
                                        //     cb(false);
                                        // }
                                        ev.preventDefault();
                                        void onCloseLocal(true);
                                    }
                                }}
                                value={name || ''}
                                error={!!objects[id] || !name}
                                disabled={startTheProcess}
                                onChange={e => {
                                    const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                    newDataEdit.common.name = e.target.value;
                                    setDataEdit(newDataEdit);

                                    if (!newFolder) {
                                        const parentId = getParentId(data!._id);
                                        setId(
                                            `${parentId}.${e.target.value.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`,
                                        );
                                    }

                                    setName(e.target.value);
                                }}
                                margin="normal"
                            />
                        </div>
                        <div style={styles.divOidField}>
                            <div style={styles.oidName}>{I18n.t('Color')}</div>
                            <TextField
                                variant="standard"
                                key="_color"
                                disabled={startTheProcess}
                                // fullWidth
                                value={dataEdit?.common?.color || ''}
                                style={{ width: 'calc(100% - 40px)' }}
                                onChange={e => {
                                    const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                    newDataEdit.common.color = e.target.value;
                                    setDataEdit(newDataEdit);
                                }}
                            />
                            <TextField
                                variant="standard"
                                key="_color1"
                                type="color"
                                disabled={startTheProcess}
                                value={dataEdit?.common?.color || ''}
                                style={{ width: 40 }}
                                onChange={e => {
                                    const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                    newDataEdit.common.color = e.target.value;
                                    setDataEdit(newDataEdit);
                                }}
                            />
                        </div>
                        <UploadImage
                            crop={false}
                            disabled={startTheProcess}
                            // maxSize={256 * 1024}
                            icon={dataEdit?.common?.icon}
                            removeIconFunc={() => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.icon = '';
                                setDataEdit(newDataEdit);
                            }}
                            onChange={(base64: string): void => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.icon = base64;
                                setDataEdit(newDataEdit);
                            }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        autoFocus
                        disabled={
                            JSON.stringify(dataEdit) === JSON.stringify(data) ||
                            !dataEdit.common.name ||
                            (!!objects[id] && getIdFromName(dataEdit) !== getIdFromName(data)) ||
                            startTheProcess
                        }
                        onClick={() => onCloseLocal(true)}
                        startIcon={<IconCheck />}
                        color="primary"
                    >
                        {I18n.t('Save')}
                    </Button>
                    <Button
                        variant="contained"
                        disabled={startTheProcess}
                        onClick={() => onCloseLocal(false)}
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

DialogEditFolder.defaultProps = {
    data: emptyObj,
    selected: 'alias.0',
};

export default DialogEditFolder;
