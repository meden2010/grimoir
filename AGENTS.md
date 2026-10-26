# Grimoir — Agent Guidelines

Unified testing report tool that consolidates E2E (Playwright), performance (k6), API, and unit test results into an illuminated visual report with an Arcane Dark aesthetic.

This document is the **universal source of truth** for all autonomous AI assistants (Claude Code, Cursor, Codex, Gemini/Antigravity, etc.) and human contributors.

---

## 1. Development Environment & Tooling

Grimoir is developed and tested using **[Bun](https://bun.com/)**, but distributed as a package runnable by standard **Node.js (>= 18.0.0)**.

- **Package Manager:** Use **Bun** exclusively. Do NOT run `npm`, `pnpm`, or `yarn` for development tasks.
- **Install dependencies:** `bun install`
- **Run unit tests:** `bun test`
- **Type check & Lint:** `bun run lint` (runs `tsc --noEmit`)
- **Fast Static Audit:** `bun run audit:compat` (scans `src/` for illegal Bun runtime leaks)
- **Real Node.js Execution Test:** `bun run test:compat` (builds `dist/` and runs CLI on demo fixtures under Node.js)
- **Build distribution:** `bun run build` (compiles TypeScript and copies assets to `dist/`)
- **Generate demo report:** `bun run dev:demo` (generates mock Playwright + k6 fixtures and builds report in `./output/`)
- **Run CLI locally:** `bun src/cli/index.ts`
- **Clean output:** `bun src/cli/index.ts clean --output ./output`

---

## 2. Invariant Architectural Rules

### Rule 1: Universal Node.js Distribution Compatibility
- The compiled output in `dist/` must execute without error on Node.js 18, 20, and 22 without Bun installed.
- **NEVER** use `Bun.serve`, `Bun.file`, `Bun.spawn`, `Bun.password`, or any global `Bun.*` inside `src/`.
- **NEVER** import `bun:*` modules (`bun:test`, `bun:ffi`, etc.) inside `src/`.
- Use Node standard modules (`fs`, `path`, `http`, `child_process`) exclusively.
- Guard CLI entrypoints with `if (require.main === module)` to allow safe unit testing.
- Static audit is a fast check (`bun run audit:compat`); real execution under Node (`bun run test:compat` and the CI matrix) is the ground truth.
- Full specification: [.agents/rules/01-node-compatibility.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/01-node-compatibility.md).

### Rule 2: Arcane Dark Aesthetics
- Visual report styling must adhere to Grimoir's Arcane Dark theme:
  - **Surfaces:** Void Obsidian (`#0B0C10`), Grimoire Slate (`#13171F`), Arcane Dark (`#1F2833`).
  - **Accents:** Arcane Gold (`#C5A059`), Radiant Gold (`#E5C583`), Ether Cyan (`#45A29E`), Sorcery Violet (`#8A4FFF`).
  - **Status:** Sanctified Emerald (`#2ECC71`), Corrupted Crimson (`#E74C3C`), Unstable Amber (`#F39C12`), Ashen Slate (`#7F8C8D`).
  - **Typography:** Cinzel (monumental titles), Playfair Display (subtitles), Inter (UI body), JetBrains Mono (code, metrics).
- Micro-animations must use Anime.js with subtle, non-blocking transitions.
- Reports must remain self-contained single files bundled by `src/report/template.ts` for offline viewing.
- Full specification: [.agents/rules/02-arcane-dark-design.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/02-arcane-dark-design.md).

### Rule 3: Parser Resilience & Contracts
- All parsers (`src/parsers/`) must ingest test outputs defensively:
  - Guard against `null`, `undefined`, and missing metrics.
  - Support both nested k6 summary outputs (`metric.values.avg`) and flat representations.
  - Avoid division by zero (`totalRequests > 0 ? rate : 100`).
  - Normalize all execution statuses to `'passed' | 'failed' | 'flaky' | 'skipped'`.
- Every parser must have unit tests covering success, failure, and empty/malformed inputs with real fixtures in `tests/fixtures/<tool>/`.
- Full specification: [.agents/rules/03-parsers-and-contracts.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/03-parsers-and-contracts.md).

### Rule 4: Performance & k6 Metrics Standards
- Performance tab metrics must include:
  - Latency distribution: `avg`, `min`, `max`, `p90`, and `p95`.
  - Throughput and volume: total requests and rate (req/s).
  - Health: error rate (`http_req_failed`) and success rate (%).
  - Scenario execution status and virtual user count (`vus`).
- Failed scenarios must always bubble up to the global failure drawer.
- Full specification: [.agents/rules/04-performance-k6-standards.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/04-performance-k6-standards.md).

---

## 3. Mandatory Pre-PR Verification Gate

Before opening a pull request or pushing to `main`, every agent or developer must verify that the following command exits with code `0`:
```bash
bun test && bun run lint && bun run audit:compat && bun run test:compat && bun run build
```

This verification is also enforced in GitHub Actions CI across a **Node.js 18, 20, and 22 matrix** on every push and pull request.

---

## 4. Skills & Specialized Roles

For AI agents supporting modular skills and plugin architectures:
- **Skills (`.agents/skills/`):**
  - [grimoir-dev-workflow](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/skills/grimoir-dev-workflow/SKILL.md): Local development, test, and build procedures.
  - [grimoir-perf-tester](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/skills/grimoir-perf-tester/SKILL.md): Procedures and fixtures for k6 load testing and the Performance tab.
  - [grimoir-parser-builder](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/skills/grimoir-parser-builder/SKILL.md): Step-by-step runbook for adding or extending test parsers.
  - [grimoir-report-designer](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/skills/grimoir-report-designer/SKILL.md): Runbook for editing report HTML/CSS/JS and live previewing.
  - [grimoir-compat-verifier](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/skills/grimoir-compat-verifier/SKILL.md): Static audit and real multi-version Node execution procedures.
- **Specialized Roles (`.agents/plugins/grimoir-devkit/agents/`):**
  - [perf-specialist](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/plugins/grimoir-devkit/agents/perf-specialist/AGENT.md): Performance metrics, percentiles, and scenario health.
  - [arcane-ui-designer](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/plugins/grimoir-devkit/agents/arcane-ui-designer/AGENT.md): Arcane Dark design, typography, and Anime.js animations.
  - [qa-compat-auditor](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/plugins/grimoir-devkit/agents/qa-compat-auditor/AGENT.md): Node.js matrix verification, CLI reliability, and pre-PR quality gate.
