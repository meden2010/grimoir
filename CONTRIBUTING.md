# Contributing to Grimoir

First of all, thank you for taking the time to contribute! 🎉

Every contribution helps make Grimoir better for the entire QA community.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)
- [Project Structure](#project-structure)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## How Can I Contribute?

### 🐛 Reporting Bugs
- Check if the bug has already been reported in [Issues](https://github.com/YOUR_USERNAME/grimoir/issues)
- If not, open a new issue using the **Bug Report** template
- Include as much detail as possible: OS, Node.js version, steps to reproduce

### 💡 Suggesting Features
- Open a new issue using the **Feature Request** template
- Explain the problem you're trying to solve
- Describe your proposed solution

### 🔧 Submitting Code
- Look for issues tagged `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it
- Fork the repo and create your branch from `main`

---

## Setting Up the Development Environment

### Requirements
- Node.js 18+
- npm 9+
- Git

### Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/grimoir.git
cd grimoir

# 3. Install dependencies
npm install

# 4. Run tests to verify everything works
npm test

# 5. Start development
npm run dev
```

---

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name:
   ```bash
   git checkout -b feat/playwright-parser
   git checkout -b fix/report-generation
   git checkout -b docs/update-readme
   ```

2. **Make your changes** and write tests if applicable

3. **Run the test suite** before submitting:
   ```bash
   npm test
   ```

4. **Push your branch** and open a Pull Request against `main`

5. **Fill out the PR template** with a clear description of your changes

6. Wait for a review — we'll do our best to respond within 48 hours

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Examples:
feat(cli): add --output flag to specify report path
fix(parser): handle empty Playwright results file
docs(readme): update installation instructions
test(parser): add unit tests for k6 parser
chore(deps): update dependencies
```

**Types:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `style`

---

## Project Structure

```
grimoir/
├── src/
│   ├── cli/          # CLI commands and configuration
│   ├── parsers/      # Result parsers (Playwright, k6, etc.)
│   ├── report/       # HTML report generation
│   └── utils/        # Shared utilities
├── tests/            # Test suite
├── examples/         # Example test results
└── docs/             # Additional documentation
```

---

Thank you for helping build Grimoir! 🔮
