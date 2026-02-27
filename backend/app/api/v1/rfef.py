"""
TrainingHub Pro - Router de RFEF
Gestión de competiciones, jornadas y actas RFEF con scraping automático.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, Body, status
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.rfef_scraper_service import RFAFScraper
from app.services.competition_linker_service import link_competition

logger = logging.getLogger(__name__)
router = APIRouter()


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


# ============ Competiciones ============

@router.get("/competiciones")
async def list_competiciones(
    equipo_id: Optional[UUID] = None,
    temporada: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Lista competiciones RFEF del equipo."""
    supabase = get_supabase()

    query = supabase.table("rfef_competiciones").select("*")

    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        # Equipos de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).execute()
        eids = [e["id"] for e in equipos.data]
        if eids:
            query = query.in_("equipo_id", eids)

    if temporada:
        query = query.eq("temporada", temporada)

    query = query.order("created_at", desc=True)
    response = query.execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/competiciones/{competicion_id}")
async def get_competicion(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Obtiene una competición con su clasificación."""
    supabase = get_supabase()

    response = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada"
        )

    return response.data


@router.post("/competiciones", status_code=status.HTTP_201_CREATED)
async def create_competicion(
    equipo_id: UUID,
    nombre: str = Query(..., min_length=2),
    categoria: Optional[str] = None,
    grupo: Optional[str] = None,
    temporada: Optional[str] = None,
    rfef_id: Optional[str] = None,
    url_fuente: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_CREATE)),
):
    """Crea una competición RFEF."""
    supabase = get_supabase()

    data = {
        "equipo_id": str(equipo_id),
        "nombre": nombre,
        "categoria": categoria,
        "grupo": grupo,
        "temporada": temporada,
        "rfef_id": rfef_id,
        "url_fuente": url_fuente,
    }

    response = supabase.table("rfef_competiciones").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear competición"
        )

    return response.data[0]


@router.put("/competiciones/{competicion_id}")
async def update_competicion(
    competicion_id: UUID,
    nombre: Optional[str] = None,
    categoria: Optional[str] = None,
    grupo: Optional[str] = None,
    temporada: Optional[str] = None,
    clasificacion: Optional[list] = None,
    calendario: Optional[list] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Actualiza una competición RFEF (clasificación, calendario, etc.)."""
    supabase = get_supabase()

    update_data = {}
    if nombre is not None:
        update_data["nombre"] = nombre
    if categoria is not None:
        update_data["categoria"] = categoria
    if grupo is not None:
        update_data["grupo"] = grupo
    if temporada is not None:
        update_data["temporada"] = temporada
    if clasificacion is not None:
        update_data["clasificacion"] = clasificacion
    if calendario is not None:
        update_data["calendario"] = calendario

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rfef_competiciones").update(update_data).eq(
        "id", str(competicion_id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada"
        )

    return response.data[0]


@router.delete("/competiciones/{competicion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competicion(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_DELETE)),
):
    """Elimina una competición, sus jornadas y los partidos auto-creados."""
    supabase = get_supabase()
    comp_id = str(competicion_id)

    # Borrar partidos auto-creados ANTES de que el FK se anule por CASCADE
    supabase.table("partidos").delete().eq(
        "rfef_competicion_id", comp_id
    ).eq("auto_creado", True).execute()

    # Borrar competición (cascadea a jornadas y actas)
    supabase.table("rfef_competiciones").delete().eq(
        "id", comp_id
    ).execute()
    return None


# ============ Jornadas ============

@router.get("/competiciones/{competicion_id}/jornadas")
async def list_jornadas(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Lista jornadas de una competición."""
    supabase = get_supabase()

    response = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", str(competicion_id)
    ).order("numero").execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/jornadas/{jornada_id}")
async def get_jornada(
    jornada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Obtiene una jornada con sus partidos."""
    supabase = get_supabase()

    response = supabase.table("rfef_jornadas").select("*").eq(
        "id", str(jornada_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jornada no encontrada"
        )

    return response.data


@router.post("/competiciones/{competicion_id}/jornadas", status_code=status.HTTP_201_CREATED)
async def create_jornada(
    competicion_id: UUID,
    numero: int = Query(..., ge=1),
    fecha: Optional[str] = None,
    partidos: list = [],
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_CREATE)),
):
    """Crea una jornada en una competición."""
    supabase = get_supabase()

    data = {
        "competicion_id": str(competicion_id),
        "numero": numero,
        "fecha": fecha,
        "partidos": partidos,
    }

    response = supabase.table("rfef_jornadas").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear jornada"
        )

    return response.data[0]


