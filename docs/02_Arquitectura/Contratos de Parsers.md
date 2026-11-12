---
tags:
  - grimoir/architecture
  - contracts
  - parsers
updated: 2026-11-12
---

# 📜 Contratos de Parsers y Normalización

Todos los parsers en `src/parsers/` deben adherirse a contratos estrictos para garantizar que el generador de reportes reciba datos normalizados sin importar la herramienta de origen.

> [!IMPORTANT] Invariante (Regla 3 de Grimoir)
> Los parsers deben ser tolerantes a fallos. Si un JSON contiene campos nulos, estructuras inesperadas o valores faltantes, el parser debe devolver valores seguros (`null`, `[]`, o defaults) con advertencias legibles en lugar de arrojar excepciones no controladas.

---

## 1. Estados Normalizados de Ejecución

Cualquier estado nativo de los test runners debe mapearse exclusivamente a uno de estos 4 valores:

```typescript
export type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped';
```

- **`passed`**: La prueba ejecutó y aprobó sin reintentos fallidos.
- **`failed`**: La prueba falló y agotó todos sus reintentos.
- **`flaky`**: La prueba falló en su primera ejecución pero aprobó en un reintento posterior.
- **`skipped`**: La prueba fue ignorada intencionalmente (`test.skip`).

---

## 2. Contrato de Métricas de Performance (k6)

Las pruebas de carga deben extraer obligatoriamente las siguientes dimensiones según la **Regla 4**:

```typescript
export interface K6MetricsSummary {
  latency: {
    avg: number | null;
    min: number | null;
    max: number | null;
    p90: number | null;
    p95: number | null;
  };
  volume: {
    totalRequests: number | null;
    requestRate: number | null; // req/s
  };
  health: {
    errorRate: number | null; // porcentaje (0 a 100)
    successRate: number | null; // 100 - errorRate
    vus: number | null; // Virtual Users
  };
  thresholds: Array<{
    name: string;
    expression: string;
    passed: boolean;
    value: number | null;
  }>;
  warnings: string[];
}
```

### Reglas críticas para k6:
- Si falta una métrica en el JSON, debe asignarse `null` (nunca inventar `0` o `100%`) y registrar un warning en `warnings`.
- Todo umbral fallido (`passed === false`) debe elevarse automáticamente a la vista global de fallos del reporte.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Arquitectura del Sistema]]
- [[Roadmap y Backlog]]
