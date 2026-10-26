---
name: grimoir-report-designer
description: >-
  Use when modifying the HTML report template (src/report/template.html), editing CSS styles
  (styles.css), adding Anime.js animations (script.js), or updating report visual layout.
---

# Grimoir Report Designer Skill

Procedural runbook for modifying the visual Arcane Dark test report in Grimoir.

## Design System & Tokens
Color palette, font stacks, and animation constraints are defined in:
👉 [02-arcane-dark-design.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/02-arcane-dark-design.md) (Do not redefine here).

## Architecture & Files
- `src/report/template.html`: Base HTML skeleton and token placeholders.
- `src/report/styles.css`: CSS styling and responsive layout.
- `src/report/script.js`: Client-side behavior, tab switching, Anime.js animations.
- `src/report/template.ts`: Inlines CSS/JS into a single, standalone distribution HTML file.

## Modification Procedure

### 1. Modifying Template, CSS, or Script
- Edit `src/report/styles.css` using existing CSS variables (`--bg-primary`, `--accent-gold`, etc.).
- Ensure micro-animations in `script.js` are subtle and non-blocking.

### 2. Live Previewing
Generate realistic demo data and build the HTML report:
```bash
bun run dev:demo
```
Open `output/index.html` to visually inspect changes across desktop and mobile viewport widths.

### 3. Verifying Standalone Bundle
Ensure that building and running via Node.js produces a working self-contained file:
```bash
bun run test:compat
```
