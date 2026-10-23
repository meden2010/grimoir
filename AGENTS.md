# Grimoir — Agent Guidelines

Unified testing report tool that consolidates E2E (Playwright), performance (k6), and unit test results into a single visual report.

## Development Environment & Tooling
- **Runtime & Package Manager:** Use **[Bun](https://bun.com/)** exclusively for development and testing. Do NOT run `npm`, `pnpm`, or `yarn`.
- **Install dependencies:** `bun install`
- **Run unit tests:** `bun test`
- **Run E2E tests:** `bun run test:e2e`
- **Type check & Lint:** `bun run lint` (runs `tsc --noEmit`)
- **Build distribution:** `bun run build` (compiles `tsc` and copies templates/assets to `dist/`)
- **Run CLI locally:** `bun src/cli/index.ts`

## Architecture & Project Structure
- `src/cli/index.ts`: Commander-based CLI entry point (`generate`, `serve`, `clean`).
- `src/parsers/`: Parsers for test outputs (`playwright.parser.ts`, `k6.parser.ts`).
- `src/report/`: HTML report template generation (`template.ts`, `template.html`, `styles.css`, `script.js`).
- `src/reporter/index.ts`: Native Playwright reporter plugin exported as `grimoir/reporter`.
- `tests/unit/`: Unit tests executed via `bun test` (configured in `bunfig.toml`).
- `tests/e2e/`: Playwright end-to-end demo and integration tests.

## Critical Rules for Agents
1. **Universal Node.js Distribution Compatibility:**
   - The compiled code in `dist/` must run seamlessly on standard Node.js (>=18) environments for end users who install Grimoir via `npm i -g grimoir` or use `npx grimoir`.
   - Avoid using Bun-exclusive runtime APIs (`Bun.serve`, `Bun.file`, etc.) in `src/` unless a polyfill or fallback to Node.js standard modules (`fs`, `http`, `path`) is provided.
2. **Preserve Arcane Dark Aesthetics:**
   - Grimoir uses a curated Arcane Dark Theme (Cinzel, Playfair Display, Inter, JetBrains Mono, Anime.js micro-animations). Do not alter colors, typography, or visual tokens without explicit instructions.
3. **Verification Before Pull Request:**
   - Always run and verify that all of the following commands exit with code 0:
     ```bash
     bun test
     bun run lint
     bun run build
     ```
