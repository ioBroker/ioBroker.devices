const makeShared = (pkgs: string[]): Record<string, { requiredVersion: '*'; singleton: true; eager?: boolean }> => {
    const result: Record<string, { requiredVersion: '*'; singleton: true; eager?: boolean }> = {};
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
 * @param packageJson - package.json or list of modules that used in component
 * @returns Object with shared modules for "federation"
 */
export function moduleFederationShared(
    packageJson?:
        | {
              dependencies: Record<string, string>;
              devDependencies?: Record<string, string>;
          }
        | string[],
): Record<string, { requiredVersion: '*'; singleton: true; eager?: boolean }> {
    const list: string[] = [
        '@emotion/react',
        '@emotion/styled',
        '@iobroker/adapter-react-v5',
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
