# Feature Specification: Filtro rápido en planes guardados (EJEMPLO)

**Feature Branch**: `000-example`  
**Created**: 2026-05-16  
**Status**: Example — no implementar  
**Input**: Documento de referencia para el formato SDD en MapTuu

> Esta carpeta es solo plantilla de ejemplo. No representa trabajo pendiente.

## User Scenarios & Testing

### User Story 1 - Filtrar por tipo de actividad (Priority: P1)

Como usuario autenticado, quiero filtrar mis planes guardados por tipo de actividad para encontrar planes relevantes más rápido.

**Why this priority**: Mejora retención en la vista `saved-plans`.

**Independent Test**: Abrir `/plans/saved`, aplicar un filtro y ver solo planes que contengan actividades del tipo elegido.

**Acceptance Scenarios**:

1. **Given** tengo al menos 2 planes guardados con tipos distintos, **When** selecciono un tipo en el filtro, **Then** solo veo planes que incluyen actividades de ese tipo.
2. **Given** un filtro activo, **When** lo limpio, **Then** vuelvo a ver todos mis planes guardados.

---

### Edge Cases

- Sin planes guardados → mensaje vacío i18n, sin error en consola.
- Usuario no autenticado → redirect según `auth.guards`.

## Requirements

### Functional Requirements

- **FR-001**: El filtro DEBE persistir mientras el usuario permanece en la vista (estado en componente).
- **FR-002**: El listado DEBE actualizarse sin recargar la página completa.

### Key Entities

- **Plan**: ver `src/app/common/models/plan.model.ts`
- **ActivityType**: tipos asociados a actividades del plan

## Success Criteria

- **SC-001**: Filtrar y limpiar en menos de 3 interacciones.
- **SC-002**: Sin regresión en carga de planes (Firebase listener existente).

## Review & Acceptance Checklist

- [x] Formato de ejemplo válido
- [ ] (N/A — no es feature real)

## Clarifications

_Ninguna — documento de ejemplo._
