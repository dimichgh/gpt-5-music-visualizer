## Subtask: Bootstrapping (M0)

### Objectives
- Initialize Electron + TypeScript project with `main`, `preload`, `renderer` (React + Vite) workspaces.
- Configure linting, formatting, testing (mocha/chai/sinon), and scripts.

### Steps
1) Create project structure:
   - `app/main` (ts), `app/preload` (ts), `app/renderer` (react+ts+vite).
   - Shared types in `packages/types` (ts).
2) Tooling:
   - `eslint`, `prettier`, `typescript`, `vitest` for renderer unit tests, but project-wide tests use mocha.
   - `mocha`, `chai`, `sinon` for Node-side units.
3) Electron wiring:
   - `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`.
   - Preload exposes `ipcBridge` with typed channels.
4) Dev scripts:
   - Concurrent start: build main/preload with `tsc -w` or `esbuild`, run `vite` for renderer, then `electron .`.
5) CI:
   - `pnpm` or `yarn` preferred; lint + typecheck + test.

### Deliverables
- Running dev app showing placeholder Three.js scene.
- Passing unit test skeletons.


