"""
TrainingHub Pro - Scheduler de Scraping RFAF
Programación automática de sincronización con la RFAF.
"""

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


async def _upsert_jornada(supabase, comp_id: str, jornada: dict):
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
    Refreshes current jornada plus jornada-1 and jornada+1.
    Uses clasificación page for reliable scores (no ntype obfuscation).
    If mi_equipo_nombre is set, triggers auto-link.
    """
    comp_id = comp["id"]
    codcompeticion = comp.get("rfef_codcompeticion")
    codgrupo = comp.get("rfef_codgrupo")
    codtemporada = comp.get("rfef_codtemporada", "21")

    if not codcompeticion or not codgrupo:
        return

    try:
        data = await scraper.sync_competicion(codcompeticion, codgrupo, codtemporada)

        update = {
            "clasificacion": data["clasificacion"],
            "goleadores": data["goleadores"],
            "ultima_sincronizacion": datetime.utcnow().isoformat(),
        }

        if data.get("calendario"):
            update["calendario"] = data["calendario"]

        # Save current jornada
        jornada_num = None
        if data.get("jornada_actual"):
            jornada = data["jornada_actual"]
            jornada_num = jornada["numero"]
            await _upsert_jornada(supabase, comp_id, jornada)

        # Also refresh adjacent jornadas (N-1 and N+1) using combined approach
        # (scores from clasificación + fecha/hora/campo from jornada page)
        if jornada_num:
            import asyncio
            for adj_num in [jornada_num - 1, jornada_num + 1]:
                if adj_num < 1:
                    continue
                try:
                    adj_jornada = await scraper.scrape_jornada_combined(
                        codcompeticion, codgrupo, str(adj_num), codtemporada
                    )
                    if adj_jornada.get("partidos"):
                        await _upsert_jornada(supabase, comp_id, adj_jornada)
                    await asyncio.sleep(0.3)
                except Exception as e:
                    logger.debug("Could not scrape adjacent jornada %d: %s", adj_num, e)

        supabase.table("rfef_competiciones").update(update).eq(
            "id", comp_id
        ).execute()

        # Auto-link if mi_equipo_nombre is set
        if comp.get("mi_equipo_nombre"):
            try:
                link_result = link_competition(supabase, comp)
                logger.info(
                    "Auto-link for %s: %d rivales, %d partidos created, %d updated",
                    comp.get("nombre", comp_id),
                    link_result.get("rivales_created", 0),
                    link_result.get("partidos_created", 0),
                    link_result.get("partidos_updated", 0),
                )
            except Exception as e:
                logger.error("Error in auto-link for %s: %s", comp_id, e)

        logger.info("Synced competition %s successfully", comp.get("nombre", comp_id))

    except Exception as e:
        logger.error("Error syncing competition %s: %s", comp_id, e, exc_info=True)


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
