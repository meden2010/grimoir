---
tags:
  - grimoir/adr
  - design
  - visual-identity
date: 2026-10-26
status: accepted
---

# ADR-002: Estética Arcane Dark y Animaciones con Anime.js

## Contexto
La mayoría de herramientas de reporte de pruebas son visualmente utilitarias, impersonales o con temas claros estridentes. Grimoir busca una experiencia de diagnóstico inmersiva que convierta la inspección de resultados y trazas de error en una experiencia visual cautivadora sin sacrificar legibilidad.

## Decisión
1. **Identidad Visual "Arcane Dark":**
   - **Superficies:** Void Obsidian (`#0B0C10`), Grimoire Slate (`#13171F`), Arcane Dark (`#1F2833`).
   - **Acentos:** Arcane Gold (`#C5A059`), Radiant Gold (`#E5C583`), Ether Cyan (`#45A29E`), Sorcery Violet (`#8A4FFF`).
   - **Tipografía fija:**
     - `Cinzel` para títulos monumentales y contadores numéricos.
     - `Playfair Display` para subtítulos editoriales.
     - `Inter` para cuerpo y elementos de UI.
     - `JetBrains Mono` para trazas de error, código y métricas.
2. **Biblioteca de Animación:**
   - Se utiliza **Anime.js** para micro-interacciones sutiles (fade-ins de modales, apertura de acordeones, transiciones de pestañas).
   - Prohibido el uso de bibliotecas de animación pesadas o con dependencias de servidor.
   - Respeto estricto a la directiva de accesibilidad `prefers-reduced-motion`.

## Consecuencias
- Interfaz distintiva y memorable con alto contraste para largas sesiones de debugging nocturno.
- Cumple con WCAG AA en ratios de contraste sobre fondos oscuros.

---

## 🔗 Notas Relacionadas
- [[Grimoir Brain]]
- [[Arquitectura del Sistema]]
