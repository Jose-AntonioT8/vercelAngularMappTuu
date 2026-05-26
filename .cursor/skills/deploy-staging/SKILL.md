---
name: deploy-staging
description: >-
  Flujo completo de deploy MapTuu en Vercel (validación local, preview, producción).
  Usar cuando el usuario pida deploy, staging, preview, release, Vercel o publicar la app.
disable-model-invocation: true
---

# Deploy MapTuu — flujo completo (Vercel)

## Resumen del flujo

```text
[Fase 0] Validar código local
    → [Fase 1] Preview (staging)
        → [Fase 2] Verificación post-preview
            → [Fase 3] Producción (solo con confirmación explícita)
```

## Contexto técnico

| | |
|---|---|
| Framework | Angular 19 standalone |
| Config deploy | `vercel.json` |
| Build local | `npm run build` → `prebuild` ejecuta `scripts/generate-env.js` |
| Salida | `dist/map-tuu/browser` |
| Build en Vercel | `npm run build && npm run docs:build` |
| API backend | Externa (`apiUrl` en `src/app/common/models/apiurl.model.ts`) |

## Fase 0 — Validación local (obligatoria)

Ejecutar desde la raíz del repo:

```bash
npm run build
npm test
```

Checklist:

- [ ] Build sin errores
- [ ] Tests pasan si el cambio toca lógica crítica
- [ ] No hay `.env` ni `src/assets/env.js` en el diff
- [ ] Variables necesarias documentadas en Vercel (mismas claves que `scripts/generate-env.js`)
- [ ] Si hay spec SDD: checklist de `specs/NNN-*/spec.md` revisado

Si falla algo, **no desplegar** hasta corregir.

## Fase 1 — Preview / staging

### Opción A — Git push (recomendada si el repo está en Vercel)

1. Push a la rama del PR.
2. Vercel crea **Preview Deployment** automáticamente.
3. Abrir URL de preview en el dashboard de Vercel.

### Opción B — CLI

```bash
npm i -g vercel   # si no está instalado
vercel            # preview; seguir prompts
```

**No ejecutar** `vercel --prod` en esta fase.

## Fase 2 — Verificación post-preview

- [ ] La app carga en la URL de preview
- [ ] Login Firebase (dominio `*.vercel.app` autorizado en Firebase Console)
- [ ] Rutas SPA (rewrites a `/index.html` en `vercel.json`)
- [ ] `assets/env.js` servido con headers no-cache (ya en `vercel.json`)
- [ ] Flujos críticos del cambio (actividades, planes, mapas según alcance)
- [ ] Documentación Compodoc en preview si aplica (`/documentation/`)

## Fase 3 — Producción (solo con confirmación explícita del usuario)

```bash
vercel --prod
```

O merge a la rama de producción conectada en Vercel, según política del equipo.

Confirmar antes:

- [ ] Preview validado por el usuario
- [ ] Variables de entorno de **Production** en Vercel completas
- [ ] No hay migraciones o cambios de API pendientes en el backend externo

## Integración Jira MapTuu (opcional)

Si **atlassian-rovo** está conectado en Cursor (cloud `maptuu.atlassian.net`):

Tras deploy exitoso, el agente puede **proponer** actualizar el ticket MapTuu (estado, comentario con URL de preview) si el usuario lo pide; no cambiar Jira sin confirmación.

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| Build falla por env | Revisar Vercel env + `generate-env.js` |
| Auth Firebase | Añadir dominio preview en Firebase Console |
| 404 en rutas | `rewrites` en `vercel.json` |
| API 401/403 | Backend `vercel-node-mapp-tuu`; token y CORS |

## Prohibido sin permiso explícito

- `vercel --prod` o deploy a producción
- Commitear secretos o pegar tokens en el chat
- Cambiar variables de producción en Vercel sin acuerdo
