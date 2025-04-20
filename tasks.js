/**
 * Copyright 2018-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
const { deleteFoldersRecursive, buildReact, npmInstall, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');
const { copyFileSync, existsSync } = require('node:fs');

async function copyAllFiles() {
    copyFiles(['src-admin/build/**/*', '!src-admin/build/index.html', 'admin-config/*', '!src-admin/build/vendor/socket.io.js'], 'admin/');

    await patchHtmlFile(`${__dirname}/src-admin/build/index.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/index_m.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/tab.html`);
}

function clean() {
    deleteFoldersRecursive(`${__dirname}/admin`, ['devices.png', 'devices.svg']);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

if (process.argv.includes('--0-clean')) {
    clean();
} else if (process.argv.includes('--1-npm')) {
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmInstall(`${__dirname}/src-admin`).catch(e => {
            console.error(`Cannot run npm: ${e}`);
            process.exit(2);
        });
    }
} else if (process.argv.includes('--2-build')) {
    buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }).catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--3-copy')) {
    copyAllFiles().catch(e => {
        console.error(`Cannot copy: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--build-admin')) {
    clean();
    npmInstall(`${__dirname}/src-admin`)
        .then(() => buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }))
        .then(() => copyAllFiles());
} else {
    clean();
    npmInstall(`${__dirname}/src-admin`)
        .then(() => buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }))
        .then(() => copyAllFiles())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(2);
        });
}
