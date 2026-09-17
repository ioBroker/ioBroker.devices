/**
 * Copyright 2018-2026 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
const { deleteFoldersRecursive, buildReact, npmInstall, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');
const { copyFileSync, existsSync, unlinkSync, readFileSync, writeFileSync } = require('node:fs');

/**
 * Take over the version from the root package.json into package.json (and package-lock.json) of the given GUI project
 *
 * @param {string} dir project directory, e.g. src-admin
 */
function syncVersion(dir) {
    const { version } = JSON.parse(readFileSync(`${__dirname}/package.json`, 'utf8'));

    for (const file of ['package.json', 'package-lock.json']) {
        const fileName = `${__dirname}/${dir}/${file}`;
        if (!existsSync(fileName)) {
            continue;
        }
        const pack = JSON.parse(readFileSync(fileName, 'utf8'));
        let changed = false;
        if (pack.version !== version) {
            pack.version = version;
            changed = true;
        }
        // package-lock.json stores the version of the root project a second time
        if (pack.packages?.['']?.version && pack.packages[''].version !== version) {
            pack.packages[''].version = version;
            changed = true;
        }
        if (changed) {
            writeFileSync(fileName, `${JSON.stringify(pack, null, 4)}\n`);
            console.log(`Version in ${dir}/${file} set to ${version}`);
        }
    }
}

async function copyAllFilesAdmin() {
    copyFiles(
        [
            'src-admin/build/**/*',
            '!src-admin/build/index.html',
            'admin-config/*',
            '!src-admin/build/vendor/socket.io.js',
        ],
        'admin/',
    );

    await patchHtmlFile(`${__dirname}/src-admin/build/index.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/index_m.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/tab.html`);
}

function cleanAdmin() {
    deleteFoldersRecursive(`${__dirname}/admin`, ['devices.png', 'devices.svg']);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function cleanWww() {
    deleteFoldersRecursive(`${__dirname}/www`);
    deleteFoldersRecursive(`${__dirname}/src-www/build`);
}

async function copyAllFilesWww() {
    copyFiles(['src-www/build/**/*', '!src-www/build/index.html', '!src-www/build/vendor/socket.io.js'], 'www/');

    await patchHtmlFile(`${__dirname}/src-www/build/index.html`);
    copyFileSync(`${__dirname}/src-www/build/index.html`, `${__dirname}/www/index.html`);
    if (existsSync(`${__dirname}/www/vendor/socket.io.js`)) {
        unlinkSync(`${__dirname}/www/vendor/socket.io.js`);
    }
}

if (process.argv.includes('--0-clean')) {
    cleanAdmin();
} else if (process.argv.includes('--1-npm')) {
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmInstall(`${__dirname}/src-admin`).catch(e => {
            console.error(`Cannot run npm: ${e}`);
            process.exit(2);
        });
    }
} else if (process.argv.includes('--2-build')) {
    syncVersion('src-admin');
    buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }).catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--3-copy')) {
    copyAllFilesAdmin().catch(e => {
        console.error(`Cannot copy: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--0-clean-www')) {
    cleanWww();
} else if (process.argv.includes('--1-npm-www')) {
    if (!existsSync(`${__dirname}/src-www/node_modules`)) {
        npmInstall(`${__dirname}/src-www`).catch(e => {
            console.error(`Cannot run npm: ${e}`);
            process.exit(2);
        });
    }
} else if (process.argv.includes('--2-build-www')) {
    syncVersion('src-www');
    buildReact(`${__dirname}/src-www`, { rootDir: `${__dirname}/src-www`, tsc: true, vite: true }).catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--3-copy-www')) {
    copyAllFilesWww().catch(e => {
        console.error(`Cannot copy: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--build-www')) {
    cleanWww();
    syncVersion('src-www');
    npmInstall(`${__dirname}/src-www`)
        .then(() => buildReact(`${__dirname}/src-www`, { rootDir: `${__dirname}/src-www`, tsc: true, vite: true }))
        .then(() => copyAllFilesWww());
} else if (process.argv.includes('--build-admin')) {
    cleanAdmin();
    syncVersion('src-admin');
    npmInstall(`${__dirname}/src-admin`)
        .then(() => buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }))
        .then(() => copyAllFilesAdmin());
} else {
    cleanAdmin();
    cleanWww();
    syncVersion('src-admin');
    syncVersion('src-www');
    npmInstall(`${__dirname}/src-admin`)
        .then(() => npmInstall(`${__dirname}/src-www`))
        .then(() => buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }))
        .then(() => copyAllFilesAdmin())
        .then(() => buildReact(`${__dirname}/src-www`, { rootDir: `${__dirname}/src-www`, tsc: true, vite: true }))
        .then(() => copyAllFilesWww())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(2);
        });
}
