# AGENTS.md — ioBroker.devices

## Architecture

Tab-only ioBroker adapter with **two separate codebases**:

- **Backend** (`src/`): Minimal TypeScript adapter (`src/main.ts`) using `@iobroker/dm-utils` for device management. `src/lib/DeviceManagement.ts` (733 lines) detects physical devices via `@iobroker/type-detector` and exposes them as `dm-utils` controls (switches, sliders, buttons). Runs as an ioBroker adapter process.
- **Frontend** (`src-admin/src/`): React 18 + TypeScript + MUI 6 + Vite SPA. Entry: `App.tsx` → `Tabs/ListDevices.tsx` (3644 lines, main UI). Creates/edits virtual alias devices in the `alias.0` namespace. Uses `@dnd-kit` for drag-and-drop, `@iobroker/adapter-react-v5` for admin integration.

**Data flow**: Physical adapter states → `@iobroker/type-detector` detects device patterns → user maps states to alias devices via the React UI → alias objects written to ioBroker object DB → consumed by Material UI, IoT, Matter adapters.

## Setup & Build

```bash
# Install (ALWAYS use these flags)
PUPPETEER_SKIP_DOWNLOAD=true npm install
cd src-admin && npm install --legacy-peer-deps

# Build (backend + frontend, ~21s — never cancel)
npm run build

# Individual frontend steps
node tasks --0-clean    # wipe admin/ and src-admin/build/
node tasks --2-build    # vite build (~19s)
node tasks --3-copy     # copy to admin/, patch HTML

# Dev server (proxies to ioBroker admin on localhost:8081)
cd src-admin && npm start
```

## Validation (run all before committing)

```bash
npx mocha test/package.test.js          # package structure (<1s)
npx eslint . --max-warnings 0           # root lint (ignores src-admin/)
cd src-admin && npm run lint             # frontend lint (separate eslint config)
cd src-admin && npm run check-ts         # TypeScript strict check
cd src-admin && npx prettier --write .   # fix formatting
```

Full `npm test` requires network access to ioBroker servers — use `test/package.test.js` only in isolated environments.

## Key Conventions

- **Two ESLint configs**: root `eslint.config.mjs` (backend, ignores `src-admin/`) and `src-admin/eslint.config.mjs` (React rules via `@iobroker/eslint-config`). Both use `@iobroker/eslint-config` as base.
- **Prettier**: shared config from `@iobroker/eslint-config/prettier.config.mjs`.
- **i18n**: 11 languages in `src-admin/src/i18n/*.json`. All UI strings go through `I18n.t()` from `@iobroker/adapter-react-v5`. Backend labels use inline `{ en: '...', de: '...' }` objects.
- **Type detection**: `@iobroker/type-detector` `Types` enum defines device types (dimmer, thermostat, blind, etc.). `PatternControl` describes detected state patterns. Extended as `PatternControlEx` in `src-admin/src/types.d.ts` with rooms/functions metadata.
- **Alias namespace**: Virtual devices are created under `alias.0.*` in ioBroker's object tree.
- **No runtime backend logic**: `src/main.ts` is near-empty (reads language config). All heavy logic is in `DeviceManagement.ts` (device detection + control building) using the `dm-utils` framework.
- **Build output**: `tasks.js` copies `src-admin/build/` → `admin/`, renames `index.html` → `tab.html` + `index_m.html` via `patchHtmlFile()`. Never edit files in `admin/` directly.
- **Inline styles**: React components use `const styles: Record<string, React.CSSProperties>` objects, not CSS modules. Only `App.css` exists for global styles.

## File Guide

| Path | Purpose |
|------|---------|
| `src/lib/DeviceManagement.ts` | Backend: device detection, control building (switches/sliders/buttons per device type) |
| `src-admin/src/Tabs/ListDevices.tsx` | Main UI: device list, drag-drop, toolbar, all CRUD operations |
| `src-admin/src/Dialogs/DialogNewDevice.tsx` | New device wizard with type selection and state mapping |
| `src-admin/src/Dialogs/DialogEditDevice.tsx` | Edit existing device properties and state mappings |
| `src-admin/src/Components/TypeOptions.tsx` | Device type → platform compatibility matrix (Alexa, Google, Material, Alisa) |
| `src-admin/src/Devices/SmartDetector.ts` | Thin wrapper around `@iobroker/type-detector` with key caching |
| `src-admin/src/Components/helpers/utils.ts` | Shared utilities: device copying, renaming, ID manipulation |
| `tasks.js` | Build orchestration using `@iobroker/build-tools` |
| `io-package.json` | ioBroker adapter manifest (version, news, dependencies, config) |

