import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { makeStyles } from '@mui/styles';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { Checkbox, DialogTitle, FormControlLabel, ThemeProvider } from '@mui/material';

import IconClose from '@mui/icons-material/Close';
import IconDelete from '@mui/icons-material/Delete';

import I18n from '@iobroker/adapter-react-v5/i18n';
import theme from '@iobroker/adapter-react-v5/Theme';
import Utils from '@iobroker/adapter-react-v5/Components/Utils';

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
    }
}));

const DialogDeleteFolder = ({ cb, device }) => {
    const classes = useStyles();
    const [open, setOpen] = useState(true);
    const [checked, setChecked] = useState(false);

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
            <DialogTitle>{I18n.t('Please confirm...')}</DialogTitle>
            <DialogContent className={classes.overflowHidden} dividers>
                {I18n.t(device ? 'Device and all states will be deleted. Are you sure?' : 'Folder will be deleted. Are you sure?')}
                <div className={classes.showDialog}>
                    <FormControlLabel
                        control={<Checkbox checked={checked} onChange={e => setChecked(e.target.checked)} />}
                        label={I18n.t('Do not show dialog for 5 minutes')}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    onClick={() => {
                        onClose();
                        if (checked) {
                            window.localStorage.setItem(device ? 'DeleteDeviceTime' : 'DeleteFolderTime', new Date().getTime());
                        }
                        cb(true);
                    }}
                    startIcon={<IconDelete />}
                    color="primary">
                    {I18n.t('Delete')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onClose();
                        cb(false);
                    }}
                    startIcon={<IconClose />}
                    color="grey"
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export const deleteFolderAndDeviceCallBack = (cb, device = false) => {
    const time = window.localStorage.getItem(device ? 'DeleteDeviceTime' : 'DeleteFolderTime');
    const fiveMin = 1000 * 60 * 5;
    if (time && new Date().getTime() - time < fiveMin) {
        return cb(true);
    }
    if (!node) {
        node = document.createElement('div');
        node.id = 'renderModal';
        document.body.appendChild(node);
    }
    return ReactDOM.render(<DialogDeleteFolder cb={cb} device={device} />, node);
}