import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.mjs', '*.js'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // `src/**/*.js` are TypeScript compile outputs emitted in-place next to their `.ts` sources
        // (the package builds with a bare `tsc`). They are not lintable sources and the TS project
        // service cannot parse them, so exclude them — same as the src-admin config.
        ignores: [
            'example/**/*',
            'node_modules/**/*',
            'build/**/*',
            '.**/*',
            'modulefederation.devices.config.js',
            'src/**/*.js',
        ],
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',

            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
