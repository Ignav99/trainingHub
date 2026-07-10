# TrainingHub Pro — Memory de sesión

## Estado actual
- Rama activa: `cursor/redisenio-traininghub-ae84`.
- Último commit en rama: `be22f5e` — redesign: pestañas en plan de partido, export PDF rival/plan, morfociclo sin SHD con subtipos físicos, nutrición profesional y layout mejorado.
- PR #114 creado: https://github.com/Ignav99/trainingHub/pull/114
- PR #113 ya mergeado a `main` con el rediseño base.
- Frontend TypeScript pasa (`npx tsc --noEmit`). Build local falla por falta de variables de entorno `supabaseUrl`, no por errores de compilación.

## Rediseño de Sala de Lunes / War Room (feedback usuario 10 jul 2026)
Se implementó el rediseño de la vista de microciclo según el feedback del usuario:
- Página de detalle de microciclo ahora muestra una sola vista: `SalaLunes` (se eliminaron las tabs duplicadas War Room / Sala del Lunes / Plan de Partido).
- Tipos actualizados en `frontend/src/types/index.ts`:
  - `TipoSesionDia`, `FaseRival`, `FasePlanPartido`.
  - `RivalPhaseAnalysis`, `PlanPartidoPhase`, `NutricionSemana`.
  - `DiaMorfociclo` ahora incluye `tipo_sesion`, `subtipo_fisico`, `descanso`, `observacion_importante`, `aspecto_psicologico` (boolean), `aspecto_psicologico_texto`, `objetivo_tactico`.
  - `PlanCT` incluye `objetivos_semana`, `olfato_ct`, `observaciones_ct`, `nutricion`.
  - `VistaCompletaMicrociclo.plantilla.jugadores_lesionados/en_recuperacion` incluyen `motivo_baja`.
- Componentes modificados:
  - `SalaLunes.tsx`: header con múltiples objetivos, olfato CT, observaciones, secciones unificadas, botón resumen copiable, layout disponibilidad + cargas en 1/3 cada uno.
  - `MorfocicloGrid.tsx`: 6 días (sin domingo), día de descanso gris, enfoques táctico/físico/técnico-táctico/psicológico, subtipos físicos (fuerza, resistencia, velocidad, activación), objetivo táctico, aspecto psicológico clickeable, sin SHD.
  - `RivalScout.tsx`: análisis por fases con fortalezas, debilidades, clips y anotaciones por fase; botón exportar PDF.
  - `PlanPartido.tsx`: plan por fases en pestañas con texto, principios del modelo de juego, consignas, clips y botón exportar PDF.
  - `NutricionSemanalEditor.tsx`: nuevo componente con plan nutricional profesional (CH semanal, hidratación pre/durante/post, comidas pre/post, snacks, suplementación, recuperación).
  - `frontend/src/app/(dashboard)/microciclos/[id]/page.tsx`: eliminadas tabs, imports limpiados, renderiza solo `SalaLunes`.
- Nuevas utilidades PDF:
  - `frontend/src/lib/pdf/exportPlanPartidoPDF.ts`
  - `frontend/src/lib/pdf/exportRivalScoutPDF.ts`
- Dependencia añadida: `jspdf`.

## Deploy
- El usuario ha añadido `RENDER_API_KEY` como Runtime Secret en Cursor Dashboard, pero este run no lo tiene inyectado.
- PR #114 está listo para mergear a `main`. Render tiene `autoDeploy` activado para `main`, así que mergeando se desplegará automáticamente.
- El agente no puede reiniciarse a sí mismo desde dentro de la conversación.

## Próximos pasos sugeridos
1. Mergear PR #114 a `main` para despliegue automático en Render.
2. Recoger feedback del usuario sobre la nueva Sala de Lunes.
3. Iterar ajustes UX/UI y posiblemente vincular principios del modelo de juego real desde `game_models`.
