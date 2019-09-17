/**
 * Copyright 2018 bluefox <dogafox@gmail.com>
 *
 * Licensed under the Creative Commons Attribution-NonCommercial License, Version 4.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Dropzone from 'react-dropzone';

import {MdDelete as IconDelete} from 'react-icons/md';
import {MdFileUpload as IconOpen} from 'react-icons/md';
import {MdClose as IconClose} from 'react-icons/md';
import {MdCameraAlt as IconCam} from 'react-icons/md';

import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';

import ImageList from './ImageList';
import ReactCrop/*, { makeAspectCrop } */from 'react-image-crop';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import 'react-image-crop/dist/ReactCrop.css'

// Icons
import IconList from './icons/icons';
import I18n from '@iobroker/adapter-react/i18n';

const style = {
    label: {
        color: 'rgba(0, 0, 0, 0.54)',
        fontSize: 12,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        lineHeight: 1,
        paddingTop: 10,
        paddingBottom: 5
    },
    dropzone: {
        marginTop: 20,
        width: 'calc(100% - 22px)',
        height: 65,
        marginLeft: 22,
        border: '2px dashed black',
        textAlign: 'center',
        paddingTop: 45,
        marginBottom: 5,
        borderRadius: 10
    },
    dropzoneRejected: {
        border: '2px dashed red',
    },
    dropzoneAccepted: {
        border: '2px dashed green',
    },
    imageButtons: {
        color: '#888888',
    },
    deleteIcon: {
        color: '#888888',
        opacity: 0.9,
        position: 'absolute',
        top: 10,
        right: 10
    },
    openIcon: {
        color: '#888888',
        opacity: 0.9,
        position: 'absolute',
        right: 10,
        zIndex: 10
    },
    camIcon: {
        position: 'absolute',
        bottom: 8,
        right: 3,
        zIndex: 10,
        cursor: 'pointer'
    },
    imageBar: {
        bar: {

        },
        imageButton: {

        },
        image: {

        }
    },
    'chart-dialog': {
        zIndex: 2101
    },
    'chart-dialog-paper': {
        width: 'calc(100% - 2em)',
        maxWidth: 'calc(100% - 2em)',
        height: 'calc(100% - 2em)',
        maxHeight: 'calc(100% - 2em)'
    },
    'chart-dialog-img': {

    },
    'chart-dialog-content': {
        width: 'calc(100% - 4em)',
        height: 'calc(100% - 4em)',
        cursor: 'pointer',
        textAlign: 'center',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
    },
};

class ImageSelector extends React.Component {
    constructor(props) {
        super(props);
        const state = {
            imageStatus: 'wait',
            image:  this.props.image,
            beforeCrop: null,
            images: this.props.images,
            opened: !this.props.image,
            cropOpened: false,
            crop: null,
            cropWidth: 100,
            cropHeight: 100
        };
        if (this.props.icons) {
            this.icons = IconList.List;
        }
        this.cropPixels = null;
        this.inputRef = React.createRef();
        this.cropRef = React.createRef();
        this.state = state;
    }

    componentWillUpdate(nextProps, nextState) {
        if (!this.props.icons && JSON.stringify(nextProps.images) !== JSON.stringify(this.state.images)) {
            this.setState({images: nextProps.images});
        }
    }

