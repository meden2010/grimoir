---
name: Grimoir
description: Illuminated Arcane Dark unified test and performance diagnostics report
colors:
  void-obsidian: "#0B0C10"
  grimoire-slate: "#13171F"
  arcane-dark: "#1F2833"
  surface-lowest: "#0f0d15"
  surface-base: "#15121b"
  surface-low: "#1d1a23"
  surface-container: "#211e27"
  surface-high: "#2c2832"
  on-surface: "#e7e0ed"
  on-surface-variant: "#cbc3d7"
  outline: "#7A7580"
  outline-variant: "#3d3a40"
  arcane-gold: "#C5A059"
  radiant-gold: "#E5C583"
  amber-gold: "#FBBF24"
  sorcery-violet: "#8B5CF6"
  ether-cyan: "#45A29E"
  sanctified-emerald: "#2ECC71"
  corrupted-crimson: "#E74C3C"
  unstable-amber: "#F39C12"
  ashen-slate: "#7F8C8D"
typography:
  display:
    fontFamily: "Cinzel, serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cinzel, serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Playfair Display, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  base: "8px"
  gutter: "16px"
  section: "24px"
components:
  button-filter:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  button-filter-active:
    backgroundColor: "{colors.sorcery-violet}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  card-surface:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Grimoir

## Overview

**Creative North Star: "The Illuminated Diagnostic Grimoire"**

Grimoir transforms dry QA, E2E, and load-testing telemetry into an atmospheric, high-precision arcane manuscript. The interface operates in **Operate** mode: engineers open it to triage failures, inspect execution steps, and verify performance percentiles under time pressure. Atmospheric details—subtle parchment noise, corner sigils, book-spine scroll progress, and runic borders—frame the viewport while keeping the analytical canvas disciplined, scannable, and high-contrast.

Structure and layout are intentionally modular and open to refinement: hierarchy, grid asymmetry, progressive disclosure, and table ergonomics take priority over decorative excess. Visual authority is anchored by Rule 2 (`.agents/rules/02-arcane-dark-design.md`): dark obsidian/slate surfaces, gold/violet/cyan accents, four canonical typefaces, and subtle Anime.js transitions.

**Key Characteristics:**
- Deep obsidian and slate tonal layering (`#0B0C10` / `#0f0d15` to `#2c2832`) instead of heavy drop shadows.
- Monumental serif counters and headers (`Cinzel`, `Playfair Display`) paired with surgical UI sans (`Inter`) and tabular technical monospace (`JetBrains Mono`).
- Strictly semantic status encoding: Emerald (`#2ECC71`) for passed, Crimson (`#E74C3C`) for failed, Amber (`#F39C12`) for flaky/warnings, and Ashen Slate (`#7F8C8D`) for skipped.
- Self-contained single-HTML architecture with subtle Anime.js micro-animations (`300ms`, `easeOutCubic`).

## Colors

The palette pairs deep nocturnal surfaces with metallic gold, sorcery violet, and ether cyan accents, reserving high-chroma hues strictly for semantic test outcomes.

### Primary
- **Sorcery Violet** (`#8B5CF6` / `#8A4FFF`): Active tab indicators, primary interactive focus, performance/k6 highlights, and subtle ambient aura.
- **Arcane Gold** (`#C5A059` / `#FBBF24`): Runic borders, secondary highlights, and monumental accents.
- **Radiant Gold** (`#E5C583`): High-priority hover highlights and active sigil accents.

### Secondary
- **Ether Cyan** (`#45A29E`): Automated test indicators and secondary diagnostic accents.

### Tertiary
- **Sanctified Emerald** (`#2ECC71`): Passed tests, healthy thresholds, and high health score states.
- **Corrupted Crimson** (`#E74C3C`): Failed tests, breached k6 thresholds, and error badges.
- **Unstable Amber** (`#F39C12`): Flaky tests, retries, and ingestion warnings.
- **Ashen Slate** (`#7F8C8D`): Skipped or sealed test cases.

