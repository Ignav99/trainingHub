"""
TrainingHub Pro - Router de Convocatorias
Gestión de convocatorias y estadísticas de partido.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from uuid import UUID
import asyncio
import io

import logging
from typing import Optional, Tuple
from app.models import (
    ConvocatoriaCreate,
    ConvocatoriaUpdate,
    ConvocatoriaResponse,
    ConvocatoriaListResponse,
    RendimientoNotaUpsert,
    RendimientoNotaResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.load_calculation_service import recalculate_player_load

logger = logging.getLogger(__name__)

router = APIRouter()


def _recalc_jugador(supabase, jugador_id: str):
    """Background task: recalculate load for a single player."""
    try:
        jug = supabase.table("jugadores").select("equipo_id").eq(
            "id", jugador_id
        ).single().execute()
        if jug.data:
            recalculate_player_load(UUID(jugador_id), UUID(jug.data["equipo_id"]))
            logger.info("Auto-recalc load for player %s", jugador_id)
    except Exception as e:
        logger.error("Error in auto-recalc for %s: %s", jugador_id, e)


def _recompute_rendimiento_media(supabase, convocatoria_id: str) -> Tuple[Optional[float], int]:
    """Recalcula media y cuenta de notas; actualiza cache en convocatorias."""
    notes = supabase.table("rendimiento_notas").select("nota").eq(
        "convocatoria_id", convocatoria_id
    ).execute()
    vals = [float(n["nota"]) for n in (notes.data or []) if n.get("nota") is not None]
    media = round(sum(vals) / len(vals), 1) if vals else None
    count = len(vals)
    supabase.table("convocatorias").update({
        "rendimiento_media": media,
        "rendimiento_num_notas": count,
    }).eq("id", convocatoria_id).execute()
    return media, count


@router.get("/partido/{partido_id}", response_model=ConvocatoriaListResponse)
async def list_convocatorias_partido(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_READ)),
):
    """Lista convocatorias de un partido (incluye media y mi nota de rendimiento)."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal, foto_url, apodo)",
        count="exact"
    ).eq("partido_id", str(partido_id)).order("titular", desc=True).order("dorsal").execute()

    rows = response.data or []
    total = response.count or 0
    conv_ids = [c["id"] for c in rows]

    mi_notas: dict[str, float] = {}
    if conv_ids and auth.user_id:
        mine = supabase.table("rendimiento_notas").select(
            "convocatoria_id, nota"
        ).eq("evaluador_id", str(auth.user_id)).in_("convocatoria_id", conv_ids).execute()
        for n in (mine.data or []):
            mi_notas[n["convocatoria_id"]] = float(n["nota"])

    data = []
    for c in rows:
        payload = {**c, "mi_nota_rendimiento": mi_notas.get(c["id"])}
        data.append(ConvocatoriaResponse(**payload))

    return ConvocatoriaListResponse(
        data=data,
        total=total,
        page=1,
        limit=total or 1,
        pages=1,
    )


