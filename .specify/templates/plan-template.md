# Implementation Plan: [NOMBRE DE LA FEATURE]

**Branch**: `[NNN-nombre-feature]` | **Date**: [YYYY-MM-DD] | **Spec**: [spec.md](./spec.md)  
**Input**: Especificación funcional aprobada en `spec.md`

## Summary

[Enfoque técnico en 2-4 frases: qué se construye y cómo encaja en MapTuu]

## Technical Context

**Language/Version**: TypeScript 5.7 / Angular 19  
**Primary Dependencies**: @angular/*, @angular/fire, leaflet, tailwind  
**Storage**: Firebase Firestore (lecturas) + API HTTP (escrituras)  
**Testing**: Jasmine + Karma (`ng test`)  
**Target Platform**: Web (SPA)  
**Project Type**: Angular standalone SPA  
**Performance Goals**: [ej. tiempo de carga inicial, listeners Firebase]  
**Constraints**: [ej. sin nuevas dependencias pesadas, mobile-first]  
**Scale/Scope**: [componentes/rutas afectados]

## Constitution Check

*GATE: Debe pasar antes de Phase 0. Revisar tras diseño.*

- [ ] Respeta capas features / common / core
- [ ] Firebase vs API HTTP usados según convención del proyecto
- [ ] i18n planificado para textos de UI
- [ ] Guards/rutas considerados si hay auth

## Project Structure

### Documentation (this feature)

```text
specs/[NNN-nombre-feature]/
├── spec.md
├── plan.md              # Este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── api-contract.md  # o openapi fragment
```

### Source Code (repository root)

```text
src/app/
├── features/[area]/[componente]/     # Pantallas nuevas o modificadas
├── common/[tipo]/[componente]/       # UI reutilizable
├── core/services/[servicio].ts       # Lógica de dominio / HTTP / Firebase
└── app.routes.ts                     # Rutas y guards
```

**Structure Decision**: [explicar qué carpetas se tocan y por qué]

## Phase 0: Outline & Research

Ver [research.md](./research.md) para decisiones, alternativas descartadas y referencias.

## Phase 1: Design & Contracts

- Modelo de datos: [data-model.md](./data-model.md)
- Contratos API/Firebase: [contracts/](./contracts/)
- Guía de prueba manual: [quickstart.md](./quickstart.md)

## Phase 2: Implementation Strategy

1. [Orden sugerido: servicios → componentes → rutas → i18n → tests]
2. [Dependencias entre user stories P1, P2…]

## Complexity Tracking

| Violación propuesta | Por qué es necesaria | Alternativa rechazada |
|---------------------|----------------------|------------------------|
| [ninguna / describir] | | |

## Risks & Mitigations

| Riesgo | Mitigación |
|--------|------------|
| [ej. regresión en listeners Firebase] | [tests / feature flag] |
