"""Slide-deck outline for player-facing presentations.

AI returns this JSON. If the model is down, a deterministic fallback still
produces a short deck from the briefing.
"""

from __future__ import annotations

import json
import re
from typing import Any

MAX_SLIDES = 8
MAX_BULLETS = 4
MAX_KEYWORDS = 6
MAX_TITLE = 48
MAX_BULLET = 78
MAX_KEYWORD = 22

ALLOWED_LAYOUTS = {"portada", "claves", "bullets"}

SYNTHESIZE_PRESENTACION_PROMPT = """Eres analista de un club de fútbol. Tienes el informe rival o el plan de partido del staff.
Tu trabajo es una CHARLA DE VESTUARIO para jugadores, no un dossier para el cuerpo técnico.

Reglas:
- Máximo 8 diapositivas, incluida la portada.
- Pocas palabras. Palabras clave. Una idea por slide.
- Cada viñeta: máximo 12 palabras. Sin jerga de analista.
- Orden fijo: portada → claves → cómo juegan / qué hacemos → ataque → defensa → transiciones → ABP → cierre.
- Omite fases vacías. No inventes datos que no estén en el briefing.
- Tono directo, en español de campo: "ellos", "nosotros", "hoy".

Devuelve SOLO JSON válido (sin markdown) con esta forma:
{
  "titulo": "string corto",
  "subtitulo": "string corto",
  "slides": [
    {
      "layout": "portada" | "claves" | "bullets",
      "kicker": "string corto (fase o etiqueta)",
      "title": "string",
      "bullets": ["..."],
      "keywords": ["palabra", "..."]
    }
  ]
}
"""


def _clip(text: Any, n: int) -> str:
    raw = " ".join(str(text or "").split())
    if len(raw) <= n:
        return raw
    return raw[: n - 1].rstrip() + "…"


def _clean_list(values: Any, limit: int, size: int) -> list[str]:
    if not isinstance(values, list):
        return []
    out: list[str] = []
    for item in values:
        t = _clip(item, size)
        if t and t not in out:
            out.append(t)
        if len(out) >= limit:
            break
    return out


def normalize_deck(raw: Any, briefing: dict[str, Any] | None = None) -> dict[str, Any]:
    briefing = briefing or {}
    data = raw if isinstance(raw, dict) else {}
    tipo = briefing.get("tipo") or "informe"
    rival = briefing.get("rival") or "Rival"
    club = briefing.get("club") or ""
    default_title = f"vs {rival}" if tipo == "informe" else f"Plan vs {rival}"
    slides_in = data.get("slides") if isinstance(data.get("slides"), list) else []
    slides: list[dict[str, Any]] = []

    def add(slide: dict[str, Any]) -> None:
        if len(slides) >= MAX_SLIDES:
            return
        layout = slide.get("layout") if slide.get("layout") in ALLOWED_LAYOUTS else "bullets"
        title = _clip(slide.get("title"), MAX_TITLE)
        kicker = _clip(slide.get("kicker"), 28)
        bullets = _clean_list(slide.get("bullets"), MAX_BULLETS, MAX_BULLET)
        keywords = _clean_list(slide.get("keywords"), MAX_KEYWORDS, MAX_KEYWORD)
        if layout == "portada":
            slides.append({
                "layout": "portada",
                "kicker": kicker or (club or "Charla de partido"),
                "title": title or default_title,
                "bullets": bullets[:2],
                "keywords": [],
            })
            return
        if layout == "claves":
            if not keywords and not bullets:
                return
            slides.append({
                "layout": "claves",
                "kicker": kicker or "Claves",
                "title": title or "Lo que importa hoy",
                "bullets": [],
                "keywords": keywords or _clean_list(bullets, MAX_KEYWORDS, MAX_KEYWORD),
            })
            return
        if not title and not bullets:
            return
        slides.append({
            "layout": "bullets",
            "kicker": kicker,
            "title": title or kicker or "Clave",
            "bullets": bullets,
            "keywords": keywords[:3],
        })

    if not any(isinstance(s, dict) and s.get("layout") == "portada" for s in slides_in):
        add({
            "layout": "portada",
            "kicker": data.get("subtitulo") or club,
            "title": data.get("titulo") or default_title,
            "bullets": [
                briefing.get("fecha") or "",
                " · ".join(x for x in [briefing.get("localia"), briefing.get("tramo")] if x),
            ],
        })

    for item in slides_in:
        if isinstance(item, dict):
            add(item)

    if not slides:
        add({
            "layout": "portada",
            "kicker": club or "Charla de partido",
            "title": default_title,
            "bullets": [],
        })

    return {
        "titulo": _clip(data.get("titulo") or default_title, MAX_TITLE),
        "subtitulo": _clip(data.get("subtitulo") or rival, 60),
        "slides": slides[:MAX_SLIDES],
    }


