# DB tables usage (static code analysis)

Source: `docs/DB_SCHEMA_RECONSTRUCTED.md` (87 tables) cross-checked with `backend/app`, `backend/scripts`, `scripts`, `frontend/src` (2026-09-30).

Method and limits:
- Read/write detected from `supabase.table("x")` chains (select vs insert/update/upsert/delete) plus embedded selects and RPCs. Frontend does not access tables directly (only 3 RPCs: `hybrid_search_kb`, `hybrid_search_tareas`, `search_kb_chunks`, all via backend).
- SQL functions/triggers only write via `updated_at` triggers, `increment_tarea_uso` (sesion_tareas -> tareas.uso), `auto_link_sesion_microciclo` (sesiones), `calculate_resultado` (partidos) and `cleanup_old_background_tasks` (nothing in code calls it; needs manual/cron).
- Only scheduler in code: RFAF scheduler (`rfef_scheduler_service.py`, started in `main.py`) and `license_checker.py`. Everything else is written by user-triggered API calls.
- Row counts cannot be known (no DB access). "Last touched" = last git commit on the main file (not the table).
- Status: active = read and written; read-only = read but no code writes it; unused = no code refs; legacy-duplicate = overlaps another table.

Counts: active 77, read-only 5, unused 3, legacy-duplicate 2 (both still used).

## Tenancy and users
Organisations, teams, users, roles, invitations, ownership.

| table | purpose | read? | written? | status |
|---|---|---|---|---|
| organizaciones | club / tenant | yes (admin.py, partidos.py) | user API (admin.py, organizacion.py) | active |
| equipos | teams per club | yes (club_admin.py, admin.py) | user API (equipos.py, club_admin.py) | active |
| usuarios | app users | yes (admin.py, club_admin.py) | user API (auth.py, admin.py) | active |
| usuarios_equipos | user-team membership and role | yes (club_admin.py) | user API (invitaciones.py, auth.py) | active |
| invitaciones | invite links | yes (invitaciones.py) | user API (invitaciones.py, admin.py) | active |
| transferencias_propiedad | club ownership transfers | yes (invitaciones.py) | user API (invitaciones.py) | active |
| permisos_personalizados | per-team/role permission overrides | yes (security/dependencies.py) | no code writes it (only manual SQL) | read-only |
| onboarding_progreso | onboarding checklist | yes (onboarding.py; last 2026-03-02) | user API (onboarding.py) | active |
| posiciones | position catalogue (lookup) | yes (jugadores.py) | no (seed SQL only) | read-only |

## Roster and players
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| jugadores | player master (2026-08-29) | yes (jugadores.py, rpe.py) | user API (jugadores.py); medical_availability_service.py updates estado | active |
| convocatorias | match squad lists (2026-09-26) | yes (convocatorias.py, carga.py) | user API (convocatorias.py) | active |
| rendimiento_notas | coach performance ratings per player/match | yes (convocatorias.py) | user API (convocatorias.py) | active |
| jugador_evaluaciones | clinical/physical evaluations | yes (ficha_clinica.py, informe_service.py) | user API (ficha_clinica.py) | active |
| jugador_habitos | player habits (sleep etc.) | yes (ficha_clinica.py) | user API (ficha_clinica.py) | active |
| descansos | rest days / absences (2026-03-09) | yes (descansos.py, load_calculation_service.py) | user API (descansos.py) | active |
| equipaciones | kit colours per team/rival | yes (organizacion.py, partidos.py) | user API (organizacion.py, rivales.py) | active |
| vinculos_tutor | guardian-minor links | yes (tutores.py, gdpr.py) | user API (tutores.py) | active |

## Training planning
Task library, sessions, microcycles, goalkeeper and margin work.

| table | purpose | read? | written? | status |
|---|---|---|---|---|
| tareas | exercise library (2026-08-27) | yes (tareas.py) | user API (tareas.py, sesiones.py); `uso` counter by trigger; seed scripts (seed_exercises.py) | active |
| categorias_tarea | task categories (lookup) | yes (tareas.py, club_admin.py) | no code writes; seed SQL only | read-only |
| sesiones | training sessions (2026-09-22) | yes (sesiones.py, club_admin.py) | user API (sesiones.py, microciclos.py); trigger auto_link_sesion_microciclo | active |
| sesion_tareas | tasks inside a session | yes (sesiones.py, informe_service.py) | user API (sesiones.py) | active |
| asistencias_sesion | session attendance | yes (sesiones.py, load_calculation_service.py) | user API (sesiones.py) | active |
| microciclos | weekly plans (2026-09-22) | yes (microciclos.py) | user API (microciclos.py, microciclo_estado.py) | active |
| entrenamientos_margen | extra work "margin" sessions (2026-03-26) | yes (entrenamientos_margen.py) | user API (same) | active |
| entrenamientos_margen_tareas | tasks of margin sessions | yes | user API (entrenamientos_margen.py) | active |
| portero_tareas | goalkeeper tasks (2026-04-07) | yes (portero_tareas.py) | user API (portero_tareas.py, sesiones.py) | active |
| match_day_config | MD preferred/avoid config | no (only a comment in frontend canonico.ts) | no | unused |
| contenidos | task contents catalogue | no (only a UI component named multi-select) | no | unused |
| tareas_contenidos | task-contents join | no | no | unused |
| alertas | load/plan alerts (2026-07-03) | yes (alertas.py, microciclos.py) | user API upsert (alertas.py) | active |

