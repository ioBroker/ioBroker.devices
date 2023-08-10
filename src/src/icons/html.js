const fs = require('node:fs');
const lines = [
    '<html>',
    '<head>',
    '<style>',
    '.svg {',
    '  width: 48px;',
    '  height: 48px;',
    '  fill: currentColor;',
    '  cursor: pointer;',
    '}',
    '.div {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  width: 48px;',
    '}',
    '</style>',
    `<script>
function deselectCurrent() {
    const selection = document.getSelection();
    if (!selection.rangeCount) {
        return () => {};
    }
    let active = document.activeElement;

    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i));
    }

    switch (active.tagName.toUpperCase()) { // .toUpperCase handles XHTML
        case 'INPUT':
        case 'TEXTAREA':
            active.blur();
            break;

        default:
            active = null;
            break;
    }

    selection.removeAllRanges();
    return () => {
        selection.type === 'Caret' &&
        selection.removeAllRanges();

        if (!selection.rangeCount) {
            ranges.forEach(range => selection.addRange(range));
        }

        active && active.focus();
    };
}

// https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js

const clipboardToIE11Formatting = {
    'text/plain': 'Text',
    'text/html': 'Url',
    default: 'Text',
};

const defaultMessage = 'Copy to clipboard: #{key}, Enter';

function format(message) {
    const copyKey = 'Ctrl+C';
    return message.replace(/#{\\s*key\\s*}/g, copyKey);
}

function copy(text, options) {
    let reselectPrevious;
    let range;
    let selection;
    let mark;
    let success = false;
    if (!options) {
        options = {};
    }
    const debug = options.debug || false;
    try {
        reselectPrevious = deselectCurrent();

        range = document.createRange();
        selection = document.getSelection();

        mark = document.createElement('span');
        mark.textContent = text;
        // avoid screen readers from reading out loud the text
        mark.ariaHidden = 'true';
        // reset user styles for span element
        mark.style.all = 'unset';
        // prevents scrolling to the end of the page
        mark.style.position = 'fixed';
        mark.style.top = 0;
        mark.style.clip = 'rect(0, 0, 0, 0)';
        // used to preserve spaces and line breaks
        mark.style.whiteSpace = 'pre';
        // do not inherit user-select (it may be \`none\`)
        mark.style.webkitUserSelect = 'text';
        mark.style.MozUserSelect = 'text';
        mark.style.msUserSelect = 'text';
        mark.style.userSelect = 'text';
        mark.addEventListener('copy', e => {
            e.stopPropagation();
            if (options.format) {
                e.preventDefault();
                if (typeof e.clipboardData === 'undefined') { // IE 11
                    debug && console.warn('unable to use e.clipboardData');
                    debug && console.warn('trying IE specific stuff');
                    window.clipboardData.clearData();
                    const _format = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting.default;
                    window.clipboardData.setData(_format, text);
                } else { // all other browsers
                    e.clipboardData.clearData();
                    e.clipboardData.setData(options.format, text);
                }
            }
            if (options.onCopy) {
                e.preventDefault();
                options.onCopy(e.clipboardData);
            }
        });

        document.body.appendChild(mark);

        range.selectNodeContents(mark);
        selection.addRange(range);

        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('copy command was unsuccessful');
        }
        success = true;
    } catch (err) {
        debug && console.error('unable to copy using execCommand: ', err);
        debug && console.warn('trying IE specific stuff');
        try {
            window.clipboardData.setData(options.format || 'text', text);
            options.onCopy && options.onCopy(window.clipboardData);
            success = true;
        } catch (error) {
            debug && console.error('unable to copy using clipboardData: ', error);
            debug && console.error('falling back to prompt');
            const message = format('message' in options ? options.message : defaultMessage);
            window.prompt(message, text);
        }
    } finally {
        if (selection) {
            if (typeof selection.removeRange === 'function') {
                selection.removeRange(range);
            } else {
                selection.removeAllRanges();
            }
        }

        if (mark) {
            document.body.removeChild(mark);
        }
        reselectPrevious();
    }

    return success;
}

</script>`,
    '</head>',
    '<body>',
    '<h1>KNX UF Iconset</h1>',
    '<div style="display: flex; flex-wrap: wrap; background: grey">',
]
fs.readdirSync(__dirname).filter(file => file.endsWith('.svg')).forEach(file => {
    const data = fs.readFileSync(file);
    lines.push(`<div class="div">
<img class="svg" src="data:image/svg+xml;base64,${data.toString('base64')}" alt="${file}" title="${file}" onclick="copy(this.src)"/>
<div>${file.replace('.svg', '').replace(/_/g, ' ')}</div>
</div>`)
});

lines.push('</div></body></html>');

fs.writeFileSync('index.html', lines.join('\n'));