@router.get("/jugador/{jugador_id}")
async def list_convocatorias_jugador(
    jugador_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_READ)),
):
    """Historial de convocatorias de un jugador con estadísticas acumuladas."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, partidos(fecha, localia, competicion, goles_favor, goles_contra, resultado, rivales(nombre, nombre_corto))"
    ).eq("jugador_id", str(jugador_id)).order("created_at", desc=True).limit(limit).execute()

    # Calcular estadísticas acumuladas
    convocatorias = response.data or []
    medias = [
        float(c["rendimiento_media"])
        for c in convocatorias
        if c.get("rendimiento_media") is not None and (c.get("minutos_jugados") or 0) > 0
    ]
    minutos_con_nota = sum(
        (c.get("minutos_jugados") or 0)
        for c in convocatorias
        if c.get("rendimiento_media") is not None and (c.get("minutos_jugados") or 0) > 0
    )
    rendimiento_ponderado = None
    if minutos_con_nota > 0:
        rendimiento_ponderado = round(
            sum(
                float(c["rendimiento_media"]) * (c.get("minutos_jugados") or 0)
                for c in convocatorias
                if c.get("rendimiento_media") is not None and (c.get("minutos_jugados") or 0) > 0
            ) / minutos_con_nota,
            2,
        )
    stats = {
        "total_convocatorias": len(convocatorias),
        "titularidades": sum(1 for c in convocatorias if c.get("titular")),
        "minutos_totales": sum(c.get("minutos_jugados", 0) for c in convocatorias),
        "goles": sum(c.get("goles", 0) for c in convocatorias),
        "asistencias": sum(c.get("asistencias", 0) for c in convocatorias),
        "amarillas": sum(1 for c in convocatorias if c.get("tarjeta_amarilla")),
        "rojas": sum(1 for c in convocatorias if c.get("tarjeta_roja")),
        "rendimiento_medio": round(sum(medias) / len(medias), 2) if medias else None,
        "rendimiento_ponderado_minutos": rendimiento_ponderado,
        "partidos_con_nota": len(medias),
    }

    return {"data": convocatorias, "estadisticas": stats}


@router.get("/{convocatoria_id}", response_model=ConvocatoriaResponse)
async def get_convocatoria(
    convocatoria_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_READ)),
):
    """Obtiene una convocatoria por ID."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal, apodo)"
    ).eq("id", str(convocatoria_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Convocatoria no encontrada"
        )

    return ConvocatoriaResponse(**response.data)


@router.put("/{convocatoria_id}/rendimiento", response_model=RendimientoNotaResponse)
async def upsert_rendimiento_nota(
    convocatoria_id: UUID,
    body: RendimientoNotaUpsert,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_UPDATE)),
):
    """
    Upsert de la nota de rendimiento del CT autenticado (1-10).
    Recalcula la media colaborativa de la convocatoria.
    """
    supabase = get_supabase()
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    conv = supabase.table("convocatorias").select("id, minutos_jugados").eq(
        "id", str(convocatoria_id)
    ).limit(1).execute()
    if not conv.data:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")

    from datetime import datetime, timezone
    nota = round(float(body.nota), 1)
    now_iso = datetime.now(timezone.utc).isoformat()
    # Upsert by unique (convocatoria_id, evaluador_id)
    existing = supabase.table("rendimiento_notas").select("id").eq(
        "convocatoria_id", str(convocatoria_id)
    ).eq("evaluador_id", str(auth.user_id)).limit(1).execute()

    if existing.data:
        supabase.table("rendimiento_notas").update({
            "nota": nota,
            "updated_at": now_iso,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("rendimiento_notas").insert({
            "convocatoria_id": str(convocatoria_id),
            "evaluador_id": str(auth.user_id),
            "nota": nota,
        }).execute()

    media, count = _recompute_rendimiento_media(supabase, str(convocatoria_id))
    return RendimientoNotaResponse(
        convocatoria_id=convocatoria_id,
        nota=nota,
        rendimiento_media=media,
        rendimiento_num_notas=count,
        mi_nota=nota,
    )


@router.delete("/{convocatoria_id}/rendimiento", response_model=RendimientoNotaResponse)
async def delete_rendimiento_nota(
    convocatoria_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_UPDATE)),
):
    """Elimina la nota del CT autenticado y recalcula la media."""
    supabase = get_supabase()
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    supabase.table("rendimiento_notas").delete().eq(
        "convocatoria_id", str(convocatoria_id)
    ).eq("evaluador_id", str(auth.user_id)).execute()

    media, count = _recompute_rendimiento_media(supabase, str(convocatoria_id))
    return RendimientoNotaResponse(
        convocatoria_id=convocatoria_id,
        nota=0,
        rendimiento_media=media,
        rendimiento_num_notas=count,
        mi_nota=None,
    )


from app.services.medical_availability_service import can_convocar


def _assert_jugador_convocable(supabase, jugador_id: str):
    jug = (
        supabase.table("jugadores")
        .select("id, nombre, apellidos, estado, disponibilidad, es_convocable")
        .eq("id", jugador_id)
        .single()
        .execute()
    )
    if not jug.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jugador no encontrado")
    if not can_convocar(jug.data, permitir_grupo_adaptado=True):
        disp = jug.data.get("disponibilidad") or "?"
        estado = jug.data.get("estado") or "?"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Jugador no convocable (estado={estado}, disponibilidad={disp}). "
                "Debe estar en pleno o grupo adaptado."
            ),
        )
    return jug.data


