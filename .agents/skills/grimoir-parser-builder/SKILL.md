---
name: grimoir-parser-builder
description: >-
  Use when creating a new test parser (e.g. Vitest, Jest, Cypress), modifying an existing
  test parser (Playwright, k6), or adding parser test fixtures and unit tests.
---

# Grimoir Parser Builder Skill

Procedural runbook for adding or modifying test result parsers in Grimoir.

## Standards & Contracts
Data contracts, normalization statuses, and defensive parsing requirements are defined in:
👉 [03-parsers-and-contracts.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/03-parsers-and-contracts.md) (Do not redefine here).

## Implementation Procedure

### Step 1: Create or Update Parser in `src/parsers/`
1. Create `src/parsers/<tool>.parser.ts`.
2. Define strongly typed interfaces (`<Tool>Report`, `<Tool>Stats`).
3. Implement `parse<Tool>(rawJson: Record<string, unknown>): <Tool>Report`.
4. Ensure fallbacks prevent crashes on `null` or undefined metrics.

### Step 2: Add Real JSON Fixtures
Place representative fixtures in `tests/fixtures/<tool>/`:
- `tests/fixtures/<tool>/standard-success.json`
- `tests/fixtures/<tool>/with-failures.json`
- `tests/fixtures/<tool>/empty.json`

### Step 3: Write Unit Tests
Create `tests/unit/<tool>.parser.test.ts`:
```bash
bun test tests/unit/<tool>.parser.test.ts
```

### Step 4: Wire into CLI and HTML Template
1. In `src/cli/index.ts`: Read `<tool>-results.json` from `--input` folder and invoke `parse<Tool>`.
2. In `src/report/template.ts`: Inject parsed data into report placeholders.
3. Validate end-to-end report build:
   ```bash
   bun run test:compat
   ```