### Neutral
- **Void Obsidian & Surface Lowest** (`#0B0C10` / `#0f0d15`): Primary canvas and deep card wells.
- **Grimoire Slate & Surface Base** (`#13171F` / `#15121b` / `#1d1a23`): Main page background and elevated containers.
- **Arcane Dark & Surface Container** (`#1F2833` / `#211e27` / `#2c2832`): Interactive hover states, table headers, and inputs.
- **On-Surface & Variant** (`#e7e0ed` / `#cbc3d7`): Primary and secondary readable text.
- **Outline & Variant** (`#7A7580` / `#3d3a40`): Muted labels, dividers, and hairline card borders.

### Named Rules
**The Semantic Purity Rule.** Never use Emerald (`#2ECC71`), Crimson (`#E74C3C`), or Amber (`#F39C12`) for decorative chrome; they belong exclusively to test execution and threshold health states.

**The Runic Whisper Rule.** Borders and ornamental sigils remain low-opacity (`rgba(197, 160, 89, 0.2)` or `#3d3a40`) at rest and brighten only on focus or hover.

## Typography

**Display Font:** Cinzel, serif
**Title Font:** Playfair Display, serif
**Body Font:** Inter, sans-serif
**Label/Mono Font:** JetBrains Mono, monospace

**Character:** Monumental, scholarly headers (`Cinzel` and `Playfair Display`) establish the grimoire identity on top-level titles and KPI counters, while `Inter` and `JetBrains Mono` handle dense test trees, stack traces, and latency tables with crisp legibility.

### Hierarchy
- **Display** (`700`, `48px` / `2.25rem–3rem`, `line-height: 1.2`): Report title and primary Health Score / Total Execution counters (`tabular-nums`).
- **Headline** (`600`, `24px–32px`, `line-height: 1.3`): Section headers, KPI card metrics, and modal test titles.
- **Title** (`600`, `18px–20px`, `line-height: 1.4`): Subsection titles and detail panel headers.
- **Body** (`400–600`, `14px–16px`, `line-height: 1.5`): Test case names, descriptions, and table cells.
- **Label** (`600`, `11px–12px`, `letter-spacing: 0.08em`, `uppercase`): Metric labels, table headers, and filter pills.
- **Mono** (`400–500`, `12px–13px`, `line-height: 1.5`): File paths, durations (`ms`/`s`), k6 percentiles (`p90`/`p95`), and error stack traces.

### Named Rules
**The Tabular Metric Rule.** Every numeric counter, duration, percentage, and latency percentile must use `tabular-nums` (`Cinzel` for hero counters, `JetBrains Mono` for technical tables and k6 metrics).

**The Distinct Scale Rule.** Maintain at least a `1.25x` size step between adjacent heading levels (`h1`, `h2`, `h3`, body) rather than relying solely on uppercase labels at identical font sizes.

## Layout

- **Container**: Centered `max-w-[1440px]` canvas with `16px` (`gutter`) horizontal padding and `24px` (`section`) vertical rhythm between primary blocks.
- **Navigation**: Top horizontal tab bar (`Overview`, `Automated`, `Performance`) with animated bottom indicator.
- **Overview Grid**: 3-column top summary (Total Execution + 2-column Health Score gauge), followed by framework coverage strip, 2-column chart row, full-width Failures triage table, historical trend chart, and collapsible KPI sections.
- **Automated Explorer**: Responsive split-pane (`1/3` filterable suite/test tree on left, `2/3` step/error/artifact inspector on right) with expandable Allure-style full-screen modal.
- **Avoid Nested Cards**: Prefer clean dividers (`border-outline-variant/30`), spacing, and tonal background shifts over placing bordered cards inside bordered cards.

## Elevation & Depth

Depth is achieved primarily through **tonal surface layering** (`#0f0d15` -> `#15121b` -> `#211e27`) and hairline borders (`1px solid #3d3a40`), accented by restrained ambient glow on active or hovered cards.

