---
tags:
  - grimoir/cheatsheet
  - workflow
  - cli
updated: 2026-11-12
---

# ⚡ Cheatsheet: Comandos y Flujo Diario

Guía rápida de comandos frecuentes para desarrollo y verificación en Grimoir.

---

## 🛠️ Comandos de Desarrollo Local

```bash
# Instalar dependencias
bun install

# Ejecutar todos los tests unitarios
bun test

# Verificar tipos de TypeScript (sin emitir archivos)
bun run lint

# Generar reporte de demostración con fixtures de Playwright y k6
bun run dev:demo

# Limpiar carpeta de salida
bun src/cli/index.ts clean --output ./output
```

---

## 🛡️ Puerta de Verificación (Pre-PR Quality Gate)

Antes de hacer commit, abrir un PR o dar una tarea por terminada, este comando DEBE salir con código `0`:

```bash
bun run gate
```

> [!NOTE] ¿Qué ejecuta `bun run gate` por debajo?
> 1. `bun test` (Tests unitarios)
> 2. `bun run lint` (`tsc --noEmit`)
> 3. `bun run audit:compat` (Auditoría estática de no uso de `Bun.*` en `src/`)
> 4. `bun run test:compat` (Compilación y ejecución real bajo Node.js)
> 5. `bun run build` (Compilación de producción a `dist/`)

> [!WARNING] Limpieza automática en `bun run gate`
> El paso `bun run test:compat` incluido en `bun run gate` ejecuta `clean --output ./output` al final, por lo que eliminará `./output/index.html` y `./output/.grimoir-history.json` locales. Respalda o regenera `./output` después si necesitas conservar el historial local.

---

## 🧪 Pruebas de Compatibilidad con Node.js

```bash
# Auditoría rápida de fugas de APIs de Bun
bun run audit:compat

# Ejecución real en Node.js sobre fixtures de demostración
bun run test:compat
```

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Compatibilidad Node]]
- [[Roadmap y Backlog]]
