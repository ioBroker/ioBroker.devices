/**
 * Copyright 2018-2023 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
'use strict';

const gulp      = require('gulp');
const fs        = require('fs');
const rename    = require('gulp-rename');
const cp        = require('child_process');

const pkg       = require('./package.json');
const iopackage = require('./io-package.json');
const version   = (pkg && pkg.version) ? pkg.version : iopackage.common.version;

function deleteFoldersRecursive(path, exceptions) {
    if (fs.existsSync(path)) {
        const stat = fs.statSync(path);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(path);
            for (const file of files) {
                const curPath = `${path}/${file}`;
                if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
                    continue;
                }

                const stat = fs.statSync(curPath);
                if (stat.isDirectory()) {
                    deleteFoldersRecursive(curPath);
                    fs.rmdirSync(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            }
        } else {
            fs.unlinkSync(path);
        }
    }
}

gulp.task('clean', done => {
    deleteFoldersRecursive(`${__dirname}/admin`);
    deleteFoldersRecursive(`${__dirname}/src/build`);
    done();
});

function npmInstall() {
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = `${__dirname.replace(/\\/g, '/')}/src/`;

        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during installation, the npm packet will be deleted too,
        // but some files must be loaded even during the installation process.
        const exec = require('child_process').exec;
        const child = exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

gulp.task('2-npm', () => {
    if (fs.existsSync(`${__dirname}/src/node_modules`)) {
        return Promise.resolve();
    } else {
        return npmInstall();
    }
});

gulp.task('2-npm-dep', gulp.series('clean', '2-npm'));

function build() {
    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe',
            cwd:   `${__dirname}/src/`
        };

        const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString('utf8')).version;
        const data = JSON.parse(fs.readFileSync(`${__dirname}/src/package.json`).toString('utf8'));
        data.version = version;
        fs.writeFileSync(`${__dirname}/src/package.json`, JSON.stringify(data, null, 4));

        console.log(options.cwd);

        let script = `${__dirname}/src/node_modules/react-scripts/scripts/build.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/react-scripts/scripts/build.js`;
        }
        if (!fs.existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const child = cp.fork(script, [], options);
            child.stdout.on('data', data => console.log(data.toString()));
            child.stderr.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

gulp.task('3-build', () => build());

gulp.task('3-build-dep', gulp.series('2-npm', '3-build'));

function copyFiles() {
    deleteFoldersRecursive(`${__dirname}/admin`);
    return Promise.all([
        gulp.src([
            'src/build/**/*',
            '!src/build/index.html',
            '!src/build/static/js/main.*.chunk.js',
            '!src/build/i18n/**/*',
            '!src/build/i18n',
            'admin-config/*'
        ])
            .pipe(gulp.dest('admin/')),

        gulp.src([
            'src/build/index.html',
        ])
            .pipe(rename('tab.html'))
            .pipe(gulp.dest('admin/')),

        gulp.src([
            'src/build/static/js/main.*.chunk.js',
        ])
            .pipe(gulp.dest('admin/static/js/')),
    ]);
}

gulp.task('5-copy', () => copyFiles());

gulp.task('5-copy-dep', gulp.series('3-build-dep', '5-copy'));

gulp.task('6-patch', () => new Promise(resolve => {
    if (fs.existsSync(`${__dirname}/admin/tab.html`)) {
        let code = fs.readFileSync(`${__dirname}/admin/tab.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.writeFileSync(`${__dirname}/admin/tab.html`, code);
    }
    if (fs.existsSync(`${__dirname}/src/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src/build/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.writeFileSync(`${__dirname}/src/build/index.html`, code);
    }
    resolve();
}));

gulp.task('6-patch-dep',  gulp.series('5-copy-dep', '6-patch'));

gulp.task('default', gulp.series('6-patch-dep'));

gulp.task('default', gulp.series('5-copy-dep'));
