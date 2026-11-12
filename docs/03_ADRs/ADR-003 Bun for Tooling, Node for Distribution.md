---
tags:
  - grimoir/adr
  - tooling
  - node-compatibility
date: 2026-10-28
status: accepted
---

# ADR-003: Bun para Tooling Interno, Node.js para Distribución

## Contexto
El equipo busca la máxima velocidad de ejecución para tests unitarios, tipado y desarrollo local (donde Bun supera significativamente a npm/yarn). Sin embargo, la gran mayoría de servidores de CI y equipos de desarrollo corporativos ejecutan Node.js estándar (Node 18, 20 o 22) y no tienen Bun preinstalado.

## Decisión
- **En Desarrollo Local (Interno):**
  - Se utiliza `bun` exclusivamente para instalar dependencias (`bun install`), correr tests (`bun test`), y compilar (`bun run build`).
- **En Distribución (Producción / CLI):**
  - El código en `src/` no debe utilizar ninguna API exclusiva de Bun.
  - El paquete generado en `dist/` debe ser 100% compatible con Node.js estándar (>= 18.0.0).
  - Un gate de verificación automatizado (`bun run audit:compat` y `bun run test:compat`) garantiza que no se publiquen APIs de Bun.

## Consecuencias
- Velocidad máxima de desarrollo local para los ingenieros y agentes.
- Máxima adopción y compatibilidad cero-fricción para los usuarios finales.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Compatibilidad Node]]
- [[Comandos y Flujo Diario]]
