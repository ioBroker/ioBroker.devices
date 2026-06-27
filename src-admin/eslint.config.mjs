import config, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...config,
    ...reactConfig,
    {
        rules: {
            'no-new-func': 'warn',
            'no-extend-native': 'warn',
            'no-eval': 'warn',
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.ts', '*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            '@/no-duplicate-imports': 'error',
            'react/react-in-jsx-scope': 'off',
        },
    },
    {
        // eslint-plugin-react-hooks@7 promotes the React Compiler rules to "error" in its
        // `recommended` config (pulled in via @iobroker/eslint-config's reactConfig). This
        // project does not use the React Compiler yet, so keep these forward-looking rules
        // as warnings (visible but non-blocking) instead of failing lint/CI.
        rules: {
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
        },
    },
    {
        // `src/**/*.js` are TypeScript compile outputs that sit next to their `.ts`/`.tsx`
        // sources (the project compiles in-place). They are not lintable sources and the
        // TS project service cannot parse them, so exclude them from linting.
        ignores: ['build/**/*', 'node_modules/**/*', 'public/vendor/socket.io.js', '.__mf__temp/**/*', 'src/**/*.js'],
    },
];
