# AGENTS.md — MapTuu

Instrucciones para agentes de código (Cursor, Copilot, etc.). Archivo raíz del repositorio; aplica a todo el proyecto salvo que exista un `AGENTS.md` más específico en un subdirectorio (hoy no hay).

## 1. Project Snapshot

| | |
|---|---|
| **Tipo** | Proyecto simple (un solo app Angular SPA) |
| **Producto** | MapTuu — actividades y planes geolocalizados, mapas, auth, moderación |
| **Stack** | Angular 19 standalone, TypeScript 5.7, Tailwind 3, Firebase 11 (`@angular/fire`), Leaflet, RxJS |
| **Backend HTTP** | API externa (`apiUrl` en `src/app/common/models/apiurl.model.ts`); no está el código del API en este repo |
| **Deploy** | Vercel (`vercel.json`) → salida `dist/map-tuu/browser` |
| **Prefijo componentes** | `app` (`angular.json`) |

## 2. Agent Role

### Puedes

- Leer y modificar código en `src/`, specs en `specs/`, y configuración documentada (`.cursor/`, `.specify/`).
- Ejecutar comandos de build/test/documentación listados abajo.
- Crear specs SDD nuevas con `./scripts/create-spec-feature.sh` cuando el alcance lo requiera.
- Usar reglas en `.cursor/rules/` y skills/comandos en `.cursor/skills/`, `.cursor/commands/`.

### No debes (sin permiso explícito del usuario)

- Hacer `git commit`, `git push` ni cambiar configuración git.
- Commitear `.env`, `src/assets/env.js` ni secretos.
- Inventar endpoints, colecciones Firebase o reglas de negocio no presentes en código o specs.
- Añadir dependencias npm sin necesidad clara y acordada.
- Implementar features de producto nuevas sin `spec.md` (salvo spike acordado) — ver `.specify/memory/constitution.md`.

## 3. Setup, Build & Test

Ejecutar desde la **raíz del repo**:

```bash
npm install
cp .env.example .env   # rellenar valores locales; ver scripts/generate-env.js
npm run start          # http://localhost:4200 — ejecuta prestart → generate-env.js
npm run build          # dist/map-tuu — ejecuta prebuild → generate-env.js
npm test               # Karma + Jasmine
npm run docs           # Compodoc estático
npm run docs:serve     # Compodoc en http://localhost:8080
npm run docs:build     # exporta docs al build de producción
```

- **Runtime env**: `scripts/generate-env.js` → `src/assets/env.js` (ignorado por git). Consumo en `src/app/environment/environment.ts`.
- **Variables**: plantilla en `.env.example`; lista completa de claves generadas en `scripts/generate-env.js` (Firebase, Cloudinary, IA/Groq, mapas).
- **No hay** script `lint` ni ESLint configurado en el repo.

## 4. Architecture & JIT Index

### Capas (`src/app/`)

| Ruta | Contenido |
|------|-----------|
| `features/` | Pantallas por dominio (ver tabla abajo) |
| `common/` | UI reutilizable: `activities/`, `plans/`, `activityTypes/`, `maps/`, `custom-controls/`, `modals/`, `header/`, `footer/`, `models/` |
| `core/services/` | Lógica de dominio e integraciones |
| `core/guards/` | `auth.guards.ts`, `guest.guards.ts`, `admin.guards.ts` |
| `core/pipes/`, `core/directives/`, `core/validators/` | Utilidades transversales |
| `repositories/` | `repository.token.ts` (`FIREBASEOPTIONS`) |
| `environment/` | Config por entorno |
| `app.routes.ts` | **Fuente de verdad de rutas y guards** |
| `app.config.ts` | Router, HttpClient, Firebase (Auth, Firestore, Storage) |

### Dominios en `features/`

`activities`, `activity-type`, `plans`, `maps`, `search`, `user`, `dashboard`, `reports`, `ia`, `landing-page`, `about`, `contact`

### Servicios en `core/services/`

`activity.service.ts`, `activitytype.service.ts`, `plan.service.ts`, `user.service.ts`, `auth.service.ts`, `maps.service.ts`, `reporting.service.ts`, `content-moderation.service.ts`, `ia-assistant.service.ts`, `translation.service.ts`, `theme.service.ts`, `firebase-media.service.ts`, `base-media.service.ts`

### Modelos compartidos (`common/models/`)

`activity.model.ts`, `plan.model.ts`, `user.model.ts`, `activityType.models.ts`, `activityDetail.ts`, `apiurl.model.ts`, `maps.model.ts`, `reporting.types.ts`

### Datos (patrón del repo)

- **Lecturas**: Firebase Firestore (`onSnapshot`) — ver p. ej. `activity.service.ts`.
- **Escrituras / dominio**: HTTP a `apiUrl` con `Authorization: Bearer <token>`.
- **Local dev API**: `apiUrl` = `/api` en localhost; producción = `https://vercel-node-mapp-tuu.vercel.app/api`.

### Búsqueda rápida (JIT)

```bash
# Ruta y guard de una pantalla
rg -n "path:" src/app/app.routes.ts

# Servicio de un dominio
rg -n "class.*Service" src/app/core/services/

# Textos i18n
rg -n "clave" src/assets/i18n/

# Tests de un componente
rg -n "describe\\(" src/app/features/plans/
```

