# ioBroker.devices Adapter

ioBroker.devices is a tab-only adapter for the ioBroker smart home platform that manages virtual devices. It provides a React-based web interface for creating and configuring virtual devices that wrap physical device states into standardized structures for use by other adapters like Material UI, IoT, and Matter.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build and Test
- Install main dependencies: `PUPPETEER_SKIP_DOWNLOAD=true npm install` -- takes 7-15 seconds. NEVER CANCEL.
- Install admin dependencies: `cd src-admin && npm install --legacy-peer-deps` -- takes 23 seconds. NEVER CANCEL.
- **OR** install all dependencies at once: `PUPPETEER_SKIP_DOWNLOAD=true npm run npm` -- takes 30 seconds. NEVER CANCEL.
- Build the project: `npm run build` -- takes 21 seconds. NEVER CANCEL. Set timeout to 60+ minutes.
- Run package validation tests: `npx mocha test/package.test.js` -- takes <1 second.
- **NOTE**: Full test suite (`npm test`) includes GUI tests that require network access to ioBroker servers and will fail in isolated environments.

### Development Workflow
- **ALWAYS** use the workarounds for Puppeteer and React dependencies:
  - Set `PUPPETEER_SKIP_DOWNLOAD=true` for main npm install
  - Use `--legacy-peer-deps` flag for src-admin npm install
- Build process overview:
  1. `node tasks --1-npm` - Install src-admin dependencies (if not already done)
  2. `node tasks --2-build` - Build React app with Vite (~19 seconds)
  3. `node tasks --3-copy` - Copy built files to admin directory (<1 second)
- **Individual React development**:
  - `cd src-admin && npm start` - Start Vite dev server
  - React app source is in `src-admin/src/`
  - TypeScript, Material-UI, and React DnD used for UI

### Validation and Quality
- **Package validation**: `npx mocha test/package.test.js` -- always run this, takes <1 second
- **Root linting**: `npx eslint . --max-warnings 0` -- takes 8 seconds
- **Admin linting**: `cd src-admin && npm run lint` -- takes 10 seconds
- **TypeScript check**: `cd src-admin && npm run check-ts` -- takes 6 seconds
- **Format code**: `cd src-admin && npx prettier --write .` -- fix formatting issues
- **ALWAYS** run linting before committing or the CI (.github/workflows/test-and-release.yml) will fail

## Common Issues and Solutions

### Known Issues
- **Puppeteer download fails**: Use `PUPPETEER_SKIP_DOWNLOAD=true` environment variable
- **React peer dependency conflicts**: Use `--legacy-peer-deps` or `-f` flag for src-admin npm install
- **Network-dependent tests fail**: GUI tests require access to ioBroker download servers; run only package tests in isolated environments
- **Current linting errors**: Some files have formatting issues, use Prettier to fix

### Build Failures
- If npm install fails with Puppeteer errors: `PUPPETEER_SKIP_DOWNLOAD=true npm install`
- If src-admin install fails with peer dependency errors: `cd src-admin && npm install --legacy-peer-deps`
- If build fails: Ensure dependencies are installed first, then retry `npm run build`

### CI/CD Requirements
- Tests must pass: Package validation tests should always work
- Linting must pass: Fix all ESLint and Prettier issues
- Build must succeed: 21 second build time is normal
- **GitHub workflow**: `.github/workflows/test-and-release.yml` runs these checks

## Project Structure

### Key Directories
- `src-admin/` - React-based admin interface (TypeScript + Vite)
- `admin/` - Built admin interface files (generated, do not edit)
- `test/` - Test files (package validation + GUI tests)
- `.github/workflows/` - CI/CD configuration

### Important Files
- `package.json` - Main project dependencies and scripts
- `src-admin/package.json` - React app dependencies
- `tasks.js` - Custom build script using @iobroker/build-tools
- `io-package.json` - ioBroker adapter configuration
- `eslint.config.mjs` - Root ESLint configuration
- `src-admin/eslint.config.mjs` - Admin ESLint configuration
- `prettier.config.mjs` - Prettier configuration

### Source Code
- Main entry: `src-admin/src/App.tsx`
- Device management: `src-admin/src/Tabs/ListDevices.tsx`
- Components: `src-admin/src/Components/`
- Dialogs: `src-admin/src/Dialogs/`
- Type definitions: `src-admin/src/types.d.ts`

## Common Commands Reference

### Dependencies
```bash
# Install all dependencies (recommended)
PUPPETEER_SKIP_DOWNLOAD=true npm run npm

# Install main dependencies only
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Install admin dependencies only
cd src-admin && npm install --legacy-peer-deps
```

### Build
```bash
# Full build (21 seconds)
npm run build

# Individual build steps
node tasks --0-clean    # Clean build directories
node tasks --1-npm      # Install src-admin dependencies
node tasks --2-build    # Build React app (19 seconds)
node tasks --3-copy     # Copy files to admin directory
```

### Testing and Validation
```bash
# Package validation (always works)
npx mocha test/package.test.js

# Full test suite (may fail due to network requirements)
npm test

# Linting
npx eslint . --max-warnings 0
cd src-admin && npm run lint

# TypeScript checking
cd src-admin && npm run check-ts

# Code formatting
cd src-admin && npx prettier --write .
```

### Development
```bash
# Start React dev server
cd src-admin && npm start

# Build for production
cd src-admin && npm run build
```

## Manual Validation Requirements

After making changes:
1. **ALWAYS** run package validation tests: `npx mocha test/package.test.js`
2. **ALWAYS** run linting: `npx eslint . --max-warnings 0` and `cd src-admin && npm run lint`
3. **ALWAYS** run TypeScript check: `cd src-admin && npm run check-ts`
4. Build the project: `npm run build` -- verify no errors
5. Check built files exist in `admin/` directory
6. Since this is a web-only adapter (no backend), functional testing requires a full ioBroker installation

## CI/CD Pipeline

The GitHub workflow (`.github/workflows/test-and-release.yml`) performs:
1. **check-and-lint**: Install dependencies and basic checks
2. **build**: Full build process
3. **adapter-tests**: Package validation and GUI tests (may fail in CI due to network)
4. **deploy**: NPM publishing on tagged releases

**Key CI Requirements**:
- All linting must pass
- Package validation tests must pass
- Build must complete successfully
- **Timing**: Builds typically take 1-2 minutes in CI

## Architecture Notes

- **Tab-only adapter**: No backend process, zero CPU/RAM footprint in ioBroker
- **Admin interface only**: All functionality through web UI
- **Virtual device management**: Creates alias devices in `alias.0` namespace
- **TypeScript + React**: Modern web development stack
- **Material-UI**: Google Material Design components
- **Vite build system**: Fast development and production builds
- **ioBroker integration**: Uses @iobroker/adapter-react-v5 for admin integration