@router.put("/jornadas/{jornada_id}")
async def update_jornada(
    jornada_id: UUID,
    fecha: Optional[str] = None,
    partidos: Optional[list] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Actualiza una jornada."""
    supabase = get_supabase()

    update_data = {}
    if fecha is not None:
        update_data["fecha"] = fecha
    if partidos is not None:
        update_data["partidos"] = partidos

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rfef_jornadas").update(update_data).eq(
        "id", str(jornada_id)
    ).execute()

    return response.data[0] if response.data else None


# ============ Mi Equipo + Full Sync + Link ============

class MiEquipoRequest(BaseModel):
    nombre: str


@router.put("/competiciones/{competicion_id}/mi-equipo")
async def set_mi_equipo(
    competicion_id: UUID,
    body: MiEquipoRequest,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Seleccionar 'soy este equipo' en la clasificación."""
    supabase = get_supabase()

    comp = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    # Validate that the nombre exists in clasificacion
    clasificacion = comp.data.get("clasificacion", [])
    nombre_lower = body.nombre.lower()
    found = any(
        e.get("equipo", "").lower() == nombre_lower
        for e in clasificacion
    )

    if not found:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El equipo '{body.nombre}' no se encuentra en la clasificación",
        )

    supabase.table("rfef_competiciones").update({
        "mi_equipo_nombre": body.nombre,
    }).eq("id", str(competicion_id)).execute()

    return {"status": "ok", "mi_equipo_nombre": body.nombre}


