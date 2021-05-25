import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

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

let node = null;

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

const EditFolder = ({ cb, data, socket, devices, objects, deleteDevice }) => {
    const classes = useStyles();
    const [open, setOpen] = useState(true);
    const [dataEdit, setDataEdit] = useState(data);
    const [arrayObjects, setArrayObjects] = useState([]);
    const [name, setName] = useState(Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()) === 'undefined' ? dataEdit.common.name[Object.keys(dataEdit.common.name)[0]] : Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()))
    const [newId, setId] = useState(data._id);
    useEffect(() => {
        const idsObject = Object.keys(objects).filter((el) => el.includes(data._id)).map(id => objects[id]);
        setArrayObjects(idsObject);
    }, [objects, data._id]);

    const onClose = () => {
        if (
            (Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()) === 'undefined' ? dataEdit.common.name[Object.keys(dataEdit.common.name)[0]] : Utils.getObjectNameFromObj(dataEdit, I18n.getLanguage()))
            !==
            (Utils.getObjectNameFromObj(data, I18n.getLanguage()) === 'undefined' ? data.common.name[Object.keys(data.common.name)[0]] : Utils.getObjectNameFromObj(data, I18n.getLanguage()))) {
            onChangeCopy(cb);
        } else {
            socket.setObject(dataEdit._id, dataEdit)
                .then(cb)
        }
        setOpen(false);
        if (node) {
            document.body.removeChild(node);
            node = null;
        }
    };

    const addNewFolder = async (dataFolder, id, cb) => {
        const obj = {
            _id: id,
            common: {
                name: { [I18n.getLanguage()]: dataFolder.name },
                color: dataFolder.color,
                icon: dataFolder.icon
            },
            native: {},
            type: 'folder'
        };

        objects[obj._id] = obj;
        await socket.setObject(id, obj).then(() => {
            cb && cb()
        });
    }

    const addToEnum = (enumId, id) => {
        socket.getObject(enumId)
            .then(obj => {
                if (obj && obj.common) {
                    obj.common.members = obj.common.members || [];

                    if (!obj.common.members.includes(id)) {
                        obj.common.members.push(id);
                        obj.common.members.sort();
                        objects[enumId] = obj;
                        return socket.setObject(enumId, obj);
                    }
                }
            });
    }

    const processTasks = (tasks, cb) => {
        if (!tasks || !tasks.length) {
            cb && cb();
        } else {
            const task = tasks.shift();
            let promises = [];

            if (task.enums) {
                promises = task.enums.map(enumId => addToEnum(enumId, task.id))
            }
            objects[task.id] = task.obj;
            promises.push(socket.setObject(task.id, task.obj));

            Promise.all(promises)
                .then(() => setTimeout(() =>
                    processTasks(tasks, cb), 0));
        }
    }

    const onCopyDevice = (copyDevice, newChannelId, cb) => {
        if (!copyDevice) {
            return null
        }
        // if this is device not from linkeddevice or from alias
        const channelId = copyDevice.channelId;
        const isAlias = channelId.startsWith('alias.') || channelId.startsWith('linkeddevices.');

        const channelObj = objects[channelId];
        const { functions, rooms, icon, states, color } = copyDevice;
        const tasks = [];

        tasks.push({
            id: newChannelId,
            obj: {
                common: {
                    name: channelObj.common.name,
                    color: color,
                    desc: channelObj.common.desc,
                    role: channelObj.common.role,
                    icon: icon && icon.startsWith('adapter/') ? `../../${icon}` : icon,
                },
                type: 'channel'
            },
            enums: rooms.concat(functions)
        });
        console.log(2222233444, tasks)
        states.forEach(state => {
            if (!state.id) {
                return;
            }
            const obj = JSON.parse(JSON.stringify(objects[state.id]));
            obj._id = newChannelId + '.' + state.name;

            obj.native = {};
            if (!isAlias) {
                obj.common.alias = { id: state.id };
            }
            tasks.push({ id: obj._id, obj });
        });
        return new Promise((resolve) => {
            processTasks(tasks, () => {
                resolve();
                cb();
            });
        })
    }

    const generateId = () =>{
        if(typeof dataEdit.common.name !== 'string'){
            return false;
        }else if(!dataEdit.common.name){
            return data._id;
        }
        let parts = data._id.split('.');
        parts.pop();
        parts = parts.join('.');
        parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
       return parts;

    }

    const onChangeCopy = () => {
        let parts = data._id.split('.');
        parts.pop();
        parts = parts.join('.');
        parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
        arrayObjects.forEach(async el => {
            const newId = el._id.replace(data._id, parts);
            if (el.type === 'folder') {
                addNewFolder(dataEdit.common, newId, () => socket.delObjects(el._id, true));
            } else {
                const device = devices.find(device => el._id === device.channelId);
                await onCopyDevice(device, newId, () => deleteDevice(devices.indexOf(device)));
            }
        })
        return cb && cb();
    }

    return <ThemeProvider theme={theme(Utils.getThemeName())}>
        <Dialog
            onClose={onClose}
            open={open}
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
                                    if (dataEdit.common.name && JSON.stringify(dataEdit) !== JSON.stringify(data)) {
                                        cb(dataEdit);
                                    } else {
                                        cb(false);
                                    }
                                    onClose();
                                    ev.preventDefault();
                                }
                            }}
                            value={name}
                            className={classes.oidField}
                            error={!!objects[generateId()]}
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
                        crop
                        icons
                        className={classes.sizeDropZone}
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
                    disabled={JSON.stringify(dataEdit) === JSON.stringify(data) || !dataEdit.common.name || !!objects[generateId()]}
                    onClick={() => {
                        onClose();
                        cb(dataEdit);
                    }}
                    startIcon={<IconCheck />}
                    color="primary">
                    {I18n.t('Write')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onClose();
                        cb(false);
                    }}
                    startIcon={<IconClose />}
                    color="default">
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export const editFolderCallBack = (data, cb, socket, devices, objects, deleteDevice) => {
    if (!node) {
        node = document.createElement('div');
        node.id = 'renderModal';
        document.body.appendChild(node);
    }
    return ReactDOM.render(<EditFolder deleteDevice={deleteDevice} objects={objects} socket={socket} devices={devices} data={data} cb={cb} />, node);
}