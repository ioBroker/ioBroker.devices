// Ambient declarations for style side-effect imports (e.g. `import 'leaflet/dist/leaflet.css'`).
// TypeScript 6 rejects side-effect imports of modules it cannot resolve types for.
// This file must stay free of imports/exports, otherwise it becomes a module and the
// wildcard declarations below would be treated as module augmentations.
declare module '*.css';