def parse_deck_json(text: str, briefing: dict[str, Any] | None = None) -> dict[str, Any]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.S)
        if not match:
            return fallback_deck(briefing or {})
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return fallback_deck(briefing or {})
    return normalize_deck(parsed, briefing)


def _fase_bullets(block: Any) -> list[str]:
    if not isinstance(block, dict):
        return []
    out: list[str] = []
    for key in ("fortalezas", "debilidades"):
        tags = block.get(key) or []
        if tags:
            label = "Ellos" if key == "fortalezas" else "Atacar"
            out.append(f"{label}: {', '.join(tags[:3])}")
    if block.get("idea"):
        out.append(str(block["idea"]))
    for key in ("formacion", "espacios", "repliegue", "abp_comentarios"):
        if block.get(key):
            out.append(str(block[key]))
    sub = block.get("subfases") or {}
    if isinstance(sub, dict):
        for name, nota in list(sub.items())[:3]:
            out.append(f"{name}: {nota}")
    for item in block.get("abp") or []:
        out.append(str(item))
    return _clean_list(out, MAX_BULLETS, MAX_BULLET)


def fallback_deck(briefing: dict[str, Any]) -> dict[str, Any]:
    tipo = briefing.get("tipo") or "informe"
    rival = briefing.get("rival") or "Rival"
    club = briefing.get("club") or ""
    fases = briefing.get("fases") if isinstance(briefing.get("fases"), dict) else {}
    keywords = []
    for src in (briefing.get("fortalezas"), briefing.get("debilidades"), briefing.get("consignas")):
        for tag in src or []:
            if tag not in keywords:
                keywords.append(tag)
            if len(keywords) >= MAX_KEYWORDS:
                break
    if not keywords:
        keywords = [k for k in fases.keys()][:MAX_KEYWORDS]

    slides: list[dict[str, Any]] = [
        {
            "layout": "portada",
            "kicker": club or ("Informe rival" if tipo == "informe" else "Plan de partido"),
            "title": f"vs {rival}" if tipo == "informe" else f"Plan vs {rival}",
            "bullets": [x for x in [briefing.get("fecha"), briefing.get("tramo"), briefing.get("localia")] if x],
            "keywords": [],
        }
    ]
    if keywords:
        slides.append({
            "layout": "claves",
            "kicker": "Claves",
            "title": "Lo que importa hoy",
            "bullets": [],
            "keywords": keywords[:MAX_KEYWORDS],
        })

    order = [
        "Ataque organizado",
        "Defensa organizada",
        "Transición ofensiva",
        "Transición defensiva",
        "ABP ofensiva",
        "ABP defensiva",
    ]
    for label in order:
        bullets = _fase_bullets(fases.get(label))
        if not bullets:
            continue
        slides.append({
            "layout": "bullets",
            "kicker": label,
            "title": label,
            "bullets": bullets,
            "keywords": [],
        })
        if len(slides) >= MAX_SLIDES - 1:
            break

    if briefing.get("once"):
        slides.append({
            "layout": "bullets",
            "kicker": briefing.get("sistema") or "Once",
            "title": "Once probable",
            "bullets": briefing["once"][:MAX_BULLETS],
            "keywords": [],
        })
    if briefing.get("anotaciones"):
        slides.append({
            "layout": "bullets",
            "kicker": "Cierre",
            "title": "Lo que pedimos",
            "bullets": [briefing["anotaciones"]],
            "keywords": [],
        })

    return {
        "titulo": _clip(f"vs {rival}" if tipo == "informe" else f"Plan vs {rival}", MAX_TITLE),
        "subtitulo": _clip(club, 60),
        "slides": slides[:MAX_SLIDES],
    }
