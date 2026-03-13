"""
TrainingHub Pro - Scheduler de Scraping RFAF
Programación automática de sincronización con la RFAF.

Sync periódico:
- Quick sync: clasificación + jornada actual + adyacentes + goleadores
- Auto-link: crea/actualiza rivales y partidos
- Actas: scrape de actas de las jornadas recientes (si hay cod_acta)
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import get_supabase
from app.services.rfef_scraper_service import RFAFScraper
from app.services.competition_linker_service import link_competition
from app.services.pre_match_service import auto_populate_upcoming_matches
from app.services.load_calculation_service import recalculate_all_teams

logger = logging.getLogger(__name__)


def _parse_fecha_sanciones(fecha_str):
    """Parse DD-MM-YYYY or DD/MM/YYYY to ISO date string."""
    if not fecha_str:
        return None
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(fecha_str.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _upsert_sanciones(supabase, comp_id: str, sanciones: list[dict]) -> int:
    """Upsert sanciones using ON CONFLICT. Returns count saved."""
    saved = 0
    for s in sanciones:
        record = {
            "competicion_id": comp_id,
            "jornada_numero": s["jornada_numero"],
            "jornada_fecha": _parse_fecha_sanciones(s.get("jornada_fecha")),
            "reunion_fecha": _parse_fecha_sanciones(s.get("reunion_fecha")),
            "categoria": s["categoria"],
            "equipo_nombre": s["equipo_nombre"],
            "persona_nombre": s.get("persona_nombre", ""),
            "tipo_licencia": s.get("tipo_licencia"),
            "articulo": s.get("articulo"),
            "descripcion": s["descripcion"],
        }
        try:
            supabase.table("rfef_sanciones").upsert(
                record,
                on_conflict="competicion_id,jornada_numero,equipo_nombre,persona_nombre,articulo,descripcion",
            ).execute()
            saved += 1
        except Exception as e:
            logger.debug("Upsert sancion error: %s", e)
    return saved

scheduler = AsyncIOScheduler()


async def sync_all_competitions():
    """Sincroniza todas las competiciones con sync_habilitado=true."""
    supabase = get_supabase()

    try:
        response = supabase.table("rfef_competiciones").select("*").eq(
            "sync_habilitado", True
        ).not_.is_("rfef_codcompeticion", "null").not_.is_("rfef_codgrupo", "null").execute()

        competiciones = response.data or []
        if not competiciones:
            logger.info("No competitions to sync")
            return

        logger.info("Starting RFAF sync for %d competitions", len(competiciones))

        scraper = RFAFScraper()
        try:
            for comp in competiciones:
                await _sync_one(supabase, scraper, comp)
        finally:
            await scraper.close()

        # Auto-populate pre-match intel for upcoming matches
        try:
            intel_result = auto_populate_upcoming_matches(supabase)
            if intel_result.get("populated", 0) > 0:
                logger.info(
                    "Pre-match intel: %d populated, %d errors",
                    intel_result["populated"],
                    intel_result.get("errors", 0),
                )
        except Exception as e:
            logger.warning("Error in auto_populate_upcoming_matches: %s", e)

    except Exception as e:
        logger.error("Error in sync_all_competitions: %s", e, exc_info=True)


def _upsert_jornada(supabase, comp_id: str, jornada: dict):
    """Upsert a single jornada into rfef_jornadas."""
    existing = supabase.table("rfef_jornadas").select("id").eq(
        "competicion_id", comp_id
    ).eq("numero", jornada["numero"]).execute()

    if existing.data:
        supabase.table("rfef_jornadas").update({
            "partidos": jornada["partidos"],
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("rfef_jornadas").insert({
            "competicion_id": comp_id,
            "numero": jornada["numero"],
            "partidos": jornada["partidos"],
        }).execute()


async def _sync_one(supabase, scraper: RFAFScraper, comp: dict):
    """Sincroniza una competición individual.

    1. Quick sync: clasificación + jornada actual + goleadores
    2. Refresh adjacent jornadas (N-1, N+1) for pre/post match data
    3. Auto-link if mi_equipo_nombre is set
    4. Sync actas for recent jornadas (current, N-1)
    """
    comp_id = comp["id"]
    codcompeticion = comp.get("rfef_codcompeticion")
    codgrupo = comp.get("rfef_codgrupo")
    codtemporada = comp.get("rfef_codtemporada", "21")

    if not codcompeticion or not codgrupo:
        return

    try:
        # --- Main sync: clasificación + current jornada + goleadores ---
        data = await scraper.sync_competicion(codcompeticion, codgrupo, codtemporada)

        update = {"ultima_sincronizacion": datetime.utcnow().isoformat()}

        if data.get("clasificacion"):
            update["clasificacion"] = data["clasificacion"]
        if data.get("goleadores") is not None:
            update["goleadores"] = data["goleadores"]
        if data.get("calendario"):
            update["calendario"] = data["calendario"]

        # Save current jornada
        jornada_num = None
        if data.get("jornada_actual") and data["jornada_actual"].get("partidos"):
            jornada = data["jornada_actual"]
            jornada_num = jornada["numero"]
            _upsert_jornada(supabase, comp_id, jornada)

        # --- Refresh adjacent jornadas (N-1 and N+1) ---
        if jornada_num:
            for adj_num in [jornada_num - 1, jornada_num + 1]:
                if adj_num < 1:
                    continue
                try:
                    adj_jornada = await scraper.scrape_jornada_combined(
                        codcompeticion, codgrupo, str(adj_num), codtemporada
                    )
                    if adj_jornada.get("partidos"):
                        _upsert_jornada(supabase, comp_id, adj_jornada)
                    await asyncio.sleep(0.3)
                except Exception as e:
                    logger.debug("Could not scrape adjacent jornada %d: %s", adj_num, e)

        supabase.table("rfef_competiciones").update(update).eq(
            "id", comp_id
        ).execute()

        # --- Auto-link if mi_equipo_nombre is set ---
        if comp.get("mi_equipo_nombre"):
            try:
                # Refresh comp for linker
                fresh_comp = supabase.table("rfef_competiciones").select("*").eq(
                    "id", comp_id
                ).single().execute()
                if fresh_comp.data:
                    link_result = link_competition(supabase, fresh_comp.data)
                    logger.info(
                        "Auto-link for %s: %d rivales, %d partidos created, %d updated",
                        comp.get("nombre", comp_id),
                        link_result.get("rivales_created", 0),
                        link_result.get("partidos_created", 0),
                        link_result.get("partidos_updated", 0),
                    )
            except Exception as e:
                logger.error("Error in auto-link for %s: %s", comp_id, e)

        # --- Sync actas for recent jornadas ---
        if jornada_num:
            await _sync_recent_actas(supabase, scraper, comp_id, jornada_num)

        # --- Sync sanciones if configured ---
        sancion_comp = comp.get("sancion_competicion_id")
        sancion_grupo = comp.get("sancion_grupo_id")
        if sancion_comp and sancion_grupo:
            try:
                sanciones_data = await scraper.scrape_sanciones(
                    codtemporada, sancion_comp, sancion_grupo, ""
                )
                saved = _upsert_sanciones(supabase, comp_id, sanciones_data)
                if saved > 0:
                    logger.info("Synced %d sanciones for %s", saved, comp.get("nombre", comp_id))
            except Exception as e:
                logger.debug("Error syncing sanciones for %s: %s", comp_id, e)

        logger.info("Synced competition %s successfully", comp.get("nombre", comp_id))

    except Exception as e:
        logger.error("Error syncing competition %s: %s", comp_id, e, exc_info=True)


async def _sync_recent_actas(supabase, scraper: RFAFScraper, comp_id: str, current_jornada: int):
    """Sync actas for the current jornada and the previous one.
    Only scrapes actas that have a cod_acta and aren't already saved.
    """
    try:
        jornada_nums = [n for n in [current_jornada - 1, current_jornada] if n >= 1]
        logger.info("Scheduler: checking actas for jornadas %s (comp %s)", jornada_nums, comp_id)

        jornadas_res = supabase.table("rfef_jornadas").select("numero, partidos").eq(
            "competicion_id", comp_id
        ).in_("numero", jornada_nums).execute()

        # Collect cod_actas
        actas_to_scrape = []
        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                cod_acta = partido.get("cod_acta")
                if cod_acta:
                    actas_to_scrape.append({
                        "cod_acta": cod_acta,
                        "jornada_numero": jornada["numero"],
                    })

        logger.info("Scheduler: found %d actas with cod_acta in jornadas %s",
                    len(actas_to_scrape), jornada_nums)

        if not actas_to_scrape:
            return

        # Check which actas already exist AND are complete (have titulares)
        existing_actas_res = supabase.table("rfef_actas").select(
            "cod_acta, titulares_local"
        ).eq(
            "competicion_id", comp_id
        ).in_("cod_acta", [a["cod_acta"] for a in actas_to_scrape]).execute()
        complete_codes = set()
        for a in existing_actas_res.data or []:
            if a.get("titulares_local") and len(a["titulares_local"]) > 0:
                complete_codes.add(a["cod_acta"])

        new_actas = [a for a in actas_to_scrape if a["cod_acta"] not in complete_codes]
        logger.info("Scheduler: %d actas to scrape (%d already complete)",
                    len(new_actas), len(complete_codes))
        if not new_actas:
            return

        actas_saved = 0
        for acta_info in new_actas:
            try:
                acta_data = await scraper.scrape_acta(acta_info["cod_acta"])

                # Get fecha/hora from jornada data
                fecha = None
                hora = None
                for jornada in jornadas_res.data or []:
                    if jornada["numero"] == acta_info["jornada_numero"]:
                        for p in jornada.get("partidos", []):
                            if p.get("cod_acta") == acta_info["cod_acta"]:
                                if p.get("fecha"):
                                    try:
                                        fecha = datetime.strptime(p["fecha"], "%d-%m-%Y").date().isoformat()
                                    except ValueError:
                                        pass
                                hora = p.get("hora") or None
                                break

                acta_record = {
                    "competicion_id": comp_id,
                    "jornada_numero": acta_info["jornada_numero"],
                    "cod_acta": acta_info["cod_acta"],
                    "local_nombre": acta_data["local"]["nombre"],
                    "visitante_nombre": acta_data["visitante"]["nombre"],
                    "local_escudo_url": acta_data["local"].get("escudo_url"),
                    "visitante_escudo_url": acta_data["visitante"].get("escudo_url"),
                    "goles_local": acta_data.get("goles_local"),
                    "goles_visitante": acta_data.get("goles_visitante"),
                    "estadio": acta_data.get("estadio", ""),
                    "ciudad": acta_data.get("ciudad", ""),
                    "fecha": fecha,
                    "hora": hora,
                    "titulares_local": acta_data.get("titulares_local", []),
                    "suplentes_local": acta_data.get("suplentes_local", []),
                    "titulares_visitante": acta_data.get("titulares_visitante", []),
                    "suplentes_visitante": acta_data.get("suplentes_visitante", []),
                    "goles": acta_data.get("goles", []),
                    "tarjetas_local": acta_data.get("tarjetas_local", []),
                    "tarjetas_visitante": acta_data.get("tarjetas_visitante", []),
                    "sustituciones_local": acta_data.get("sustituciones_local", []),
                    "sustituciones_visitante": acta_data.get("sustituciones_visitante", []),
                    "cuerpo_tecnico_local": acta_data.get("cuerpo_tecnico_local", {}),
                    "cuerpo_tecnico_visitante": acta_data.get("cuerpo_tecnico_visitante", {}),
                }

                supabase.table("rfef_actas").upsert(
                    acta_record, on_conflict="cod_acta"
                ).execute()
                actas_saved += 1
                logger.info("Scheduler: scraped acta %s (%s vs %s)",
                            acta_info["cod_acta"],
                            acta_data["local"]["nombre"],
                            acta_data["visitante"]["nombre"])
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.warning("Scheduler: error scraping acta %s: %s", acta_info["cod_acta"], e)
                continue

        if actas_saved > 0:
            logger.info("Scheduler: synced %d actas for competition %s", actas_saved, comp_id)

    except Exception as e:
        logger.warning("Scheduler: error syncing recent actas for %s: %s", comp_id, e)


async def _sync_all_actas(supabase, scraper: RFAFScraper, comp_id: str, comp_name: str):
    """Sync actas for ALL jornadas — only scrape new or incomplete (no titulares).
    Returns sync_status dict.
    """
    try:
        all_jornadas_res = supabase.table("rfef_jornadas").select(
            "numero, partidos"
        ).eq("competicion_id", comp_id).order("numero").execute()

        all_actas = []
        for jornada in all_jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                cod_acta = partido.get("cod_acta")
                if cod_acta:
                    all_actas.append({
                        "cod_acta": cod_acta,
                        "jornada_numero": jornada["numero"],
                    })

        if not all_actas:
            logger.info("Daily actas sync: no actas found for %s", comp_name)
            return None

        # Check which are already complete
        existing_res = supabase.table("rfef_actas").select(
            "cod_acta, titulares_local"
        ).eq("competicion_id", comp_id).execute()
        complete_codes = set()
        for a in existing_res.data or []:
            if a.get("titulares_local") and len(a["titulares_local"]) > 0:
                complete_codes.add(a["cod_acta"])

        pending_actas = [a for a in all_actas if a["cod_acta"] not in complete_codes]
        logger.info("Daily actas sync %s: %d pending, %d complete, %d total",
                    comp_name, len(pending_actas), len(complete_codes), len(all_actas))

        if not pending_actas:
            # All complete — save status
            sync_status = {
                "total_actas": len(all_actas),
                "actas_completas": len(complete_codes),
                "actas_incompletas": [],
                "actas_fallidas": [],
                "ultima_sync_actas": datetime.utcnow().isoformat(),
            }
            supabase.table("rfef_competiciones").update({
                "sync_status": sync_status,
            }).eq("id", comp_id).execute()
            return sync_status

        actas_saved = 0
        actas_fallidas = []
        for acta_info in pending_actas:
            try:
                acta_data = await scraper.scrape_acta(acta_info["cod_acta"])

                # Get fecha/hora from jornada data
                fecha = None
                hora = None
                jornada_local = ""
                jornada_visitante = ""
                for jornada in all_jornadas_res.data or []:
                    if jornada["numero"] == acta_info["jornada_numero"]:
                        for p in jornada.get("partidos", []):
                            if p.get("cod_acta") == acta_info["cod_acta"]:
                                if p.get("fecha"):
                                    try:
                                        fecha = datetime.strptime(
                                            p["fecha"], "%d-%m-%Y"
                                        ).date().isoformat()
                                    except ValueError:
                                        pass
                                hora = p.get("hora") or None
                                jornada_local = p.get("local", "")
                                jornada_visitante = p.get("visitante", "")
                                break

                acta_record = {
                    "competicion_id": comp_id,
                    "jornada_numero": acta_info["jornada_numero"],
                    "cod_acta": acta_info["cod_acta"],
                    "local_nombre": acta_data["local"]["nombre"] or jornada_local,
                    "visitante_nombre": acta_data["visitante"]["nombre"] or jornada_visitante,
                    "local_escudo_url": acta_data["local"].get("escudo_url"),
                    "visitante_escudo_url": acta_data["visitante"].get("escudo_url"),
                    "goles_local": acta_data.get("goles_local"),
                    "goles_visitante": acta_data.get("goles_visitante"),
                    "estadio": acta_data.get("estadio", ""),
                    "ciudad": acta_data.get("ciudad", ""),
                    "fecha": fecha,
                    "hora": hora,
                    "titulares_local": acta_data.get("titulares_local", []),
                    "suplentes_local": acta_data.get("suplentes_local", []),
                    "titulares_visitante": acta_data.get("titulares_visitante", []),
                    "suplentes_visitante": acta_data.get("suplentes_visitante", []),
                    "goles": acta_data.get("goles", []),
                    "tarjetas_local": acta_data.get("tarjetas_local", []),
                    "tarjetas_visitante": acta_data.get("tarjetas_visitante", []),
                    "sustituciones_local": acta_data.get("sustituciones_local", []),
                    "sustituciones_visitante": acta_data.get("sustituciones_visitante", []),
                    "cuerpo_tecnico_local": acta_data.get("cuerpo_tecnico_local", {}),
                    "cuerpo_tecnico_visitante": acta_data.get("cuerpo_tecnico_visitante", {}),
                    "arbitros": acta_data.get("arbitros", []),
                }

                supabase.table("rfef_actas").upsert(
                    acta_record, on_conflict="cod_acta"
                ).execute()
                actas_saved += 1
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.warning("Daily actas sync: error acta %s: %s", acta_info["cod_acta"], e)
                actas_fallidas.append(acta_info["cod_acta"])
                continue

        # Re-check incomplete after this run
        incomplete_codes = [
            a["cod_acta"] for a in pending_actas
            if a["cod_acta"] not in actas_fallidas
        ]
        # Remove newly saved from incomplete (they're now complete)
        # The truly incomplete are: fallidas + those that were pending but saved with empty titulares
        sync_status = {
            "total_actas": len(all_actas),
            "actas_completas": len(complete_codes) + actas_saved,
            "actas_incompletas": [c for c in incomplete_codes if c not in complete_codes][:50],
            "actas_fallidas": actas_fallidas[:50],
            "ultima_sync_actas": datetime.utcnow().isoformat(),
        }
        supabase.table("rfef_competiciones").update({
            "sync_status": sync_status,
        }).eq("id", comp_id).execute()

        logger.info("Daily actas sync %s: saved %d, failed %d",
                    comp_name, actas_saved, len(actas_fallidas))
        return sync_status

    except Exception as e:
        logger.error("Daily actas sync error for %s: %s", comp_name, e, exc_info=True)
        return None


async def daily_sync_data():
    """Daily 03:00 CET — lightweight sync: clasificación + goleadores + all jornadas for all comps."""
    supabase = get_supabase()
    try:
        response = supabase.table("rfef_competiciones").select("*").eq(
            "sync_habilitado", True
        ).not_.is_("rfef_codcompeticion", "null").not_.is_("rfef_codgrupo", "null").execute()

        competiciones = response.data or []
        if not competiciones:
            return

        logger.info("Daily data sync starting for %d competitions", len(competiciones))
        scraper = RFAFScraper()
        try:
            for comp in competiciones:
                comp_id = comp["id"]
                comp_name = comp.get("nombre", comp_id)
                codcompeticion = comp.get("rfef_codcompeticion")
                codgrupo = comp.get("rfef_codgrupo")
                codtemporada = comp.get("rfef_codtemporada", "21")

                if not codcompeticion or not codgrupo:
                    continue

                try:
                    # Sync clasificación + goleadores
                    data = await scraper.sync_competicion(codcompeticion, codgrupo, codtemporada)
                    update = {"ultima_sincronizacion": datetime.utcnow().isoformat()}
                    if data.get("clasificacion"):
                        update["clasificacion"] = data["clasificacion"]
                    if data.get("goleadores") is not None:
                        update["goleadores"] = data["goleadores"]
                    if data.get("calendario"):
                        update["calendario"] = data["calendario"]
                    supabase.table("rfef_competiciones").update(update).eq("id", comp_id).execute()

                    # Refresh ALL jornadas from calendario
                    calendario = comp.get("calendario") or []
                    if not calendario:
                        try:
                            calendario = await scraper.scrape_calendario(
                                codcompeticion, codgrupo, codtemporada
                            )
                        except Exception:
                            calendario = [{"numero": n} for n in range(1, 31)]

                    for j_info in calendario:
                        num = j_info["numero"]
                        try:
                            jornada = await scraper.scrape_jornada_combined(
                                codcompeticion, codgrupo, str(num), codtemporada
                            )
                            if jornada.get("partidos"):
                                _upsert_jornada(supabase, comp_id, jornada)
                            await asyncio.sleep(0.3)
                        except Exception as e:
                            logger.debug("Daily sync: error jornada %d for %s: %s", num, comp_name, e)
                            continue

                    # Auto-link if mi_equipo_nombre is set
                    if comp.get("mi_equipo_nombre"):
                        try:
                            fresh_comp = supabase.table("rfef_competiciones").select("*").eq(
                                "id", comp_id
                            ).single().execute()
                            if fresh_comp.data:
                                link_competition(supabase, fresh_comp.data)
                        except Exception as e:
                            logger.debug("Daily sync: auto-link error for %s: %s", comp_name, e)

                    logger.info("Daily data sync completed for %s", comp_name)

                except Exception as e:
                    logger.error("Daily data sync error for %s: %s", comp_name, e)
                    continue

        finally:
            await scraper.close()

    except Exception as e:
        logger.error("Error in daily_sync_data: %s", e, exc_info=True)


async def daily_sync_actas():
    """Daily 06:00 CET — full acta sync: scrape all missing/incomplete actas for all comps."""
    supabase = get_supabase()
    try:
        response = supabase.table("rfef_competiciones").select("*").eq(
            "sync_habilitado", True
        ).not_.is_("rfef_codcompeticion", "null").not_.is_("rfef_codgrupo", "null").execute()

        competiciones = response.data or []
        if not competiciones:
            return

        logger.info("Daily actas sync starting for %d competitions", len(competiciones))
        scraper = RFAFScraper()
        try:
            for comp in competiciones:
                await _sync_all_actas(
                    supabase, scraper, comp["id"], comp.get("nombre", comp["id"])
                )
        finally:
            await scraper.close()

    except Exception as e:
        logger.error("Error in daily_sync_actas: %s", e, exc_info=True)


def start_scheduler():
    """Configura y arranca el scheduler de scraping RFAF."""
    # Viernes 20:00 — Pre-jornada
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="fri", hour=20, minute=0, timezone="Europe/Madrid"),
        id="rfaf_viernes",
        replace_existing=True,
    )

    # Sábado 14:00 y 22:00 — Durante jornada
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="sat", hour=14, minute=0, timezone="Europe/Madrid"),
        id="rfaf_sabado_14",
        replace_existing=True,
    )
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="sat", hour=22, minute=0, timezone="Europe/Madrid"),
        id="rfaf_sabado_22",
        replace_existing=True,
    )

    # Domingo 14:00 y 22:00
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="sun", hour=14, minute=0, timezone="Europe/Madrid"),
        id="rfaf_domingo_14",
        replace_existing=True,
    )
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="sun", hour=22, minute=0, timezone="Europe/Madrid"),
        id="rfaf_domingo_22",
        replace_existing=True,
    )

    # Lunes 08:00 — Full sync + pre-match intel
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="Europe/Madrid"),
        id="rfaf_lunes_08",
        replace_existing=True,
    )

    # Lunes 10:00 — Post-jornada
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="mon", hour=10, minute=0, timezone="Europe/Madrid"),
        id="rfaf_lunes",
        replace_existing=True,
    )

    # Viernes 08:00 — Refresh sanciones + pre-match intel
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="fri", hour=8, minute=0, timezone="Europe/Madrid"),
        id="rfaf_viernes_08",
        replace_existing=True,
    )

    # Daily 03:00 CET — lightweight sync: clasificación + goleadores + all jornadas
    scheduler.add_job(
        daily_sync_data,
        CronTrigger(hour=3, minute=0, timezone="Europe/Madrid"),
        id="daily_sync_data",
        replace_existing=True,
    )

    # Daily 06:00 CET — full acta sync: scrape all missing/incomplete actas
    scheduler.add_job(
        daily_sync_actas,
        CronTrigger(hour=6, minute=0, timezone="Europe/Madrid"),
        id="daily_sync_actas",
        replace_existing=True,
    )

    # Daily load recalculation at 00:15 CET
    scheduler.add_job(
        _daily_load_recalc,
        CronTrigger(hour=0, minute=15, timezone="Europe/Madrid"),
        id="daily_load_recalc",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("RFAF scheduler started with %d jobs", len(scheduler.get_jobs()))


async def _daily_load_recalc():
    """Daily recalculation of training load for all teams."""
    try:
        count = recalculate_all_teams()
        logger.info("Daily load recalc completed: %d teams", count)
    except Exception as e:
        logger.error("Error in daily load recalc: %s", e, exc_info=True)


def stop_scheduler():
    """Para el scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("RFAF scheduler stopped")