### Shadow Vocabulary
- **Subtle Card Hover** (`0 0 15px rgba(197, 160, 89, 0.15)` or `0 12px 32px -8px rgba(139, 92, 246, 0.18)`): Applied on interactive cards and modals.
- **Modal Backdrop** (`rgba(0, 0, 0, 0.75)` with `backdrop-filter: blur(8px)`): Separates error and Allure inspection dialogs from the underlying report.

### Named Rules
**The No Card-In-Card Rule.** Do not nest bordered/shadowed `.card-hover` containers inside outer bordered cards; use flat header rows or subtle dividers for grouping.

## Shapes

- **Cards & Panels**: `12px` (`rounded-xl`) outer radius with `1px` hairline borders.
- **Inputs & Buttons**: `6px–8px` (`rounded` / `rounded-lg`) for compact search fields, pagination buttons, and filter toggles.
- **Badges & Status Pills**: Full pill (`9999px`) for status indicators and counts.
- **No Thick Side-Tabs**: Avoid `border-l-4` thick colored side stripes on cards; use status dots, pills, or subtle full-border tints instead.

## Components

### Buttons & Filter Pills
- **Shape:** Compact rounded (`6px`–`8px` radius).
- **Primary / Active Filter:** Sorcery Violet tint (`rgba(139, 92, 246, 0.2)`) with `#8B5CF6` text and `1px` border (`rgba(139, 92, 246, 0.4)`).
- **Secondary / Ghost:** Surface container (`#211e27`) with `#cbc3d7` text and subtle hover transition.

### Chips & Status Badges
- **Style:** Pill-shaped (`9999px`), `10px–11px` uppercase bold label with leading `6px` status dot or icon.
- **State:** Colored by semantic status (`#2ECC71` pass, `#E74C3C` fail, `#F39C12` flaky, `#7F8C8D` skip).

### Cards / Containers
- **Corner Style:** `12px` radius (`rounded-xl`).
- **Background:** `#0f0d15` (`surface-container-lowest`) or `#13171F` (`Grimoire Slate`).
- **Border:** `1px solid #3d3a40`.
- **Internal Padding:** `16px` (`p-gutter`) to `24px` (`p-6`).

### Inputs / Search Fields
- **Style:** `1px solid rgba(61, 58, 64, 0.4)` on `#211e27` background, `8px` radius, leading search icon.
- **Focus:** Border shifts to `#8B5CF6` with subtle focus ring (`0 0 12px rgba(139, 92, 246, 0.35)`).

### Navigation Tabs
- **Style:** Horizontal bar with `16px` gap, bottom `1px` divider, and `2px` animated active underline in `#8B5CF6` / `#C5A059`.

## Do's and Don'ts

### Do:
- **Do** preserve the four canonical fonts (`Cinzel`, `Playfair Display`, `Inter`, `JetBrains Mono`) and Arcane Dark palette tokens from Rule 2.
- **Do** use Anime.js and smooth exponential easing (`easeOutCubic` / `cubic-bezier(0.22, 1, 0.36, 1)`) for tab transitions and counter animations.
- **Do** keep all CSS/JS compatible with single-file offline bundling via `src/report/template.ts`.
- **Do** ensure every failed test and failed k6 scenario is immediately visible in the global Failures triage view.

### Don't:
- **Don't** nest bordered cards inside outer bordered cards (`[nested-cards]`).
- **Don't** use `border-l-4` thick colored left borders on cards (`[side-tab]`).
- **Don't** use multi-stop rainbow gradient text (`bg-clip-text`) on headings or metrics (`[gradient-text]`); use solid Radiant Gold (`#E5C583`), Arcane Gold (`#C5A059`), or crisp On-Surface (`#e7e0ed`).
- **Don't** use elastic/bounce easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`); use smooth deceleration curves.
