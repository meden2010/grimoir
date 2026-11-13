---
tags:
  - grimoir/architecture
  - system-design
updated: 2026-11-12
---

# 🏛️ Arquitectura del Sistema Grimoir

Grimoir es un consolidador de reportes de pruebas y generador estático que unifica resultados de pruebas funcionales (E2E/Unit) y pruebas de carga (k6) en un único archivo HTML autocontenido con estética **Arcane Dark**.

---

## 🔄 Flujo de Datos de Extremo a Extremo

```mermaid
flowchart TD
    subgraph Inputs["1. Entradas Heterogéneas"]
        PW["Playwright JSON (`tests/fixtures/playwright/`)"]
        K6["k6 Summary JSON (`tests/fixtures/k6/`)"]
        VT["Vitest / Unit JSON"]
    end

    subgraph CLI["2. Capa CLI & Ingesta (`src/cli/`)"]
        Args["Command Parser (`commander`)"]
        Reader["fs / Ingesta Defensiva"]
    end

    subgraph Parsers["3. Capa de Normalización (`src/parsers/`)"]
        PWP["playwright.parser.ts"]
        K6P["k6.parser.ts"]
        Contracts["Contrato Normalizado (`ReportData`)"]
    end

    subgraph Bundler["4. Bundler Monolítico (`src/report/`)"]
        HTML["template.html (Estructura DOM)"]
        CSS["styles.css (Arcane Dark Design Tokens)"]
        JS["script.js + Anime.js (Interacción)"]
        TPL["template.ts (Inlining en memoria)"]
    end

    subgraph Output["5. Salida Final"]
        SingleFile["`output/index.html` (100% Autónomo, Offline)"]
    end

    Inputs --> CLI
    CLI --> Parsers
    Parsers --> Contracts
    Contracts --> Bundler
    HTML & CSS & JS --> TPL
    TPL --> Output
```

---

## 🧱 Módulos Principales

### 1. `src/cli/` — CLI & Orquestación
- **`index.ts`**: Punto de entrada del binario CLI.
- Comandos soportados:
  - `grimoir generate`: Ingiere los JSONs especificados y produce el archivo HTML.
  - `grimoir serve`: Inicia un servidor HTTP local para previsualizar el reporte.
  - `grimoir clean`: Limpia la carpeta de salida (`output/`) y los historiales.

### 2. `src/parsers/` — Normalización Defensiva
- Implementa la **Regla 3** de Grimoir:
  - Ningún archivo malformado debe hacer colapsar el proceso (`try/catch` y valores por defecto).
  - Normalización de estados a `'passed' | 'failed' | 'flaky' | 'skipped'`.
  - División segura por cero en cálculos de ratios y porcentajes de error.

### 3. `src/report/` — Reporte Visual Autónomo
- Cumple la **Regla 2** de Grimoir:
  - Empaqueta el HTML, estilos CSS y scripts JS en un único archivo autónomo listo para descargar en artefactos de CI sin necesidad de un servidor web.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Contratos de Parsers]]
- [[Compatibilidad Node]]
- [[ADR-001 Standalone Single-File Bundler]]
