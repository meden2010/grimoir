# Grimoir Rule: Arcane Dark Design System & Aesthetics

## Purpose
Grimoir delivers an immersive, mystical "Arcane Dark" visual report experience. The visual identity transforms dry QA and test execution data into an illuminated grimoire of diagnostics.

## Design Tokens & Palette

1. **Background & Surface Hierarchy**:
   - `Abyss Black / Canvas`: `#0B0C10` (deep background)
   - `Grimoire Slate / Surface 1`: `#13171F` (cards, containers)
   - `Arcane Dark / Surface 2`: `#1F2833` (card hover, active state, table headers)
   - `Border & Runic Lines`: `rgba(197, 160, 89, 0.2)` to `rgba(197, 160, 89, 0.4)`

2. **Accents & Mystical Glyphs**:
   - `Arcane Gold / Brass`: `#C5A059` (primary accent, runes, active indicators)
   - `Radiant Gold`: `#E5C583` (hover glow, high-priority highlights)
   - `Ether Cyan / Magic`: `#45A29E` / `#66FCF1` (secondary indicators, automated tests)
   - `Sorcery Violet`: `#8A4FFF` / `#B388FF` (performance & k6 indicators)

3. **Status Semantic Tokens**:
   - `Passed / Sanctified`: Emerald Green (`#2ECC71` / `#27AE60`)
   - `Failed / Corrupted`: Crimson Flame (`#E74C3C` / `#C0392B`)
   - `Flaky / Unstable`: Amber Spark (`#F39C12` / `#D35400`)
   - `Skipped / Sealed`: Ashen Slate (`#7F8C8D` / `#95A5A6`)

4. **Typography**:
   - `Titles, Headings & Runes`: **Cinzel**, serif (Arcane, monumental)
   - `Subheadings & Quotes`: **Playfair Display**, serif (Literary elegance)
   - `Body & Interface Text`: **Inter**, sans-serif (Legibility, precision)
   - `Code, Logs & Numbers`: **JetBrains Mono**, monospace (Technical alignment)

## Animation & Interactivity Rules

1. **Anime.js Micro-Animations**:
   - Tab transitions: subtle opacity fade and Y-axis translation (`translateY: [8, 0]`, duration `300ms`, easing `easeOutCubic`).
   - Counter animations: numbers in metric cards should increment fluidly on report load.
   - Runes & Cards: subtle border-glow on hover (`box-shadow: 0 0 15px rgba(197, 160, 89, 0.15)`). Never use jarring or rapid pulsing.

2. **Single-File Bundling Contract**:
   - `src/report/template.html`, `styles.css`, and `script.js` are inlined by `src/report/template.ts` into a standalone, self-contained HTML file.
   - Do NOT introduce external CDN dependencies that would prevent offline report viewing unless explicitly embedded as base64 or inline SVG/CSS/JS.
