# TrainingHub Pro — Memory de sesión

## Estado actual
- Rama base: `main` (último merge: `b446432`).
- Rama feature: `cursor/redisenio-traininghub-ae84`.
- PR #116 mergeado a `main`: https://github.com/Ignav99/trainingHub/pull/116
- PRs anteriores #113, #114, #115 también mergeados.
- Frontend TypeScript pasa (`npx tsc --noEmit`).

## Verificación de servicios Render (13 jul 2026)
- Frontend `https://traininghub-frontend-eu.onrender.com/login` responde HTTP 200.
- Backend `https://traininghub-api-eu.onrender.com/` responde HTTP 200 con `{"status":"healthy"}`.
- El usuario reporta que en el dashboard de Render aparecen como "failed". Puede ser un estado anterior o un fallo intermitente.

## Monitorización automática añadida
- `.github/workflows/deploy.yml`: después de disparar los deploy hooks de Render, espera 90s y verifica que frontend y backend respondan HTTP 200. Si no, el workflow falla.
- `.github/workflows/monitor-render.yml`: nuevo workflow que se ejecuta tras `Deploy` y hace polling durante 10 minutos a las URLs de Render. Si algún servicio no responde, crea un issue automáticamente.
- URLs monitorizadas:
  - Frontend: `https://traininghub-frontend-eu.onrender.com/login`
  - Backend: `https://traininghub-api-eu.onrender.com/`

## Pendiente de diagnóstico
- El usuario reporta "error al guardar" al crear un microciclo. Se añadió mejor logging en frontend para mostrar status y mensaje exacto. Se necesita el error exacto (consola o logs de Render) para identificar la causa.
- Si Render sigue mostrando failed, revisar los logs de Render del backend/frontend para obtener el error concreto.

## Próximos pasos
1. Recoger el error exacto de creación de microciclo o logs de Render.
2. Iterar ajustes UX/UI según feedback.
3. Si el monitor de Render crea un issue, actuar sobre él.
