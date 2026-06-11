# Migración a Frankfurt (UE) — Runbook

Fecha: 2026-06-11. Motivo: Supabase está en la UE (~55 ms desde España) y los
servicios estaban en Oregon — cada query backend↔DB cruzaba el Atlántico (~140 ms).

## Nueva topología

| Servicio | URL | Región | Plan |
|---|---|---|---|
| `traininghub-api-eu` (srv-d8lbubeq1p3s73c65mmg) | https://traininghub-api-eu.onrender.com | Frankfurt | Starter |
| `traininghub-frontend-eu` (srv-d8lbud6gvqtc73aphqi0) | https://traininghub-frontend-eu.onrender.com | Frankfurt | Starter |

Todo está configurado salvo los pasos manuales de abajo (secretos no legibles por API).

## Pasos manuales pendientes (dashboard)

1. **Copiar secretos al backend nuevo** — Render → `traininghub-api` (viejo) → Environment:
   - `SUPABASE_SERVICE_ROLE_KEY` → pegar en `traininghub-api-eu`
   - `SECRET_KEY` → pegar en `traininghub-api-eu` ⚠️ NUNCA regenerar: el cifrado de
     registros médicos deriva de esta clave; una clave nueva deja ilegibles los datos.
   - `MEDICAL_ENCRYPTION_KEY` → copiarla también SI existe en el servicio viejo.
   - Si el frontend viejo tiene vars de Sentry (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
     `SENTRY_PROJECT`), copiarlas a `traininghub-frontend-eu`.
2. **Deploy hooks** — en cada servicio nuevo: Settings → Deploy Hook → crear `github-ci`
   y actualizar los secrets del repo (`gh secret set` o Settings → Secrets → Actions):
   - `RENDER_DEPLOY_HOOK_BACKEND` ← hook de `traininghub-api-eu`
   - `RENDER_DEPLOY_HOOK_FRONTEND` ← hook de `traininghub-frontend-eu`
3. **Health check** — `traininghub-api-eu` → Settings → Health Check Path = `/health`.
4. **Supabase Auth** — Dashboard Supabase → Authentication → URL Configuration:
   añadir `https://traininghub-frontend-eu.onrender.com` como Site URL / Redirect URL
   (los emails de confirmación/reset apuntan ahí).
5. **Verificar**: login + dashboard en la URL nueva del frontend.
6. **Apagar lo viejo** (cuando lo nuevo esté verificado): suspender o borrar
   `traininghub-frontend` (deja de facturar $7/mes) y `traininghub-api` en Oregon.

## Rollback

Los servicios viejos quedan intactos hasta el paso 6 — si algo falla, se siguen usando
las URLs antiguas y se restauran los deploy hooks anteriores.
