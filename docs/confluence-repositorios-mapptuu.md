# MapTuu — Repositorios y novedades (Confluence)

> **Última actualización:** 24 de mayo de 2026 (post-merge PR #11 → `frontend`)  
> **Equipo:** Ezequiel Vargas Berrocal · José Antonio Domínguez González  
> **Propietario GitHub:** [Jose-AntonioT8](https://github.com/Jose-AntonioT8)

Documento para pegar o sincronizar en Confluence (`maptuu.atlassian.net`). Resume el estado de los cuatro repositorios del ecosistema MapTuu.

### Páginas Confluence (espacio MAP)

| Página | ID | URL |
|--------|-----|-----|
| Home MappTuu | 360621 | https://maptuu.atlassian.net/wiki/spaces/MAP/overview |
| 08 - Repositorios GitHub | 27000833 | https://maptuu.atlassian.net/wiki/spaces/MAP/pages/27000833 |
| 09 - Android MappTuu | 27197450 | https://maptuu.atlassian.net/wiki/spaces/MAP/pages/27197450 |
| 10 - Python MappTuu (Power BI) | 27426817 | https://maptuu.atlassian.net/wiki/spaces/MAP/pages/27426817 |
| 01 - Arquitectura general | 24150017 | https://maptuu.atlassian.net/wiki/spaces/MAP/pages/24150017 |

---

## 1. Visión general

MapTuu es una plataforma de **actividades y planes geolocalizados** con:

| Capa | Repositorio | Tecnología | Despliegue / uso |
|------|-------------|------------|------------------|
| **Web (SPA)** | [vercelAngularMappTuu](https://github.com/Jose-AntonioT8/vercelAngularMappTuu) | Angular 19, Firebase, Leaflet, Tailwind | Vercel (rama `frontend`) |
| **API REST** | [vercelNodeMappTuu](https://github.com/Jose-AntonioT8/vercelNodeMappTuu) | Node.js, Express 5, TypeScript, Prisma, Firebase Admin | [vercel-node-mapp-tuu.vercel.app](https://vercel-node-mapp-tuu.vercel.app/api) |
| **Android** | [androidMappTuu](https://github.com/Jose-AntonioT8/androidMappTuu) | Kotlin, Jetpack Compose, Hilt, Room, Retrofit | APK en releases / build local |
| **Analytics / BI** | [PythonMappTuu](https://github.com/Jose-AntonioT8/PythonMappTuu) | Python, export Firestore → CSV | Ejecución local → Power BI |

**Patrón de datos (web + API):**

- **Lecturas:** Firebase Firestore (`onSnapshot` en Angular).
- **Escrituras / dominio:** HTTP a la API con `Authorization: Bearer <Firebase ID token>`.

**Documentación de exposición (2º DAM):** [Proyecto-Intermodular-MappTuu](https://github.com/Ezequielvb/Proyecto-Intermodular-MappTuu) (repo guía del equipo, público).

---

## 2. vercelAngularMappTuu (frontend web)

| | |
|---|---|
| **URL** | https://github.com/Jose-AntonioT8/vercelAngularMappTuu |
| **Visibilidad** | Privado |
| **Producción** | https://vercel-angular-mapp-tuu.vercel.app (Vercel) |
| **API consumida** | `https://vercel-node-mapp-tuu.vercel.app/api` (prod) · `/api` en local (proxy) |

### Rama de producción

| Rama | Estado | Contenido principal |
|------|--------|---------------------|
| **`frontend`** | Rama por defecto · deploy Vercel | Todo lo anterior + **merge PR #11** (`spec-drive-delvelopment` → `frontend`, mayo 2026) |

La rama `spec-drive-delvelopment` quedó **integrada** en `frontend`. Usar siempre `git checkout frontend` para desarrollo y despliegue.

### Novedades integradas en `frontend` (PR #11, mayo 2026)

1. **`chore: add spec-driven development and Cursor project config`** — en producción
   - `AGENTS.md`, `.specify/`, `specs/`, `.cursor/` (reglas, hooks, MCP).

2. **`fix(activities): improve activity detail map layout`** — en producción
   - Mapa Leaflet full-width en detalle de actividad.

3. **`feat(ia): filter Firebase context by question for assistant`** — mergeado y **revertido** en `frontend` (`42fa740`)
   - El asistente `/ia` mantiene el comportamiento previo (sin filtrado/scoring por pregunta en prod).
   - Reintroducir en una rama futura si se valida en QA.

### Stack y features (web)

- Angular 19 **standalone**, Tailwind 3, Leaflet.
- Firebase 11: Auth, Firestore, Storage.
- Pantallas: actividades, planes, mapas, búsqueda, usuario, dashboard, informes, IA (`/ia`), landing.
- **Compodoc:** `npm run docs` / `docs:serve` (documentación JSDoc).
- Moderación de contenido e imágenes; sistema de denuncias.

### Merge

- **PR #11** — `spec-drive-delvelopment` → `frontend` (mergeado).
- Commit cabecera en `frontend`: `a2a86ee`.

---

## 3. vercelNodeMappTuu (backend API)

| | |
|---|---|
| **URL** | https://github.com/Jose-AntonioT8/vercelNodeMappTuu |
| **Rama** | `main` |
| **Visibilidad** | Privado |
| **Producción** | https://vercel-node-mapp-tuu.vercel.app |
| **Swagger** | Redirección `/` → `/api-docs/` |

### Stack

- Node.js, **Express 5**, TypeScript.
- **Prisma** + PostgreSQL (modelo relacional).
- **Firebase Admin** (validación token, Firestore).
- Seguridad: helmet, cors, rate-limit, JWT, bcrypt, Zod.
- Tests: Jest + Supertest.

### Novedades recientes (mayo 2026)

Serie de mejoras **Swagger UI** (José Antonio Domínguez):

- Integración Swagger con CDN y cabeceras de seguridad.
- Enrutado `/api-docs` simplificado; redirects en `vercel.json`.
- CORS configurado hacia `https://vercel-angular-mapp-tuu.vercel.app`.

Scripts útiles: `npm run dev`, `seed:firestore`, `migrate:activity-moderation`, `test` / `test:coverage`.

---

## 4. androidMappTuu (app móvil)

| | |
|---|---|
| **URL** | https://github.com/Jose-AntonioT8/androidMappTuu |
| **Rama** | `main` |
| **Visibilidad** | **Público** |

### Rol

App **visor** en Kotlin + **Jetpack Compose**: listas y detalle de actividades/planes, perfil, mapa (Google Maps), login/registro con Firebase Auth.

### Stack

- Hilt, Room (caché local + `Flow`), Retrofit + Bearer token.
- Navigation Compose, Coil, Material3.

### Novedades recientes

| Fecha | Cambio |
|-------|--------|
| 04-may-2026 | APK MappTuu incluida en el repo; selector de deployment target |
| 19-mar-2026 | Edición/borrado de planes y actividades **solo para owners** |

README del repo documenta arquitectura (`ui/`, `data/`, `di/`), `NavGraph`, flujo Room → Repository → ViewModel → Compose.

---

## 5. PythonMappTuu (exportación Power BI)

| | |
|---|---|
| **URL** | https://github.com/Jose-AntonioT8/PythonMappTuu |
| **Rama** | `main` |
| **Visibilidad** | Privado |

### Propósito

Script **`export_firestore_to_powerbi.py`**: extrae colecciones de **Firestore** y genera CSV en `output/` para **Power BI**.

### Tablas exportadas

- `users.csv`, `activityTypes.csv`, `activities.csv`, `plans.csv`
- `activity_reviews.csv`, `plan_reviews.csv`, `plan_activity_links.csv`

Campos anidados (`reviews`, `activitiesIds`) se normalizan en tablas auxiliares para relaciones en Power BI.

### Configuración

Variables de entorno (o `.env` desde `.env.example`):

- `FIREBASE_SERVICE_ACCOUNT` o `FIREBASE_SERVICE_ACCOUNT_PATH`

### Historial

- Abr-2026: extracción con pandas; dependencias geopy, Babel.
- Abr-2026: commit `powerbi` (ajustes finales exportación).

---

## 6. Integración entre repos

```
[androidMappTuu] ──Retrofit Bearer──┐
[vercelAngularMappTuu] ──HTTP API───┼──► [vercelNodeMappTuu] ──► PostgreSQL / Firestore Admin
         │                          │
         └── Firestore (lecturas) ◄─┘
[PythonMappTuu] ──export CSV──► Power BI (informes académicos / negocio)
```

---

## 7. Enlaces rápidos

| Recurso | Enlace |
|---------|--------|
| Centro exposiciones DAM | [CPIFPAlanTuring/exposiciones_proyecto_intermodular_25_26_2DAM_M](https://github.com/CPIFPAlanTuring/exposiciones_proyecto_intermodular_25_26_2DAM_M) |
| Repo documentación equipo | [Ezequielvb/Proyecto-Intermodular-MappTuu](https://github.com/Ezequielvb/Proyecto-Intermodular-MappTuu) |
| Confluence (08 Repositorios) | https://maptuu.atlassian.net/wiki/spaces/MAP/pages/27000833 |
| Jira / Confluence | https://maptuu.atlassian.net |

---

## 8. Próximos pasos recomendados

- [x] Merge PR `spec-drive-delvelopment` → `frontend` (PR #11).
- [ ] Re-evaluar `feat(ia)` filtrado por pregunta (revertido en `frontend`).
- [ ] Completar README de `Proyecto-Intermodular-MappTuu` y URL en fila 7 del README del centro.
- [ ] Mantener esta página Confluence alineada tras cada release relevante.

---

*Generado desde GitHub MCP + estado de repos a 26/05/2026.*
