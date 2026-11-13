---
tags:
  - grimoir/architecture
  - node-compatibility
  - compliance
updated: 2026-11-12
---

# 🛡️ Compatibilidad con Node.js (Regla Invariante 1)

Grimoir se desarrolla y prueba utilizando **Bun** por su velocidad y experiencia de desarrollo, pero se distribuye como un paquete ejecutable para **Node.js (>= 18.0.0)**.

> [!CAUTION] Prohibición Estricta
> El código en `src/` **NUNCA** debe depender de variables globales de Bun (`Bun.*`) ni importar módulos de Bun (`bun:*`). El código compilado en `dist/` debe ejecutarse en entornos donde Bun no está instalado.

---

## 🚫 Prácticas Prohibidas vs. ✅ Alternativas Aprobadas

| Prohibido en `src/` | Motivo | Alternativa Aprobada |
| :--- | :--- | :--- |
| `Bun.file(path)` | Exclusivo de Bun | `fs.readFileSync(path)` o `fs.promises.readFile(path)` |
| `Bun.write(path, data)` | Exclusivo de Bun | `fs.writeFileSync(path, data)` |
| `Bun.serve({ ... })` | Rompe en Node | Módulo estándar `node:http` |
| `Bun.spawn([ ... ])` | Rompe en Node | Módulo estándar `node:child_process` |
| `import 'bun:test'` | Inexistente en Node | Usar solo en `tests/`, jamás en `src/` |

---

## 🔍 Protocolo de Verificación

Para garantizar que ningún escape de Bun llegue a producción:

1. **Auditoría Estática:**
   ```bash
   bun run audit:compat
   ```
   Escanea recursivamente `src/` buscando llamadas o imports ilegales.
2. **Prueba Real en Node.js:**
   ```bash
   bun run test:compat
   ```
   Compila `dist/` y ejecuta el CLI real usando el binario de `node` del sistema sobre fixtures de prueba.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Arquitectura del Sistema]]
- [[Comandos y Flujo Diario]]
- [[ADR-003 Bun for Tooling, Node for Distribution]]
