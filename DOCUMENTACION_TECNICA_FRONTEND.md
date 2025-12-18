# Documentación Técnica - Frontend MapTuu

## 📋 Tabla de Contenidos

1. [Visión General del Frontend](#visión-general-del-frontend)
2. [Stack Tecnológico y Versiones](#stack-tecnológico-y-versiones)
3. [Arquitectura y Estructura del Proyecto](#arquitectura-y-estructura-del-proyecto)
4. [Navegación y Rutas (Sitemap)](#navegación-y-rutas-sitemap)
5. [Gestión de Estado y Datos](#gestión-de-estado-y-datos)
6. [Componentes y Features Clave](#componentes-y-features-clave)
7. [Configuración y Entornos](#configuración-y-entornos)
8. [Estado del Desarrollo](#estado-del-desarrollo)

---

## 1. Visión General del Frontend

### ¿Qué aplicación es esta?

**MapTuu** es una aplicación web de gestión y descubrimiento de actividades turísticas y planes de viaje. La aplicación permite a los usuarios:

- **Explorar actividades turísticas** geolocalizadas en un mapa interactivo
- **Buscar y filtrar actividades** por diferentes criterios
- **Crear y gestionar planes de viaje** personalizados
- **Visualizar detalles** de actividades (horarios, precios, contacto, etc.)
- **Gestionar perfiles de usuario** con autenticación

### Objetivo Principal

Proporcionar una plataforma intuitiva donde los usuarios puedan descubrir actividades turísticas en ubicaciones específicas, crear planes de viaje personalizados y gestionar sus experiencias de viaje de manera organizada.

### Descripción de UX/UI

- **Diseño Moderno**: Utiliza **Tailwind CSS** para un diseño responsive y moderno
- **Mapas Interactivos**: Integración con **Leaflet** para visualización geográfica de actividades
- **Navegación Intuitiva**: Header con navegación contextual y footer para acceso rápido
- **Responsive Design**: Adaptación a diferentes tamaños de pantalla (móvil, tablet, desktop)
- **Componentes Reutilizables**: Sistema de componentes compartidos para mantener consistencia visual

---

## 2. Stack Tecnológico y Versiones

### Framework Principal

- **Angular**: `^19.2.0` (versión más reciente, utilizando Standalone Components)
- **TypeScript**: `~5.7.2`
- **Zone.js**: `~0.15.0`

### Librerías de UI y Estilos

- **Tailwind CSS**: `^3.4.18` - Framework de utilidades CSS para diseño
- **SCSS**: Preprocesador CSS (configurado en `angular.json`)
- **Leaflet**: `^1.9.4` - Librería de mapas interactivos
- **@types/leaflet**: `^1.9.21` - Tipos TypeScript para Leaflet

### Backend y Autenticación

- **Firebase**: `^11.10.0` - Backend as a Service
  - **@angular/fire**: `^19.2.0` - Integración oficial de Angular con Firebase
  - **Firebase Auth**: Autenticación de usuarios
  - **Firestore**: Base de datos NoSQL en tiempo real

### Programación Reactiva

- **RxJS**: `~7.8.0` - Programación reactiva con Observables
  - Uso de `BehaviorSubject` para gestión de estado
  - Operadores como `map`, `filter` para transformación de datos

### HTTP y Comunicación

- **@angular/common/http**: Cliente HTTP nativo de Angular
- **API REST**: Comunicación con backend en `http://localhost:3000/api`

### Herramientas de Desarrollo

- **Angular CLI**: `^19.2.18`
- **Karma**: `~6.4.0` - Test runner
- **Jasmine**: `~5.1.0` - Framework de testing
- **PostCSS**: `^8.5.6` - Procesador CSS
- **Autoprefixer**: `^10.4.21` - Compatibilidad de CSS

---

## 3. Arquitectura y Estructura del Proyecto

### Tipo de Arquitectura: Standalone Components

El proyecto utiliza **Standalone Components** (nuevo paradigma de Angular 19), lo que significa:

- ✅ **No usa NgModules** tradicionales
- ✅ Cada componente es independiente y declara sus propias dependencias
- ✅ Configuración centralizada en `app.config.ts`
- ✅ Mejor tree-shaking y bundle size optimizado

### Estructura de Carpetas en `src/app`

La aplicación sigue una **arquitectura por features** con separación de responsabilidades:

```
src/app/
├── app.component.ts          # Componente raíz (Standalone)
├── app.config.ts             # Configuración de la aplicación
├── app.routes.ts             # Definición de rutas
│
├── core/                     # Funcionalidades core (singleton)
│   ├── guards/               # Guards de navegación
│   │   ├── auth.guards.ts    # Guard para usuarios autenticados
│   │   └── admin.guards.ts   # Guard para administradores
│   ├── services/             # Servicios singleton
│   │   ├── auth.service.ts   # Autenticación Firebase
│   │   ├── activity.service.ts
│   │   ├── plan.service.ts
│   │   ├── maps.service.ts
│   │   ├── user.service.ts
│   │   └── activitytype.service.ts
│   └── validators/           # Validadores personalizados
│       └── match-password.validator.ts
│
├── features/                 # Módulos de funcionalidad (por dominio)
│   ├── activities/           # Gestión de actividades
│   │   ├── list-activities/
│   │   ├── activities-creation/
│   │   ├── activity-detail/
│   │   └── activity-update/
│   ├── activity-type/        # Tipos de actividades
│   │   ├── activity-types-creation/
│   │   └── activity-types-list/
│   ├── plans/                # Gestión de planes
│   │   ├── plans-creation/
│   │   ├── plans-detail/
│   │   └── plans-list/
│   ├── user/                 # Gestión de usuarios
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── profile/
│   ├── dashboard/            # Panel de administración
│   ├── landing-page/         # Página de inicio
│   └── maps/                 # Vista de mapas
│
├── common/                   # Componentes y recursos compartidos
│   ├── activities/           # Componentes relacionados con actividades
│   │   ├── card/             # Tarjeta de actividad
│   │   ├── filter/           # Filtros de búsqueda
│   │   └── list/             # Lista de actividades
│   ├── plans/                # Componentes relacionados con planes
│   │   ├── card-plans/
│   │   ├── filter-plans/
│   │   └── list-plans/
│   ├── maps/                 # Componente de mapa reutilizable
│   ├── header/               # Header de navegación
│   ├── footer/               # Footer
│   ├── options/              # Componentes de opciones
│   └── models/               # Interfaces y modelos TypeScript
│       ├── activity.model.ts
│       ├── activityDetail.ts
│       ├── activityType.models.ts
│       ├── plan.model.ts
│       ├── maps.model.ts
│       └── apiurl.model.ts
│
└── environment/              # Configuración por entornos
    └── environment.ts
```

### Estrategia de Estilos

- **SCSS**: Preprocesador CSS configurado como estilo por defecto
- **Tailwind CSS**: Framework de utilidades para diseño rápido
- **Estilos Globales**: `src/styles.scss` con importaciones de Tailwind y Leaflet
- **Estilos por Componente**: Cada componente tiene su propio archivo `.scss`
- **CSS de Leaflet**: Importado globalmente para estilos de mapas

### Configuración de Build

- **Output Path**: `dist/map-tuu`
- **Inline Style Language**: SCSS
- **Source Maps**: Habilitados en desarrollo
- **Optimization**: Deshabilitada en desarrollo, habilitada en producción
- **Budgets**: 
  - Initial: 500kB warning / 1MB error
  - Component Styles: 4kB warning / 8kB error

---

## 4. Navegación y Rutas (Sitemap)

### Archivo de Rutas: `app.routes.ts`

El sistema de rutas utiliza **Functional Guards** (nuevo en Angular 19) y **Component Input Binding**.

### Rutas Públicas (Sin Autenticación)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Redirect | Redirige a `/landingPage` |
| `/landingPage` | `LandingPageComponent` | Página de inicio pública |
| `/login` | `LoginComponent` | Inicio de sesión |
| `/signup` | `SignupComponent` | Registro de usuarios |
| `/activitiesList` | `ListActivitiesComponent` | Lista pública de actividades |
| `/activityDetail/:id` | `ActivityDetailComponent` | Detalle de actividad |
| `/maps` | `MapsComponent` | Vista de mapa con actividades |

### Rutas Protegidas (Requieren Autenticación - `authGuard`)

| Ruta | Componente | Guard | Descripción |
|------|------------|-------|-------------|
| `/activitiesCreation` | `ActivitiesCreationComponent` | `authGuard` | Crear nueva actividad |
| `/updateActivity/:id` | `ActivitiesUpdateComponent` | `authGuard` | Editar actividad existente |
| `/planDetail/:id` | `PlansComponent` | `authGuard` | Detalle de plan de viaje |
| `/profile` | `ProfileComponent` | `authGuard` | Perfil de usuario |
| `/plansCreation` | `PlansCreationComponent` | `authGuard` | Crear nuevo plan |
| `/plansList` | `PlansListComponent` | `authGuard` | Lista de planes del usuario |

### Rutas de Administración (Requieren Admin - `adminGuard`)

| Ruta | Componente | Guard | Descripción |
|------|------------|-------|-------------|
| `/dashboard` | `DashboardComponent` | `adminGuard` | Panel de administración |
| `/activityTypesCreation` | `ActivityTypesCreationComponent` | `adminGuard` | Crear tipo de actividad |
| `/activityTypesList` | `ActivityTypesListComponent` | `adminGuard` | Lista de tipos de actividades |

### Guards Implementados

#### 1. `authGuard`
- **Ubicación**: `core/guards/auth.guards.ts`
- **Función**: Verifica que el usuario esté autenticado
- **Comportamiento**: 
  - Si está autenticado → permite acceso
  - Si no está autenticado → redirige a `/landingPage`

#### 2. `adminGuard`
- **Ubicación**: `core/guards/admin.guards.ts`
- **Función**: Verifica que el usuario sea administrador
- **Comportamiento**:
  - Si es admin → permite acceso
  - Si no es admin → redirige a `/dashboard`
- **Lógica de Admin**: Usuario con email `admin@mapptuu.com`

### Flujo de Navegación

```
Usuario No Autenticado:
  Landing Page → Login/Signup → Landing Page (después de auth)

Usuario Autenticado:
  Landing Page → Activities List / Maps / Profile / Plans

Administrador:
  Dashboard → Gestión de Activities Types / Activities / Plans
```

---

## 5. Gestión de Estado y Datos

### Patrón de Gestión de Estado

La aplicación utiliza **Servicios con BehaviorSubjects** (patrón Observable) para gestión de estado reactiva. **No se utiliza NgRx, Akita ni Signals** para estado global.

### Servicios de Estado

#### 1. `AuthService` (`core/services/auth.service.ts`)

**Responsabilidades**:
- Autenticación con Firebase Auth
- Gestión del estado del usuario actual
- Verificación de roles (admin)

**Estado**:
```typescript
private userSubject = new BehaviorSubject<User | null>(null);
user$ = this.userSubject.asObservable();
```

**Métodos Clave**:
- `login(email, password)`: Inicio de sesión
- `register(email, password)`: Registro
- `logout()`: Cerrar sesión
- `isAuthenticated()`: Verificar autenticación
- `isAdmin()`: Verificar rol de administrador
- `currentUser`: Getter del usuario actual

#### 2. `ActivityService` (`core/services/activity.service.ts`)

**Responsabilidades**:
- CRUD de actividades
- Sincronización en tiempo real con Firestore
- Gestión de estado de actividades

**Estado**:
```typescript
private _activities = new BehaviorSubject<ActivityDetail[]>([]);
public activities$ = this._activities.asObservable();
```

**Características**:
- **Firestore Real-time**: Usa `onSnapshot` para actualizaciones automáticas
- **HTTP REST**: Operaciones CRUD hacia backend (`http://localhost:3000/api/activities`)
- **Híbrido**: Lectura desde Firestore, escritura hacia REST API

**Métodos**:
- `getActivities()`: Observable con lista completa (Firestore)
- `getActivityId(id)`: Obtener actividad específica (Firestore)
- `createActivity(data, token)`: Crear (REST API)
- `updateActivity(id, data, token)`: Actualizar (REST API)
- `deleteActivity(id, token)`: Eliminar (REST API)

#### 3. `PlanService` (`core/services/plan.service.ts`)

**Patrón Similar a ActivityService**:
- Firestore para lectura en tiempo real
- REST API para escritura
- BehaviorSubject para estado reactivo

#### 4. `mapsService` (`core/services/maps.service.ts`)

**Responsabilidades**:
- Geocodificación inversa (coordenadas → dirección)
- Integración con API externa (BigDataCloud)

**API Externa**:
- `https://api.bigdatacloud.net/data/reverse-geocode-client`
- Parámetros: `latitude`, `longitude`, `localityLanguage=es`

### Comunicación con Backend

#### Arquitectura Híbrida

La aplicación utiliza un **patrón híbrido**:

1. **Firestore (Firebase)**: 
   - Lectura de datos en tiempo real
   - Sincronización automática
   - Sin necesidad de polling

2. **REST API**:
   - Escritura de datos (CREATE, UPDATE, DELETE)
   - Endpoint base: `http://localhost:3000/api`
   - Autenticación mediante Bearer Token

#### Autenticación HTTP

- **Método**: Bearer Token en headers
- **Formato**: `Authorization: Bearer ${token}`
- **Obtención**: Token de Firebase Auth (`user.getIdToken()`)
- **Nota**: No se encontraron Interceptors HTTP, el token se pasa manualmente en cada petición

#### Servicios REST

| Servicio | Endpoint Base | Operaciones |
|----------|---------------|-------------|
| `ActivityService` | `/activities` | POST, PATCH, DELETE |
| `PlanService` | `/plans` | POST, PATCH, DELETE |
| `UserService` | `/users` | POST, GET, PATCH, DELETE |
| `ActivityTypeService` | `/activity-types` (inferido) | CRUD completo |

### Modelos de Datos

#### `Activity` / `ActivityDetail`
```typescript
interface Activity {
  id: string;
  name: string;
  imageURL: string;
  favorite: boolean;
  IdTypeActivity: string;
  longitude: string;
  latitude: string;
  rating: number;
}

interface ActivityDetail extends Activity {
  description: string;
  price: number;
  openingHours: { day: string, hours: string }[];
  contactEmail: string;
  highlights: string[];
}
```

#### `Plan`
```typescript
interface Plan {
  id: string;
  name: string;
  activitiesIds: string[];
  imgRef: string;
  ownerId: string;
  rating: number;
  visibility: boolean;
  description: string;
}
```

#### `ActivityType`
```typescript
interface ActivityType {
  id: string;
  name: string;
  description: string;
  color: string;
}
```

---

## 6. Componentes y Features Clave

### Componentes Standalone

Todos los componentes son **Standalone**, lo que significa:
- No dependen de NgModules
- Declaran sus propias dependencias con `imports: []`
- Mejor tree-shaking y optimización de bundle

### Features Principales

#### 1. **Gestión de Actividades** (`features/activities/`)

**Componentes**:
- `ListActivitiesComponent`: Lista con filtros responsive
- `ActivitiesCreationComponent`: Formulario de creación
- `ActivityDetailComponent`: Vista detallada de actividad
- `ActivitiesUpdateComponent`: Formulario de edición

**Componentes Compartidos**:
- `CardComponent`: Tarjeta de actividad reutilizable
- `FilterComponent`: Sistema de filtros
- `ListComponent`: Lista de actividades

**Características**:
- Filtros responsive (se abre/cierra en móvil)
- Integración con mapa para visualización geográfica
- Sistema de favoritos

#### 2. **Sistema de Mapas** (`features/maps/` y `common/maps/`)

**Componente Principal**: `MapComponent` (`common/maps/maps.component.ts`)

**Tecnología**: Leaflet.js

**Características**:
- Mapas interactivos con marcadores
- Geocodificación inversa (coordenadas → dirección)
- Capas de mapas:
  - **Base**: Esri World Imagery (satelital)
  - **Labels**: CartoDB Light Only Labels
- Interacción:
  - Click en marcador → muestra tarjeta con detalles
  - Click en mapa → cierra tarjeta
  - Auto-fit bounds para mostrar todos los marcadores
- Responsive y compatible con SSR (Platform Browser check)

**Props del Componente**:
```typescript
@Input() points: MapMarkerData[]  // Array de marcadores
@Input() center: [number, number]  // Centro del mapa
@Input() zoom: number              // Nivel de zoom
```

#### 3. **Gestión de Planes** (`features/plans/`)

**Componentes**:
- `PlansListComponent`: Lista de planes del usuario
- `PlansCreationComponent`: Crear nuevo plan
- `PlansComponent`: Detalle de plan

**Características**:
- Asociación de múltiples actividades a un plan
- Sistema de visibilidad (público/privado)
- Rating de planes

#### 4. **Autenticación y Usuarios** (`features/user/`)

**Componentes**:
- `LoginComponent`: Inicio de sesión con Firebase
- `SignupComponent`: Registro con validación
- `ProfileComponent`: Perfil de usuario

**Validación**:
- `matchPasswordValidator`: Validador personalizado para confirmar contraseña

#### 5. **Dashboard de Administración** (`features/dashboard/`)

**Funcionalidades**:
- Acceso restringido a administradores
- Navegación rápida a:
  - Crear/Ver Actividades
  - Crear/Ver Tipos de Actividades
  - Crear/Ver Planes
- Logout

#### 6. **Componentes Compartidos** (`common/`)

**Header** (`common/header/`):
- Navegación contextual
- Detección de ruta actual
- Iconos dinámicos según ruta

**Footer** (`common/footer/`):
- Navegación secundaria
- Acceso rápido a secciones

**Cards y Lists**:
- Componentes reutilizables para actividades y planes
- Diseño consistente con Tailwind CSS

### Patrones de Diseño Utilizados

1. **Container/Presentational**: 
   - Features como contenedores
   - Common components como presentacionales

2. **Service Layer**: 
   - Lógica de negocio en servicios
   - Componentes solo para presentación

3. **Observable Pattern**: 
   - Estado reactivo con RxJS
   - Suscripciones para actualizaciones en tiempo real

---

## 7. Configuración y Entornos

### Archivo de Entorno: `environment/environment.ts`

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyC0iCkAwrhlSZ5C5-g01ZbTbupV_3Kh9ew",
    authDomain: "maptuu-e0f68.firebaseapp.com",
    projectId: "maptuu-e0f68",
    storageBucket: "maptuu-e0f68.firebasestorage.app",
    messagingSenderId: "894446902771",
    appId: "1:894446902771:web:59914a0a4c8ab97b218686",
    measurementId: "G-PJC4K4MV6P"
  }
};
```

### Variables Clave Configuradas

1. **Firebase Configuration**:
   - Credenciales completas de Firebase
   - Proyecto: `maptuu-e0f68`
   - Habilitado: Auth, Firestore

2. **API URL** (`common/models/apiurl.model.ts`):
   ```typescript
   const apiUrl = 'http://localhost:3000/api';
   ```
   - **Nota**: Hardcodeado, no usa `environment.ts`
   - **Recomendación**: Mover a `environment.ts` para diferentes entornos

### Configuración de Firebase en `app.config.ts`

```typescript
provideFirebaseApp(() => initializeApp(environment.firebase))
provideAuth(() => getAuth())
provideFirestore(() => getFirestore())
```

### Configuración de TypeScript

**`tsconfig.json`**:
- **Target**: ES2022
- **Module**: ES2022
- **Strict Mode**: Habilitado
- **Angular Compiler Options**:
  - `strictInjectionParameters`: true
  - `strictInputAccessModifiers`: true
  - `strictTemplates`: true

### Configuración de Tailwind

**`tailwind.config.js`**:
- Content: `./src/**/*.{html,ts}`
- Tema extendido (sin personalizaciones adicionales)
- Sin plugins adicionales

### Entornos Disponibles

Actualmente solo existe `environment.ts` (desarrollo). **No se encontró**:
- `environment.prod.ts`
- `environment.staging.ts`

**Recomendación**: Crear archivos de entorno separados para producción.

---

## 8. Estado del Desarrollo

### Funcionalidades Implementadas ✅

1. **Autenticación Completa**:
   - Login/Registro con Firebase
   - Guards funcionales
   - Gestión de sesión

2. **CRUD de Actividades**:
   - Listar, crear, editar, eliminar
   - Integración Firestore + REST API
   - Filtros y búsqueda

3. **Sistema de Mapas**:
   - Visualización geográfica
   - Marcadores interactivos
   - Geocodificación inversa

4. **Gestión de Planes**:
   - Creación y listado
   - Asociación de actividades

5. **Dashboard de Admin**:
   - Gestión de tipos de actividades
   - Acceso restringido

### Áreas de Mejora y Pendientes 🔄

#### 1. **Gestión de Entornos**
- ❌ Falta `environment.prod.ts`
- ❌ API URL hardcodeada (debería estar en environment)
- ⚠️ Credenciales de Firebase expuestas en código

#### 2. **Interceptores HTTP**
- ❌ No hay interceptor para agregar token automáticamente
- ⚠️ Token se pasa manualmente en cada petición
- **Impacto**: Código repetitivo, riesgo de olvidar token

#### 3. **Manejo de Errores**
- ⚠️ No se encontró servicio global de manejo de errores
- ⚠️ Errores HTTP no se manejan centralizadamente
- **Recomendación**: Implementar interceptor de errores

#### 4. **Loading States**
- ⚠️ No hay indicadores de carga globales
- **Recomendación**: Implementar servicio de loading state

#### 5. **Logout en UI**
- ⚠️ Comentario en código: "no está implementado el logout en la interfaz pero lo agrego para tenerlo listo"
- ✅ Método `logout()` existe en servicio
- **Estado**: Funcional pero posiblemente no visible en UI

#### 6. **Validación de Formularios**
- ✅ Validador personalizado para contraseñas
- ⚠️ No se verificó validación completa de formularios
- **Recomendación**: Revisar validaciones en componentes de creación

#### 7. **Testing**
- ⚠️ Archivos `.spec.ts` presentes pero no se verificó cobertura
- **Recomendación**: Ejecutar tests y verificar cobertura

#### 8. **Optimización de Bundle**
- ⚠️ No se verificó lazy loading de rutas
- **Recomendación**: Implementar lazy loading para features grandes

#### 9. **Documentación de Código**
- ⚠️ Comentarios en español e inglés mezclados
- ⚠️ Falta documentación JSDoc en métodos públicos
- **Recomendación**: Estandarizar documentación

#### 10. **Seguridad**
- ⚠️ Email de admin hardcodeado: `admin@mapptuu.com`
- **Recomendación**: Mover a configuración o usar roles de Firebase
- ⚠️ Credenciales de Firebase en código fuente
- **Recomendación**: Usar variables de entorno

### Comentarios en Código (TODOs Implícitos)

1. **`landing-page.component.ts`** (líneas 48-49, 54-55):
   ```typescript
   //una vez que tengamos implementados los planes hay que poner la ruta a la lista
   //this.router.navigate(['/plans']);
   ```
   **Estado**: Parece que los planes ya están implementados, comentario posiblemente obsoleto

2. **`auth.service.ts`** (línea 34):
   ```typescript
   //no esta implementado el logout en la interfaz pero lo agrego para tenerlo listo
   ```
   **Estado**: Método implementado, verificar si está en UI

### Arquitectura y Mejores Prácticas

#### ✅ Buenas Prácticas Implementadas

1. **Standalone Components**: Arquitectura moderna de Angular 19
2. **Separación de Concerns**: Core, Features, Common bien definidos
3. **TypeScript Strict Mode**: Type safety habilitado
4. **Reactive Programming**: Uso correcto de RxJS
5. **Component Reusability**: Componentes compartidos bien estructurados

#### ⚠️ Áreas de Mejora

1. **Lazy Loading**: Implementar para optimizar carga inicial
2. **Error Handling**: Centralizar manejo de errores
3. **Loading States**: Implementar estados de carga globales
4. **Environment Management**: Separar configuraciones por entorno
5. **HTTP Interceptors**: Automatizar autenticación HTTP
6. **Role Management**: Mejorar sistema de roles (no hardcodear email)

---

## 📊 Resumen Ejecutivo

### Fortalezas

- ✅ Arquitectura moderna con Standalone Components
- ✅ Integración robusta con Firebase (Auth + Firestore)
- ✅ Sistema de mapas interactivo y funcional
- ✅ Separación clara de responsabilidades
- ✅ TypeScript con strict mode
- ✅ Diseño responsive con Tailwind CSS

### Debilidades

- ⚠️ Falta de gestión de entornos (solo desarrollo)
- ⚠️ No hay interceptores HTTP (token manual)
- ⚠️ Credenciales expuestas en código
- ⚠️ Sistema de roles básico (email hardcodeado)
- ⚠️ Falta manejo centralizado de errores

### Recomendaciones Prioritarias

1. **Corto Plazo**:
   - Crear `environment.prod.ts`
   - Implementar HTTP Interceptor para tokens
   - Mover API URL a environment

2. **Mediano Plazo**:
   - Implementar manejo centralizado de errores
   - Mejorar sistema de roles (Firebase Custom Claims)
   - Agregar lazy loading de rutas

3. **Largo Plazo**:
   - Implementar Signals para estado (Angular 19)
   - Mejorar cobertura de tests
   - Optimizar bundle size

---

## 📝 Notas Finales

Esta documentación proporciona una visión completa del frontend de MapTuu. El proyecto muestra una base sólida con arquitectura moderna, pero requiere mejoras en gestión de entornos, seguridad y optimización para estar listo para producción.

**Última Actualización**: Basado en análisis del código fuente (Enero 2025)
**Versión del Proyecto**: 0.0.0 (desarrollo activo)