@router.post("/competiciones/{competicion_id}/sync-full")
async def sync_competicion_full(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Sync completo incremental: descarga clasificación, calendario, goleadores y TODAS
    las jornadas, guardando en BD después de cada paso para no perder datos si falla."""
    import asyncio

    supabase = get_supabase()
    comp_id = str(competicion_id)

    comp = supabase.table("rfef_competiciones").select("*").eq(
        "id", comp_id
    ).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    codcompeticion = comp.data.get("rfef_codcompeticion")
    codgrupo = comp.data.get("rfef_codgrupo")
    codtemporada = comp.data.get("rfef_codtemporada", "21")

    if not codcompeticion or not codgrupo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La competición no tiene parámetros RFAF configurados",
        )

    scraper = RFAFScraper()
    jornadas_saved = 0
    actas_saved = 0
    errors = []
    clasificacion = []
    goleadores = []
    calendario = []
    link_result = None
    sync_time = None

    try:
        # --- Step 1: Clasificación (save immediately) ---
        try:
            clas_data = await scraper.scrape_clasificacion_full(
                codcompeticion, codgrupo, codtemporada
            )
            clasificacion = clas_data.get("clasificacion", [])
            if clasificacion:
                supabase.table("rfef_competiciones").update({
                    "clasificacion": clasificacion,
                }).eq("id", comp_id).execute()
                logger.info("Sync-full: saved clasificación (%d equipos)", len(clasificacion))
            else:
                logger.warning("Sync-full: clasificación returned empty, keeping existing data")
        except Exception as e:
            logger.error("Sync-full: error in clasificación: %s", e)
            errors.append(f"clasificación: {e}")

        await asyncio.sleep(0.3)

        # --- Step 2: Calendario (try scraping, fallback to range 1..30) ---
        calendario = []
        try:
            calendario = await scraper.scrape_calendario(
                codcompeticion, codgrupo, codtemporada
            )
            if calendario:
                supabase.table("rfef_competiciones").update({
                    "calendario": [
                        {"numero": j["numero"], "texto": j.get("texto", f"Jornada {j['numero']}")}
                        for j in calendario
                    ],
                }).eq("id", comp_id).execute()
                logger.info("Sync-full: saved calendario (%d jornadas)", len(calendario))
        except Exception as e:
            logger.error("Sync-full: error in calendario: %s", e)
            errors.append(f"calendario: {e}")

        # Fallback: if calendario is empty or too short, generate full range
        # Standard league has 30 jornadas; use existing DB calendario or default
        if len(calendario) < 20:
            existing_cal = comp.data.get("calendario", [])
            max_from_db = max((j["numero"] for j in existing_cal), default=0) if existing_cal else 0
            max_jornada = max(30, max_from_db)
            calendario = [{"numero": n, "texto": f"Jornada {n}"} for n in range(1, max_jornada + 1)]
            # Save the full calendario to DB
            supabase.table("rfef_competiciones").update({
                "calendario": calendario,
            }).eq("id", comp_id).execute()
            logger.info("Sync-full: generated full calendario (1-%d)", max_jornada)

        await asyncio.sleep(0.3)

        # --- Step 3: Goleadores (save immediately) ---
        try:
            goleadores = await scraper.scrape_goleadores(
                codcompeticion, codgrupo, codtemporada
            )
            if goleadores:
                supabase.table("rfef_competiciones").update({
                    "goleadores": goleadores,
                }).eq("id", comp_id).execute()
                logger.info("Sync-full: saved goleadores (%d)", len(goleadores))
        except Exception as e:
            logger.error("Sync-full: error in goleadores: %s", e)
            errors.append(f"goleadores: {e}")

        # --- Step 4: All jornadas (save each one immediately) ---
        # Try each jornada — empty jornadas (future) will simply return no partidos
        for j_info in calendario:
            num = j_info["numero"]
            try:
                jornada = await scraper.scrape_jornada_combined(
                    codcompeticion, codgrupo, str(num), codtemporada
                )
                if jornada.get("partidos"):
                    _upsert_jornada(supabase, comp_id, jornada)
                    jornadas_saved += 1
                await asyncio.sleep(0.3)
            except Exception as e:
                logger.warning("Sync-full: error jornada %d: %s", num, e)
                errors.append(f"jornada {num}: {e}")
                continue

        # --- Step 5: Update sync timestamp ---
        sync_time = datetime.utcnow().isoformat()
        supabase.table("rfef_competiciones").update({
            "ultima_sincronizacion": sync_time,
        }).eq("id", comp_id).execute()

        # --- Step 6: Clean bad data (scores > 20 from old broken ntype) ---
        try:
            supabase.table("partidos").delete().eq(
                "rfef_competicion_id", comp_id
            ).eq("auto_creado", True).gt("goles_favor", 20).execute()
            supabase.table("partidos").delete().eq(
                "rfef_competicion_id", comp_id
            ).eq("auto_creado", True).gt("goles_contra", 20).execute()
        except Exception as e:
            logger.warning("Error cleaning bad match data: %s", e)

        # --- Step 7: Auto-link if mi_equipo is set ---
        if comp.data.get("mi_equipo_nombre"):
            try:
                # Refresh comp data for linker (clasificacion may have updated)
                fresh_comp = supabase.table("rfef_competiciones").select("*").eq(
                    "id", comp_id
                ).single().execute()
                if fresh_comp.data:
                    link_result = link_competition(supabase, fresh_comp.data)
            except Exception as e:
                logger.error("Sync-full: error in auto-link: %s", e)
                errors.append(f"auto-link: {e}")

        # --- Step 8: Sync ALL actas (scrape match reports for all jornadas) ---
        actas_saved = 0
        try:
            all_jornadas_res = supabase.table("rfef_jornadas").select(
                "numero, partidos"
            ).eq("competicion_id", comp_id).order("numero").execute()

            # Collect all cod_actas
            all_actas = []
            for jornada in all_jornadas_res.data or []:
                for partido in jornada.get("partidos", []):
                    cod_acta = partido.get("cod_acta")
                    if cod_acta:
                        all_actas.append({
                            "cod_acta": cod_acta,
                            "jornada_numero": jornada["numero"],
                        })

            if all_actas:
                # Check which already exist
                existing_actas_res = supabase.table("rfef_actas").select("cod_acta").eq(
                    "competicion_id", comp_id
                ).execute()
                existing_codes = {a["cod_acta"] for a in (existing_actas_res.data or [])}

                new_actas = [a for a in all_actas if a["cod_acta"] not in existing_codes]
                logger.info("Sync-full: %d actas to scrape (%d already exist)",
                            len(new_actas), len(existing_codes))

                for acta_info in new_actas:
                    try:
                        acta_data = await scraper.scrape_acta(acta_info["cod_acta"])

                        # Get fecha/hora from jornada
                        fecha = None
                        hora = None
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
                        logger.debug("Sync-full: error acta %s: %s", acta_info["cod_acta"], e)
                        continue

                logger.info("Sync-full: saved %d actas", actas_saved)
        except Exception as e:
            logger.warning("Sync-full: error in actas phase: %s", e)
            errors.append(f"actas: {e}")

    finally:
        await scraper.close()

    return {
        "status": "ok" if not errors else "partial",
        "equipos_clasificacion": len(clasificacion),
        "goleadores": len(goleadores),
        "jornadas_saved": jornadas_saved,
        "jornadas_total": len(calendario),
        "actas_saved": actas_saved,
        "link_result": link_result,
        "errors": errors[:5] if errors else None,
        "sincronizado_en": sync_time,
    }


@router.post("/competiciones/{competicion_id}/link")
async def link_competicion(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_CREATE)),
):
    """Trigger manual de auto-link: crea rivales y partidos desde jornadas RFEF."""
    supabase = get_supabase()

    comp = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    if not comp.data.get("mi_equipo_nombre"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primero debes seleccionar tu equipo (mi_equipo_nombre)",
        )

    result = link_competition(supabase, comp.data)
    return result


# ============ Actas ============

class SyncActasRequest(BaseModel):
    jornadas: Optional[list[int]] = None  # Specific jornadas, or None for all


@router.post("/competiciones/{competicion_id}/sync-actas")
async def sync_actas(
    competicion_id: UUID,
    body: SyncActasRequest = Body(default=SyncActasRequest()),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Scrape actas de jornada(s) específica(s) o todas.
    Saves detailed match reports (lineups, goals, cards, substitutions).
    """
    supabase = get_supabase()

    comp = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    # Get jornadas with cod_acta info
    jornadas_query = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", str(competicion_id)
    ).order("numero")

    if body.jornadas:
        jornadas_query = jornadas_query.in_("numero", body.jornadas)

    jornadas_res = jornadas_query.execute()
    jornadas = jornadas_res.data or []

    # Collect all cod_actas from jornadas
    actas_to_scrape = []
    for jornada in jornadas:
        for partido in jornada.get("partidos", []):
            cod_acta = partido.get("cod_acta")
            if cod_acta:
                actas_to_scrape.append({
                    "cod_acta": cod_acta,
                    "jornada_numero": jornada["numero"],
                })

    if not actas_to_scrape:
        return {
            "status": "ok",
            "message": "No hay actas disponibles para scraping",
            "actas_scraped": 0,
        }

    scraper = RFAFScraper()
    actas_saved = 0
    errors = 0

    try:
        import asyncio
        for acta_info in actas_to_scrape:
            try:
                acta_data = await scraper.scrape_acta(acta_info["cod_acta"])

                # Parse fecha/hora from jornada data
                fecha = None
                hora = None
                for jornada in jornadas:
                    if jornada["numero"] == acta_info["jornada_numero"]:
                        for p in jornada.get("partidos", []):
                            if p.get("cod_acta") == acta_info["cod_acta"]:
                                if p.get("fecha"):
                                    try:
                                        from datetime import datetime as dt
                                        fecha = dt.strptime(p["fecha"], "%d-%m-%Y").date().isoformat()
                                    except ValueError:
                                        pass
                                hora = p.get("hora") or None
                                break

                # Upsert acta
                acta_record = {
                    "competicion_id": str(competicion_id),
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
                    "updated_at": datetime.utcnow().isoformat(),
                }

                existing = supabase.table("rfef_actas").select("id").eq(
                    "cod_acta", acta_info["cod_acta"]
                ).execute()

                if existing.data:
                    supabase.table("rfef_actas").update(acta_record).eq(
                        "id", existing.data[0]["id"]
                    ).execute()
                else:
                    supabase.table("rfef_actas").insert(acta_record).execute()

                actas_saved += 1
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.warning("Error scraping acta %s: %s", acta_info["cod_acta"], e)
                errors += 1
                continue
    finally:
        await scraper.close()

    return {
        "status": "ok",
        "actas_scraped": actas_saved,
        "errors": errors,
        "total_available": len(actas_to_scrape),
    }


