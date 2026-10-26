---
name: grimoir-dev-workflow
description: >-
  Use when building the project (bun run build), running unit tests (bun test),
  type-checking with tsc (bun run lint), or executing Grimoir CLI commands locally.
---

# Grimoir Development Workflow Skill

Procedural runbook for common development commands and pre-PR gates in Grimoir.

## Key Procedures

### 1. Daily Development Loop
```bash
# Typecheck TypeScript
bun run lint

# Run all unit tests
bun test

# Generate demo report and preview locally
bun run dev:demo
```

### 2. Pre-PR / Pre-Merge Quality Gate
Before submitting a PR or merging, execute the complete quality suite:
```bash
bun test && bun run lint && bun run audit:compat && bun run test:compat && bun run build
```
All commands must exit with code `0`.

### 3. Cleaning Build Artifacts
```bash
bun src/cli/index.ts clean --output ./output
```

## References
- Coding and runtime rules: [01-node-compatibility.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/01-node-compatibility.md)
- Universal agent guidelines: [AGENTS.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/AGENTS.md)
