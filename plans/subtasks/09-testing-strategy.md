## Subtask: Testing Strategy

### Unit
- Feature extraction math, param mapping, settings validation.

### Integration
- Renderer store and event wiring; mock audio frames with deterministic fixtures.

### E2E (Smoke)
- Launch Electron, load renderer, verify render loop heartbeat and IPC bridge basics. Prefer Playwright controlling the Electron app.

### Tooling
- `mocha`, `chai`, `sinon` for Node-side; renderer pure logic can use mocha as well.


