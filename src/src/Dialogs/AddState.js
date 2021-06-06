import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import { Checkbox, DialogTitle, FormControl, FormControlLabel, InputLabel, makeStyles, MenuItem, Paper, Select, TextField, ThemeProvider } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';

import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';

import I18n from '@iobroker/adapter-react/i18n';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';

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
        width: 'calc(100% - 64px)'
    },
    overflowHidden: {
        display: 'flex',
        flexDirection: 'column',
        border: 'none'
        // overflow: 'hidden'
    },
    pre: {
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        margin: 0
    },
    showDialog: {
        marginTop: 10
    },
    nameField: {
        marginTop: 10
    },
    roleField: {
        marginTop: 10

    },
    typeField: {
        marginTop: 10

    },
    unitField: {
        // marginTop: 10

    },
    minField: {
        marginTop: 10,
        marginRight: 10

    },
    maxField: {
        marginTop: 10

    },
    minMax: {
        display: 'flex'
    }
}));

const typeArray = [
    'string',
    'boolean',
    'number',
    'file',
];

const AddState = ({ cb, objects, socket, channelId, arrayStateDefault }) => {
    const classes = useStyles();
    const [open, setOpen] = useState(true);
    const [role, setRole] = useState(null);
    const [roleInput, setRoleInput] = useState(null);
    const [roles, setRoles] = useState([]);
    const [name, setName] = useState('NEW_STATE');
    const [unit, setUnit] = useState('');
    const [type, setType] = useState('string');
    const [checkedRead, setCheckedRead] = useState(true);
    const [checkedWrite, setCheckedWrite] = useState(true);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(100);

    useEffect(() => {
        let rolesArr = [];
        Object.keys(objects).forEach(key => {
            const obj = objects[key];
            if (obj) {
                const common = obj.common;
                const role = common && common.role;
                if (role && !rolesArr.includes(role)) {
                    rolesArr.push(role);
                }
            }
        });
        setRoles(rolesArr.sort());
    }, [objects])

    const onClose = () => {
        setOpen(false);
        if (node) {
            document.body.removeChild(node);
            node = null;
        }
    };

    return <ThemeProvider theme={theme(Utils.getThemeName())}>
        <Dialog
            onClose={onClose}
            open={open}
            classes={{ paper: classes.paper }}
        >
            <DialogTitle>{I18n.t('Add state %s', `${channelId}.${name}`)}</DialogTitle>
            <DialogContent className={classes.overflowHidden} dividers>
                <Paper className={classes.showDialog} style={{ padding: `10px 20px` }} p={3}>
                    <TextField
                        fullWidth
                        value={name}
                        error={!name || objects[`${channelId}.${name}`] || arrayStateDefault.find(item => item.name === name)}
                        className={classes.nameField}
                        label={I18n.t('Name')}
                        onChange={e => setName(e.target.value?.toUpperCase())}
                    />
                    <Autocomplete
                        freeSolo
                        options={roles}
                        className={classes.roleField}
                        style={{ width: '100%' }}
                        value={role}
                        onChange={(event, role) => {
                            setRole(role);
                            setRoleInput(role);
                        }}
                        onInputChange={(event, role) => setRoleInput(role)}
                        renderInput={params => <TextField
                            {...params}
                            label={I18n.t('Role')}
                        // variant="outlined"
                        />}
                    />
                    <FormControl fullWidth
                        className={classes.typeField}>
                        <InputLabel>{I18n.t('Type')}</InputLabel>
                        <Select
                            fullWidth
                            value={type}
                            onChange={e => setType(e.target.value)}
                        >
                            {typeArray.map(key => <MenuItem key={key} value={key}>{I18n.t(key)}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {type !== 'file' &&
                        <>
                            <FormControlLabel
                                control={<Checkbox checked={checkedRead} onChange={e => setCheckedRead(e.target.checked)} />}
                                label={I18n.t('Readable')}
                            />
                            <FormControlLabel
                                control={<Checkbox checked={checkedWrite} onChange={e => setCheckedWrite(e.target.checked)} />}
                                label={I18n.t('Writable')}
                            />
                        </>
                    }
                    {type === 'number' && <TextField
                        fullWidth
                        value={unit}
                        className={classes.unitField}
                        label={I18n.t('Unit')}
                        onChange={e => setUnit(e.target.value)}
                    />}
                    {type === 'number' && <div className={classes.minMax}>
                        <TextField
                            fullWidth
                            value={min}
                            type="number"
                            className={classes.minField}
                            label={I18n.t('Min')}
                            onChange={e => setMin(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            value={max}
                            type="number"
                            className={classes.maxField}
                            label={I18n.t('Max')}
                            onChange={e => setMax(e.target.value)}
                        />
                    </div>}
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    disabled={!name || objects[`${channelId}.${name}`] || arrayStateDefault.find(item => item.name === name)}
                    onClick={async () => {
                        onClose();
                        let obj = {
                            _id: `${channelId}.${name}`,
                            common: {
                                name,
                                role: roleInput,
                                type,
                            },
                            type: 'state'
                        };
                        if (type === 'number') {
                            obj.common.min = min;
                            obj.common.max = max;
                            obj.common.unit = unit;

                        }
                        if (type !== 'file') {
                            obj.common.read = checkedRead;
                            obj.common.write = checkedWrite;
                        }
                        cb(obj);
                        await socket.setObject(`${channelId}.${name}`, obj);
                    }}
                    startIcon={<IconCheck />}
                    color="primary">
                    {I18n.t('Add')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => onClose()}
                    startIcon={<IconClose />}
                    color="default">
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export const addStateCallBack = (cb, objects, socket, channelId, arrayStateDefault) => {
    if (!node) {
        node = document.createElement('div');
        node.id = 'renderModal';
        document.body.appendChild(node);
    }

    return ReactDOM.render(
        <AddState
            arrayStateDefault={arrayStateDefault}
            channelId={channelId}
            socket={socket}
            objects={objects}
            cb={cb}
        />, node);
}