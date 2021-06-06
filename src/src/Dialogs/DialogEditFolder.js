import React, { useEffect, useState } from 'react';
// import ReactDOM from 'react-dom';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import { DialogTitle, makeStyles, TextField, ThemeProvider } from '@material-ui/core';

import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';

import I18n from '@iobroker/adapter-react/i18n';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';
import UploadImage from '../Components/UploadImage';

// let node = null;

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        width: '100%',
        height: 'auto',
        display: 'flex'
    },
    paper: {
        maxWidth: 600,
        width: '100%'
    },
    overflowHidden: {
        display: 'flex',
        // overflow: 'hidden'
    },
    pre: {
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        margin: 0
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
        fontWeight: 'bold'
    },
}));

const DialogEditFolder = ({ onClose, data, socket, devices, objects, deleteDevice, processTasks }) => {
    const classes = useStyles();
    // const [open, setOpen] = useState(true);
    const [dataEdit, setDataEdit] = useState(JSON.parse(JSON.stringify(data)));
    const [arrayObjects, setArrayObjects] = useState([]);
    const [name, setName] = useState(Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()) === 'undefined' ? dataEdit.common.name[Object.keys(dataEdit.common.name)[0]] : Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()))
    const [newId, setId] = useState(data._id);
    const [startTheProcess, setStartTheProcess] = useState(false);

    useEffect(() => {
        const idsObject = Object.keys(objects).filter(el => el === data._id || el.startsWith(data._id + '.'))
            .filter(id => objects[id].type === 'folder' || objects[id].type === 'channel' || objects[id].type === 'device')
            .map(id => objects[id]);

        setArrayObjects(idsObject);
    }, [data._id, objects]);

    function getNonEmptyName(obj) {
        const lang = I18n.getLanguage();
        const name = Utils.getObjectNameFromObj(obj, lang);
        return name === 'undefined' ? obj.common.name[Object.keys(obj.common.name)[0]] : name
    }

    const onCloseLocal = async changed => {
        if (!startTheProcess && changed) {
            setStartTheProcess(true);

            // If name and ID were changed
            if (getNonEmptyName(dataEdit) !== getNonEmptyName(data)) {
                await onChangeCopy();
            } else if (JSON.stringify(dataEdit) !== JSON.stringify(data)) {
                await socket.setObject(dataEdit._id, dataEdit);
            }
        }

        onClose();
    };

    const addNewFolder = async (dataFolder, id) => {
        const obj = {
            _id: id,
            common: {
                name: typeof dataFolder.name === 'string' ? { [I18n.getLanguage()]: dataFolder.name } : dataFolder.name,
                color: dataFolder.color,
                icon: dataFolder.icon
            },
            native: {},
            type: 'folder'
        };
        await socket.setObject(id, obj);
    }

    const onCopyDevice = async (copyDevice, newChannelId, obj) => {
        if (!copyDevice && !copyDevice?.channelId) {
            return null;
        }
        // if this is device not from linkeddevice or from alias
        const channelId = copyDevice.channelId;
        const isAlias = channelId.startsWith('alias.') || channelId.startsWith('linkeddevices.');
        let channelObj = objects[channelId];
        if (!channelObj?.common) {
            if (obj) {
                channelObj = obj
            } else {
                return null;
            }
        }
        const { functions, rooms, icon, states, color, type } = copyDevice;
        const tasks = [];

        tasks.push({
            id: newChannelId,
            obj: {
                common: {
                    name: channelObj.common.name,
                    color: color,
                    desc: channelObj.common.desc,
                    role: type,
                    icon: icon && icon.startsWith('adapter/') ? `../../${icon}` : icon,
                },
                type: 'channel',
                native: channelObj.native || {}
            },
            enums: rooms.concat(functions)
        });

        states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(objects[state.id]));
            obj._id = newChannelId + '.' + state.name;

            if (!obj.native) {
                obj.native = {};
            }
            if (!isAlias) {
                obj.common.alias = { id: state.id };
            }
            tasks.push({ id: obj._id, obj });
        });

        await processTasks(tasks);
    }

    const generateId = () => {
        if (typeof dataEdit.common.name !== 'string') {
            return false;
        } else if (!dataEdit.common.name) {
            return data._id;
        }
        let parts = data._id.split('.');
        parts.pop();
        parts = parts.join('.');
        parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
        return parts;

    }

    const onChangeCopy = async () => {
        let newDevices = JSON.parse(JSON.stringify(devices));

        let parts = data._id.split('.');
        parts.pop();
        parts = parts.join('.');
        parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;

        let deleteFolderID = '';
        for (let i = 0; i < arrayObjects.length; i++) {
            const el = arrayObjects[i];
            const newId = el._id.replace(data._id, parts);
            if (el.type === 'folder') {
                await addNewFolder(data._id === el._id ? dataEdit.common : el.common, newId);
                deleteFolderID = el._id;
            } else {
                const device = newDevices.find(device => el._id === device.channelId);
                await onCopyDevice(device, newId, el);
                newDevices = await deleteDevice(newDevices.indexOf(device));
            }
        }

        // Delete folder and all object
        deleteFolderID && (await socket.delObjects(deleteFolderID, true));
    }

    return <ThemeProvider theme={theme(Utils.getThemeName())}>
        <Dialog
            onClose={() => onCloseLocal()}
            open={true}
            classes={{ paper: classes.paper }}
        >
            <DialogTitle>{I18n.t('Edit folder %s', newId)}</DialogTitle>
            <DialogContent className={classes.overflowHidden} dividers>
                <div className={classes.divOids}>
                    <div className={classes.divOidField}>
                        <div className={classes.oidName} >{I18n.t('Name')}</div>
                        <TextField
                            key="_name"
                            fullWidth
                            autoFocus
                            onKeyPress={(ev) => {
                                if (ev.key === 'Enter') {
                                    // if (dataEdit.common.name && JSON.stringify(dataEdit) !== JSON.stringify(data)) {
                                    //     cb(dataEdit);
                                    // } else {
                                    //     cb(false);
                                    // }
                                    onCloseLocal(true);
                                    ev.preventDefault();
                                }
                            }}
                            value={name}
                            className={classes.oidField}
                            error={!!objects[generateId()]}
                            disabled={startTheProcess}
                            onChange={e => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.name = e.target.value;
                                setDataEdit(newDataEdit);

                                let parts = data._id.split('.');
                                parts.pop();
                                parts = parts.join('.');
                                parts = `${parts}.${e.target.value.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
                                setName(e.target.value);
                                setId(parts);
                            }}
                            margin="normal"
                        />
                    </div>
                    <div className={classes.divOidField}>
                        <div className={classes.oidName} >{I18n.t('Color')}</div>
                        <TextField
                            key="_color"
                            disabled={startTheProcess}
                            // fullWidth
                            value={dataEdit.common.color}
                            style={{ width: 'calc(100% - 40px)' }}
                            onChange={e => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.color = e.target.value;
                                setDataEdit(newDataEdit);
                            }}
                        />
                        <TextField
                            key="_color1"
                            type="color"
                            style={{ width: 40 }}
                            disabled={startTheProcess}
                            value={dataEdit.common.color}
                            className={classes.oidField + ' ' + classes.colorButton}
                            onChange={e => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.color = e.target.value;
                                setDataEdit(newDataEdit);
                            }}
                        // margin="normal"
                        />
                    </div>
                    <UploadImage
                        crop={false}
                        icons
                        className={classes.sizeDropZone}
                        disabled={startTheProcess}
                        maxSize={256 * 1024}
                        icon={dataEdit.common.icon}
                        removeIconFunc={e => {
                            const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                            newDataEdit.common.icon = '';
                            setDataEdit(newDataEdit);
                        }}
                        onChange={base64 => {
                            const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                            newDataEdit.common.icon = base64;
                            setDataEdit(newDataEdit);
                        }}
                        t={I18n.t}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    disabled={JSON.stringify(dataEdit) === JSON.stringify(data) || !dataEdit.common.name || !!objects[generateId()] || startTheProcess}
                    onClick={() => onCloseLocal(true)}
                    startIcon={<IconCheck />}
                    color="primary">
                    {I18n.t('Save')}
                </Button>
                <Button
                    variant="contained"
                    disabled={startTheProcess}
                    onClick={() => onCloseLocal(false)}
                    startIcon={<IconClose />}
                    color="default">
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export default DialogEditFolder;