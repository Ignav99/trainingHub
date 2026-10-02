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

PLAN_SUBFASE_LABELS = {
    **SUBFASE_LABELS,
    "bloque_medio": "Bloque Mixto",
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


def _subfase_line(sub: dict, *, include_sistema: bool) -> str:
    parts: list[str] = []
    if include_sistema and sub.get("sistema"):
        parts.append(_clip(sub.get("sistema"), 80))
    nota = _clip(sub.get("notas"), 220)
    if nota:
        parts.append(nota)
    forts = _tags(sub.get("fortalezas"), 4)
    debs = _tags(sub.get("debilidades"), 4)
    if forts:
        parts.append("Fortalezas: " + ", ".join(forts))
    if debs:
        parts.append("Debilidades: " + ", ".join(debs))
    return _clip(" · ".join(parts), 280)


def _collect_phase_informe(fase: dict) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    general = _clip(fase.get("comentario_general"), 220)
    if general:
        payload["comentario_general"] = general
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
            line = _subfase_line(sub, include_sistema=False)
            if line:
                notes[SUBFASE_LABELS.get(key, key)] = line
        if notes:
            payload["subfases"] = notes
    return payload


def _collect_phase_plan(fase: dict) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    general = _clip(fase.get("comentario_general"), 220)
    if general:
        payload["comentario_general"] = general
    texto = _clip(fase.get("texto") or fase.get("sistema"), 240)
    if texto:
        payload["idea"] = texto
    subfases = fase.get("subfases") or {}
    if isinstance(subfases, dict):
        notes = {}
        for key, sub in subfases.items():
            if not isinstance(sub, dict):
                continue
            line = _subfase_line(sub, include_sistema=True)
            if line:
                notes[PLAN_SUBFASE_LABELS.get(key, key)] = line
        if notes:
            payload["subfases"] = notes
    abp = fase.get("jugadas_abp") or []
    if isinstance(abp, list) and abp:
        comments = [
            _clip(item.get("comentario"), 120)
            for item in abp[:4]
            if isinstance(item, dict)
        ]
        comments = [line for line in comments if line]
        if comments:
            payload["abp"] = comments
    estructuras = []
    for item in fase.get("estructuras_rival") or []:
        if not isinstance(item, dict):
            continue
        titulo = _clip(item.get("titulo") or "Estructura defensiva", 48)
        nota = _clip(item.get("notas"), 180)
        if nota:
            estructuras.append(f"{titulo}: {nota}")
        elif titulo:
            estructuras.append(titulo)
        if len(estructuras) >= 6:
            break
    if estructuras:
        payload["estructura_rival"] = estructuras
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
        "campo": _clip(estrategia.get("dimensiones_campo") if isinstance(estrategia, dict) else "", 40),
        "actitud": _clip(estrategia.get("actitud_estilo") if isinstance(estrategia, dict) else "", 80),
        "once": jugadores,
        "fases": fases,
    }


def _optional_on(flag: Any, has_content: bool) -> bool:
    if isinstance(flag, bool):
        return flag
    return has_content


def _nutricion_lineas(nutricion: Any) -> list[str]:
    if not isinstance(nutricion, dict):
        return []
    out: list[str] = []
    for key in ("argumento_suplementacion", "comida_recomendada", "notas", "clima_estimacion"):
        line = _clip(nutricion.get(key), 220)
        if line:
            out.append(line)
    tags = _tags(nutricion.get("etiquetas"), 8)
    if tags:
        out.append(", ".join(tags))
    for item in nutricion.get("items") or []:
        if isinstance(item, dict) and item.get("nombre"):
            out.append(_clip(item.get("nombre"), 40))
    return out


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
        if str(key) == "abp_defensiva" and not _optional_on(data.get("incluir_abp_defensiva"), bool(collected)):
            continue
        if collected:
            fases[FASE_LABELS.get(str(key), str(key))] = collected
    legacy = {}
    for key, label in FASE_LABELS.items():
        val = _clip(data.get(key), 220)
        if key == "abp_defensiva" and not _optional_on(data.get("incluir_abp_defensiva"), bool(val)):
            continue
        if val:
            legacy[label] = val
    lineas = _nutricion_lineas(data.get("nutricion_partido"))
    nutricion = lineas if _optional_on(data.get("incluir_nutricion"), bool(lineas)) else []
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
        "nutricion": nutricion,
    }


def briefing_to_prompt(briefing: dict[str, Any]) -> str:
    import json

    text = json.dumps(briefing, ensure_ascii=False, indent=2)
    if len(text) > _MAX_CHARS:
        return text[:_MAX_CHARS] + "\n…"
    return text
