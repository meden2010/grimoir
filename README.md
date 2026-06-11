# GRIMOIR

## Unified Test Reports

Consolidate all your test results into a single visual report

## What is Grimoir?

Grimoir is an open source tool that consolidates the results of different types of tests into a single visual report, so users don't have to review multiple reports separately and can communicate software quality at a glance.

## ✨ Features

- **📊 Unified report** — E2E, performance, API and unit results in one place
- **🖥️ Visual HTML report** — clean, interactive and shareable
- **⚡ Simple CLI** — one command to generate your report
- **🔌 Multiple integrations** — compatible with Playwright, k6, Lighthouse, Newman, Bruno and more
- **🌐 No server required** — the report is a standalone HTML file

## 🛠️ Tech Stack

Category | Technology
-------- | ----------
Runtime  | Node.js + TypeScript
CLI      | Commander.js
Report   | TailwindCSS + DaisyUI + Chart.js + Lucide Icons

## 📦 Installation

```bash
npm install -g grimoir
```

## 🚀 Usage

```bash
grimoir generate --input ./test-results --output ./report
```

This will read all test results from the `./test-results` folder and generate a `report.html` file.

## 🗺️ Roadmap

### ✅ Phase 1 — MVP

- E2E results parser (Playwright)
- Performance results parser (k6 / Lighthouse)
- Unified HTML report generation
- Basic CLI

### 🔜 Phase 2 — Next

- API results parser (Newman / Bruno)
- Unit test results parser (Jest / Vitest)
- Improved report design
- Robust CLI with more options

### 🔮 Phase 3 — Future

- Accessibility (Axe)
- Security (OWASP ZAP)
- Visual regression (Argos)
- Web hosted version
- CI/CD integrations (GitHub Actions, Jenkins)

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
