/**
 * Copyright 2019-2020 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import IconClose from '@material-ui/icons/Close';
import IconCheck from '@material-ui/icons/Check';

import { Types } from 'iobroker.type-detector';
import I18n from '@iobroker/adapter-react/i18n';
import Utils, { FORBIDDEN_CHARS } from '@iobroker/adapter-react/Components/Utils';
import TreeView from '../Components/TreeView';
import TypeIcon from '../Components/TypeIcon';

const styles = theme => ({
    header: {
        width: '100%',
        fontSize: 16,
        textTransform: 'capitalize',
        textAlign: 'center',
        paddingBottom: 20,
        color: '#000',
    },
    nameDiv: {
        width: '50%',
        display: 'inline-block',
        verticalAlign: 'top',
    },
    viewDiv: {
        width: '50%',
        display: 'inline-block',
    },
    type: {
        marginTop: 10
    },
    input: {
        width: 200
    },
    icon: {
        display: 'inline-block',
    },
    selectIcon: {
        paddingRight: theme.spacing(1),
        verticalAlign: 'middle',
        width: 20,
        height: 20
    },
    selectText: {
        verticalAlign: 'middle',
    },
    enumIcon: {
        width: 24,
        height: 24,
        marginRight: 10
    },
    renderValueWrapper: {
        display: 'flex'
    },
    renderValueCurrent: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 10
    },
    blockFields: {
        display: 'flex',
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        margin: 5
    },
    container: {
        display: 'flex',
        overflowX: 'hidden',
        flexFlow: 'wrap'
    },
    treeDiv: {
        width: '100%',
        flex: 1,
        margin: 5
    },
    titleColor: {
        '& h2': {
            overflow: 'hidden',
            direction: 'rtl',
            textOverflow: 'ellipsis',
            textAlign: 'end'
        },
    },
});

const UNSUPPORTED_TYPES = [
    Types.unknown
];

function getParentId(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(0, pos);
    } else {
        return '';
    }
}

function getLastPart(id) {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    } else {
        return id;
    }
}

class DialogNewDevice extends React.Component {
    constructor(props) {
        super(props);
        let i = 1;

        this.prefix = this.props.prefix || 'alias.0';

        while (this.props.objects[this.prefix + '.' + I18n.t('Device') + '_' + i]) {
            i++;
        }

        const prefix = this.prefix.startsWith('alias.') ? this.prefix.replace(/\d+$/, '') : this.prefix; // alias.0 => alias.

        // filter aliases
        const ids = [];

        Object.keys(this.props.objects).forEach(id => {
            if (id.startsWith(prefix) &&
                this.props.objects[id] &&
                this.props.objects[id].common &&
                (this.props.objects[id].type === 'channel' || this.props.objects[id].type === 'device' || this.props.objects[id].type === 'folder')) {
                let parentId;
                // getParentId
                if (this.props.objects[id].type === 'folder') {
                    parentId = id;
                } else {
                    parentId = getParentId(id);
                }

                if (parentId && !ids.includes(parentId)) {
                    ids.push(parentId);
                }
            }
        });

        this.typesWords = {};
        Object.keys(Types)
            .filter(id => !UNSUPPORTED_TYPES.includes(id))
            .forEach(typeId => this.typesWords[typeId] = I18n.t('type-' + Types[typeId]));

        // sort types by ABC in the current language
        this.types = Object.keys(this.typesWords).sort((a, b) => {
            if (this.typesWords[a] === this.typesWords[b]) {
                return 0;
            }
            if (this.typesWords[a] > this.typesWords[b]) {
                return 1;
            } else {
                return -1;
            }
        });

        const stateIds = {};
        const language = I18n.getLanguage();
        // console.log(2222, 45555, this.props.objects)
        ids.forEach(id => stateIds[id] = {
            common: {
                name: this.props.objects[id] && this.props.objects[id].type === 'folder' ? Utils.getObjectName(this.props.objects, id, { language }) : getLastPart(id),
                nondeletable: true,
                color: this.props.objects[id].common && this.props.objects[id].common.color ? this.props.objects[id].common.color : null,
                icon: this.props.objects[id].common && this.props.objects[id].common.icon ? this.props.objects[id].common.icon : null
            },
            type: 'folder'
        });

        stateIds[this.prefix] = {
            common: {
                name: I18n.t('Root'),
                nondeletable: true
            },
            type: 'folder'
        };
        const functionStorage = JSON.parse(window.localStorage.getItem('Devices.new.functions'));
        const roomsStorage = JSON.parse(window.localStorage.getItem('Devices.new.rooms'));
        this.state = {
            root: this.prefix,
            name: I18n.t('Device') + ' ' + i,
            notUnique: false,
            functions: !!roomsStorage && typeof functionStorage !== 'string' ? functionStorage : [],
            rooms: !!roomsStorage && typeof roomsStorage !== 'string' ? roomsStorage : [],
            type: window.localStorage.getItem('Devices.newType') || 'light',
            ids: stateIds
        };

    }
    renderSelectEnum(name, title) {
        const enums = this.props.enumIDs.filter(id => id.startsWith('enum.' + name + '.'));
        const language = I18n.getLanguage();
        const objs = enums.map(id => {
            return {
                name: Utils.getObjectName(this.props.objects, id, { language }),
                icon: Utils.getObjectIcon(id, this.props.objects[id]),
                id: id
            }
        });
        return (<FormControl className={this.props.classes.type}>
            <InputLabel>{title}</InputLabel>
            <Select
                className={this.props.classes.oidField}
                fullWidth
                multiple
                renderValue={(arrId) => {
                    const newArr = arrId.length && typeof arrId !== 'string' ? arrId.map(id => {
                        return {
                            name: Utils.getObjectName(this.props.objects, id, { language }),
                            icon: Utils.getObjectIcon(id, this.props.objects[id]),
                            id: id
                        }
                    }) : []
                    return <div className={this.props.classes.renderValueWrapper}>
                        {newArr.map(obj => (<div className={this.props.classes.renderValueCurrent} key={`${obj.id}-render`}>
                            {obj.icon ? (<img className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} />) : (<div className={this.props.classes.enumIcon} />)}
                            {obj.name}
                        </div>))}
                    </div>
                }}
                value={this.state[name] || []}
                onChange={e => {
                    localStorage.setItem('Devices.new.' + name, JSON.stringify(e.target.value));
                    this.setState({ [name]: e.target.value });
                }}
            >
                {objs.map(obj => (<MenuItem key={obj.id} icon={obj.icon} value={obj.id}>
                    {obj.icon ? (<img className={this.props.classes.enumIcon} src={obj.icon} alt={obj.id} />) : (<div className={this.props.classes.enumIcon} />)}
                    {obj.name}
                </MenuItem>))}
            </Select>
        </FormControl>);
    }

    generateId() {
        return `${this.state.root}.${this.state.name.replace(FORBIDDEN_CHARS, '_').replace(/\s/g, '_')}`;
    }

    handleOk = () => {
        // check if name is unique
        this.props.onClose && this.props.onClose({
            id: this.generateId(),
            type: this.state.type,
            name: this.state.name,
            functions: this.state.functions,
            rooms: this.state.rooms,
            prefix: this.prefix
        });
    }

    handleCancel = () => {
        // check if name is unique
        this.props.onClose && this.props.onClose(null);
    }

    showEnumIcon(name) {
        const obj = this.props.objects[this.state[name]];
        if (obj && obj.common && obj.common.icon) {
            return (<img className={this.props.classes.icon} src={obj.icon} alt="" />);
        } else {
            return null;
        }
    }

    addNewFolder(name, parentId, cb) {
        const id = `${parentId}.${name.replace(FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_')}`;
        const obj = {
            _id: id,
            common: {
                name: { [I18n.getLanguage()]: name },
            },
            native: {},
            type: 'folder'
        };

        this.props.objects[obj._id] = obj;

        // create folder
        this.props.socket.setObject(id, obj).then(() => {
            const ids = JSON.parse(JSON.stringify(this.state.ids));
            ids[id] = {
                common: { name },
                type: 'folder'
            };
            this.setState({ ids }, () => cb && cb());
        });
    }

    render() {
        const classes = this.props.classes;

        return (<Dialog
            open={true}
            maxWidth="md"
            fullWidth={true}
            onClose={() => this.handleCancel()}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle className={classes.titleBackground}
                classes={{ root: classes.titleColor }}
                id="edit-device-dialog-title">{I18n.t('Create new device')}: <b>{this.generateId()}</b></DialogTitle>
            <DialogContent className={classes.container}>
                <div className={classes.treeDiv}>
                    <TreeView
                        themeType={this.props.themeType}
                        theme={this.props.theme}
                        objects={this.state.ids}
                        onAddNew={(name, parentId, cb) => this.addNewFolder(name, parentId, cb)}
                        onSelect={id => this.setState({ root: id })}
                        root={this.prefix}
                    />
                </div>
                <div className={classes.blockFields}>
                    <TextField
                        fullWidth
                        label={I18n.t('Device name')}
                        error={!!this.props.objects[this.generateId()]}
                        className={classes.name}
                        value={this.state.name}
                        onChange={e => this.setState({ name: e.target.value })}
                        margin="normal"
                    />
                    <FormControl className={classes.type}>
                        <InputLabel htmlFor="age-helper">{I18n.t('Device type')}</InputLabel>
                        <Select
                            value={this.state.type}
                            onChange={e => {
                                localStorage.setItem('Devices.newType', e.target.value);
                                this.setState({ type: e.target.value });
                            }}
                        >
                            {this.types
                                .filter(id => !UNSUPPORTED_TYPES.includes(id))
                                .map(typeId => <MenuItem key={Types[typeId]} value={Types[typeId]}>
                                    <TypeIcon className={this.props.classes.selectIcon} type={Types[typeId]} style={{ color: this.props.themeType === 'dark' ? '#FFFFFF' : '#000' }} />
                                    <span className={this.props.classes.selectText}>{this.typesWords[typeId]}</span>
                                </MenuItem>)}
                        </Select>
                    </FormControl>
                    {this.renderSelectEnum('functions', I18n.t('Function'))}
                    {this.renderSelectEnum('rooms', I18n.t('Room'))}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={!!this.props.objects[this.generateId()]}
                    onClick={this.handleOk}
                    startIcon={<IconCheck />}
                    color="primary">{I18n.t('Create')}</Button>
                <Button
                    variant="contained"
                    onClick={this.handleCancel}
                    startIcon={<IconClose />}
                >{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>);
    }
}

DialogNewDevice.propTypes = {
    onClose: PropTypes.func,
    objects: PropTypes.object,
    theme: PropTypes.object,
    themeType: PropTypes.string,
    enumIDs: PropTypes.array,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogNewDevice);
