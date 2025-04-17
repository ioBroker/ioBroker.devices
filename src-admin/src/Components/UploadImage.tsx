import React, { Component, createRef } from 'react';

import { Cropper, type ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

import { Menu, MenuItem, Tooltip, IconButton } from '@mui/material';

import { Crop as CropIcon } from '@mui/icons-material';

import { IconPicker } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
    image: {
        objectFit: 'contain',
        margin: 'auto',
        display: 'flex',
        width: '100%',
        height: '100%',
    },

    buttonCropWrapper: {
        position: 'absolute',
        zIndex: 222,
        right: 0,
        top: 50,
    },
    buttonIconsWrapper: {
        position: 'absolute',
        zIndex: 222,
        right: 0,
        top: 100,
    },
    error: {
        border: '2px solid red',
    },
    iconPickerLabel: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    iconPickerIcon: {
        width: 32,
        height: 'auto',
    },
};

interface UploadImageProps {
    disabled: boolean;
    crop: boolean;
    error: boolean;
    onChange: (base64: string) => void;
    t: (el: string) => string;
    icon?: string | null;
    removeIconFunc?: () => void;
    style?: React.CSSProperties;
}

interface UploadImageState {
    anchorEl: HTMLElement | null;
    cropHandler: boolean;
}

class UploadImage extends Component<UploadImageProps, UploadImageState> {
    private readonly cropperRef: React.RefObject<ReactCropperElement>;

    constructor(props: UploadImageProps) {
        super(props);
        this.state = {
            anchorEl: null,
            cropHandler: false,
        };
        this.cropperRef = createRef();
    }

    render(): React.JSX.Element {
        const { disabled, icon, t, crop, onChange, style } = this.props;
        const { anchorEl, cropHandler } = this.state;
        return (
            <div style={{ ...style, position: 'relative' }}>
                {icon && crop && (
                    <div style={styles.buttonCropWrapper}>
                        <Tooltip
                            title={t('Crop')}
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        >
                            <IconButton
                                onClick={e => {
                                    if (!cropHandler) {
                                        this.setState({ cropHandler: true });
                                    } else {
                                        this.setState({ anchorEl: e.currentTarget });
                                    }
                                    e.stopPropagation();
                                }}
                            >
                                <CropIcon color={cropHandler ? 'primary' : 'inherit'} />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            keepMounted
                            open={!!anchorEl}
                            onClose={() => this.setState({ anchorEl: null })}
                        >
                            <MenuItem
                                onClick={() =>
                                    this.setState({ anchorEl: null, cropHandler: false }, () => {
                                        const imageElement = this.cropperRef?.current?.cropper;
                                        if (imageElement) {
                                            onChange(imageElement.getCroppedCanvas().toDataURL());
                                        }
                                    })
                                }
                            >
                                {t('Save')}
                            </MenuItem>
                            <MenuItem onClick={() => this.setState({ anchorEl: null, cropHandler: false })}>
                                {t('Close')}
                            </MenuItem>
                        </Menu>
                    </div>
                )}

                <IconPicker
                    label={this.props.t('Icon')}
                    disabled={disabled}
                    customStyles={{ label: styles.iconPickerLabel, icon: styles.iconPickerIcon }}
                    onChange={base64 => onChange(base64)}
                    value={icon}
                />

                {icon && crop && cropHandler ? (
                    <Cropper
                        ref={this.cropperRef}
                        style={styles.image}
                        src={icon}
                        initialAspectRatio={1}
                        viewMode={1}
                        guides={false}
                        minCropBoxHeight={10}
                        minCropBoxWidth={10}
                        background={false}
                        checkOrientation={false}
                    />
                ) : null}
            </div>
        );
    }
}

export default UploadImage;
