/**
 * Copyright 2018-2023 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
'use strict';

const gulp       = require('gulp');
const fs         = require('fs');

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
const dir = `${__dirname}/src/i18n/`;
gulp.task('i18n=>flat', done => {
    const files = fs.readdirSync(dir).filter(name => name.match(/\.json$/));
    const index = {};
    const langs = [];
    files.forEach(file => {
        const lang = file.replace(/\.json$/, '');
        langs.push(lang);
        const text = require(dir + file);

        for (const id in text) {
            if (text.hasOwnProperty(id)) {
                index[id] = index[id] || {};
                index[id][lang] = text[id] === undefined ? id : text[id];
            }
        }
    });

    const keys = Object.keys(index);
    keys.sort();

    if (!fs.existsSync(`${dir}/flat/`)) {
        fs.mkdirSync(`${dir}/flat/`);
    }

    langs.forEach(lang => {
        const words = [];
        keys.forEach(key => {
            words.push(index[key][lang]);
        });
        fs.writeFileSync(`${dir}/flat/${lang}.txt`, words.join('\n'));
    });
    fs.writeFileSync(`${dir}/flat/index.txt`, keys.join('\n'));
    done();
});

gulp.task('flat=>i18n', done => {
    if (!fs.existsSync(`${dir}/flat/`)) {
        console.error(`${dir}/flat/ directory not found`);
        return done();
    }
    const keys = fs.readFileSync(`${dir}/flat/index.txt`).toString().split(/[\r\n]/);
    while (!keys[keys.length - 1]) keys.splice(keys.length - 1, 1);

    const files = fs.readdirSync(`${dir}/flat/`).filter(name => name.match(/\.txt$/) && name !== 'index.txt');
    const index = {};
    const langs = [];
    files.forEach(file => {
        const lang = file.replace(/\.txt$/, '');
        langs.push(lang);
        const lines = fs.readFileSync(`${dir}/flat/${file}`).toString().split(/[\r\n]/);
        lines.forEach((word, i) => {
            index[keys[i]] = index[keys[i]] || {};
            index[keys[i]][lang] = word;
        });
    });
    langs.forEach(lang => {
        const words = {};
        keys.forEach((key, line) => {
            if (!index[key]) {
                console.log(`No word ${key}, ${lang}, line: ${line}`);
            }
            words[key] = index[key][lang];
        });
        fs.writeFileSync(`${dir}/${lang}.json`, JSON.stringify(words, null, 2));
    });
    done();
});

gulp.task('build', done => {
    const { fork } = require('child_process');

    const child = fork(`${__dirname}/node_modules/react-scripts/scripts/build.js`, {
        cwd: __dirname
    });
    child.on('exit', (code, signal) => done());
});

gulp.task('clean', done => {
    deleteFoldersRecursive(`${__dirname}/admin`, ['actions.js', 'alexalogo.png', 'blockly.js', 'iot.png']);
    done();
});

gulp.task('copy', () => {
    return gulp.src(['build/*/**', 'build/*'])
        .pipe(gulp.dest('../admin/'));
});

gulp.task('renameIndex', gulp.series('copy', function (done) {
    if (fs.existsSync(`${__dirname}/../admin/index.html`)) {
        fs.renameSync(`${__dirname}/admin/index.html`, __dirname + '/admin/index_m.html')
    }
    done();
}));

gulp.task('renameTab', gulp.series('copy', function (done) {
    if (fs.existsSync(`${__dirname}/../admin/index.html`)) {
        fs.renameSync(`${__dirname}/../admin/index.html`, `${__dirname}/../admin/tab.html`)
    }
    done();
}));
