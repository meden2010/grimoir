---
tags:
  - grimoir/adr
  - architecture-decision
date: 2026-10-23
status: accepted
---

# ADR-001: Bundling en un Solo Archivo HTML Autónomo

## Contexto
Los generadores de reportes tradicionales (como Allure o el reporter HTML de Playwright) a menudo generan múltiples archivos (subcarpetas de assets, chunks de JavaScript, CSS y carpetas de datos JSON). Esto genera problemas en entornos de CI/CD:
1. Requiere servir la carpeta con un servidor HTTP local para evitar errores de CORS.
2. Complicación al subir y descargar artefactos en GitHub Actions o compartirlos por Slack/correo.

## Decisión
Grimoir empaqueta todo el reporte en un **único archivo HTML autónomo (`output/index.html`)**:
- La plantilla base (`src/report/template.html`), los estilos (`src/report/styles.css`) y el motor interactivo (`src/report/script.js` + Anime.js) se inyectan en línea mediante `src/report/template.ts`.
- Los datos de las pruebas se serializan como un objeto JSON seguro dentro de una etiqueta `<script id="grimoir-data">`.
- Las imágenes y capturas de pantalla de fallos se convierten a `base64`.

## Consecuencias
### Positivas
- Cualquier desarrollador o QA puede hacer doble clic en el archivo HTML y verlo en su navegador de forma offline con protocolo `file://`.
- Cero dependencias de servidores en tiempo de ejecución.
- Compartir el reporte completo en CI/CD consiste en archivar un único archivo.

### Negativas / Mitigaciones
- Si hay cientos de capturas de pantalla pesadas en base64, el tamaño del HTML puede crecer. Para mitigar esto, se truncan o comprimen las trazas excesivas.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Arquitectura del Sistema]]
