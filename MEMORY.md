# TrainingHub Pro — Memory de sesión

## Estado actual
- Rama base: `main` (último merge: `452b28f`).
- Rama feature: `cursor/redisenio-traininghub-ae84`.
- PR #115 mergeado a `main`: https://github.com/Ignav99/trainingHub/pull/115
- PRs anteriores #113 y #114 también mergeados.
- Frontend TypeScript pasa (`npx tsc --noEmit`).
- Deploy automático a Render completado con éxito tras merge.

## Rediseño de Sala de Lunes / War Room (feedback usuario 10-13 jul 2026)
Se implementó el rediseño de la vista de microciclo según el feedback del usuario:
- Página de detalle de microciclo muestra una sola vista: `SalaLunes` (sin tabs duplicadas).
- Tipos actualizados en `frontend/src/types/index.ts`:
  - `TipoSesionDia`, `FaseRival`, `FasePlanPartido`, `SubtipoFisico`.
  - `RivalPhaseAnalysis`, `PlanPartidoPhase` con `pizarra_tactica`, `formacion`, `espacios`.
  - `DiaMorfociclo` con `tipo_sesion`, `subtipo_fisico`, `descanso`, `observacion_importante`, `aspecto_psicologico`, `aspecto_psicologico_texto`, `objetivo_tactico`.
  - `PlanCT` con `objetivos_semana`, `olfato_ct`, `observaciones_ct`, `nutricion`.
- Componentes:
  - `SalaLunes`: header con objetivos, olfato CT, observaciones, disponibilidad + cargas en fila superior, once titular ancho completo.
  - `MorfocicloGrid`: solo visible el objetivo del día; los enfoques (táctico, físico, téc-tactico, psicológico) son pills que expanden su cuadro de texto al pinchar. Sin SHD.
  - `RivalScout`: análisis por fases sin iconos, con pizarra táctica, formación, espacios y export PDF.
  - `PlanPartido`: pestañas por fase sin iconos, con pizarra táctica, formación, espacios y export PDF.
  - `TacticalBoard`: nuevo componente canvas para dibujar sobre campo de fútbol.
  - `OnceProbable`: filtra invitados (`es_invitado`), campo más grande, ancho completo.
  - `NutricionSemanalEditor`: plan nutricional profesional.
- Dependencias: `jspdf`, `typescript@5.3.3` (dev).

## Pendiente de diagnóstico
- El usuario reporta "error al guardar" al crear un microciclo. Se añadió mejor logging en frontend para mostrar status y mensaje exacto. Se necesita el error exacto (consola o logs de Render) para identificar la causa.

## Próximos pasos
1. Recoger el error exacto de creación de microciclo.
2. Iterar más ajustes UX/UI según feedback.