    /**
     * Crop image in the browser.
     *
     * @param {Object} imageData - Image File Object
     * @param {Object} crop - crop Object provided by react-image-crop
     * @param {String} fileName - File name
     * @param {Function} cb - Callback
     */
    static cropImage(imageData, crop, fileName, cb) {
        const image = new Image();
        // only in URL allowed names
        fileName = fileName.replace(/#\*\?=:\+/g, '_');
        image.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width  = Math.floor(image.width * crop.width / 100);
            canvas.height = Math.floor(image.height * crop.height / 100);
            const left = Math.floor(image.width * crop.x / 100);
            const top = Math.floor(image.height * crop.y / 100);

            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                image,
                left,
                top,
                canvas.width,
                canvas.height,
                0,
                0,
                canvas.width,
                canvas.height
            );

            cb(null, {data: canvas.toDataURL('image/jpeg'), name: fileName});
        };
        image.src = imageData;
    }

    static readFileDataUrl(file, cb) {
        const reader = new FileReader();
        reader.onload = () => {
            cb(null, {data: reader.result, name: file.name});
        };
        reader.onabort = () => {
            console.error('file reading was aborted');
            cb('file reading was aborted');
        };
        reader.onerror = (e) => {
            console.error('file reading has failed');
            cb('file reading has failed: ' + e);
        };

        reader.readAsDataURL(file)
    }

    handleSelectImage(file) {
        if (typeof file === 'object') {
            if (this.props.aspect && !file.name.toLowerCase().endsWith('.svg')) {
                this.setState({beforeCrop: file, cropOpened: true});
            } else {
                this.setState({image: file.data});
                this.props.onUpload && this.props.onUpload(file);
            }
        } else {
            this.setState({image: file});
            this.props.onUpload && this.props.onUpload(file);
        }
    }

    handleDropImage(files) {
        if (files && files.hasOwnProperty('target')) {
            files = files.target.files;
        }

        if (!files && !files.length) return;
        const file = files[files.length - 1];

        if (!file) {
            return;
        }
        ImageSelector.readFileDataUrl(file, (err, result) => {
            if (err) {
                alert(err);
            } else {
                this.handleSelectImage(result);
            }
        });
    }

    removeImage() {
        this.setState({image: '', opened: true});
        this.props.onUpload && this.props.onUpload('');
    }

    static isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
    }

    onCamera() {
        this.inputRef.current.click();
    }

    onCropEnd(){
        ImageSelector.cropImage(this.state.beforeCrop.data, this.cropPixels, this.state.beforeCrop.name, (err, file) => {
            this.setState({cropOpened: false, image: file.data});
            this.props.onUpload && this.props.onUpload(file);
        });
    }

    onImageLoaded(image, tryCount) {
        tryCount = tryCount || 0;
        let cropHeight;
        let cropWidth;
        let width;
        let height;
        if (!this.cropRef.current && tryCount < 10) {
            return setTimeout(() => this.onImageLoaded(image, tryCount + 1), 200);
        }
        let aspect = this.props.aspect || 1;

        if (this.cropRef.current) {
            if (this.cropRef.current.clientWidth > this.cropRef.current.clientHeight) {
                cropHeight = this.cropRef.current.clientHeight;
                if (cropHeight > image.naturalHeight) {
                    cropHeight = image.naturalHeight;
                }
                cropWidth = cropHeight * (image.naturalWidth / image.naturalHeight);
                height = 100;
                width = (image.naturalHeight / image.naturalWidth) * 100 * aspect;
                if (width > 100) {
                    height = 100 / width * 100;
                    width = 100;
                }
            } else {
                cropWidth = this.cropRef.current.clientWidth;
                if (cropWidth > image.naturalWidth) {
                    cropWidth = image.naturalWidth;
                }
                cropHeight = cropWidth * (image.naturalHeight / image.naturalWidth);
                width = 100;
                height = (image.naturalWidth / image.naturalHeight) * 100 / aspect;
				if (height > 100) {
                    width = 100 / height * 100;
                    height = 100;
                }
            }
        }
        this.setState({
            cropHeight,
            cropWidth,
            crop: {x: 0, y: 0, width, height, aspect}
        });
    }

    render() {
        //const onDrop = useCallback(acceptedFiles => this.handleDropImage(acceptedFiles), []);

        //const {getRootProps, getInputProps, isDragActive, isDragReject} = useDropzone({onDrop});

        const classes = this.props.classes;

        return (
            <div style={{position: 'relative'}}>
                <div key="image-label" className={classes.label}>{this.props.label}</div>
                {this.state.image ? [
                    (<img key="image-preview"
                          src={typeof this.state.image === 'object' ? this.state.image.preview : this.state.image}
                          alt={this.props.label || ''} style={{width: this.props.height || '100%', height: 'auto'}}/>),
                    (<IconButton
                        size="small"
                        key="image-delete"
                        onClick={this.removeImage.bind(this)}
                        className={classes.imageButtons + ' ' + classes.deleteIcon}
                        aria-label="delete">
                        <IconDelete fontSize="inherit" />
                    </IconButton>),
                    (<IconButton
                        key="image-open"
                        onClick={() => this.setState({opened: !this.state.opened})}
                        className={classes.imageButtons + ' ' + classes.openIcon}
                        style={!this.state.opened ? {bottom: -14} : {top: 85}}
                        size="small"
                        aria-label="open">
                        {this.state.opened ? (<IconClose fontSize="inherit"/>) : (<IconOpen fontSize="inherit"/>)}
                    </IconButton>)
                ] : null}
                {this.state.opened &&
                    [
                        (<Dropzone
                            key="image-drop"
                            onDrop={files => this.handleDropImage(files)}
                            maxSize={this.props.maxSize}
                            accept={this.props.accept || 'image/jpeg, image/png, image/gif, image/svg+xml'}
                            style={{}}>
                            {({getRootProps, getInputProps, isDragActive, isDragReject}) => (
                                <div {...getRootProps()} className={classes.dropzone + ' ' + (isDragReject ? classes.dropzoneRejected : (isDragActive ? classes.dropzoneAccepted : ''))}>
                                    <input accept="image/*" {...getInputProps()} />
                                    {isDragReject ? (this.props.textRejected || 'Some files will be rejected') :
                                        (isDragActive ? (this.props.textAccepted || 'All files will be accepted') :
                                            (this.props.textWaiting || 'Drop some files here or click...'))}
                                </div>
                            )}
                        </Dropzone>),
                        (this.state.images && this.state.images.length) || this.icons ? (<ImageList key="image-list" images={this.state.images || this.icons} onSelect={this.handleSelectImage.bind(this)}/>) : null,
                        ImageSelector.isMobile() && !this.props.icons ?
                            (<IconButton
                                key="image-camera" onClick={() => this.onCamera()}
                                className={classes.camIcon}
                                size="small"
                                aria-label="camera">
                                <IconCam fontSize="inherit"/>
                                <input ref={this.inputRef}
                                       type="file"
                                       accept="image/*"
                                       onChange={files => this.handleDropImage(files)}
                                       capture
                                       style={{display: 'none'}}/>
                            </IconButton>) : null,
                    ]
                }
                {this.state.cropOpened ? (<Dialog
                key="crop-dialog"
                open={true}
                classes={{paper: classes['chart-dialog-paper']}}
                onClose={() => this.setState({cropOpened: false})}
                className={classes['chart-dialog']}
                aria-labelledby="alert-dialog-title"
            >
                <DialogTitle id="alert-dialog-title">{I18n.t('Crop image')}</DialogTitle>
                <DialogContent className={classes['chart-dialog-content']}>
                    <div ref={this.cropRef} style={{width: '100%', height: '100%'}}>
                        <ReactCrop style={{width: this.state.cropWidth, height: this.state.cropHeight}}
                                   onChange={crop => this.setState({crop})}
                                   onComplete={(crop, pixelCrop) => this.cropPixels = pixelCrop}
                                   crop={Object.assign({unit: '%'}, this.state.crop)}
                                   keepSelection={true}
                                   onImageLoaded={image => this.onImageLoaded(image)}
                                   src={this.state.beforeCrop.data} />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.onCropEnd(true)} color="primary" autoFocus>{I18n.t('Crop')}</Button>
                    <Button onClick={() => this.setState({cropOpened: false})} autoFocus>{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>): null}
            </div>
        );
    }
}
ImageSelector.propTypes = {
    image:           PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object
    ]).isRequired,
    onUpload:        PropTypes.func.isRequired,
    maxSize:         PropTypes.number,
    height:          PropTypes.number, // height of the shown image
    images:          PropTypes.array,
    icons:           PropTypes.bool,
    label:           PropTypes.string,
    accept:          PropTypes.string,
    textAccepted:    PropTypes.string,
    textRejected:    PropTypes.string,
    textWaiting:     PropTypes.string,
    aspect:          PropTypes.number // if set, the crop function will be called
};

export default withStyles(style)(ImageSelector);
