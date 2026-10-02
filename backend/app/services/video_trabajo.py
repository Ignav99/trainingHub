"""Marca de que un partido ya se trabajó en vídeo, aunque el archivo se vuelva a cargar."""

import json

MODOS_TRABAJO = ("revision", "informe_rival")


def parse_trabajo_descripcion(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str) or not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def video_trabajo_marks(rows: list[dict]) -> list[dict]:
    """Una marca por partido. La guardada gana; una sesión local antigua cuenta como revisión."""
    marks: dict[str, dict] = {}
    for row in rows:
        partido_id = row.get("partido_id")
        if not partido_id:
            continue
        tipo = row.get("tipo")
        if tipo == "local_session":
            marks.setdefault(
                partido_id,
                {"partido_id": partido_id, "modo": "revision", "rival_visto": None},
            )
            continue
        if tipo != "trabajo_marca":
            continue
        parsed = parse_trabajo_descripcion(row.get("descripcion"))
        modo = parsed.get("modo") if parsed.get("modo") in MODOS_TRABAJO else "revision"
        rival = str(parsed.get("rival_visto") or "").strip() or None
        marks[partido_id] = {
            "partido_id": partido_id,
            "modo": modo,
            "rival_visto": rival if modo == "informe_rival" else None,
        }
    return list(marks.values())


def trabajo_descripcion(modo: str, rival_visto: str | None) -> str:
    payload = {"modo": modo}
    if modo == "informe_rival" and rival_visto:
        payload["rival_visto"] = rival_visto.strip()
    return json.dumps(payload, ensure_ascii=False)