@router.post("", response_model=ConvocatoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_convocatoria(
    convocatoria: ConvocatoriaCreate,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_CREATE)),
):
    """Crea una convocatoria."""
    supabase = get_supabase()

    data = convocatoria.model_dump(mode="json")
    data["partido_id"] = str(data["partido_id"])
    data["jugador_id"] = str(data["jugador_id"])
    _assert_jugador_convocable(supabase, data["jugador_id"])

    response = supabase.table("convocatorias").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear convocatoria"
        )

    return ConvocatoriaResponse(**response.data[0])


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_convocatorias_batch(
    convocatorias: list[ConvocatoriaCreate],
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_CREATE)),
):
    """Crea múltiples convocatorias a la vez (ej: toda la lista de un partido)."""
    supabase = get_supabase()

    if not convocatorias:
        return {"created": 0, "skipped": 0, "rejected": 0, "data": []}

    partido_id = str(convocatorias[0].partido_id)

    # Query existing convocatorias for this partido to avoid duplicate key errors
    existing = supabase.table("convocatorias").select("jugador_id").eq(
        "partido_id", partido_id
    ).execute()
    existing_ids = {row["jugador_id"] for row in (existing.data or [])}

    items = []
    skipped = 0
    rejected = 0
    for c in convocatorias:
        data = c.model_dump(mode="json")
        data["partido_id"] = str(data["partido_id"])
        data["jugador_id"] = str(data["jugador_id"])
        if data["jugador_id"] in existing_ids:
            skipped += 1
            continue
        try:
            _assert_jugador_convocable(supabase, data["jugador_id"])
        except HTTPException:
            rejected += 1
            continue
        items.append(data)

    if not items:
        return {"created": 0, "skipped": skipped, "rejected": rejected, "data": []}

    response = supabase.table("convocatorias").insert(items).execute()

    return {
        "created": len(response.data),
        "skipped": skipped,
        "rejected": rejected,
        "data": response.data,
    }


@router.put("/batch-update")
async def batch_update_convocatorias(
    updates: list[dict],
    bg: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_UPDATE)),
):
    """Actualiza múltiples convocatorias de una vez (stats de jugadores post-partido)."""
    supabase = get_supabase()

    allowed_fields = {"minutos_jugados", "goles", "asistencias", "tarjeta_amarilla", "tarjeta_roja"}
    results = []

    for item in updates:
        conv_id = item.get("id")
        if not conv_id:
            continue

        update_data = {k: v for k, v in item.items() if k in allowed_fields and v is not None}
        if not update_data:
            continue

        response = supabase.table("convocatorias").update(update_data).eq(
            "id", str(conv_id)
        ).execute()

        if response.data:
            results.append(response.data[0])

    # Trigger load recalculation in background for players with updated minutes
    for item in results:
        if item.get("minutos_jugados") and item.get("jugador_id"):
            bg.add_task(_recalc_jugador, supabase, item["jugador_id"])

    return {"updated": len(results), "data": results}


@router.put("/{convocatoria_id}", response_model=ConvocatoriaResponse)
async def update_convocatoria(
    convocatoria_id: UUID,
    convocatoria: ConvocatoriaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_UPDATE)),
):
    """Actualiza una convocatoria (ej: registrar estadísticas post-partido)."""
    supabase = get_supabase()

    existing = supabase.table("convocatorias").select("id").eq(
        "id", str(convocatoria_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Convocatoria no encontrada"
        )

    update_data = convocatoria.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("convocatorias").update(update_data).eq(
        "id", str(convocatoria_id)
    ).execute()

    return ConvocatoriaResponse(**response.data[0])


@router.delete("/{convocatoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_convocatoria(
    convocatoria_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.CONVOCATORIA_CREATE)),
):
    """Elimina una convocatoria."""
    supabase = get_supabase()

    supabase.table("convocatorias").delete().eq(
        "id", str(convocatoria_id)
    ).execute()

    return None


@router.get("/partido/{partido_id}/pdf")
async def generate_convocatoria_pdf(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Genera un PDF de la convocatoria del partido."""
    from app.services.pdf_service import generate_convocatoria_pdf as gen_pdf

    supabase = get_supabase()

    # Obtener partido con rival y equipo
    partido_resp = supabase.table("partidos").select(
        "*, rivales(*), equipos(*, organizaciones(*))"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_resp.data:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    partido = partido_resp.data
    rival = partido.pop("rivales", {}) or {}
    equipo = partido.pop("equipos", {}) or {}
    organizacion = equipo.pop("organizaciones", {}) or {}

    # Obtener convocatoria con jugadores
    conv_resp = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal, apodo)"
    ).eq("partido_id", str(partido_id)).order("titular", desc=True).execute()

    pdf_bytes = await gen_pdf(
        partido=partido,
        rival=rival,
        convocatoria=conv_resp.data or [],
        organizacion=organizacion,
        equipo_nombre=equipo.get("nombre", ""),
        equipo_categoria=equipo.get("categoria", ""),
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="convocatoria_{partido_id}.pdf"'
        },
    )
