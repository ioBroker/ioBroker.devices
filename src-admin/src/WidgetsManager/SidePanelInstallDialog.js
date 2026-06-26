import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography, } from '@mui/material';
import { Check, Close, ContentCopy, Download } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import ioBrokerLogo from './assets/ioBrokerLogo.png';
/** Copy text to clipboard with fallback for non-secure contexts (HTTP) */
function copyText(text) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
    }
    return copyTextFallback(text);
}
function copyTextFallback(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
}
// ---- Minimal ZIP builder (no external lib needed for a handful of text files) ----
function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function dosDateTime(date) {
    return {
        time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
        date: (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
    };
}
function writeU16(arr, offset, val) {
    arr[offset] = val & 0xff;
    arr[offset + 1] = (val >> 8) & 0xff;
}
function writeU32(arr, offset, val) {
    arr[offset] = val & 0xff;
    arr[offset + 1] = (val >> 8) & 0xff;
    arr[offset + 2] = (val >> 16) & 0xff;
    arr[offset + 3] = (val >> 24) & 0xff;
}
function buildZip(files) {
    const encoder = new TextEncoder();
    const now = new Date();
    const { time, date } = dosDateTime(now);
    const entries = [];
    const chunks = [];
    let offset = 0;
    // Local file headers + data
    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const dataBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
        const crc = crc32(dataBytes);
        // Local file header: 30 bytes + name + data
        const header = new Uint8Array(30 + nameBytes.length);
        writeU32(header, 0, 0x04034b50); // signature
        writeU16(header, 4, 20); // version needed
        writeU16(header, 6, 0); // flags
        writeU16(header, 8, 0); // compression: store
        writeU16(header, 10, time);
        writeU16(header, 12, date);
        writeU32(header, 14, crc);
        writeU32(header, 18, dataBytes.length);
        writeU32(header, 22, dataBytes.length);
        writeU16(header, 26, nameBytes.length);
        writeU16(header, 28, 0); // extra length
        header.set(nameBytes, 30);
        entries.push({ name: nameBytes, data: dataBytes, crc, offset });
        chunks.push(header, dataBytes);
        offset += header.length + dataBytes.length;
    }
    // Central directory
    const cdStart = offset;
    for (const entry of entries) {
        const cd = new Uint8Array(46 + entry.name.length);
        writeU32(cd, 0, 0x02014b50); // signature
        writeU16(cd, 4, 20); // version made by
        writeU16(cd, 6, 20); // version needed
        writeU16(cd, 8, 0); // flags
        writeU16(cd, 10, 0); // compression
        writeU16(cd, 12, time);
        writeU16(cd, 14, date);
        writeU32(cd, 16, entry.crc);
        writeU32(cd, 20, entry.data.length);
        writeU32(cd, 24, entry.data.length);
        writeU16(cd, 28, entry.name.length);
        writeU16(cd, 30, 0); // extra
        writeU16(cd, 32, 0); // comment
        writeU16(cd, 34, 0); // disk
        writeU16(cd, 36, 0); // internal attr
        writeU32(cd, 38, 0); // external attr
        writeU32(cd, 42, entry.offset);
        cd.set(entry.name, 46);
        chunks.push(cd);
        offset += cd.length;
    }
    // End of central directory
    const cdSize = offset - cdStart;
    const eocd = new Uint8Array(22);
    writeU32(eocd, 0, 0x06054b50); // signature
    writeU16(eocd, 4, 0); // disk
    writeU16(eocd, 6, 0); // disk with cd
    writeU16(eocd, 8, entries.length);
    writeU16(eocd, 10, entries.length);
    writeU32(eocd, 12, cdSize);
    writeU32(eocd, 16, cdStart);
    writeU16(eocd, 20, 0); // comment
    chunks.push(eocd);
    return new Blob(chunks, { type: 'application/zip' });
}
// ---- Icon generator: resize the ioBroker logo to required sizes ----
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
function imageToResizedPng(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox') && !ua.includes('Chrome')) {
        return 'firefox';
    }
    if (ua.includes('Chrome') && !ua.includes('Firefox')) {
        return 'chrome';
    }
    return null;
}
// ---- Extension file generators ----
function generateChromeManifest(serverUrl) {
    const url = new URL(serverUrl);
    const hostPattern = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}/*`;
    return JSON.stringify({
        manifest_version: 3,
        name: 'ioBroker Smart Home',
        description: 'ioBroker Smart Home widgets in Chrome Side Panel',
        version: '1.0',
        permissions: ['sidePanel', 'declarativeNetRequest'],
        host_permissions: [hostPattern],
        side_panel: { default_path: 'panel.html' },
        action: { default_title: 'ioBroker Smart Home' },
        background: { service_worker: 'background.js' },
        icons: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' },
        declarative_net_request: {
            rule_resources: [{ id: 'strip_frame_headers', enabled: true, path: 'rules.json' }],
        },
    }, null, 2);
}
function generateFirefoxManifest(serverUrl) {
    const url = new URL(serverUrl);
    const hostPattern = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}/*`;
    return JSON.stringify({
        manifest_version: 2,
        name: 'ioBroker Smart Home',
        description: 'ioBroker Smart Home widgets in Firefox Sidebar',
        version: '1.0',
        permissions: [hostPattern],
        sidebar_action: {
            default_title: 'ioBroker Smart Home',
            default_panel: 'panel.html',
            default_icon: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' },
        },
        icons: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' },
        browser_specific_settings: {
            gecko: { id: 'iobroker-smarthome@iobroker.net' },
        },
    }, null, 2);
}
function generateBackground() {
    return `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });\n`;
}
function generateRules(serverUrl) {
    const url = new URL(serverUrl);
    const urlFilter = `||${url.hostname}${url.port ? `:${url.port}` : ''}`;
    return JSON.stringify([
        {
            id: 1,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                responseHeaders: [
                    { header: 'X-Frame-Options', operation: 'remove' },
                    { header: 'Content-Security-Policy', operation: 'remove' },
                ],
            },
            condition: {
                urlFilter,
                resourceTypes: ['sub_frame'],
            },
        },
    ], null, 2);
}
function generatePanel(pageUrl) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
    <style>
        *{margin:0;padding:0}
        html,body{width:100%;height:100%;overflow:hidden}
        iframe{width:100%;height:100%;border:none}
    </style>
</head>
<body>
<iframe src="${pageUrl}"></iframe>
</body>
</html>
`;
}
// ---- Web adapter URL detection (admin mode) ----
async function detectWebUrl(socket) {
    const currentHostname = window.location.hostname;
    // Get all web adapter instances
    const instances = await socket.getObjectViewSystem('instance', 'system.adapter.web.', 'system.adapter.web.\u9999');
    const webInstances = [];
    for (const [id, obj] of Object.entries(instances)) {
        if (!obj?.common?.enabled) {
            continue;
        }
        const native = obj.native || {};
        webInstances.push({
            id,
            enabled: true,
            bind: native.bind || '0.0.0.0',
            port: native.port || 8082,
            secure: !!native.secure,
        });
    }
    if (webInstances.length === 0) {
        // Fallback: guess from the current page
        return `${window.location.protocol}//${window.location.host}`;
    }
    // Priority: 1) bound to 0.0.0.0, 2) bound to the same IP as the current page, 3) first enabled
    const best = webInstances.find(i => i.bind === '0.0.0.0') ||
        webInstances.find(i => i.bind === currentHostname) ||
        webInstances[0];
    const protocol = best.secure ? 'https' : 'http';
    return `${protocol}://${currentHostname}:${best.port}`;
}
export { detectBrowser };
function SidePanelInstallDialog(props) {
    const { open, onClose, admin, socket } = props;
    const [serverUrl, setServerUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [copied, setCopied] = useState(false);
    // Detect URL when dialog opens
    useEffect(() => {
        if (!open) {
            return;
        }
        if (admin && socket) {
            setLoading(true);
            void detectWebUrl(socket)
                .then(url => {
                setServerUrl(url);
                setLoading(false);
            })
                .catch(() => {
                setServerUrl(`${window.location.protocol}//${window.location.host}`);
                setLoading(false);
            });
        }
        else {
            // Non-admin: use the current URL directly
            setServerUrl(`${window.location.origin}${window.location.pathname.replace(/\/+$/, '/')}`);
        }
    }, [open, admin, socket]);
    const pageUrl = admin ? `${serverUrl}/devices/` : serverUrl;
    const browser = detectBrowser();
    const handleDownload = useCallback(async () => {
        try {
            new URL(serverUrl);
        }
        catch {
            return;
        }
        // Load the ioBroker logo and resize to required icon sizes
        let icon16;
        let icon48;
        let icon128;
        try {
            const img = await loadImage(ioBrokerLogo);
            icon16 = imageToResizedPng(img, 16);
            icon48 = imageToResizedPng(img, 48);
            icon128 = imageToResizedPng(img, 128);
        }
        catch {
            // Fallback: empty icons if the image fails to load
            icon16 = new Uint8Array(0);
            icon48 = new Uint8Array(0);
            icon128 = new Uint8Array(0);
        }
        const files = [
            { name: 'panel.html', content: generatePanel(pageUrl) },
            { name: 'icon-16.png', content: icon16 },
            { name: 'icon-48.png', content: icon48 },
            { name: 'icon-128.png', content: icon128 },
        ];
        if (browser === 'firefox') {
            files.unshift({ name: 'manifest.json', content: generateFirefoxManifest(serverUrl) });
        }
        else {
            // Chrome (default)
            files.unshift({ name: 'manifest.json', content: generateChromeManifest(serverUrl) });
            files.push({ name: 'background.js', content: generateBackground() });
            files.push({ name: 'rules.json', content: generateRules(serverUrl) });
        }
        const blob = buildZip(files);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = browser === 'firefox' ? 'iobroker-sidebar.zip' : 'iobroker-sidepanel.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloaded(true);
    }, [serverUrl, pageUrl, browser]);
    if (!open) {
        return null;
    }
    return (React.createElement(Dialog, { open: true, onClose: onClose, maxWidth: "sm", fullWidth: true },
        React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', gap: 1, pr: 6 } },
            I18n.t('wm_Install as Side Panel'),
            React.createElement(IconButton, { onClick: onClose, sx: { position: 'absolute', right: 8, top: 8 } },
                React.createElement(Close, null))),
        React.createElement(DialogContent, { dividers: true },
            loading ? (React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', py: 3 } },
                React.createElement(CircularProgress, { size: 32 }))) : (React.createElement(React.Fragment, null,
                React.createElement(Typography, { variant: "body2", sx: { mb: 0.5, fontWeight: 500 } }, I18n.t('wm_Server URL')),
                React.createElement(TextField, { fullWidth: true, variant: "filled", size: "small", value: serverUrl, onChange: e => {
                        setServerUrl(e.target.value);
                        setDownloaded(false);
                    }, placeholder: "http://192.168.1.10:8082", sx: { mb: 0.5 } }),
                admin ? (React.createElement(Typography, { variant: "caption", sx: { display: 'block', mb: 2, color: 'text.disabled' } },
                    I18n.t('wm_Page URL'),
                    ": ",
                    pageUrl)) : (React.createElement(Box, { sx: { mb: 1.5 } })),
                React.createElement(Button, { variant: "contained", color: downloaded ? 'success' : 'primary', startIcon: downloaded ? React.createElement(Check, null) : React.createElement(Download, null), onClick: handleDownload, disabled: !serverUrl, fullWidth: true, sx: { mb: 3, py: 1.2 } }, downloaded
                    ? I18n.t('wm_Downloaded')
                    : I18n.t(browser === 'firefox' ? 'wm_Download FF extension' : 'wm_Download extension')))),
            React.createElement(Typography, { variant: "subtitle2", sx: { mb: 1, fontWeight: 600 } }, I18n.t('wm_Installation instructions')),
            browser === 'firefox' ? (React.createElement(Box, { component: "ol", sx: {
                    pl: 2.5,
                    '& li': { mb: 0.8, fontSize: '0.875rem', color: 'text.secondary' },
                } },
                React.createElement("li", null, I18n.t('wm_sidepanel_step1')),
                React.createElement("li", null,
                    I18n.t('wm_sidepanel_step2'),
                    ' ',
                    React.createElement(Box, { component: "code", sx: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            userSelect: 'all',
                            cursor: 'pointer',
                        }, onClick: () => {
                            void copyText('about:debugging#/runtime/this-firefox').then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            });
                        } },
                        "about:debugging#/runtime/this-firefox",
                        copied ? (React.createElement(Check, { sx: { fontSize: 14, color: 'success.main' } })) : (React.createElement(ContentCopy, { sx: { fontSize: 14, opacity: 0.5 } })))),
                React.createElement("li", null, I18n.t('wm_ff_step3')),
                React.createElement("li", null, I18n.t('wm_ff_step4')),
                React.createElement("li", null, I18n.t('wm_ff_step5')))) : (React.createElement(Box, { component: "ol", sx: {
                    pl: 2.5,
                    '& li': { mb: 0.8, fontSize: '0.875rem', color: 'text.secondary' },
                } },
                React.createElement("li", null, I18n.t('wm_sidepanel_step1')),
                React.createElement("li", null,
                    I18n.t('wm_sidepanel_step2'),
                    ' ',
                    React.createElement(Box, { component: "code", sx: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                            userSelect: 'all',
                            cursor: 'pointer',
                        }, onClick: () => {
                            void copyText('chrome://extensions').then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            });
                        } },
                        "chrome://extensions",
                        copied ? (React.createElement(Check, { sx: { fontSize: 14, color: 'success.main' } })) : (React.createElement(ContentCopy, { sx: { fontSize: 14, opacity: 0.5 } })))),
                React.createElement("li", null, I18n.t('wm_sidepanel_step3')),
                React.createElement("li", null, I18n.t('wm_sidepanel_step4')),
                React.createElement("li", null, I18n.t('wm_sidepanel_step5')))),
            React.createElement(Typography, { variant: "caption", sx: { display: 'block', mt: 2, color: 'text.disabled' } }, I18n.t(browser === 'firefox' ? 'wm_ff_hint' : 'wm_sidepanel_hint'))),
        React.createElement(DialogActions, null,
            React.createElement(Button, { onClick: onClose }, I18n.t('wm_Close')))));
}
export default SidePanelInstallDialog;
//# sourceMappingURL=SidePanelInstallDialog.js.map