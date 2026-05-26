# API Contract: [NOMBRE]

**Base URL**: `{apiUrl}` (ver `environment.ts`)  
**Auth**: `Authorization: Bearer <firebase-id-token>`

## [Operación 1]

### `METHOD /path`

**Descripción**: [...]

**Request**

```json
{
  "field": "type"
}
```

**Response 200**

```json
{
  "id": "string"
}
```

**Errores**

| Código | Condición |
|--------|-----------|
| 401 | Token inválido o ausente |
| 403 | Sin permiso |
| 404 | Recurso no encontrado |

## Firebase (si aplica)

### Collection: `[nombre]`

**Lectura**: `onSnapshot` en `[Service].ts`  
**Escritura**: vía API (no directo desde cliente si la convención del proyecto lo prohíbe)

## Cliente Angular

| Método HTTP | Servicio | Archivo |
|-------------|----------|---------|
| GET | `...` | `src/app/core/services/...` |
