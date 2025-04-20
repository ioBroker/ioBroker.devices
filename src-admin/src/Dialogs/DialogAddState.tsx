import React, { useEffect, useState } from 'react';

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

import { I18n, Theme, Utils, type AdminConnection } from '@iobroker/adapter-react-v5';
import type { DetectorState } from '@iobroker/type-detector';

const styles: Record<string, any> = {
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

interface DialogAddStateProps {
    editState: string | null;
    objects: Record<string, ioBroker.Object>;
    socket: AdminConnection;
    channelId: string;
    arrayStateDefault: DetectorState[];
    onClose: (obj?: ioBroker.StateObject) => void;
}

function DialogAddState(props: DialogAddStateProps): React.JSX.Element {
    const { onClose, objects, socket, channelId, arrayStateDefault, editState } = props;
    const [open, setOpen] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [roleInput, setRoleInput] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [name, setName] = useState('NEW_STATE');
    const [unit, setUnit] = useState<undefined | string>('');
    const [type, setType] = useState<ioBroker.CommonType>('string');
    const [checkedRead, setCheckedRead] = useState(true);
    const [checkedWrite, setCheckedWrite] = useState(true);
    const [min, setMin] = useState<undefined | number | string>(0);
    const [max, setMax] = useState<undefined | number | string>(100);
    const [step, setStep] = useState<undefined | number | string>(0);
    const [checkedStates, setCheckedStates] = useState(false);

    useEffect(() => {
        const rolesArr: string[] = [];
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
            const newObj: ioBroker.StateObject = objects[editState] as ioBroker.StateObject;
            if (newObj) {
                setType(newObj.common.type);
                setRole(newObj.common.role);
                if (newObj.common.name && typeof newObj.common.name === 'object') {
                    setName(
                        newObj.common.name[I18n.getLanguage()] ||
                            newObj.common.name.en ||
                            newObj.common.name[Object.keys(newObj.common.name)[0] as ioBroker.Languages] ||
                            '',
                    );
                } else {
                    setName(newObj.common.name || '');
                }

                if (newObj.common.type === 'number') {
                    setMin(newObj.common.min);
                    setMax(newObj.common.max);
                    setUnit(newObj.common.unit);
                    setStep(newObj.common.step);
                    setCheckedStates(!!newObj.common.states);
                }
                // @ts-expect-error file is deprecated
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
                    <Paper style={{ ...styles.showDialog, padding: `10px 20px` }}>
                        <TextField
                            variant="standard"
                            fullWidth
                            value={name || ''}
                            error={
                                !name ||
                                (objects[`${channelId}.${name}`] && editState !== `${channelId}.${name}`) ||
                                !!arrayStateDefault.find(item => item.name === name)
                            }
                            style={styles.nameField}
                            label={I18n.t('Name')}
                            onChange={e => setName(e.target.value?.toUpperCase())}
                        />
                        <Autocomplete
                            freeSolo
                            options={roles}
                            style={{ ...styles.roleField, width: '100%' }}
                            value={role || ''}
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
                                value={type || ''}
                                onChange={e => setType(e.target.value as ioBroker.CommonType)}
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
                        {/* @ts-expect-error file is deprecated */}
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
                                value={unit || ''}
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
                                    value={min === undefined ? '' : min}
                                    type="number"
                                    style={styles.minField}
                                    label={I18n.t('Min')}
                                    onChange={e => setMin(e.target.value)}
                                />
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={max === undefined ? '' : max}
                                    type="number"
                                    style={styles.minField}
                                    label={I18n.t('Max')}
                                    onChange={e => setMax(e.target.value)}
                                />
                                <TextField
                                    variant="standard"
                                    fullWidth
                                    value={step === undefined ? '' : step}
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
                            !!(editState && editState !== `${channelId}.${name}` && objects[`${channelId}.${name}`]) ||
                            !!arrayStateDefault.find(item => item.name === name)
                        }
                        onClick={async () => {
                            setOpen(false);
                            let obj: ioBroker.StateObject = {
                                _id: `${channelId}.${name}`,
                                common: {
                                    name,
                                    role: roleInput || 'state',
                                    type,
                                } as ioBroker.StateCommon,
                                type: 'state',
                                native: {},
                            };
                            if (editState) {
                                obj = JSON.parse(JSON.stringify(objects[editState]));
                                obj._id = `${channelId}.${name}`;
                                obj.common.name = name;
                                obj.common.role = roleInput || 'state';
                                obj.common.type = type;
                            }
                            if (type === 'number') {
                                obj.common.min = parseFloat((min || 0).toString().replace(',', '.'));
                                obj.common.max = parseFloat(
                                    (max === undefined ? 100 : max).toString().replace(',', '.'),
                                );
                                obj.common.unit = unit;
                                if (step || step === 0) {
                                    obj.common.step = parseFloat(step.toString().replace(',', '.'));
                                }
                                if (checkedStates) {
                                    obj.common.states ||= {};
                                } else if (obj.common.states) {
                                    delete obj.common.states;
                                }
                            }
                            // @ts-expect-error file is deprecated
                            if (type !== 'file') {
                                obj.common.read = checkedRead;
                                obj.common.write = checkedWrite;
                            }
                            await socket.setObject(`${channelId}.${name}`, obj);
                            onClose(obj);
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
}

export default DialogAddState;
