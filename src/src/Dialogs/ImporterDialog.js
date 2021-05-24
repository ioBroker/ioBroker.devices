import React from 'react';
// import ReactDOM from 'react-dom';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import {
    DialogTitle, makeStyles,
    // TextField, 
    ThemeProvider
} from '@material-ui/core';

import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';

import I18n from '@iobroker/adapter-react/i18n';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';
// import UploadImage from '../Components/UploadImage';

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

const ImporterDialog = ({ onClose }) => {
    const classes = useStyles();
    // const [open, setOpen] = useState(true);
    // const [dataEdit, setDataEdit] = useState(data);

    // console.log(222, data)

    // const onClose = () => {
    //     setOpen(false);

    // };

    return <ThemeProvider theme={theme(Utils.getThemeName())}>
        <Dialog
            onClose={onClose}
            open={true}
            classes={{ paper: classes.paper }}
        >
            <DialogTitle>{I18n.t('Importer')}</DialogTitle>
            <DialogContent className={classes.overflowHidden} dividers>
                <div className={classes.divOids}>
                    <div className={classes.divOidField}>
                        <div className={classes.oidName} >{I18n.t('Name')}</div>
                    </div>
                    <div className={classes.divOidField}>
                        <div className={classes.oidName} >{I18n.t('Color')}</div>
                        {/* <TextField
                            key="_color"
                            // fullWidth
                            value={dataEdit.common.color}
                            style={{ width: 'calc(100% - 40px)' }}
                            onChange={e => {
                                const newDataEdit = JSON.parse(JSON.stringify(dataEdit));
                                newDataEdit.common.color = e.target.value;
                                setDataEdit(newDataEdit);
                            }}
                        /> */}
                        {/* <TextField
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
                        /> */}
                    </div>
                    {/* <UploadImage
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
                    /> */}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    // disabled={JSON.stringify(dataEdit) === JSON.stringify(data)}
                    onClick={() => {
                        onClose();
                    }}
                    startIcon={<IconCheck />}
                    color="primary">
                    {I18n.t('Write')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onClose();
                    }}
                    startIcon={<IconClose />}
                    color="default">
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    </ThemeProvider>;
}

export default ImporterDialog;