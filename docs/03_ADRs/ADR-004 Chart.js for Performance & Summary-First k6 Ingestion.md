---
tags:
  - grimoir/adr
  - grimoir/performance
  - grimoir/chartjs
updated: 2026-11-12
status: accepted
---

# ADR-004: Chart.js para la Pestaña Performance e Ingesta Summary-First de k6

## Contexto
Al diseñar la evolución de la pestaña **Performance** (`#tab-perf`) para k6, se evaluaron tres opciones de librerías de visualización (**Chart.js**, **TradingView Lightweight Charts** y **uPlot**) y dos modelos de ingesta (`--summary-export` JSON vs series temporales NDJSON `--out json=`).

## Decisión
1. **Mantener Chart.js como única librería de gráficas** para métricas agregadas (`--summary-export`) y evolución histórica entre ejecuciones (`.grimoir-history.json`), aprovechando la configuración *Arcane Dark* ya existente en `src/report/script.js`.
2. **Priorizar el formato `--summary-export` (`k6-results.json`)** como contrato principal, explotando percentiles (`min`, `med`, `avg`, `p90`, `p95`, `max`), fases HTTP, `checks` recursivos y métricas personalizadas (`Trend`, `Counter`, `Rate`, `Gauge`) sin inflar el HTML autocontenido.
3. **Diferir uPlot únicamente como futura extensión** en caso de que Grimoir incorpore ingesta de series temporales segundo a segundo con *downsampling*.

## Consecuencias
- **Positivas:** Una sola librería de gráficas, menor peso del reporte autocontenido, soporte uniforme para barras, barras horizontales (fases HTTP con toggle Linear/Log), líneas históricas y gráficas del Overview.
- **Negativas:** No se grafican curvas intra-ejecución (VUs/latencia segundo a segundo) hasta que se implemente un parser opcional de NDJSON con *downsampling*.

---
Relacionado con: [[Performance Tab y k6]], [[ADR-001 Standalone Single-File Bundler]], [[Contratos de Parsers]]
