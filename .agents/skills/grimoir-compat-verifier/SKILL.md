---
name: grimoir-compat-verifier
description: >-
  Use when verifying Node.js distribution compatibility, auditing source code for
  Bun-exclusive APIs, or running the multi-version Node execution check before release.
---

# Grimoir Compatibility Verifier Skill

Procedural runbook for auditing and verifying universal Node.js (>= 18) distribution compatibility.

## Compatibility Rules
Prohibited APIs and runtime invariant rules are defined in:
👉 [01-node-compatibility.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/01-node-compatibility.md) (Do not redefine here).

## Verification Procedures

### 1. Fast Static Audit
Scans `src/` files for illegal `Bun.*` or `bun:*` references:
```bash
bun run audit:compat
```

### 2. Real Node.js CLI Execution (Ground Truth)
Builds `dist/` and runs the compiled CLI using the native `node` binary over demo fixtures:
```bash
bun run test:compat
```
This tests real Node.js module resolution, absence of Bun dependencies, and CLI command execution.

### 3. CI Matrix Verification
In GitHub Actions, the workflow `.github/workflows/ci.yml` runs this check across **Node 18.x, 20.x, and 22.x**.
