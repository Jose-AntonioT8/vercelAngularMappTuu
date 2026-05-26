# Fix bug

Corrige un bug en MapTuu siguiendo un flujo reproducible y alineado con el proyecto.

## Entrada requerida

Pide al usuario (si falta):

1. **Comportamiento esperado** vs **actual**
2. **Pasos para reproducir**
3. **Ruta o pantalla** afectada (ej. `/plans/saved`)
4. **Mensaje de error** en consola o red (si hay)

## Proceso

1. **Reproducir**: localizar el código en `src/app/features/`, `common/` o `core/services/`.
2. **Alcance**: si el bug implica cambio de producto, comprobar si existe `specs/NNN-*/spec.md`; si no, proponer actualizar spec o confirmar fix puntual.
3. **Causa raíz**: no parchear síntomas en un solo componente si la lógica pertenece a un servicio compartido.
4. **Fix mínimo**: solo archivos necesarios; respetar `.cursor/rules/architecture.mdc`.
5. **Test**: añadir o actualizar `*.spec.ts` si la lógica corregida es testeable.
6. **Verificar**:
   ```bash
   npm run build
   npm test
   ```
7. **Resumen**: explicar causa, cambio y cómo validar manualmente.

## Restricciones

- No commitear `.env` ni secretos.
- No marcar tareas de `tasks.md` como hechas sin código real.
- i18n: si cambian textos de UI, actualizar `src/assets/i18n/`.
