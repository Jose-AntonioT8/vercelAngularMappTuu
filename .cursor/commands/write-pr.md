# Write PR

Genera la descripción de un Pull Request para MapTuu en **español**, lista para pegar en GitHub/GitLab.

## Antes de escribir

1. Ejecutar y revisar (solo lectura salvo que el usuario pida otra cosa):
   ```bash
   git status
   git branch --show-current
   git log --oneline -10
   git diff main...HEAD
   ```
   Si la rama base no es `main`, usar la rama que indique el usuario o `git merge-base HEAD main`.

2. Buscar spec relacionada: `specs/NNN-*/` (user stories, checklist en `spec.md`).

3. **No** hacer `git commit`, `git push` ni crear el PR en remoto salvo petición explícita.

4. Si el diff toca lógica crítica, indicar si se ejecutó:
   ```bash
   npm run build
   npm test
   ```

## Salida obligatoria (markdown)

```markdown
## Summary
[1-3 frases: qué y por qué]

## Changes
- [bullet por área: features, services, i18n, routes, specs, etc.]

## Spec / SDD
- [Enlace o ruta a specs/NNN-* si aplica; si no, "N/A — cambio puntual"]

## Test plan
- [ ] pasos manuales concretos (rutas, rol guest/auth/admin)
- [ ] npm run build
- [ ] npm test (si aplica)

## Risks / notes
[regresiones posibles, Firebase vs API, env, deploy]

## Screenshots
[Si hay cambios de UI: indicar qué capturar; si no hay UI, omitir sección]
```

## Criterios

- Basarse solo en el diff y la spec existente; no inventar features.
- Mencionar claves i18n nuevas si las hay.
- Mencionar rutas/guards nuevos si los hay.
- Recordar: API backend está fuera de este repo (`apiUrl` en `apiurl.model.ts`).
