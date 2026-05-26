# Tasks: [NOMBRE DE LA FEATURE]

**Input**: Design documents from `specs/[NNN-nombre-feature]/`  
**Prerequisites**: plan.md, spec.md, data-model.md (y contracts si aplica)

**Tests**: Incluir tareas de test solo si la spec o el plan lo exigen explícitamente.

**Organization**: Tareas agrupadas por user story para entrega incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias)
- **[Story]**: US1, US2… según spec.md
- Incluir rutas de archivo exactas en la descripción

## Phase 1: Setup

- [ ] T001 Crear estructura de carpetas en `src/app/features/...` según plan.md
- [ ] T002 [P] Añadir claves i18n en `src/assets/i18n/es.json` y `en.json`

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: Ninguna user story hasta completar esta fase.

- [ ] T003 Servicio en `src/app/core/services/...` con métodos HTTP/Firebase
- [ ] T004 Registrar rutas y guards en `src/app/app.routes.ts`

**Checkpoint**: Base lista — comenzar user stories.

## Phase 3: User Story 1 - [Título] (Priority: P1) 🎯 MVP

**Goal**: [objetivo de la story]

**Independent Test**: [cómo verificar]

- [ ] T005 [P] [US1] Componente en `src/app/features/...`
- [ ] T006 [US1] Integrar servicio y estados loading/error
- [ ] T007 [US1] Test unitario `*.spec.ts` si aplica

**Checkpoint**: User Story 1 funcional de extremo a extremo.

## Phase 4: User Story 2 - [Título] (Priority: P2)

- [ ] T008 [P] [US2] ...

**Checkpoint**: User Stories 1 y 2 independientes.

## Phase N: Polish & Cross-Cutting

- [ ] TXXX JSDoc en servicios/API públicas nuevas
- [ ] TXXX Revisar checklist de `spec.md`
- [ ] TXXX `npm run build` y `ng test` sin regresiones

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias
- **Foundational (Phase 2)**: Depende de Setup — bloquea stories
- **User Stories (Phase 3+)**: Dependen de Foundational; orden P1 → P2 → P3
- **Polish**: Después de las stories deseadas

### Parallel Opportunities

- Tareas marcadas [P] pueden ejecutarse en paralelo

## Implementation Strategy

### MVP First (User Story 1 only)

1. Completar Phase 1 + 2
2. Completar Phase 3 (US1)
3. Validar con quickstart.md
4. Demo / PR parcial

### Incremental Delivery

Cada user story añade valor verificable sin romper las anteriores.
