---
tags:
  - grimoir/postmortems
  - bug-triage
  - lessons-learned
updated: 2026-11-12
---

# 🐞 Bitácora de Bugs y Postmortems

Este documento sirve como la **memoria de aprendizaje** para errores complejos resueltos en Grimoir. Cada vez que el agente `bug-triager` o el desarrollador aíslen y reparen un defecto no trivial, deben documentar aquí el síntoma, la causa raíz y la regla de prevención.

---

## 📋 Plantilla para Nuevas Entradas

```markdown
### [FECHA] Título Breve del Bug
- **Severidad:** [Alta | Media | Baja]
- **Módulos afectados:** `src/parsers/...`, etc.
- **Síntoma:** Qué falló o qué mensaje de error se observó.
- **Causa Raíz:** Por qué ocurrió en el código fuente.
- **Solución Aplicada:** Qué cambio específico lo solucionó.
- **Test de Regresión:** Ruta del test en `tests/unit/` que previene su reaparición.
```

---

## 📚 Registro de Lecciones Aprendidas

### [2026-10-28] Normalización de Buffers de Adjuntos en Playwright
- **Severidad:** Media
- **Módulos afectados:** `src/parsers/playwright.parser.ts`
- **Síntoma:** Al serializar capturas de pantalla de Playwright para el reporte HTML, los objetos `Buffer` serializados (`{ type: 'Buffer', data: [...] }`) generaban un HTML gigantesco o fallaban al renderizar imágenes inline.
- **Causa Raíz:** Playwright a veces serializa los adjuntos binarios como arrays de bytes en JSON en lugar de cadenas base64.
- **Solución Aplicada:** Se implementó una función normalizadora que detecta buffers serializados y los convierte a cadenas base64 limpias (`Buffer.from(data).toString('base64')`).
- **Test de Regresión:** `tests/unit/playwright.parser.test.ts` ("should normalize serialized Buffer attachments to base64 strings").

### [2026-10-30] Binding de Host en CLI (`0.0.0.0` vs `127.0.0.1`)
- **Severidad:** Baja (UX)
- **Módulos afectados:** `src/cli/index.ts`
- **Síntoma:** Cuando el servidor local se iniciaba con `--host 0.0.0.0`, el enlace impreso en la terminal mostraba `http://0.0.0.0:8080`, el cual no siempre es clickeable de forma transparente en navegadores de macOS.
- **Causa Raíz:** No se formateaba el host wildcard para conveniencia de visualización en la terminal.
- **Solución Aplicada:** Se añadió la función auxiliar `formatServerUrl` que traduce el wildcard `0.0.0.0` a `127.0.0.1` en la salida visible de la terminal, manteniendo el binding real en `0.0.0.0`.
- **Test de Regresión:** `tests/unit/cli.test.ts` ("formatServerUrl > should report 0.0.0.0 wildcard as 127.0.0.1").

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Contratos de Parsers]]
- [[Comandos y Flujo Diario]]
