---
tags:
  - grimoir/roadmap
  - project-management
updated: 2026-11-12
status: active
---

# 🗺️ Roadmap y Backlog de Grimoir

Este documento centraliza el estado actual, prioridades activas y visión futura de **Grimoir**.

> [!TIP] Actualización continua
> Cada vez que un agente o desarrollador complete una tarea de esta lista, debe mover el estado a `[x]` y registrar los archivos creados o actualizados.

---

## 📌 Estado de Parsers de Pruebas

| Motor / Framework | Tipo | Estado | Fixture de prueba | Parser Source |
| :--- | :--- | :--- | :--- | :--- |
| **Playwright** | E2E | ✅ Estable | `tests/fixtures/playwright/` | `src/parsers/playwright.parser.ts` |
| **k6** | Performance | ✅ Estable | `tests/fixtures/k6/` | `src/parsers/k6.parser.ts` |
| **Vitest** | Unit | 🟡 En progreso / Planeado | `tests/fixtures/vitest/` | `src/parsers/vitest.parser.ts` |
| **Jest** | Unit | ⚪ Backlog | `tests/fixtures/jest/` | `src/parsers/jest.parser.ts` |
| **Postman / Newman** | API | ⚪ Backlog | `tests/fixtures/postman/` | `src/parsers/postman.parser.ts` |
| **Cypress** | E2E | ⚪ Backlog | `tests/fixtures/cypress/` | `src/parsers/cypress.parser.ts` |

---

## 🚀 Épicas Activas

### 1. Ingesta Multi-Framework (Parsers de Unidad y API)
- [x] Parser defensivo de Playwright con soporte de retries y capturas base64.
- [x] Parser de k6 con extracción de percentiles (`min`, `med`, `avg`, `p90`, `p95`, `max`), fases HTTP (`httpPhases`), `checks` recursivos, métricas personalizadas (`Trend`, `Counter`, `Rate`, `Gauge`), umbrales con valor observado/motivo y advertencias.
- [ ] Soporte para reportes JSON nativos de **Vitest** (normalización de `describe`/`it` y tiempos).
- [ ] Soporte para Newman/Postman (resumen de endpoints, status codes, latencias).

### 2. Experiencia Visual y Reporte Interactivo (`src/report/`)
- [x] Estética *Arcane Dark* con superficies obsidiana (`#0B0C10`, `#13171F`) y acentos dorados (`#C5A059`).
- [x] Bundler autónomo de archivo único (`template.ts`) con CSS y JS inyectados.
- [x] Vista interactiva de performance con KPIs de k6, selector de métricas `Trend` en Chart.js, desglose de fases HTTP, tendencia histórica entre ejecuciones, tablas de `Checks` / `Custom Metrics` / `Thresholds` / `Scenarios` con el porqué de cada fallo e integración en el Failure Drawer global.
- [ ] Mejorar transiciones y micro-animaciones con **Anime.js** respetando `prefers-reduced-motion`.
- [ ] Vista en árbol de suites con filtrado rápido por etiquetas y tiempo de ejecución.

### 3. Distribución y CI/CD
- [x] Compatibilidad verificada en Node.js 18, 20 y 22.
- [x] Script `bun run gate` para pre-PR verification.
- [ ] Publicación a npm con binario ejecutable sin requerir Bun en destino.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Arquitectura del Sistema]]
- [[Contratos de Parsers]]
- [[Comandos y Flujo Diario]]
