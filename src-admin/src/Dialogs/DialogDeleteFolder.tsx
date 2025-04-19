import React, { useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, Checkbox, DialogTitle, FormControlLabel } from '@mui/material';

import { Close as IconClose, Delete as IconDelete } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
    paper: {
        maxWidth: 960,
        width: 'calc(100% - 64px)',
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
};

export default function DialogDeleteFolder(props: {
    device: boolean;
    onClose: (result: boolean, doNotShow?: boolean) => void;
}): React.JSX.Element {
    const { onClose, device } = props;
    const [open, setOpen] = useState(true);
    const [checked, setChecked] = useState(false);

    return (
        <Dialog
            onClose={() => setOpen(false)}
            open={open}
            sx={{ '& .MuiDialog-paper': styles.paper }}
        >
            <DialogTitle>{I18n.t('Please confirm...')}</DialogTitle>
            <DialogContent
                style={styles.overflowHidden}
                dividers
            >
                {I18n.t(
                    device
                        ? 'Device and all states will be deleted. Are you sure?'
                        : 'Folder will be deleted. Are you sure?',
                )}
                <div style={styles.showDialog}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={checked}
                                onChange={e => setChecked(e.target.checked)}
                            />
                        }
                        label={I18n.t('Do not show dialog for 5 minutes')}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    autoFocus
                    onClick={() => {
                        setOpen(false);
                        onClose(true, checked);
                    }}
                    startIcon={<IconDelete />}
                    color="primary"
                >
                    {I18n.t('Delete')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        setOpen(false);
                        onClose(false);
                    }}
                    startIcon={<IconClose />}
                    color="grey"
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
