import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import {
    Checkbox,
    DialogTitle, FormControl, IconButton, InputLabel, makeStyles,
    MenuItem,
    Select,
    // TextField, 
    ThemeProvider,
    Tooltip
} from '@material-ui/core';

import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';

import I18n from '@iobroker/adapter-react/i18n';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';
import TypeIcon from '../Components/TypeIcon';
import { MdModeEdit as IconEdit } from 'react-icons/md';
import clsx from 'clsx';
// import UploadImage from '../Components/UploadImage';

let node = null;

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        width: '100%',
        height: 'auto',
        display: 'flex'
    },
    paper: {
        maxWidth: 960,
        maxHeight: 'calc(100% - 64px)',
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
        display: 'flex',
        width: '100%',
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
    flex: {
        flex: 1
    },
    type: {
        width: '100%',
    },
    deviceWrapper: {
        display: 'flex',
        marginLeft: 10
    },
    fontStyle: {
        padding: '0px 8px',
        overflow: 'hidden',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis'
    },
    fontStyleId: {
        padding: '0px 8px',
        overflow: 'hidden',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        opacity: 0.6,
        fontSize: 9,
        fontStyle: 'italic'
    },
    wrapperTitleAndId: {
        alignSelf: 'center'
    },
    tableIcon: {
        margin: 'auto 0'
    },
    tableIconImg: {
        width: 20,
        height: 20
    },
    header: {
        display: 'flex',
        background: '#00000057',
        padding: 10,
        borderRadius: 4,
        marginBottom: 10
    },
    wrapperDevices: {
        margin: '0 10px'
    }
}));

const ImporterDialog = ({
    onClose,
    item,
    socket,
    devices,
    objects,
    listItems
}) => {
    const classes = useStyles();
    const [open, setOpen] = useState(true);
    const [arrayDevice, setArrayDevice] = useState([]);
    const [cloningMethod, setCloningMethod] = useState('flat');
    // const [dataEdit, setDataEdit] = useState(data);

    useEffect(() => {
        const id = `${item.parent}.${item.id.replace('system.adapter.', '')}`;
        const newArray = listItems.filter(device => device.parent === item.id);
        setArrayDevice(newArray);
        console.log(222, item.id, id, newArray)
    }, [item.id, item.parent, listItems]);

    console.log(222,
        item,
        socket,
        devices,
        objects,
        listItems)

    const onCloseModal = () => {
        setOpen(false);
        onClose();
        if (node) {
            document.body.removeChild(node);
            node = null;
        }
    };



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

    const onCopyDevice = (copyDevice, newChannelId, originalId, cb) => {
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
                native: {
                    originalId
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

    // const generateId = () => {
    //     if (typeof dataEdit.common.name !== 'string') {
    //         return false;
    //     } else if (!dataEdit.common.name) {
    //         return data._id;
    //     }
    //     let parts = data._id.split('.');
    //     parts.pop();
    //     parts = parts.join('.');
    //     parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
    //     return parts;

    // }

    // const addNewFolder = async (dataFolder, id, cb) => {
    //     const obj = {
    //         _id: id,
    //         common: {
    //             name: { [I18n.getLanguage()]: dataFolder.name },
    //             color: dataFolder.color,
    //             icon: dataFolder.icon
    //         },
    //         native: {},
    //         type: 'folder'
    //     };

    //     objects[obj._id] = obj;
    //     await socket.setObject(id, obj).then(() => {
    //         cb && cb()
    //     });
    // }

    const onChangeCopy = () => {
        // let parts = data._id.split('.');
        // parts.pop();
        // parts = parts.join('.');
        // parts = `${parts}.${dataEdit.common.name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`
        arrayDevice.forEach(async el => {
            let newId = `alias.0.${cloningMethod}`;
            newId = `${newId}.${el.title.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`

            const device = devices.find(device => el.id === device.channelId);
            console.log(2223, el, device)
            await onCopyDevice(device, newId, el.id, () => {

            });
        })
        // return cb && cb();
    }



    return <ThemeProvider theme={theme(Utils.getThemeName())}>
        <Dialog
            onClose={onCloseModal}
            open={open}
            classes={{ paper: classes.paper }}
        >
            <DialogTitle>{I18n.t('Importer  %s', item.title)}---> alias.0.{cloningMethod}</DialogTitle>
            <DialogContent className={classes.overflowHidden} dividers>
                <div className={classes.divOids}>
                    <div className={clsx(classes.flex, classes.wrapperDevices)}>
                        <div className={classes.header}>
                            <Checkbox
                                defaultChecked
                                indeterminate
                            />
                        </div>
                        {arrayDevice.map(device => <div className={classes.deviceWrapper} key={device.id}>
                            <Checkbox
                                defaultChecked
                            // indeterminate
                            />
                            <div className={classes.tableIcon}>
                                <TypeIcon src={device.icon} className={classes.tableIconImg} type={device.role} />
                            </div>
                            <div className={classes.wrapperTitleAndId}>
                                <div className={classes.fontStyle}>
                                    {device.title}
                                </div>
                                <div className={classes.fontStyleId}>
                                    {device.id}
                                </div>
                            </div>
                            <Tooltip title={I18n.t('Edit folder')}>
                                <IconButton
                                >
                                    <IconEdit />
                                </IconButton>
                            </Tooltip>
                        </div>)}
                    </div>
                    <div className={classes.flex}>
                        <FormControl className={classes.type}>
                            <InputLabel>{I18n.t('cloning method')}</InputLabel>
                            <Select
                                className={classes.oidField}
                                fullWidth
                                value={cloningMethod}
                                onChange={e => {
                                    setCloningMethod(e.target.value);
                                }}
                            >
                                <MenuItem value={'flat'}>
                                    {I18n.t('flat')}
                                </MenuItem>
                                <MenuItem value={'rooms'}>
                                    {I18n.t('rooms')}
                                </MenuItem>
                                <MenuItem value={'functions'}>
                                    {I18n.t('functions')}
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    // disabled={JSON.stringify(dataEdit) === JSON.stringify(data)}
                    onClick={() => {
                        // onCloseModal();
                        onChangeCopy();
                    }}
                    startIcon={<IconCheck />}
                    color="primary">
                    {I18n.t('Write')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onCloseModal();
                    }}
                    startIcon={<IconClose />}
                    color="default">
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export const importerCallBack = (
    onClose,
    item,
    socket,
    devices,
    objects,
    listItems
) => {
    if (!node) {
        node = document.createElement('div');
        node.id = 'renderModal';
        document.body.appendChild(node);
    }

    return ReactDOM.render(<ImporterDialog
        item={item}
        socket={socket}
        devices={devices}
        objects={objects}
        onClose={onClose}
        listItems={listItems}
    />, node);
}
// export default ImporterDialog;