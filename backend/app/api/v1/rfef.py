"""
TrainingHub Pro - Router de RFEF
Gestión de competiciones y jornadas RFEF con scraping automático.
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
    """Elimina una competición y sus jornadas."""
    supabase = get_supabase()
    supabase.table("rfef_competiciones").delete().eq(
        "id", str(competicion_id)
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
    """Sync completo: descarga TODAS las jornadas y las guarda, luego auto-link si mi_equipo está puesto."""
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
        data = await scraper.sync_competicion_full(codcompeticion, codgrupo, codtemporada)
    except Exception as e:
        logger.error("Error in full sync for competition %s: %s", competicion_id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al conectar con la RFAF: {str(e)}",
        )
    finally:
        await scraper.close()

    # Update competition data
    update = {
        "clasificacion": data.get("clasificacion", []),
        "goleadores": data.get("goleadores", []),
        "ultima_sincronizacion": datetime.utcnow().isoformat(),
    }
    if data.get("calendario"):
        update["calendario"] = data["calendario"]

    supabase.table("rfef_competiciones").update(update).eq(
        "id", str(competicion_id)
    ).execute()

    # Upsert ALL jornadas
    jornadas_saved = 0
    for jornada in data.get("jornadas", []):
        existing = supabase.table("rfef_jornadas").select("id").eq(
            "competicion_id", str(competicion_id)
        ).eq("numero", jornada["numero"]).execute()

        jornada_data = {
            "competicion_id": str(competicion_id),
            "numero": jornada["numero"],
            "partidos": jornada["partidos"],
        }

        if existing.data:
            supabase.table("rfef_jornadas").update({
                "partidos": jornada["partidos"],
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("rfef_jornadas").insert(jornada_data).execute()
        jornadas_saved += 1

    # Auto-link if mi_equipo is set
    link_result = None
    if comp.data.get("mi_equipo_nombre"):
        link_result = link_competition(supabase, comp.data)

    return {
        "status": "ok",
        "equipos_clasificacion": len(data.get("clasificacion", [])),
        "goleadores": len(data.get("goleadores", [])),
        "jornadas_saved": jornadas_saved,
        "link_result": link_result,
        "sincronizado_en": update["ultima_sincronizacion"],
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

    update = {
        "clasificacion": data.get("clasificacion", []),
        "goleadores": data.get("goleadores", []),
        "ultima_sincronizacion": datetime.utcnow().isoformat(),
    }
    if data.get("calendario"):
        update["calendario"] = data["calendario"]

    supabase.table("rfef_competiciones").update(update).eq(
        "id", str(competicion_id)
    ).execute()

    # Upsert jornada actual
    if data.get("jornada_actual"):
        jornada = data["jornada_actual"]
        existing = supabase.table("rfef_jornadas").select("id").eq(
            "competicion_id", str(competicion_id)
        ).eq("numero", jornada["numero"]).execute()

        if existing.data:
            supabase.table("rfef_jornadas").update({
                "partidos": jornada["partidos"],
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("rfef_jornadas").insert({
                "competicion_id": str(competicion_id),
                "numero": jornada["numero"],
                "partidos": jornada["partidos"],
            }).execute()

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
