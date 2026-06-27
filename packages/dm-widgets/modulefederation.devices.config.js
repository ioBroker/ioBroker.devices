const makeShared = pkgs => {
    const result = {};
    pkgs.forEach(packageName => {
        result[packageName] = {
            requiredVersion: '*',
            singleton: true,
        };
    });
    return result;
};

/**
 * Admin shares these modules for all components
 *
 * @param {object | string[]} [packageJson] - package.json or list of modules that used in component
 * @returns {Record<string, { requiredVersion: string; singleton: boolean }>} Object with shared modules for "federation"
 */
function moduleFederationShared(packageJson) {
    const list = [
        '@emotion/react',
        '@emotion/styled',
        '@iobroker/adapter-react-v5',
        '@iobroker/dm-widgets',
        '@iobroker/type-detector',
        '@mui/icons-material',
        '@mui/material',
        '@sentry/browser',
        'leaflet',
        'moment',
        'react',
        'react-dom',
        'react-color',
        'react-input-color',
        'suncalc2',
    ];

    if (Array.isArray(packageJson)) {
        return makeShared(list.filter(packageName => packageJson.includes(packageName)));
    }

    if (packageJson && (packageJson.dependencies || packageJson.devDependencies)) {
        return makeShared(
            list.filter(
                packageName => packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName],
            ),
        );
    }

    return makeShared(list);
}

module.exports = { moduleFederationShared };