## 5. Conventions & Patterns

- **Componentes**: standalone; estilos SCSS + Tailwind; prefijo selector `app`.
- **i18n**: `src/assets/i18n/es.json`, `en.json`, `de.json` — no hardcodear copy de UI.
- **JSDoc**: en servicios, guards y APIs públicas (Compodoc) — ver `README.md`.
- **Rutas**: públicas, `guestGuard` (login/signup), `authGuard` (sesión), `adminGuard` (admin) — documentado en comentarios de `app.routes.ts`.
- **SDD**: features nuevas o cambio de alcance → carpeta en `specs/NNN-slug/`; plantillas en `.specify/templates/`.

## 6. Spec-Driven Development

**Orden de lectura** antes de implementar:

1. `.specify/memory/constitution.md`
2. `specs/README.md`
3. `specs/NNN-*` de la feature en curso (si existe)
4. `README.md` (raíz)

```bash
./scripts/create-spec-feature.sh 001-nombre-feature
```

Solo `specs/_example/` es referencia de formato; no es trabajo pendiente.

## 7. Cursor (`.cursor/`)

```text
.cursor/
├── rules/
│   ├── architecture.mdc              # src/** — capas
│   ├── data-layer.mdc                # core/services/** — Firestore vs API
│   ├── i18n.mdc                      # i18n + templates HTML
│   ├── routes-guards.mdc             # app.routes + guards + features
│   ├── testing.mdc                   # *.spec.ts
│   └── spec-driven-development.mdc   # SDD (always apply)
├── skills/deploy-staging/SKILL.md    # Deploy Vercel
├── commands/
│   ├── fix-bug.md                    # Slash /fix-bug
│   └── write-pr.md                   # Slash /write-pr
├── hooks.json + hooks/
├── mcp.json                          # MCP: atlassian-rovo (MapTuu) + github
└── MCP.md                            # Activar Rovo y GitHub
```

| Invocación | Uso |
|------------|-----|
| `/fix-bug` | Corregir bug con flujo estructurado |
| `/write-pr` | Generar descripción de PR (diff + spec + test plan) |
| Skill `deploy-staging` | Flujo completo deploy Vercel (validar → preview → prod) |

### MCP (Rovo MapTuu + GitHub)

| ID en Cursor | Archivo | Notas |
|--------------|---------|--------|
| **`atlassian-rovo`** | `.cursor/mcp.json` | Único Atlassian del proyecto; **Connect** → `maptuu.atlassian.net` |
| **`github`** | `.cursor/mcp.json` | Requiere `GITHUB_PERSONAL_ACCESS_TOKEN` en `~/.zshrc` |

- Guía completa y errores (`npx ENOENT`): `.cursor/MCP.md`
- No usar **Atlassian-MCP-Server** duplicado del MCP global si ya tienes `atlassian-rovo` conectado.
- Otros MCP (IRIS, Stitch): solo en `~/.cursor/mcp.json`

## 8. Security & Guardrails

- **Nunca** commitear: `.env`, `src/assets/env.js` (en `.gitignore`).
- Secretos solo en `.env` local o variables del host (Vercel, Cursor MCP).
- Hook `.cursor/hooks/guard-secrets.sh` intenta bloquear `git add/commit` de esos archivos.
- El frontend **no** sustituye validación en API/backend.
- No editar sin motivo: `node_modules/`, `dist/`, `documentation/` (salida Compodoc generada).

## 9. Definition of Done

Antes de dar por cerrado un cambio:

- [ ] `npm run build` sin errores
- [ ] `npm test` si se tocó lógica testeable o hay regresión probable
- [ ] Textos nuevos en i18n si aplica
- [ ] JSDoc actualizado en APIs públicas nuevas o modificadas
- [ ] Spec/checklist en `specs/NNN-*/spec.md` si la feature tenía spec
- [ ] Sin secretos en el diff

## 10. Related Documentation

| Documento | Contenido |
|-----------|-----------|
| `README.md` | Instalación, arquitectura, Compodoc |
| `.specify/memory/constitution.md` | Principios SDD y no negociables |
| `specs/README.md` | Flujo de especificaciones |
| `vercel.json` | Build y headers de deploy |
| Compodoc (`npm run docs`) | API del código desde JSDoc |
| `.cursor/MCP.md` | Configuración MCP (Rovo, GitHub, Jira) |

## 11. Git & PR

No hay convención de commits/ramas documentada en el repo. **Preguntar al usuario** antes de commit o push.

---

### Documentación aparte recomendada (opcional, no creada)

Estas piezas **no existen** hoy; créalas solo si el equipo las necesita:

| Archivo | Motivo |
|---------|--------|
| `src/app/AGENTS.md` | Detalle JIT por capa (`features/` vs `common/`) sin inflar el root |
| `docs/API-backend.md` | Contratos del API en `vercel-node-mapp-tuu` (repo externo) |
| Ampliar `.env.example` | Incluir todas las claves de `generate-env.js` (p. ej. `NG_APP_MAPS_API_KEY`) |
