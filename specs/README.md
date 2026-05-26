# Spec-Driven Development — MapTuu

Este directorio contiene las **especificaciones ejecutables** de cada feature. El código en `src/` se implementa a partir de estos artefactos, no al revés.

## ¿Qué es Spec-Driven Development (SDD)?

**Spec-Driven Development** invierte el desarrollo tradicional: durante décadas el código fue el artefacto principal y las especificaciones eran documentación temporal. En SDD, la **especificación es la fuente de verdad**: define el *qué* y el *por qué* antes del *cómo*, y guía (o genera) la implementación de forma sistemática.

En proyectos con agentes IA (Cursor, Copilot, etc.), las specs dan contexto estable, reducen el “vibe coding” y permiten entregas incrementales verificables.

### Fases del ciclo SDD

| Fase | Artefacto | Pregunta que responde |
|------|-----------|------------------------|
| Constitution | `.specify/memory/constitution.md` | ¿Qué principios no se negocian? |
| Specify | `specs/NNN-feature/spec.md` | ¿Qué queremos construir y para quién? |
| Clarify | Sección *Clarifications* en spec.md | ¿Qué estaba ambiguo? |
| Plan | `plan.md`, `data-model.md`, `contracts/` | ¿Cómo lo construimos en MapTuu? |
| Tasks | `tasks.md` | ¿En qué pasos verificables? |
| Implement | `src/app/...` | Código alineado con la spec |
| Review | Checklist en spec.md | ¿Cumple criterios de aceptación? |

## Estructura del repositorio

```text
.
├── .specify/
│   ├── memory/
│   │   └── constitution.md      # Principios del proyecto
│   └── templates/               # Plantillas para nuevas features
│       ├── spec-template.md
│       ├── plan-template.md
│       ├── tasks-template.md
│       ├── research-template.md
│       ├── data-model-template.md
│       ├── quickstart-template.md
│       └── api-contract-template.md
├── specs/
│   ├── README.md                # Este archivo
│   └── NNN-nombre-feature/      # Una carpeta por feature
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       └── contracts/
│           └── api-contract.md
├── scripts/
│   └── create-spec-feature.sh   # Crear carpeta de feature desde plantillas
└── AGENTS.md                    # Instrucciones para agentes IA
```

## Crear una nueva feature

```bash
./scripts/create-spec-feature.sh 001-mi-nueva-feature
```

Edita los archivos generados en `specs/001-mi-nueva-feature/`:

1. Completa **spec.md** (user stories, requisitos, checklist).
2. Resuelve dudas en **Clarifications** antes del plan.
3. Redacta **plan.md** y artefactos de diseño.
4. Genera **tasks.md** con rutas de archivo concretas.
5. Implementa siguiendo tareas; valida con **quickstart.md**.

## Convención de nombres

- Prefijo numérico de 3 dígitos: `001`, `002`, …
- Slug en kebab-case: `001-filtro-planes-guardados`
- Una carpeta = una unidad de entrega (PR o conjunto de PRs relacionados)

## Relación con otras documentaciones

| Documento | Rol |
|-----------|-----|
| `README.md` (raíz) | Arquitectura y cómo ejecutar el proyecto |
| Compodoc (`npm run docs`) | API del código (JSDoc) |
| `specs/` | Intención de producto y diseño antes/durante el desarrollo |
| `.specify/memory/constitution.md` | Reglas que todas las specs deben respetar |

## Herramienta opcional: GitHub Spec Kit

Este scaffold es compatible con el flujo de [GitHub Spec Kit](https://github.com/github/spec-kit). Para integración completa con CLI y comandos `/speckit.*`:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init . --integration cursor
```

## Ejemplo

Ver `specs/_example/` como referencia de formato (no es una feature real en producción).
