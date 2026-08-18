# TrainingHub — Memory

## Last updated: 2026-08-17

## Recent milestone: RFAF scrapeo + rivales (DONE on production)

- **PR #232** merged to `main` (`70a391a`) — consolidates scraper reliability + rivales temporada/escudos
- Deploy workflow succeeded (run 32051515694)
- Supersedes open PRs #230 and #231

### Scraper (backend)
- `rfaf_http_transport.py`: global lock, shared session, curl_cffi, retries, SCRAPERAPI_KEY / RFAF_HTTPS_PROXY
- `rfef_scraper_service.py`: RFAFUnavailableError, LstCompeticiones/LstGrupos browse
- `GET /v1/rfef/health/rfaf` (auth required)

### Rivales
- Filter by current season via `equipo_id`
- `rival_escudo_service.py` auto-download escudos from RFAF
- `competition_linker_service.py`: cleanup outdated rivals, backfill escudos

### Production note
Render datacenter IP may still get 0-byte RFAF responses — configure SCRAPERAPI_KEY or RFAF_HTTPS_PROXY on traininghub-api-eu if health/rfaf fails.

## User context
- ignaciovct99@gmail.com / Club Atlético Central / Filial
- Temporada default code `22` = 2026-2027
