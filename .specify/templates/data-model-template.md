# Data Model: [NOMBRE DE LA FEATURE]

**Date**: [YYYY-MM-DD] | **Spec**: [spec.md](./spec.md)

## Entidades

### [NombreEntidad]

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id | string | sí | Identificador |
| | | | |

**Relaciones**: [Activity, Plan, User, ActivityType…]

**Origen de datos**: Firebase collection `...` | API `POST/GET ...`

## Estados y transiciones

```text
[draft] --> [published] --> [archived]
```

## Validaciones

- Frontend: [validators en `core/validators` o FormControls]
- Backend/API: [reglas que no deben duplicarse solo en UI]

## Mapeo a código existente

| Concepto spec | Archivo / interfaz en repo |
|---------------|----------------------------|
| Plan | `src/app/common/models/plan.model.ts` |
| Activity | `src/app/common/models/...` |

## Índices / consultas Firebase (si aplica)

- Collection: `...`
- Filtros: `where(...)`, ordenación
