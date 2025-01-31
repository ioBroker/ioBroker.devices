import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import {
    Autocomplete,
    Checkbox,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    ThemeProvider,
} from '@mui/material';

import { Close as IconClose, Check as IconCheck } from '@mui/icons-material';

import { I18n, Theme, Utils } from '@iobroker/adapter-react-v5';

const styles = {
    paper: {
        maxWidth: 960,
        width: 'calc(100% - 64px)',
        '@media screen and (max-width: 450px)': {
            maxWidth: 960,
            width: 'calc(100% - 12px)',
            height: 'calc(100% - 12px)',
            maxHeight: 'calc(100% - 12px)',
            margin: 0,
        },
    },
    overflowHidden: {
        display: 'flex',
        flexDirection: 'column',
        border: 'none',
    },
    pre: {
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        margin: 0,
    },
    showDialog: {
        marginTop: 10,
    },
    nameField: {
        marginTop: 10,
    },
    roleField: {
        marginTop: 10,
    },
    typeField: {
        marginTop: 10,
    },
    unitField: {},
    minField: {
        marginTop: 10,
        marginRight: 10,
    },
    maxField: {
        marginTop: 10,
    },
    minMax: {
        display: 'flex',
    },
    overflowText: {
        '& h2': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
    },
};

const typeArray = ['string', 'boolean', 'number', 'file'];

const DialogAddState = ({ onClose, objects, socket, channelId, arrayStateDefault, editState }) => {
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
    const [step, setStep] = useState(0);
    const [checkedStates, setCheckedStates] = useState(false);

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

        if (editState) {
            const newObj = objects[editState];
            if (newObj) {
                setType(newObj.common.type);
                setRole(newObj.common.role);
                setName(newObj.common.name);
                if (newObj.common.type === 'number') {
                    setMin(newObj.common.min);
                    setMax(newObj.common.max);
                    setUnit(newObj.common.unit);
                    setStep(newObj.common.step);
                    setCheckedStates(!!newObj.common.states);
                }
                if (newObj.common.type !== 'file') {
                    setCheckedRead(newObj.common.read);
                    setCheckedWrite(newObj.common.write);
                }
            }
        }
    }, [editState, objects]);

    return (
        <ThemeProvider theme={Theme(Utils.getThemeName())}>
            <Dialog
                onClose={() => setOpen(false)}
                open={open}
                sx={{ '& .MuiDialog-paper': styles.paper }}
            >
                <DialogTitle sx={styles.overflowText}>
                    {I18n.t(editState ? 'Edit state %s' : 'Add state %s', `${channelId}.${name}`)}
                </DialogTitle>
                <DialogContent
                    style={styles.overflowHidden}
                    dividers
                >
                    <Paper
                        style={{ ...styles.showDialog, padding: `10px 20px` }}
                        p={3}
                    >
                        <TextField
                            variant="standard"
                            fullWidth
                            value={name}
                            error={
                                !name ||
                                (objects[`${channelId}.${name}`] && editState !== `${channelId}.${name}`) ||
                                arrayStateDefault.find(item => item.name === name)
                            }
                            style={styles.nameField}
                            label={I18n.t('Name')}
                            onChange={e => setName(e.target.value?.toUpperCase())}
                        />
                        <Autocomplete
                            freeSolo
                            options={roles}
                            style={{ ...styles.roleField, width: '100%' }}
                            value={role}
                            onChange={(event, role) => {
                                setRole(role);
                                setRoleInput(role);
                            }}
                            onInputChange={(event, role) => setRoleInput(role)}
                            renderInput={params => (
                                <TextField
                                    variant="standard"
                                    {...params}
                                    label={I18n.t('Role')}
                                    // variant="outlined"
                                />
                            )}
                        />
                        <FormControl
                            fullWidth
                            variant="standard"
                            style={styles.typeField}
                        >
                            <InputLabel>{I18n.t('Type')}</InputLabel>
                            <Select
                                variant="standard"
                                fullWidth
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                {typeArray.map(key => (
                                    <MenuItem
                                        key={key}
                                        value={key}
                                    >
                                        {key}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {type !== 'file' && (
                            <>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={checkedRead}
                                            onChange={e => setCheckedRead(e.target.checked)}
                                        />
                                    }
                                    label={I18n.t('Readable')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={checkedWrite}
                                            onChange={e => setCheckedWrite(e.target.checked)}
                                        />
                                    }
                                    label={I18n.t('Writable')}
                                />
                            </>
                        )}
                        {type === 'number' && (
                            <TextField
                                variant="standard"
                                fullWidth
                                value={unit}
                                style={styles.unitField}
                                label={I18n.t('Unit')}
                                onChange={e => setUnit(e.target.value)}
                            />
                        )}
                        {type === 'number' && (
                            <div style={styles.minMax}>
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={min}
                                    type="number"
                                    style={styles.minField}
                                    label={I18n.t('Min')}
                                    onChange={e => setMin(e.target.value)}
                                />
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={max}
                                    type="number"
                                    style={styles.minField}
                                    label={I18n.t('Max')}
                                    onChange={e => setMax(e.target.value)}
                                />
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={step}
                                    type="number"
                                    style={styles.maxField}
                                    label={I18n.t('Step')}
                                    onChange={e => setStep(e.target.value)}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={checkedStates}
                                            onChange={e => setCheckedStates(e.target.checked)}
                                        />
                                    }
                                    label={I18n.t('Value=>String')}
                                />
                            </div>
                        )}
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        autoFocus
                        disabled={
                            !name ||
                            (objects[`${channelId}.${name}`] && !editState) ||
                            (editState && editState !== `${channelId}.${name}` && objects[`${channelId}.${name}`]) ||
                            arrayStateDefault.find(item => item.name === name)
                        }
                        onClick={async () => {
                            setOpen(false);
                            let obj = {
                                _id: `${channelId}.${name}`,
                                common: {
                                    name,
                                    role: roleInput,
                                    type,
                                },
                                type: 'state',
                            };
                            if (editState) {
                                obj = JSON.parse(JSON.stringify(objects[editState]));
                                obj._id = `${channelId}.${name}`;
                                obj.common.name = name;
                                obj.common.role = roleInput;
                                obj.common.type = type;
                            }
                            if (type === 'number') {
                                obj.common.min = parseFloat(min.toString().replace(',', '.'));
                                obj.common.max = parseFloat(max.toString().replace(',', '.'));
                                obj.common.unit = unit;
                                if (step || step === 0) {
                                    obj.common.step = parseFloat(step.toString().replace(',', '.'));
                                }
                                if (checkedStates) {
                                    obj.common.states = obj.common.states || {};
                                } else if (obj.common.states) {
                                    delete obj.common.states;
                                }
                            }
                            if (type !== 'file') {
                                obj.common.read = checkedRead;
                                obj.common.write = checkedWrite;
                            }
                            await socket.setObject(`${channelId}.${name}`, obj);
                            onClose && onClose(obj);
                        }}
                        startIcon={<IconCheck />}
                        color="primary"
                    >
                        {I18n.t(editState ? 'Save' : 'Add')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setOpen(false)}
                        startIcon={<IconClose />}
                        color="grey"
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

DialogAddState.propTypes = {
    editState: PropTypes.string,
    objects: PropTypes.object,
    socket: PropTypes.object,
    arrayStateDefault: PropTypes.array,
    onClose: PropTypes.func.isRequired,
};

export default DialogAddState;
