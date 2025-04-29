import React, { useEffect, useState } from 'react';
import { Checkbox, Chip, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { I18n, Icon, Utils } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
    renderValueWrapper: {
        display: 'flex',
        gap: 4,
    },
    renderValueCurrent: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 10,
    },
    enumIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
};

export default function EnumSelector(props: {
    name: 'functions' | 'rooms';
    title?: string;
    value: string[];
    onChange: (value: string[]) => void;
    enumIDs: string[];
    objects: Record<string, ioBroker.Object>;
    style?: React.CSSProperties;
    sx?: Record<string, any>;
    disabled?: boolean;
}): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const [objs, setObjs] = useState<{ name: string; icon: string | null | undefined; id: string }[]>([]);
    const language = I18n.getLanguage();

    useEffect(() => {
        const enums = props.enumIDs.filter(id => id.startsWith(`enum.${props.name}.`));
        setObjs(
            enums.map(id => ({
                name: Utils.getObjectName(props.objects, id, language),
                icon: Utils.getObjectIcon(id, props.objects[id]),
                id,
            })),
        );
    }, [props.enumIDs, props.objects, props.name, language]);

    const select = (
        <Select
            style={props.title ? undefined : props.style}
            sx={props.title ? undefined : props.sx}
            variant="standard"
            disabled={!!props.disabled}
            open={open}
            onClick={() => setOpen(!open)}
            onClose={() => setOpen(false)}
            fullWidth
            multiple
            renderValue={(arrId: string[]): React.JSX.Element => {
                const newArr = objs.filter(obj => arrId.includes(obj.id));

                return (
                    <div style={styles.renderValueWrapper}>
                        {newArr.map(obj => (
                            <Chip
                                key={`${obj.id}-render`}
                                label={
                                    <div style={styles.renderValueCurrent}>
                                        {obj.icon ? (
                                            <Icon
                                                style={styles.enumIcon}
                                                src={obj.icon}
                                                alt={obj.id}
                                            />
                                        ) : null}
                                        {obj.name}
                                    </div>
                                }
                                variant="outlined"
                                onDelete={() => {
                                    const newArr = (props.value || []).filter(id => id !== obj.id);
                                    localStorage.setItem(`Devices.new.${props.name}`, JSON.stringify(newArr));
                                    props.onChange(newArr);
                                }}
                            />
                        ))}
                    </div>
                );
            }}
            value={props.value}
            onChange={e => {
                localStorage.setItem(`Devices.new.${props.name}`, JSON.stringify(e.target.value));
                props.onChange(e.target.value as string[]);
                setOpen(false);
            }}
        >
            {objs.map(obj => (
                <MenuItem
                    key={obj.id}
                    value={obj.id}
                >
                    <Checkbox checked={(props.value || []).includes(obj.id)} />
                    {obj.icon ? (
                        <Icon
                            style={styles.enumIcon}
                            src={obj.icon}
                            alt={obj.id}
                        />
                    ) : (
                        <div style={styles.enumIcon} />
                    )}
                    {obj.name}
                </MenuItem>
            ))}
        </Select>
    );

    if (!props.title) {
        return select;
    }

    return (
        <FormControl
            sx={props.sx}
            style={props.style}
            variant="standard"
        >
            <InputLabel>{props.title}</InputLabel>
            {select}
        </FormControl>
    );
}
