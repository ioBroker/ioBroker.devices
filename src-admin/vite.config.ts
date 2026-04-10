import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import { moduleFederationShared } from '../packages/dm-widgets/modulefederation.devices.config';

// Make all shared modules eager for the host application,
// so they are available in the shared scope for remote modules
const shared = moduleFederationShared();
for (const key of Object.keys(shared)) {
    shared[key].eager = true;
}

export default defineConfig({
    plugins: [
        federation({
            name: 'iobroker_devices',
            shared,
            exposes: {},
            remotes: {},
            filename: 'remoteEntry.js',
            manifest: true,
        }),
        react(),
        viteTsConfigPaths(),
        commonjs(),
    ],
    server: {
        host: '0.0.0.0',
        port: 3000,
        proxy: {
            '/adapter': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                },
            },
            '/files': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                },
            },
        },
    },
    resolve: {
        dedupe: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
        alias: {
            // Force all imports (including from packages/dm-widgets/) to use the host's single React copy
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
    },
});
