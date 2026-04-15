# MapTuu (Angular)

Proyecto Angular (standalone) con Firebase (Auth/Firestore/Storage), Leaflet, Tailwind y una API HTTP (`apiUrl`) para operaciones de dominio.

La documentación de este repo se mantiene en dos capas:

- **Manual (este README)**: arquitectura, reglas y cómo trabajar en el proyecto.
- **Automática (Compodoc)**: documentación navegable de componentes/servicios/guards/pipes/etc, basada en comentarios JSDoc del código.

## Requisitos

- Node.js + npm (recomendado: versión LTS).
- Angular CLI (opcional; el proyecto funciona con `npx ng ...`)

## Instalación

```bash
npm install
```

## Variables de entorno

Antes de ejecutar o construir, el proyecto genera un runtime env mediante `scripts/generate-env.js` (se ejecuta en `prestart` y `prebuild`).

- **Objetivo**: evitar “secrets” hardcodeados y permitir configuración por entorno (local/CI/producción).
- **Dónde se consume**: `src/app/environment/environment.ts` y el runtime env expuesto en `window.__env__` (si aplica).

## Ejecutar en local

```bash
npm run start
```

Luego abre `http://localhost:4200/`.

## Build

```bash
npm run build
```

Salida en `dist/`.

## Estructura del proyecto (high-level)

- `src/app/app.config.ts`: proveedores globales (router, HttpClient, Firebase).
- `src/app/app.routes.ts`: rutas y guards.
- `src/app/core/`: infraestructura transversal (services, guards, pipes, directives, validators).
- `src/app/features/`: pantallas/feature areas (activities, plans, maps, user, etc).
- `src/app/common/`: componentes reutilizables (cards, filtros, controles, modelos).
- `src/app/repositories/`: tokens/abstracciones (si aplica) para desacoplar acceso a datos.

## Arquitectura (cómo pensar el código)

Este proyecto separa responsabilidades de forma práctica:

- **UI / Features** (`features/`, `common/`): componentes standalone que renderizan, validan formularios y orquestan acciones de usuario.
- **Dominio / Casos de uso** (principalmente en `core/services/`): servicios que encapsulan reglas de uso, llamadas HTTP y lecturas de Firebase.
- **Infra / Datos** (`core/services/`, `environment/`): integración con Firebase, HttpClient y configuración por entorno.

### Datos y fuentes

- **Firebase**: lecturas reactivas con listeners (`onSnapshot`) para colecciones (ej: activities/activityTypes/users).
- **API HTTP**: operaciones de escritura/actualización (create/update/delete) con `Authorization: Bearer <token>`.

## Documentación automática con Compodoc

Compodoc genera una web con:
componentes, servicios, guards, pipes, directivas, routing, interfaces/tipos, etc.

### Instalar (ya incluido en el proyecto)

Compodoc está como dependencia dev en `package.json`.

### Generar documentación

```bash
npm run docs
```

### Servir documentación en local

```bash
npm run docs:serve
```

Por defecto abre en `http://localhost:8080`.

### Exportar documentación a carpeta `docs/`

```bash
npm run docs:build
```

## Convención de documentación en código (JSDoc)

Compodoc lee comentarios JSDoc (`/** ... */`).

Documentamos lo que reduce incertidumbre:

- **Responsabilidad** (qué hace y qué NO hace).
- **Contratos**: entradas esperadas, efectos, errores esperables.
- **Reglas de negocio** (si las hay).
- **Ejemplos** de uso cuando ayuda.

Evitar:

- comentarios obvios o redundantes,
- narrar línea a línea,
- cosas que se desactualizan fácil (salvo que aporten contexto real).

