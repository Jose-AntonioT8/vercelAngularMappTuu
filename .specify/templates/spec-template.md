# Feature Specification: [NOMBRE DE LA FEATURE]

**Feature Branch**: `[NNN-nombre-feature]`  
**Created**: [YYYY-MM-DD]  
**Status**: Draft | In Review | Approved | Implemented | Deprecated  
**Input**: [Enlace a issue, conversación o descripción breve del pedido]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Título breve] (Priority: P1)

[Describe esta user story en lenguaje natural]

**Why this priority**: [valor de negocio / riesgo]

**Independent Test**: [cómo probar solo esta story sin depender de otras]

**Acceptance Scenarios**:

1. **Given** [estado inicial], **When** [acción], **Then** [resultado esperado]
2. **Given** [estado inicial], **When** [acción], **Then** [resultado esperado]

---

### User Story 2 - [Título breve] (Priority: P2)

[Repetir estructura]

---

### Edge Cases

- ¿Qué pasa cuando [condición límite]?
- ¿Comportamiento sin conexión / API caída / usuario no autenticado?
- ¿Datos vacíos, permisos insuficientes, validación de formularios?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE [requisito testeable]
- **FR-002**: El sistema DEBE [requisito testeable]
- **FR-003**: Los usuarios PUEDEN [capacidad opcional]

*Marcar requisitos ambiguos con `[NEEDS CLARIFICATION: pregunta concreta]`*

### Key Entities *(si aplica)*

- **[Entidad]**: [atributos relevantes, relaciones con Activity, Plan, User, etc.]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [métrica o resultado verificable, ej. "usuario completa flujo en < 3 clics"]
- **SC-002**: [criterio de calidad, ej. "sin errores en consola en flujo feliz"]

## Review & Acceptance Checklist

- [ ] User stories cubren el alcance acordado (sin gold-plating)
- [ ] Requisitos son testeables y no contradictorios
- [ ] Edge cases relevantes documentados
- [ ] Alineado con `.specify/memory/constitution.md`
- [ ] Impacto en i18n, guards y rutas identificado

## Clarifications

### Session [YYYY-MM-DD]

- Q: [pregunta] → A: [respuesta]
