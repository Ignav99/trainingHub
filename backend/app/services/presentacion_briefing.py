"""Compact a rival report or match plan into a text briefing for the deck AI."""

from __future__ import annotations

from typing import Any

FASE_LABELS = {
    "ataque_organizado": "Ataque organizado",
    "defensa_organizada": "Defensa organizada",
    "transicion_ofensiva": "Transición ofensiva",
    "transicion_defensiva": "Transición defensiva",
    "abp_ofensiva": "ABP ofensiva",
    "abp_defensiva": "ABP defensiva",
}

SUBFASE_LABELS = {
    "creacion": "Creación",
    "progresion": "Progresión",
    "finalizacion": "Finalización",
    "bloque_alto": "Bloque alto",
    "bloque_medio": "Bloque medio",
    "bloque_bajo": "Bloque bajo",
}

_MAX_CHARS = 7000


def _clip(text: Any, n: int = 280) -> str:
    raw = " ".join(str(text or "").split())
    if len(raw) <= n:
        return raw
    return raw[: n - 1].rstrip() + "…"


def _tags(values: Any, limit: int = 8) -> list[str]:
    if not isinstance(values, list):
        return []
    out: list[str] = []
    for item in values:
        t = _clip(item, 40)
        if t and t not in out:
            out.append(t)
        if len(out) >= limit:
            break
    return out


def _collect_phase_informe(fase: dict) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key in ("fortalezas", "debilidades"):
        tags = _tags(fase.get(key))
        if tags:
            payload[key] = tags
    for key in ("formacion", "espacios", "vigilancias", "repliegue", "abp_comentarios", "abp_defensa"):
        val = _clip(fase.get(key), 220)
        if val:
            payload[key] = val
    subfases = fase.get("subfases") or {}
    if isinstance(subfases, dict):
        notes = {}
        for key, sub in subfases.items():
            if not isinstance(sub, dict):
                continue
            nota = _clip(sub.get("notas"), 220)
            if nota:
                notes[SUBFASE_LABELS.get(key, key)] = nota
        if notes:
            payload["subfases"] = notes
    return payload


def _collect_phase_plan(fase: dict) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    texto = _clip(fase.get("texto") or fase.get("sistema"), 240)
    if texto:
        payload["idea"] = texto
    subfases = fase.get("subfases") or {}
    if isinstance(subfases, dict):
        notes = {}
        for key, sub in subfases.items():
            if not isinstance(sub, dict):
                continue
            bits = [sub.get("sistema"), sub.get("notas")]
            nota = _clip(" · ".join(b for b in bits if b), 220)
            if nota:
                notes[SUBFASE_LABELS.get(key, key)] = nota
        if notes:
            payload["subfases"] = notes
    abp = fase.get("jugadas_abp") or []
    if isinstance(abp, list) and abp:
        payload["abp"] = [
            _clip(item.get("comentario") or item.get("jugada_id"), 120)
            for item in abp[:4]
            if isinstance(item, dict)
        ]
    return payload


def briefing_from_informe(data: dict | None, meta: dict | None = None) -> dict[str, Any]:
    data = data or {}
    meta = meta or {}
    estrategia = data.get("estrategia") or {}
    once = (estrategia.get("once_probable") or {}) if isinstance(estrategia, dict) else {}
    jugadores = []
    for j in (once.get("jugadores") or [])[:11]:
        if isinstance(j, dict) and j.get("nombre"):
            jugadores.append(_clip(j.get("nombre"), 28))
    fases = {}
    for fase in data.get("fases") or []:
        if not isinstance(fase, dict):
            continue
        key = fase.get("fase")
        if not key:
            continue
        collected = _collect_phase_informe(fase)
        if collected:
            label = FASE_LABELS.get(str(key), str(key))
            fases[label] = collected
    return {
        "tipo": "informe",
        "rival": meta.get("rival_nombre") or "",
        "club": meta.get("club_nombre") or "",
        "fecha": meta.get("fecha") or "",
        "localia": meta.get("localia") or "",
        "sistema": _clip(data.get("sistema") or (estrategia.get("sistema") if isinstance(estrategia, dict) else ""), 40),
        "fortalezas": _tags(data.get("fortalezas")),
        "debilidades": _tags(data.get("debilidades")),
        "anotaciones": _clip(data.get("anotaciones") or (estrategia.get("notas") if isinstance(estrategia, dict) else ""), 320),
        "once": jugadores,
        "fases": fases,
    }


def briefing_from_plan(data: dict | None, meta: dict | None = None) -> dict[str, Any]:
    data = data or {}
    meta = meta or {}
    fases = {}
    for fase in data.get("fases") or []:
        if not isinstance(fase, dict):
            continue
        key = fase.get("fase")
        if not key:
            continue
        collected = _collect_phase_plan(fase)
        if collected:
            fases[FASE_LABELS.get(str(key), str(key))] = collected
    legacy = {}
    for key, label in FASE_LABELS.items():
        val = _clip(data.get(key), 220)
        if val:
            legacy[label] = val
    nutricion = data.get("nutricion_partido") or {}
    items = []
    if isinstance(nutricion, dict):
        for it in nutricion.get("items") or []:
            if isinstance(it, dict) and it.get("nombre"):
                items.append(_clip(it.get("nombre"), 40))
    return {
        "tipo": "plan",
        "rival": meta.get("rival_nombre") or "",
        "club": meta.get("club_nombre") or "",
        "fecha": meta.get("fecha") or "",
        "hora": meta.get("hora") or "",
        "localia": meta.get("localia") or "",
        "tramo": meta.get("tramo") or "",
        "campo": meta.get("campo") or "",
        "consignas": _tags(data.get("consignas_clave")),
        "fases": fases or legacy,
        "nutricion": items,
    }


def briefing_to_prompt(briefing: dict[str, Any]) -> str:
    import json

    text = json.dumps(briefing, ensure_ascii=False, indent=2)
    if len(text) > _MAX_CHARS:
        return text[:_MAX_CHARS] + "\n…"
    return text
