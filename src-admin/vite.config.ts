import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
export default defineConfig({
    plugins: [
        federation({
            name: 'iobroker_devices',
            shared: {},
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
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
    },
});