@router.get("/competiciones/{competicion_id}/actas")
async def list_actas(
    competicion_id: UUID,
    jornada: Optional[int] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Lista actas guardadas de una competición."""
    supabase = get_supabase()

    query = supabase.table("rfef_actas").select(
        "id, competicion_id, jornada_numero, cod_acta, "
        "local_nombre, visitante_nombre, local_escudo_url, visitante_escudo_url, "
        "goles_local, goles_visitante, estadio, ciudad, fecha, hora, created_at"
    ).eq("competicion_id", str(competicion_id))

    if jornada is not None:
        query = query.eq("jornada_numero", jornada)

    query = query.order("jornada_numero")
    response = query.execute()

    return {"data": response.data, "total": len(response.data)}


@router.get("/actas/{cod_acta}")
async def get_acta(
    cod_acta: str,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Detalle completo de un acta."""
    supabase = get_supabase()

    response = supabase.table("rfef_actas").select("*").eq(
        "cod_acta", cod_acta
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Acta no encontrada",
        )

    return response.data


# ============ Scraping / Sync ============

class SetupFromUrlRequest(BaseModel):
    url: str
    equipo_id: str
    nombre: Optional[str] = None


@router.post("/competiciones/setup-from-url", status_code=status.HTTP_201_CREATED)
async def setup_from_url(
    body: SetupFromUrlRequest,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_CREATE)),
):
    """Crea una competición desde una URL de la RFAF, auto-detectando parámetros."""
    params = RFAFScraper.parse_url(body.url)

    if not params.get("codcompeticion") or not params.get("codgrupo"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudieron extraer los parámetros de la URL. "
                   "Asegúrate de pegar una URL de clasificación o jornada de rfaf.es",
        )

    supabase = get_supabase()

    # Scrape inicial para obtener datos y nombre
    scraper = RFAFScraper()
    try:
        data = await scraper.sync_competicion(
            params["codcompeticion"],
            params["codgrupo"],
            params.get("codtemporada", "21"),
        )
    except Exception as e:
        logger.error("Error scraping RFAF: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al conectar con la RFAF: {str(e)}",
        )
    finally:
        await scraper.close()

    nombre = body.nombre or f"Competición RFAF {params['codcompeticion']}"

    comp_data = {
        "equipo_id": body.equipo_id,
        "nombre": nombre,
        "rfef_codcompeticion": params["codcompeticion"],
        "rfef_codgrupo": params["codgrupo"],
        "rfef_codtemporada": params.get("codtemporada", "21"),
        "url_fuente": body.url,
        "clasificacion": data.get("clasificacion", []),
        "calendario": data.get("calendario", []),
        "goleadores": data.get("goleadores", []),
        "sync_habilitado": True,
        "ultima_sincronizacion": datetime.utcnow().isoformat(),
    }

    response = supabase.table("rfef_competiciones").insert(comp_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear la competición",
        )

    comp = response.data[0]

    # Guardar jornada actual
    if data.get("jornada_actual"):
        jornada = data["jornada_actual"]
        supabase.table("rfef_jornadas").insert({
            "competicion_id": comp["id"],
            "numero": jornada["numero"],
            "partidos": jornada["partidos"],
        }).execute()

    return comp


