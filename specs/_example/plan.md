# Implementation Plan: Filtro rápido en planes guardados (EJEMPLO)

**Branch**: `000-example` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)  
**Status**: Example only

## Summary

Extender `saved-plans` reutilizando el patrón de `filter-plans` en `common/plans/`, sin nuevo servicio si el listado ya expone actividades tipadas.

## Technical Context

**Project Type**: Angular 19 standalone SPA  
**Storage**: Firebase lectura de planes del usuario; sin cambios API si el filtro es cliente.

## Constitution Check

- [x] Capa `features/plans` + `common/plans`
- [x] i18n para label del filtro
- [x] Guard de auth en ruta existente

## Project Structure

```text
src/app/features/plans/saved-plans/     # Orquestación
src/app/common/plans/filter-plans/      # Reutilizar o extender
```

**Structure Decision**: Lógica de filtrado en el componente o pipe local si el dataset es pequeño; servicio solo si se comparte con otras vistas.

## Phase 2: Implementation Strategy

1. Añadir claves i18n.
2. Integrar control de filtro en template de `saved-plans`.
3. Filtrar colección en memoria tras `onSnapshot`.
4. Test unitario del pipe/función de filtro.
