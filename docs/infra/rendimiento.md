# Rendimiento y fiabilidad de la API (noviembre 2026)

Síntoma reportado: "a veces la página se cuelga y falla al cargar sesiones o cualquier cosa".

## Causas confirmadas

| # | Causa | Evidencia (código anterior al cambio) | Impacto |
|---|-------|----------------------------------------|---------|
| 1 | **Event loop bloqueado.** 470 rutas `async def` llamaban al cliente Supabase **síncrono** (`.execute()`) sin `await`. El loop del único worker se bloqueaba en cada consulta. | `app/api/v1/*` (470 handlers); `render.yaml:40` → `uvicorn ... ` sin `--workers` (1 proceso) | Una consulta lenta, o 10 peticiones a la vez de un dashboard, ponían en cola a **todos** los usuarios. Esta es la causa principal de que "se cuelga". |
| 2 | **Rate limit por IP, 100/min.** Todo el cuerpo técnico en la wifi del club comparte IP. Un dashboard dispara de 10 a 20 peticiones. | `app/main.py:106`, `app/middleware.py:234,259` | 429 → "fallo al cargar" al navegar rápido. |
| 3 | **Scheduler RFAF en el loop de la API.** Los jobs (vie 20h, sáb/dom 14h y 22h, mar 17h y 21h, lun, cada noche) hacen upserts síncronos en bucle entre `await`s. | `app/services/rfef_scheduler_service.py` (`_sync_one`, `_upsert_sanciones`) | Congelaba la API durante el sync, justo en horario de entrenamiento y partido. |
| 4 | **Sin timeout en PostgREST.** supabase-py espera 120 s por defecto. | `app/database.py:18` (sin `ClientOptions`) | Una consulta colgada retenía la petición (y un hilo) dos minutos. |
| 5 | **Bug latente: sesión contaminada.** `supabase.auth.sign_up` sobre el cliente **global** guarda la sesión del tutor recién registrado en ese cliente. | `app/api/v1/tutores.py:114` | Si Auth devuelve sesión (confirmación de email desactivada), **todas** las consultas del backend pasan a ir con el JWT del tutor y RLS → fallos generalizados hasta reiniciar. |
| 6 | Auth: el usuario y los roles ya se cacheaban (20 s) y se resolvían en hilo. Quedaban en el loop la suscripción (en cada fallo de caché), el fallback de roles y la carga del usuario con la caché desactivada. | `app/security/dependencies.py:171,457` | Bloqueos cortos y puntuales. |

Descartado: N+1 en las rutas calientes (`list_sesiones` agrupa en lotes de 80 con `in_`). Los PDF (WeasyPrint) ya renderizan en hilo (`asyncio.to_thread`). Los clientes de IA son asíncronos y tienen timeout (Claude 40-180 s, Gemini 120 s, OpenAI-compatible 55 s).

## Qué se ha arreglado

1. **470 rutas `async def` → `def`** (AST: solo las decoradas con `@router.<verbo>` y sin `await`, `async for/with`, `yield` ni APIs del loop en su propio cuerpo). FastAPI las ejecuta en el threadpool. Hay 3 llamadas internas (`await get_sesion`, `await get_asistencias`, `await recomendar_sesion`) que pasan a llamada directa. Gracias a eso se convierten 7 rutas más (473 en total). Quedan 59 rutas `async` legítimas (IA, PDF, uploads, scraping).
2. **Threadpool**: anyio a 16 tokens (`THREADPOOL_SIZE`) y executor de asyncio a 8 hilos (con 60+32 la instancia de 512 MB moría por memoria; ver `MALLOC_ARENA_MAX=2` y `--max-requests` en el startCommand) (`ASYNCIO_EXECUTOR_SIZE`), configurados en el lifespan (`app/main.py`).
3. **Rate limit** (`app/middleware.py`):
   - autenticado: 600/min por usuario (clave = `sub` del JWT, sin verificar la firma: solo sirve como clave de cuota);
   - anónimo: 300/min por IP;
   - login, registro y refresh: 30/min por IP;
   - IA y chat (`/v1/ai/*`, `ai-*`, `*chat`, `*diagram(s)`): 40/min por usuario;
   - techo de 3000/min por IP, para quien rote `sub` falsos.

   Usa ventana fija. Con `REDIS_URL`, Redis responde con timeout de 0,3 s y, si falla, deja pasar. El preflight `OPTIONS` no consume cuota. En memoria, el número de claves está acotado.