@router.post("/competiciones/{competicion_id}/sync")
async def sync_competicion(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Fuerza una sincronización manual de una competición con la RFAF."""
    supabase = get_supabase()

    comp = supabase.table("rfef_competiciones").select("*").eq(
        "id", str(competicion_id)
    ).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    codcompeticion = comp.data.get("rfef_codcompeticion")
    codgrupo = comp.data.get("rfef_codgrupo")
    codtemporada = comp.data.get("rfef_codtemporada", "21")

    if not codcompeticion or not codgrupo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La competición no tiene parámetros RFAF configurados",
        )

    scraper = RFAFScraper()
    try:
        data = await scraper.sync_competicion(codcompeticion, codgrupo, codtemporada)
    except Exception as e:
        logger.error("Error syncing RFAF competition %s: %s", competicion_id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al conectar con la RFAF: {str(e)}",
        )
    finally:
        await scraper.close()

    # Only update if we got actual data
    update = {"ultima_sincronizacion": datetime.utcnow().isoformat()}
    if data.get("clasificacion"):
        update["clasificacion"] = data["clasificacion"]
    if data.get("goleadores") is not None:
        update["goleadores"] = data["goleadores"]
    if data.get("calendario"):
        update["calendario"] = data["calendario"]

    supabase.table("rfef_competiciones").update(update).eq(
        "id", str(competicion_id)
    ).execute()

    # Upsert jornada actual
    if data.get("jornada_actual") and data["jornada_actual"].get("partidos"):
        _upsert_jornada(supabase, str(competicion_id), data["jornada_actual"])

    return {
        "status": "ok",
        "equipos_clasificacion": len(data.get("clasificacion", [])),
        "goleadores": len(data.get("goleadores", [])),
        "jornada_actual": data.get("jornada_actual", {}).get("numero"),
        "sincronizado_en": update["ultima_sincronizacion"],
    }


@router.get("/competiciones/{competicion_id}/jornada-actual")
async def get_jornada_actual(
    competicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Devuelve la jornada más reciente con resultados."""
    supabase = get_supabase()

    response = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", str(competicion_id)
    ).order("numero", desc=True).limit(1).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay jornadas disponibles",
        )

    return response.data[0]