## Set pieces and tactics
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| game_models | game model definitions (2026-04-28) | yes (game_models.py, ai_tool_executor.py) | user API (game_models.py) | active |
| tactical_boards | tactical boards (2026-07-23) | yes (tactical_boards.py) | user API (same) | active |
| tactical_board_frames | board animation frames | yes | user API (same) | active |
| abp_jugadas | set-piece plays library (2026-09-08) | yes (abp.py) | user API (abp.py) | active |
| abp_rival_jugadas | rival set pieces | yes (abp.py) | user API (abp.py) | active |
| abp_partido_jugadas | plays per match | yes (abp.py) | user API (abp.py) | active |
| abp_sesion_jugadas | plays per session | yes (abp.py, sesiones.py) | user API (abp.py) | active |
| abp_partido_plan | match set-piece plan | yes (abp.py) | user API (abp.py) | active |

## Matches and rivals
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| partidos | matches (2026-09-12) | yes (partidos.py, dashboard.py) | user API (partidos.py); competition_linker_service.py; trigger calculate_resultado | active |
| rivales | opponents (2026-09-29) | yes (rivales.py) | user API (rivales.py); competition_linker_service.py | active |
| estadisticas_partido | match stats (2026-09-12) | yes (estadisticas_partido.py, estadisticas_dashboard.py) | user API (estadisticas_partido.py); one-off script migrate_excel_stats.py | active |
| planes_partido | match plans (2026-07-07) | yes (plan_partido.py, alertas.py) | user API (plan_partido.py) | active |
| informes_rival | rival report v1 (2026-07-31) | yes (rival_informes.py, microciclos.py) | user API (rival_informes.py) | legacy-duplicate (still used) |
| rival_informes | rival report v2 (AI/RFAF generated) | yes (rivales.py) | user API (rivales.py) | legacy-duplicate (still used) |

## Load and wellness
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| registros_rpe | RPE and wellness records (2026-09-22) | yes (rpe.py, wellness.py) | user API (rpe.py); rpe_sync.py | active |
| carga_diaria_jugador | daily load | yes (carga.py) | service recompute (load_calculation_service.py, triggered by API) | active |
| carga_acumulada_jugador | acute/chronic load | yes (carga.py) | carga.py, load_calculation_service.py | active |

## Medical and nutrition
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| registros_medicos | injuries / medical records (2026-09-09) | yes (medico.py) | user API (medico.py, jugadores.py) | active |
| accesos_medicos_log | audit of medical access | yes (medico.py) | medico.py, jugadores.py (automatic on access) | active |
| pruebas_medicas | medical tests | yes (medico.py) | user API (medico.py) | active |
| tratamiento_diario | daily treatment | yes (medico.py) | user API (medico.py) | active |
| perfiles_nutricionales | player nutrition profile (2026-03-24) | yes (nutricion.py) | user API (nutricion.py) | active |
| plantillas_nutricionales | nutrition templates | yes | user API (nutricion.py) | active |
| planes_nutricionales_dia | daily nutrition plan | yes | user API (nutricion.py) | active |
| suplementacion_jugador | supplements | yes | user API (nutricion.py) | active |
| composicion_corporal | body composition | yes | user API (nutricion.py) | active |

## Video and revision
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| videos_partido | match videos (2026-09-22; never CREATEd in SQL, only ALTERed) | yes (videos.py, video_tags.py) | user API (videos.py) | active |
| video_tag_categories | tag categories (2026-04-17) | yes | user API (video_tag_categories.py) | active |
| video_tag_descriptors | tag descriptors | yes | user API (video_tag_categories.py) | active |
| video_tags | tags on video timeline | yes (video_tags.py) | user API (video_tags.py) | active |
| video_playlists | playlists | yes (video_playlists.py) | user API | active |
| video_playlist_items | playlist items | yes | user API (video_playlists.py) | active |
| revision_packs | revision packs (2026-09-29) | yes (revision.py, revision_service.py) | user API (revision.py) | active |
| revision_folders | folders | yes (revision.py) | user API (revision.py) | active |
| revision_clips | clips | yes (revision.py) | revision.py, revision_service.py | active |
| revision_clip_links | clip-to-entity links | yes | revision.py | active |
| revision_sessions | live revision sessions | yes (revision.py, websocket.py) | user API (revision.py) | active |

