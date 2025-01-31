/**
 * Copyright 2018-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import { Utils, I18n } from '@iobroker/adapter-react-v5';

class LocalUtils {
    static getObjectName(objects, id, label, channelName, enumNames) {
        let name;
        if (label) {
            name = label;
        } else if (!id) {
            name = 'No elements';
        } else {
            //if (objects[enumName]) {
            //    enumName = Utils.getObjectName(objects, enumName);
            //}

            let item = objects[id];
            if (item && item.common && item.common.name) {
                name = Utils.getObjectName(objects, id, null, { language: I18n.getLanguage() });

                if (enumNames) {
                    if (typeof enumNames === 'object') {
                        enumNames.forEach(e => {
                            let reg = new RegExp(`\\b${e}\\b`);
                            const newName = name.replace(reg, ' ').replace(/\s\s/g, '').trim();
                            if (newName) {
                                name = newName;
                            }
                        });
                    } else {
                        let reg = new RegExp(`\\b${enumNames}\\b`);
                        const newName = name.replace(reg, ' ').replace(/\s\s/g, '').trim();
                        if (newName) {
                            name = newName;
                        }
                    }
                }
                if (channelName) {
                    let reg = new RegExp(`${channelName}[.: ]?`);
                    const newName = name.replace(reg, ' ').trim();
                    if (newName) {
                        name = newName;
                    }
                }

                if (name && name === name.toUpperCase()) {
                    name = name[0] + name.substring(1).toLowerCase();
                }
            } else {
                let pos = id.lastIndexOf('.');
                name = id.substring(pos + 1).replace(/_/g, ' ');
                name = Utils.CapitalWords(name);

                if (enumNames) {
                    if (typeof enumNames === 'object') {
                        enumNames.forEach(e => {
                            let reg = new RegExp(`\\b${e}\\b`);
                            name = name.replace(reg, ' ').replace(/\s\s/g, '').trim();
                        });
                    } else {
                        let reg = new RegExp(`\\b${enumNames}\\b`);
                        name = name.replace(reg, ' ').replace(/\s\s/g, '').trim();
                    }
                }

                if (channelName) {
                    let reg = new RegExp(`${channelName}[.: ]?`);
                    name = I18n.t(name.replace(reg, ' ').trim());
                }
            }
        }
        return name.trim();
    }
}

export default LocalUtils;
