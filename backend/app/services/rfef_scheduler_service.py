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

logger = logging.getLogger(__name__)

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

        logger.info("Synced competition %s successfully", comp.get("nombre", comp_id))

    except Exception as e:
        logger.error("Error syncing competition %s: %s", comp_id, e, exc_info=True)


async def _sync_recent_actas(supabase, scraper: RFAFScraper, comp_id: str, current_jornada: int):
    """Sync actas for the current jornada and the previous one.
    Only scrapes actas that have a cod_acta and aren't already saved.
    """
    try:
        jornada_nums = [n for n in [current_jornada - 1, current_jornada] if n >= 1]

        jornadas_res = supabase.table("rfef_jornadas").select("numero, partidos").eq(
            "competicion_id", comp_id
        ).in_("numero", jornada_nums).execute()

        # Collect cod_actas that are not yet saved
        actas_to_scrape = []
        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                cod_acta = partido.get("cod_acta")
                if cod_acta:
                    actas_to_scrape.append({
                        "cod_acta": cod_acta,
                        "jornada_numero": jornada["numero"],
                    })

        if not actas_to_scrape:
            return

        # Check which actas already exist
        existing_actas_res = supabase.table("rfef_actas").select("cod_acta").eq(
            "competicion_id", comp_id
        ).in_("cod_acta", [a["cod_acta"] for a in actas_to_scrape]).execute()
        existing_codes = {a["cod_acta"] for a in (existing_actas_res.data or [])}

        new_actas = [a for a in actas_to_scrape if a["cod_acta"] not in existing_codes]
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

                supabase.table("rfef_actas").insert(acta_record).execute()
                actas_saved += 1
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.debug("Error scraping acta %s: %s", acta_info["cod_acta"], e)
                continue

        if actas_saved > 0:
            logger.info("Synced %d actas for competition %s", actas_saved, comp_id)

    except Exception as e:
        logger.debug("Error syncing recent actas for %s: %s", comp_id, e)


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

    # Lunes 10:00 — Post-jornada
    scheduler.add_job(
        sync_all_competitions,
        CronTrigger(day_of_week="mon", hour=10, minute=0, timezone="Europe/Madrid"),
        id="rfaf_lunes",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("RFAF scheduler started with %d jobs", len(scheduler.get_jobs()))


def stop_scheduler():
    """Para el scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("RFAF scheduler stopped")
