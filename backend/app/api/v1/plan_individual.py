"""Plan individualizado: observaciones del CT por área, mediciones, plan de trabajo y resolución."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_supabase
from app.models.plan_individual import (
    AreaPlan,
    CorteEnlace,
    EntradaCreate,
    EntradaUpdate,
    MedicionCreate,
    MedicionUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission
from app.services.plan_individual import clean_marcas, clean_plan, estado_tras_cambio

logger = logging.getLogger(__name__)
router = APIRouter()

# Solo el cuerpo técnico: el jugador tiene lectura de plantilla, pero no de estas notas.
_CT = Permission.JUGADOR_UPDATE

_MIGRACION = "Aplica la migración 20261106100000_plan_individual.sql en Supabase."


def _jugador_en_org(supabase, jugador_id: str, auth: AuthContext) -> dict:
    res = (
        supabase.table("jugadores")
        .select("id, equipo_id, equipos!inner(id, organizacion_id)")
        .eq("id", jugador_id)
        .limit(1)
        .execute()
    )
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    equipo = row.get("equipos") or {}
    if isinstance(equipo, list):
        equipo = equipo[0] if equipo else {}
    if not auth.organizacion_id or equipo.get("organizacion_id") != auth.organizacion_id:
        raise HTTPException(status_code=403, detail="El jugador no pertenece a tu organización")
    return row


def _entrada(supabase, entrada_id: str, auth: AuthContext) -> dict:
    res = supabase.table("plan_individual_entradas").select("*").eq("id", entrada_id).limit(1).execute()
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    _jugador_en_org(supabase, row["jugador_id"], auth)
    return row


def _medicion_payload(entrada_id: str, item: MedicionCreate, user_id: str | None) -> dict:
    return {
        "entrada_id": entrada_id,
        "fecha": item.fecha.isoformat(),
        "momento": item.momento.value,
        "metrica": " ".join(item.metrica.split()),
        "valor": item.valor,
        "total": item.total,
        "unidad": (item.unidad or "").strip() or None,
        "mejor": item.mejor.value,
        "notas": (item.notas or "").strip() or None,
        "creado_por": user_id,
    }


def _cortes_validos(supabase, corte_ids: list[str], auth: AuthContext) -> list[dict]:
    if not corte_ids:
        return []
    res = (
        supabase.table("biblioteca_cortes")
        .select("id, equipo_id, equipos!inner(organizacion_id)")
        .in_("id", corte_ids)
        .execute()
    )
    out = []
    for row in res.data or []:
        equipo = row.get("equipos") or {}
        if isinstance(equipo, list):
            equipo = equipo[0] if equipo else {}
        if equipo.get("organizacion_id") == auth.organizacion_id:
            out.append(row)
    if len(out) < len(set(corte_ids)):
        raise HTTPException(status_code=404, detail="Algún corte no está en la biblioteca del club")
    return out


def _enlazar_cortes(supabase, entrada: dict, corte_ids: list[str], auth: AuthContext, nota: str | None = None) -> None:
    unique = list(dict.fromkeys(corte_ids))
    if not unique:
        return
    _cortes_validos(supabase, unique, auth)
    supabase.table("plan_individual_cortes").upsert(
        [{"entrada_id": entrada["id"], "corte_id": cid, "nota": nota} for cid in unique],
        on_conflict="entrada_id,corte_id",
    ).execute()
    # El corte también aparece en los vídeos del jugador: es el mismo archivo, solo se enlaza.
    supabase.table("biblioteca_corte_jugadores").upsert(
        [{"corte_id": cid, "jugador_id": entrada["jugador_id"]} for cid in unique],
        on_conflict="corte_id,jugador_id",
    ).execute()


def _decorar(supabase, rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    ids = [row["id"] for row in rows]
    med = (
        supabase.table("plan_individual_mediciones")
        .select("*")
        .in_("entrada_id", ids)
        .order("fecha")
        .order("created_at")
        .execute()
    ).data or []
    links = (
        supabase.table("plan_individual_cortes")
        .select("entrada_id, corte_id, nota, created_at")
        .in_("entrada_id", ids)
        .order("created_at")
        .execute()
    ).data or []
    cortes: dict[str, dict] = {}
    corte_ids = list({link["corte_id"] for link in links})
    if corte_ids:
        found = (
            supabase.table("biblioteca_cortes")
            .select("id, titulo, url, partido_etiqueta, minuto_inicio, minuto_fin, fase, subfase, duration_ms")
            .in_("id", corte_ids)
            .execute()
        ).data or []
        cortes = {row["id"]: row for row in found}
    by_entrada_med: dict[str, list[dict]] = {}
    for item in med:
        by_entrada_med.setdefault(item["entrada_id"], []).append(item)
    by_entrada_cortes: dict[str, list[dict]] = {}
    for link in links:
        corte = cortes.get(link["corte_id"])
        if corte:
            by_entrada_cortes.setdefault(link["entrada_id"], []).append({**corte, "nota": link.get("nota")})
    return [
        {
            **row,
            "marcas": row.get("marcas") or [],
            "plan": row.get("plan") or {},
            "mediciones": by_entrada_med.get(row["id"], []),
            "cortes": by_entrada_cortes.get(row["id"], []),
        }
        for row in rows
    ]


@router.get("")
async def list_entradas(
    jugador_id: UUID,
    equipo_id: UUID,
    area: AreaPlan | None = None,
    auth: AuthContext = Depends(require_permission(_CT)),
):
    supabase = get_supabase()
    _jugador_en_org(supabase, str(jugador_id), auth)
    query = (
        supabase.table("plan_individual_entradas")
        .select("*")
        .eq("jugador_id", str(jugador_id))
        .order("fecha", desc=True)
        .order("created_at", desc=True)
    )
    if area:
        query = query.eq("area", area.value)
    try:
        rows = query.execute().data or []
    except Exception as err:
        logger.error("plan_individual list: %s", err)
        raise HTTPException(status_code=500, detail=f"No se pudo leer el plan individual. {_MIGRACION}") from err
    return {"data": _decorar(supabase, rows)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_entrada(data: EntradaCreate, auth: AuthContext = Depends(require_permission(_CT))):
    supabase = get_supabase()
    jugador = _jugador_en_org(supabase, str(data.jugador_id), auth)
    corte_ids = [str(cid) for cid in data.corte_ids]
    _cortes_validos(supabase, list(dict.fromkeys(corte_ids)), auth)
    payload = {
        "jugador_id": str(data.jugador_id),
        "equipo_id": jugador.get("equipo_id") or str(data.equipo_id),
        "area": data.area.value,
        "titulo": " ".join(data.titulo.split()),
        "fecha": data.fecha.isoformat(),
        "descripcion": (data.descripcion or "").strip() or None,
        "prioridad": data.prioridad.value,
        "estado": "abierta",
        "marcas": clean_marcas(data.marcas),
        "plan": clean_plan(data.plan),
        "revisar_el": data.revisar_el.isoformat() if data.revisar_el else None,
        "creado_por": auth.user_id,
    }
    if payload["plan"].get("ejercicios"):
        payload["estado"] = "en_trabajo"
    try:
        res = supabase.table("plan_individual_entradas").insert(payload).execute()
    except Exception as err:
        logger.error("plan_individual create: %s", err)
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la entrada. {_MIGRACION}") from err
    entrada = (res.data or [None])[0]
    if not entrada:
        raise HTTPException(status_code=400, detail="No se pudo guardar la entrada")
    if data.mediciones:
        supabase.table("plan_individual_mediciones").insert(
            [_medicion_payload(entrada["id"], item, auth.user_id) for item in data.mediciones]
        ).execute()
    _enlazar_cortes(supabase, entrada, corte_ids, auth)
    return _decorar(supabase, [entrada])[0]


@router.patch("/{entrada_id}")
async def update_entrada(
    entrada_id: UUID,
    data: EntradaUpdate,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    actual = _entrada(supabase, str(entrada_id), auth)
    fields = data.model_dump(exclude_unset=True)
    patch: dict = {}
    if "titulo" in fields and data.titulo:
        patch["titulo"] = " ".join(data.titulo.split())
    if "fecha" in fields and data.fecha:
        patch["fecha"] = data.fecha.isoformat()
    if "descripcion" in fields:
        patch["descripcion"] = (data.descripcion or "").strip() or None
    if "prioridad" in fields and data.prioridad:
        patch["prioridad"] = data.prioridad.value
    if "marcas" in fields:
        patch["marcas"] = clean_marcas(data.marcas)
    if "plan" in fields:
        patch["plan"] = clean_plan(data.plan)
    if data.limpiar_revision:
        patch["revisar_el"] = None
    elif "revisar_el" in fields:
        patch["revisar_el"] = data.revisar_el.isoformat() if data.revisar_el else None
    if data.limpiar_resolucion:
        patch.update({"resolucion_fecha": None, "resolucion_resultado": None, "resolucion_texto": None})
    else:
        if "resolucion_fecha" in fields:
            patch["resolucion_fecha"] = data.resolucion_fecha.isoformat() if data.resolucion_fecha else None
        if "resolucion_resultado" in fields:
            patch["resolucion_resultado"] = data.resolucion_resultado.value if data.resolucion_resultado else None
        if "resolucion_texto" in fields:
            patch["resolucion_texto"] = (data.resolucion_texto or "").strip() or None
    resolucion = patch["resolucion_fecha"] if "resolucion_fecha" in patch else actual.get("resolucion_fecha")
    pedido = data.estado.value if data.estado else None
    if pedido is None and "plan" in patch and patch["plan"].get("ejercicios") and actual.get("estado") == "abierta":
        pedido = "en_trabajo"
    patch["estado"] = estado_tras_cambio(actual.get("estado"), pedido, resolucion)
    res = supabase.table("plan_individual_entradas").update(patch).eq("id", str(entrada_id)).execute()
    row = (res.data or [actual])[0]
    return _decorar(supabase, [row])[0]


@router.delete("/{entrada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entrada(
    entrada_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    _entrada(supabase, str(entrada_id), auth)
    supabase.table("plan_individual_entradas").delete().eq("id", str(entrada_id)).execute()


@router.post("/{entrada_id}/mediciones", status_code=status.HTTP_201_CREATED)
async def add_medicion(
    entrada_id: UUID,
    data: MedicionCreate,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    entrada = _entrada(supabase, str(entrada_id), auth)
    supabase.table("plan_individual_mediciones").insert(
        _medicion_payload(entrada["id"], data, auth.user_id)
    ).execute()
    return _decorar(supabase, [entrada])[0]


def _medicion(supabase, medicion_id: str, auth: AuthContext) -> tuple[dict, dict]:
    res = supabase.table("plan_individual_mediciones").select("*").eq("id", medicion_id).limit(1).execute()
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Medición no encontrada")
    return row, _entrada(supabase, row["entrada_id"], auth)


@router.patch("/mediciones/{medicion_id}")
async def update_medicion(
    medicion_id: UUID,
    data: MedicionUpdate,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    _, entrada = _medicion(supabase, str(medicion_id), auth)
    fields = data.model_dump(exclude_unset=True)
    patch: dict = {}
    for key in ("valor", "total"):
        if key in fields:
            patch[key] = fields[key]
    if "fecha" in fields and data.fecha:
        patch["fecha"] = data.fecha.isoformat()
    if "momento" in fields and data.momento:
        patch["momento"] = data.momento.value
    if "mejor" in fields and data.mejor:
        patch["mejor"] = data.mejor.value
    if "metrica" in fields and data.metrica:
        patch["metrica"] = " ".join(data.metrica.split())
    for key in ("unidad", "notas"):
        if key in fields:
            patch[key] = (fields[key] or "").strip() or None
    if patch:
        supabase.table("plan_individual_mediciones").update(patch).eq("id", str(medicion_id)).execute()
    return _decorar(supabase, [entrada])[0]


@router.delete("/mediciones/{medicion_id}")
async def delete_medicion(
    medicion_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    _, entrada = _medicion(supabase, str(medicion_id), auth)
    supabase.table("plan_individual_mediciones").delete().eq("id", str(medicion_id)).execute()
    return _decorar(supabase, [entrada])[0]


@router.post("/{entrada_id}/cortes")
async def link_corte(
    entrada_id: UUID,
    data: CorteEnlace,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    entrada = _entrada(supabase, str(entrada_id), auth)
    _enlazar_cortes(supabase, entrada, [str(data.corte_id)], auth, (data.nota or "").strip() or None)
    return _decorar(supabase, [entrada])[0]


@router.delete("/{entrada_id}/cortes/{corte_id}")
async def unlink_corte(
    entrada_id: UUID,
    corte_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(_CT)),
):
    del equipo_id
    supabase = get_supabase()
    entrada = _entrada(supabase, str(entrada_id), auth)
    (
        supabase.table("plan_individual_cortes")
        .delete()
        .eq("entrada_id", entrada["id"])
        .eq("corte_id", str(corte_id))
        .execute()
    )
    return _decorar(supabase, [entrada])[0]