@router.get("/competiciones/{competicion_id}/proximo-rival")
async def get_proximo_rival(
    competicion_id: UUID,
    nombre_equipo: str = Query(..., description="Nombre del equipo del usuario"),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Busca el próximo partido del equipo del usuario en la competición."""
    supabase = get_supabase()

    comp = supabase.table("rfef_competiciones").select(
        "clasificacion, calendario"
    ).eq("id", str(competicion_id)).single().execute()

    if not comp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competición no encontrada",
        )

    # Buscar en las jornadas (más reciente primero para encontrar próximo partido)
    jornadas = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", str(competicion_id)
    ).order("numero").execute()

    nombre_lower = nombre_equipo.lower()

    for jornada in jornadas.data or []:
        for partido in jornada.get("partidos", []):
            local = (partido.get("local") or "").lower()
            visitante = (partido.get("visitante") or "").lower()

            is_my_team = nombre_lower in local or nombre_lower in visitante

            if is_my_team and partido.get("goles_local") is None:
                rival = partido.get("visitante") if nombre_lower in local else partido.get("local")
                localia = "local" if nombre_lower in local else "visitante"
                return {
                    "jornada": jornada.get("numero"),
                    "rival": rival,
                    "localia": localia,
                    "fecha": partido.get("fecha"),
                    "hora": partido.get("hora"),
                    "campo": partido.get("campo"),
                }

    return {"rival": None, "mensaje": "No se encontró próximo partido"}
