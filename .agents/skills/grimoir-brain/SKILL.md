---
name: grimoir-brain
description: >-
  Use when documenting architectural decisions (ADRs), recording bug post-mortems,
  updating the product roadmap, or consulting the project's Obsidian Second Brain in docs/.
---

# Grimoir Second Brain Skill

Operates the persistent knowledge vault in `docs/` and `Grimoir Brain.md`.

## Key Procedures

### 1. Consulting Context Before Non-Trivial Tasks
Before implementing a new feature or refactor:
1. Read `Grimoir Brain.md` to identify relevant architecture notes or ADRs.
2. Check `docs/01_Roadmap/Roadmap y Backlog.md` for task scope and dependencies.
3. Verify parser or design constraints in `docs/02_Arquitectura/`.

### 2. Documenting Bug Post-Mortems
When resolving a non-trivial defect or regression (especially via `bug-triager`):
1. Open `docs/04_Bitacora_Bugs/Bitacora de Postmortems.md`.
2. Append a new section following the template:
   - Severity
   - Affected modules
   - Symptom
   - Root Cause
   - Solution Applied
   - Regression Test path

### 3. Updating the Roadmap
Upon completing a feature or parser:
1. Open `docs/01_Roadmap/Roadmap y Backlog.md`.
2. Update the status table or checkboxes (`[x]`).
3. Mention key files added or modified.

### 4. Logging New ADRs
When introducing a new architectural pattern or dependency:
1. Create `docs/03_ADRs/ADR-XXX <Title>.md`.
2. Follow standard ADR sections: Context, Decision, Consequences (Positive/Negative).
3. Add a wikilink in `Grimoir Brain.md` and `docs/02_Arquitectura/Arquitectura del Sistema.md`.

## Formatting Rules
- Always use standard Obsidian wikilinks: `[[Note Name]]` or `[[Note Name|Display Label]]`.
- Use Obsidian callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`).
- Tag notes appropriately with `#grimoir/...`.