## Federation (RFAF)
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| rfef_competiciones | competitions (2026-08-17) | yes (rfef.py, scheduler) | user API (rfef.py) and scheduler (rfef_scheduler_service.py) | active |
| rfef_jornadas | matchdays / fixtures | yes (rfef.py, pre_match_service.py) | rfef.py and scheduler | active |
| rfef_actas | official match reports | yes (rfef.py, pre_match_service.py) | rfef.py and scheduler | active |
| rfef_sanciones | sanctions | yes (rfef.py, pre_match_service.py) | rfef.py and scheduler | active |

## AI and knowledge base
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| documentos_kb | KB documents (2026-03-04) | yes (knowledge_base.py) | user API (knowledge_base.py) | active |
| chunks_kb | KB chunks + embeddings | yes (knowledge_base.py, RPC search_kb_chunks / hybrid_search_kb) | knowledge_base.py | active |
| ai_conversaciones | AI chats (2026-04-06) | yes (ai_chat.py, dashboard.py) | user API (ai_chat.py) | active |
| ai_mensajes | AI messages | yes | user API (ai_chat.py) | active |
| conocimiento_global | aggregated best practices | yes (claude_service.py, ai_tool_executor.py via get_best_practices) | only `aggregate_session_patterns()`, which nothing calls | read-only (likely empty) |

## Chat and notifications
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| conversaciones | team chat threads (2026-03-02) | yes (comunicacion.py) | user API | active |
| conversacion_participantes | participants | yes | user API (comunicacion.py) | active |
| mensajes | chat messages | yes | comunicacion.py, websocket.py | active |
| notificaciones | in-app notifications | yes (notificaciones.py) | notification_service.py, notificaciones.py | active |

## Billing and licensing
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| planes | plan catalogue | yes (suscripciones.py, admin.py, license_checker) | no code writes (seed SQL in 010 migration) | read-only |
| suscripciones | subscriptions | yes (admin.py, suscripciones.py) | license_service.py, license_checker.py (scheduler-like), stripe_webhook.py, auth.py | active |
| historial_suscripciones | plan change history | yes (suscripciones.py) | license_service.py, suscripciones.py | active |

## Compliance, GDPR, audit
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| consentimientos_gdpr | consents | yes (gdpr.py) | gdpr.py, auth.py (registration) | active |
| solicitudes_gdpr | GDPR requests | yes (gdpr.py) | gdpr.py | active |
| audit_log | audit trail | yes (admin.py, club_admin.py) | audit_service.py (automatic) | active |

## System and jobs
| table | purpose | read? | written? | status |
|---|---|---|---|---|
| background_tasks | async job tracking (2026-03-04) | yes (task_service.py) | task_service.py; cleanup function never scheduled | active |

## Suspected unused or duplicate
Unused (no code references at all, only migrations): `match_day_config`, `contenidos`, `tareas_contenidos`.

Read-only (no code writer; either seeded lookup tables or dead writers):
- `posiciones`, `categorias_tarea`, `planes`: lookup/catalogue seeded by migrations, expected.
- `permisos_personalizados`: consulted for RBAC overrides but no endpoint creates rows; feature is likely dormant (rows only by manual SQL).
- `conocimiento_global`: writer `aggregate_session_patterns()` is never called, so table probably empty while AI tools read it.

Duplicates: `informes_rival` (db/005, `rival_informes.py`) vs `rival_informes` (bdm/031, `rivales.py`): two live report tables with different endpoints; consolidate. Loosely related: `planes` vs `planes_partido` vs `planes_nutricionales_dia` are different concepts (name clash only). `conversaciones/mensajes` vs `ai_conversaciones/ai_mensajes` are distinct (team chat vs AI).

Written only by seeds/scripts or manually:
- `posiciones`, `categorias_tarea`, `planes`, `permisos_personalizados` (migrations/manual SQL).
- `estadisticas_partido` also fed by `backend/scripts/migrate_excel_stats.py` (one-off) but has an API writer.
- `tareas` seeded by `backend/scripts/seed_exercises.py` and `enrich_tasks.py` (also API writer).
- `scripts/demo_seed/*` (season seed) does not go through `supabase.table(...)`, so it is not counted above.

Other notes:
- `videos_partido` is never CREATEd in any migration (only ALTERed) although heavily used: check that it exists in prod.
- `cleanup_old_background_tasks()` is defined but not scheduled from code.
- Tables with RLS-less migrations (planes, invitaciones, rfef_*, abp_*, alertas...) are accessed through the backend service role.
- Least recently touched active features (last commit on main file): notificaciones/onboarding/comunicacion/tutores/license_service/audit_service/knowledge_aggregation (2026-03-02), notification_service (2026-02-17), task_service/knowledge_base (2026-03-04), descansos (2026-03-09), nutricion (2026-03-24), entrenamientos_margen (2026-03-26).
