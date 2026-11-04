/**
 * The dialogs devices opens for web components (`dialogs` of the contract of `@iobroker/web-components`): an
 * element of the component framed by a MUI dialog, or a form rendered by JSON-Config.
 *
 * Loaded on demand: a page whose components never ask for a dialog does not fetch it.
 */
import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close } from '@mui/icons-material';

import { I18n, type IobTheme } from '@iobroker/gui-components';
import { JsonConfigComponent, type ConfigItemPanel } from '@iobroker/json-config';
import type { AdminConnection } from '@iobroker/socket-client';
import {
    DECORATION_TYPES,
    DIALOG_CLOSE_EVENT,
    getPanelSettingTypes,
    getText,
    isFormDialog,
    toSettings,
    type WebComponentDialogRequest,
    type WebComponentElementDialog,
    type WebComponentFormDialog,
    type WebComponentText,
} from '@iobroker/web-components';

import type { IStateContext } from '../../../../packages/dm-widgets/src/index';

/** One open dialog and how it ends */
export interface OpenWebComponentDialog {
    id: number;
    request: WebComponentDialogRequest;
    resolve: (result: unknown) => void;
}

interface WebComponentDialogsProps {
    dialogs: OpenWebComponentDialog[];
    stateContext: IStateContext;
}

function text(value: WebComponentText | undefined, lang: ioBroker.Languages): string {
    return getText(value, lang);
}

/** Width of the paper: what the component asks for, never wider than the window */
function paperStyle(request: WebComponentDialogRequest, fallback?: number): React.CSSProperties {
    const width = request.width || fallback;
    return {
        width: width ? `min(${width}px, calc(100vw - 32px))` : undefined,
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: 16,
    };
}

function Title(props: { title: string; onClose: () => void }): React.JSX.Element {
    return (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{props.title}</span>
            <IconButton
                size="small"
                onClick={props.onClose}
                aria-label={I18n.t('wm_Close')}
            >
                <Close fontSize="small" />
            </IconButton>
        </DialogTitle>
    );
}

/**
 * The element of the component in a MUI dialog. The element brings its own styles (a shadow root); it closes the
 * dialog with `iob-dialog-close`, whose `detail` is the result
 */
function ElementDialog(props: {
    request: WebComponentElementDialog;
    resolve: (result: unknown) => void;
    lang: ioBroker.Languages;
}): React.JSX.Element {
    const { request, resolve } = props;
    // State, not a ref: the dialog renders its content through a portal, after its own first commit - an effect
    // reading a ref would find nothing there and never run again
    const [box, setBox] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!box) {
            return undefined;
        }
        box.appendChild(request.element);
        const onClose = (event: Event): void => resolve((event as CustomEvent).detail ?? null);
        box.addEventListener(DIALOG_CLOSE_EVENT, onClose);
        return () => {
            box.removeEventListener(DIALOG_CLOSE_EVENT, onClose);
            request.element.remove();
        };
    }, [box, request, resolve]);

    return (
        <Dialog
            open
            onClose={() => resolve(null)}
            maxWidth={false}
            slotProps={{ paper: { style: paperStyle(request) } }}
        >
            <Title
                title={text(request.title, props.lang)}
                onClose={() => resolve(null)}
            />
            <DialogContent>
                <div
                    ref={setBox}
                    style={{ height: request.height ? `min(${request.height}px, calc(100vh - 160px))` : undefined }}
                />
            </DialogContent>
        </Dialog>
    );
}

/** A form from a JSON-Config panel, rendered by JSON-Config itself; the values come back typed as the form says */
function FormDialog(props: {
    request: WebComponentFormDialog;
    resolve: (result: unknown) => void;
    stateContext: IStateContext;
}): React.JSX.Element {
    const { request, resolve, stateContext } = props;
    const theme = useTheme<IobTheme>();
    const lang = stateContext.language;
    // the values to start with: what the component hands over, else the defaults
    const [data, setData] = useState<Record<string, unknown>>(() => {
        const values: Record<string, unknown> = {};
        for (const [name, setting] of Object.entries(request.form.items || {})) {
            if (setting && !DECORATION_TYPES.includes(setting.type)) {
                values[name] = request.data?.[name] ?? setting.default;
            }
        }
        return values;
    });
    const instanceId = stateContext.instanceId || 'devices.0';

    const submit = (): void => resolve(toSettings(getPanelSettingTypes(request.form), data));

    return (
        <Dialog
            open
            onClose={() => resolve(null)}
            maxWidth={false}
            slotProps={{ paper: { style: paperStyle(request, 420) } }}
        >
            <Title
                title={text(request.title, lang)}
                onClose={() => resolve(null)}
            />
            <DialogContent dividers>
                <JsonConfigComponent
                    socket={stateContext.getSocket() as unknown as AdminConnection}
                    themeName={theme.name}
                    themeType={theme.palette.mode}
                    adapterName={instanceId.replace(/\.\d+$/, '')}
                    instance={parseInt(instanceId.match(/\.(\d+)$/)?.[1] || '0', 10)}
                    isFloatComma={stateContext.isFloatComma}
                    dateFormat={stateContext.dateFormat}
                    schema={request.form as unknown as ConfigItemPanel}
                    data={data}
                    onError={() => {}}
                    onChange={(newData: Record<string, unknown> | null) => newData && setData(newData)}
                    theme={theme}
                    embedded
                    imagePrefix="../.."
                />
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={submit}
                >
                    {request.ok ? text(request.ok, lang) : I18n.t('wm_OK')}
                </Button>
                <Button
                    color="grey"
                    onClick={() => resolve(null)}
                >
                    {request.cancel ? text(request.cancel, lang) : I18n.t('wm_Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/** All open dialogs of one tile, the last one on top */
export default function WebComponentDialogs(props: WebComponentDialogsProps): React.JSX.Element {
    return (
        <>
            {props.dialogs.map(dialog =>
                isFormDialog(dialog.request) ? (
                    <FormDialog
                        key={dialog.id}
                        request={dialog.request}
                        resolve={dialog.resolve}
                        stateContext={props.stateContext}
                    />
                ) : (
                    <ElementDialog
                        key={dialog.id}
                        request={dialog.request}
                        resolve={dialog.resolve}
                        lang={props.stateContext.language}
                    />
                ),
            )}
        </>
    );
}