4. **Scheduler**: cada job corre en un hilo con su propio event loop (`_off_loop`), así el loop de la API queda libre. Un lock de fichero (`fcntl`) asegura que solo un worker arranca el scheduler. Se desactiva con `DISABLE_SCHEDULER=1`.
5. **Timeouts**: PostgREST 30 s (connect 5 s) y cliente de servidor sin refresco ni persistencia de sesión. Embeddings de Gemini 30 s. Generador de diagramas Claude 60 s con 1 reintento (antes, 600 s por defecto).
6. **`tutores.py`**: `sign_up` con un cliente desechable (`new_auth_client()`).
7. **Dependencias de auth**: la suscripción en fallo de caché, el fallback de roles y la carga del usuario sin caché pasan a `asyncio.to_thread`.
8. **GZip** selectivo (≥1 KB, nivel 5): solo JSON. No se aplica a SSE (`/stream`) ni a PDF, imágenes o vídeo.
9. **Arranque** (`render.yaml` y `Procfile`): gunicorn + UvicornWorker con `--workers ${WEB_CONCURRENCY:-1} --timeout 120 --graceful-timeout 30 --keep-alive 75`. gunicorn reinicia el worker si muere o si el loop se bloquea más de 120 s. `--keep-alive 75` supera el idle del balanceador y evita 502 intermitentes.

Verificación: `pytest` 677/677 antes y después. Hubo que adaptar 4 tests que hacían `await` directo a handlers convertidos. Se probó gunicorn en local con 2 workers: `/health` responde 200 y el scheduler arranca una sola vez.

## Qué queda (priorizado)

- 36 rutas `async` todavía hacen 111 `.execute()` síncronos en el loop: PDF de partido/rival/ABP, chats de IA, `rfef.sync_competicion_full` (14 llamadas), uploads. Son poco frecuentes, pero cada una bloquea entre 50 y 300 ms. Lo siguiente es envolverlas con `await asyncio.to_thread(...)`. Se localizan buscando `async def` con `@router` en `app/api/v1` y `.execute()` fuera de `to_thread`.
- Memoria: cada worker ocupa unos **250 MB RSS** solo con los imports (IA, WeasyPrint, pptx, stripe, scraping). Más adelante conviene importar IA, PDF y pptx de forma diferida.
- Las cachés de auth y del rate limit son por proceso. Con 2 o más workers o instancias, Redis las unifica.
- Frontend (otro agente): reintento con backoff ante 429/502/503 y respeto de `Retry-After`.
- Si el servicio de Render se creó a mano y no desde el Blueprint, el `startCommand` del dashboard manda: hay que copiarlo allí.

## Recomendación de infraestructura

Precios de Render y Supabase en USD/mes, consultados en noviembre de 2026; confirmar antes de contratar. Los de BetterStack, UptimeRobot y Sentry son aproximados y no se verificaron en sus webs.

| Prioridad | Qué | Coste | Por qué |
|-----------|-----|-------|---------|
| **1 (imprescindible)** | API en **Render Standard** (2 GB, 1 CPU) con `WEB_CONCURRENCY=3` | $25 (hoy $7) | Con 512 MB solo cabe **1 worker**, y un pico de WeasyPrint puede provocar OOM y reinicio ("se cae"). Con 2 GB caben 3 workers con margen, y un PDF o una IA lenta deja de afectar al resto. |
| 2 | Frontend en **Render Standard** si los logs muestran OOM o latencias de SSR | $25 (hoy $7) | Next standalone con 512 MB va justo. Mirar primero las métricas de memoria. |
| 3 | **Supabase Pro**, si el proyecto está en Free | $25 (Micro incluido; Small +$15, Medium +$60) | En Free el proyecto se pausa tras una semana sin actividad y no hay backups diarios. Subir a Small si la CPU de la BD pasa del 70 %. |
| 4 | **Render Key Value Starter** (Redis, 256 MB) y `REDIS_URL` | $10 | Rate limit compartido entre workers. Base para cachear respuestas. |
| 5 | **Monitor de disponibilidad**: BetterStack (gratis, 10 monitores) o UptimeRobot (gratis, intervalo de 5 min) sobre `/health` y la home del frontend | $0 | Avisos cuando algo cae, antes de que lo note el cuerpo técnico. |
| 6 | **Sentry**: el SDK ya está integrado (`SENTRY_DSN`), solo falta definir la variable en Render | $0 (Developer); unos $26 en Team | Errores 500 con traza y rendimiento por endpoint. |

Coste mínimo recomendado: API Standard + Redis + monitores ≈ **+$28/mes** sobre lo actual (+$18 si se prescinde de Redis). Con frontend Standard y Supabase Pro ≈ +$71/mes.

No hace falta Render Pro ($85, 4 GB, 2 CPU) mientras no haya más de unos 50 usuarios concurrentes.

Fuentes: [Render pricing](https://render.com/pricing), [Supabase pricing](https://supabase.com/pricing).
