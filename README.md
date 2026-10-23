<p align="center">
  <img src="./src/report/assets/grimoir-logo.png" alt="Grimoir Logo" width="160" />
</p>

<h1 align="center">Grimoir</h1>

<p align="center">
  <strong>Unified Testing Report — Consolidate E2E, Performance, and Unit Tests into a Single Arcane Report</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License" /></a>
  <a href="https://bun.com/"><img src="https://img.shields.io/badge/bun-%3E%3D1.0-FBF0DF.svg?logo=bun&logoColor=black" alt="Bun" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-8B5CF6.svg" alt="Node" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-%5E5.0-3178C6.svg" alt="TypeScript" /></a>
  <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/playwright-supported-2EAD33.svg" alt="Playwright" /></a>
  <a href="https://k6.io/"><img src="https://img.shields.io/badge/k6-supported-7D64FF.svg" alt="k6" /></a>
</p>

---

## 📖 What is Grimoir?

**Grimoir** is an open-source testing report tool designed to consolidate the results of multiple testing tools (**Playwright**, **k6**, **Vitest**, and more) into a single, cohesive, and visually stunning dashboard. 

Instead of jumping between isolated reports and tools, software teams can assess holistic quality, performance thresholds, and test execution history at a single glance.

---

## ✨ Features

- **📊 Unified Multi-Engine Report** — Aggregate Playwright (E2E), Vitest (Unit), and k6 (Performance) in one unified dashboard.
- **⚡ Allure-Style Split Pane Layout** — Interactive test suite explorer on the left, with detailed test steps, duration, retries, tags, and attachments on the right.
- **📈 Historical Execution Tracking** — Automatically records test execution runs over time (`.grimoir-history.json`) to track stability, duration trends, and failure patterns.
- **🔮 Arcane Dark Theme** — Meticulously crafted dark grimoire aesthetics with fluid micro-animations (Anime.js), custom glyphs, and responsive layouts.
- **🍩 Interactive Distribution Donut** — Visual status breakdowns with instant filter chips (`Passed`, `Failed`, `Skipped`) and fast text search.
- **🔌 Native Playwright Reporter** — Exposes `grimoir/reporter` to plug seamlessly into your `playwright.config.ts`.
- **👀 Live Watch & Serve Mode** — Built-in HTTP server that watches test output folders and auto-regenerates upon test completion.
- **🌐 Zero Server Requirement** — The output is a standalone HTML report with embedded styles and assets.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Development & Engine** | [Bun](https://bun.com/) (Fast Package Manager, Native TS Runner & Test Engine) |
| **Target Runtime** | Node.js (>=18) & Bun universal compatibility |
| **CLI Framework** | Commander.js |
| **Report Architecture** | JSDOM + TailwindCSS + Custom Grimoire Design System |
| **Charts & Motion** | Chart.js + Anime.js |
| **Typography** | Cinzel + Playfair Display + Inter + JetBrains Mono |
| **Parsers** | Native Playwright JSON, k6 stdout/JSON, Vitest |

---

## 📦 Installation

Install globally:

```bash
# Using bun
bun add -g grimoir

# Or using npm
npm install -g grimoir
```

Or add it locally to your project:

```bash
# Using bun
bun add -d grimoir

# Or using npm
npm install -D grimoir
```

---

## 🚀 Usage

### 1. Generate a Report

Generate a unified report from your test outputs:

```bash
grimoir generate --input ./test-results --output ./grimoir-report
```

#### CLI Options for `generate`:

| Option | Shorthand | Default | Description |
| :--- | :--- | :--- | :--- |
| `--input <path>` | `-i` | `./test-results` | Path to the directory containing test results |
| `--output <path>` | `-o` | `./grimoir-report` | Path where the HTML report will be generated |
| `--port <number>` | `-p` | `8080` | Port for the local preview server |
| `--no-serve` | | | Generate report without starting local HTTP server |
| `--watch` | `-w` | `false` | Watch input folder and auto-regenerate on changes |
| `--clean` | `-c` | `false` | Wipe previous execution history before generating |

### 2. Live Watch Mode (Development)

Run in watch mode during test development:

```bash
grimoir generate -w -i ./test-results -o ./grimoir-report
```

### 3. Serve an Existing Report

```bash
grimoir serve -f ./grimoir-report/index.html -p 8080
```

### 4. Clean History and Output

```bash
grimoir clean -o ./grimoir-report
```

---

## 🔌 Playwright Reporter Integration

Grimoir includes a custom Playwright reporter module. In your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['grimoir/reporter', { outputFile: 'test-results/playwright-results.json' }],
  ],
});
```

When Playwright completes, generate the Grimoire view:

```bash
npx grimoir generate -i ./test-results -o ./report
```

---

## 🗺️ Roadmap

- [x] **Phase 1 — Core & MVP**
  - [x] Playwright E2E parser with test steps & attachments
  - [x] k6 performance scenarios & threshold metrics
  - [x] Allure-style interactive split view
  - [x] Historical test execution tracking
  - [x] CLI commands (`generate`, `serve`, `clean`, `--watch`)
  - [x] Official Grimoire branding and favicons
- [ ] **Phase 2 — Next Expansions**
  - [x] Vitest parser integration
  - [ ] API test parser (Newman / Bruno)
  - [ ] Lighthouse performance scores & web vitals
  - [ ] CI/CD integration guides (GitHub Actions, GitLab CI)
- [ ] **Phase 3 — Arcane Horizon**
  - [ ] Visual regression testing (Argos / Pixelmatch)
  - [ ] Accessibility audits (Axe-core)
  - [ ] Hosted report deployment integration

---

## 🤝 Contributing

Contributions are very welcome! Please check out [CONTRIBUTING.md](./CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details on how to get started.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
