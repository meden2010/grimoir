# Grimoir Rule: Universal Node.js Distribution Compatibility

## Purpose
Grimoir is developed and tested using **Bun** (`bun test`, `bun run build`, `bunfig.toml`), but the distributed package (`dist/`) must run seamlessly on standard **Node.js (>= 18.0.0)** environments when installed via `npm i -g grimoir` or run via `npx grimoir`.

## Invariant Constraints

1. **Zero Bun Runtime APIs in `src/`**:
   - **NEVER** use `Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.password`, or any global `Bun.*` inside `src/`.
   - **NEVER** import `bun:*` modules (`bun:test`, `bun:ffi`, `bun:sqlite`, etc.) in `src/`.
   - `bun:test` is permitted **ONLY** in `tests/` directories.

2. **Standard Node.js Modules**:
   - For file system operations: use standard Node.js `fs` (`readFileSync`, `writeFileSync`, `existsSync`, `mkdirSync`, `rmSync`).
   - For paths: use `path` (`join`, `resolve`, `dirname`, `basename`, `relative`). Always use `path.join` or cross-platform normalized path handling.
   - For child processes: use standard Node.js `child_process` (`spawn`, `execSync`).
   - For local HTTP server: use standard Node.js `http` module (`http.createServer`).

3. **CJS / ESM and File Resolution**:
   - In compiled CommonJS/ESM modules, avoid assuming Bun's extensionless or arbitrary import resolution.
   - Guard entry points: When writing CLI or executable scripts, use `require.main === module` guards to ensure safe testability without accidental execution.

4. **Distribution Verification**:
   - Every file emitted to `dist/` must be valid JavaScript runnable by `node dist/cli/index.js`.
   - Run `bun run audit:compat` before any pull request or merge.
