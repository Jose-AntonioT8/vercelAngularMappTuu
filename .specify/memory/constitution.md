# Constitución del proyecto — MapTuu

Documento rector para Spec-Driven Development. Toda especificación, plan e implementación debe respetar estos principios.

## Propósito del producto

MapTuu es una aplicación Angular para descubrir, crear y gestionar actividades y planes geolocalizados, con mapas (Leaflet), autenticación Firebase y operaciones de dominio vía API HTTP.

## Principios no negociables

### 1. Especificación antes que código

- No se implementa una feature sin `spec.md` aprobado (o al menos revisado).
- Los cambios de alcance se reflejan primero en la spec, luego en el plan y las tareas.

### 2. Arquitectura del repositorio

- **Features** (`src/app/features/`): pantallas y flujos de usuario (standalone components).
- **Common** (`src/app/common/`): UI reutilizable, modelos compartidos, controles.
- **Core** (`src/app/core/`): servicios transversales, guards, pipes, directivas, validadores.
- **Repositories** (`src/app/repositories/`): tokens y abstracciones de acceso a datos cuando aplique.

### 3. Fuentes de datos

- **Firebase**: lecturas reactivas (`onSnapshot`) para colecciones en tiempo real.
- **API HTTP** (`apiUrl`): escrituras y operaciones de dominio con `Authorization: Bearer <token>`.
- No duplicar lógica de negocio entre componentes; centralizar en servicios de `core/`.

### 4. Calidad y mantenibilidad

- Componentes **standalone**; evitar NgModules nuevos salvo necesidad extrema.
- JSDoc en contratos públicos (servicios, guards, modelos) para Compodoc y agentes IA.
- Tests unitarios (`*.spec.ts`) para lógica no trivial y regresiones críticas.
- Sin secretos en código: usar `scripts/generate-env.js` y variables de entorno.

### 5. UX e i18n

- Textos de usuario en archivos `src/assets/i18n/` (no hardcodear strings visibles).
- Consistencia visual con Tailwind y patrones existentes (cards, filtros, modales).
- Accesibilidad básica: labels en formularios, estados de carga y error claros.

### 6. Seguridad

- Rutas protegidas con guards existentes (`auth.guards`, `guest.guards`).
- Validar permisos en backend/API; el frontend no es la única barrera.
- No exponer tokens ni claves en specs, commits ni documentación.

## Stack tecnológico (referencia)

| Capa | Tecnología |
|------|------------|
| Framework | Angular 19 (standalone) |
| Estilos | Tailwind CSS + SCSS por componente |
| Mapas | Leaflet |
| Auth / DB tiempo real | Firebase (Auth, Firestore, Storage) |
| HTTP | HttpClient → API REST |
| Docs código | Compodoc (JSDoc) |
| Specs | Spec-Driven Development (esta carpeta) |

## Flujo de trabajo SDD

1. **Constitution** (este archivo) — principios del proyecto.
2. **Specify** — `specs/NNN-nombre-feature/spec.md` (qué y por qué).
3. **Clarify** — resolver ambigüedades antes del plan.
4. **Plan** — `plan.md`, `data-model.md`, `contracts/`, `research.md`.
5. **Tasks** — `tasks.md` con tareas verificables.
6. **Implement** — código en `src/` siguiendo el plan.
7. **Review** — checklist de aceptación en la spec.

## Criterios de aceptación globales

Toda feature entregada debe:

- [ ] Cumplir las user stories de su `spec.md`.
- [ ] Respetar la arquitectura de carpetas descrita arriba.
- [ ] Incluir i18n para textos nuevos visibles al usuario.
- [ ] No introducir regresiones en rutas/guards documentados.
- [ ] Actualizar JSDoc en APIs públicas nuevas o modificadas.

## Gobernanza de cambios

- Cambios que alteren principios de esta constitución requieren actualizar este archivo y comunicarlo en el PR.
- Las specs obsoletas se marcan con estado `Deprecated` en el encabezado, no se borran sin historial.
