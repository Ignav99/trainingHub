"""Especificación de un informe: asunto, profundidad, secciones y lenguaje natural."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from datetime import date, timedelta
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.services.partido_ambito import AMBITO_COMPETICION, normalize_ambito

logger = logging.getLogger(__name__)

ASUNTOS = {
    "temporada": "Temporada",
    "plantilla": "Plantilla",
    "jugador": "Jugador",
    "microciclo": "Microciclo",
    "resultados": "Resultados",
}

PROFUNIDADES = {
    "breve": "Breve",
    "estandar": "Estándar",
    "extendido": "Extendido",
}

AUDIENCIAS = {
    "cuerpo_tecnico": "Cuerpo técnico",
    "metodologia": "Jefe de metodología",
    "direccion": "Dirección deportiva",
    "staff": "Staff del club",
}

SECCIONES = {
    "resumen": "Cifras del equipo",
    "resultados": "Resultados",
    "plantilla": "Minutos y aportación",
    "disciplina": "Tarjetas",
    "jugador": "Ficha individual",
    "microciclo": "Semana de entrenamiento",
    "narrativa": "Lectura del periodo",
}

DEFAULT_SECCIONES = {
    "temporada": ["resumen", "resultados", "plantilla", "narrativa"],
    "plantilla": ["resumen", "plantilla", "disciplina", "narrativa"],
    "jugador": ["resumen", "jugador", "narrativa"],
    "microciclo": ["microciclo", "narrativa"],
    "resultados": ["resumen", "resultados", "narrativa"],
}

LIMITE_FILAS = {"breve": 8, "estandar": 24, "extendido": 200}


class InformeSpec(BaseModel):
    asunto: str = "temporada"
    profundidad: str = "estandar"
    audiencia: str = "cuerpo_tecnico"
    ambito: str = AMBITO_COMPETICION
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    jugador_id: Optional[str] = None
    microciclo_id: Optional[str] = None
    secciones: list[str] = Field(default_factory=lambda: list(DEFAULT_SECCIONES["temporada"]))
    ultimos_n: Optional[int] = None
    titulo: Optional[str] = None
    prompt: Optional[str] = None
    notas: Optional[str] = None

    @field_validator(
        "fecha_desde",
        "fecha_hasta",
        "jugador_id",
        "microciclo_id",
        "titulo",
        "prompt",
        "notas",
        "ultimos_n",
        mode="before",
    )
    @classmethod
    def _blank_to_none(cls, v):
        if v == "" or v is False:
            return None
        return v

    def normalized(self) -> "InformeSpec":
        asunto = self.asunto if self.asunto in ASUNTOS else "temporada"
        profundidad = self.profundidad if self.profundidad in PROFUNIDADES else "estandar"
        audiencia = self.audiencia if self.audiencia in AUDIENCIAS else "cuerpo_tecnico"
        secciones = [s for s in (self.secciones or []) if s in SECCIONES]
        if not secciones:
            secciones = list(DEFAULT_SECCIONES[asunto])
        if asunto == "jugador" and "jugador" not in secciones:
            secciones = ["jugador"] + secciones
        if asunto == "microciclo" and "microciclo" not in secciones:
            secciones = ["microciclo"] + secciones
        return self.model_copy(
            update={
                "asunto": asunto,
                "profundidad": profundidad,
                "audiencia": audiencia,
                "ambito": normalize_ambito(self.ambito),
                "secciones": secciones,
            }
        )


def limite_filas(profundidad: str) -> int:
    return LIMITE_FILAS.get(profundidad, LIMITE_FILAS["estandar"])


def catalogo() -> dict[str, Any]:
    return {
        "asuntos": [{"id": k, "nombre": v} for k, v in ASUNTOS.items()],
        "profundidades": [{"id": k, "nombre": v} for k, v in PROFUNIDADES.items()],
        "audiencias": [{"id": k, "nombre": v} for k, v in AUDIENCIAS.items()],
        "secciones": [{"id": k, "nombre": v} for k, v in SECCIONES.items()],
        "defaults": DEFAULT_SECCIONES,
    }


def spec_from_tipo(
    tipo: str,
    *,
    ambito: str = AMBITO_COMPETICION,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    jugador_id: Optional[str] = None,
    microciclo_id: Optional[str] = None,
    profundidad: str = "estandar",
) -> InformeSpec:
    asunto = tipo if tipo in ASUNTOS else "temporada"
    return InformeSpec(
        asunto=asunto,
        profundidad=profundidad,
        ambito=ambito,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        jugador_id=jugador_id,
        microciclo_id=microciclo_id,
        secciones=list(DEFAULT_SECCIONES[asunto]),
    ).normalized()


def _fold(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def parse_informe_prompt(
    texto: str,
    *,
    jugadores: Optional[list[dict]] = None,
    microciclos: Optional[list[dict]] = None,
) -> InformeSpec:
    raw = (texto or "").strip()
    folded = _fold(raw)
    spec = InformeSpec(prompt=raw or None)

    if any(w in folded for w in ("metodolog", "jefe de metodo")):
        spec.audiencia = "metodologia"
    elif any(w in folded for w in ("direccion", "directiva", "comite", "presidente", "gerencia")):
        spec.audiencia = "direccion"
    elif "staff" in folded:
        spec.audiencia = "staff"

    if any(w in folded for w in ("extendid", "detallad", "completo", "en profundidad", "largo", "a fondo")):
        spec.profundidad = "extendido"
    elif any(w in folded for w in ("breve", "resumen", "corto", "una pagina", "1 pagina", "flash", "una hoja")):
        spec.profundidad = "breve"

    if any(w in folded for w in ("amistoso", "friendly")):
        spec.ambito = "amistosos" if "solo" in folded or "unicamente" in folded else "todos"
        if "sin amistoso" in folded or "no amistoso" in folded or "oficial" in folded:
            spec.ambito = "competicion"
    if any(w in folded for w in ("competicion", "oficial", "liga y copa", "solo liga")):
        spec.ambito = "competicion"
    if any(w in folded for w in ("conjunta", "conjunto", "todo incluido", "todos los partidos")):
        spec.ambito = "todos"

    if any(w in folded for w in ("microciclo", "la semana", "esta semana", "morfociclo")):
        spec.asunto = "microciclo"
    elif any(w in folded for w in ("ficha", "jugador", "individual")):
        spec.asunto = "jugador"
    elif "plantilla" in folded or "minutos de todos" in folded:
        spec.asunto = "plantilla"
    elif "resultado" in folded or "clasificacion" in folded:
        spec.asunto = "resultados"
    elif any(w in folded for w in ("temporada", "estadistica", "dashboard")):
        spec.asunto = "temporada"

    m_n = re.search(
        r"ultim[oa]s?\s+(\d{1,2})(?:\s+partidos|\s+oficiales|\s+encuentros)?",
        folded,
    )
    if m_n:
        after = folded[m_n.end() : m_n.end() + 8]
        if "dia" not in after:
            spec.ultimos_n = max(1, min(int(m_n.group(1)), 40))
            if spec.asunto == "temporada":
                spec.asunto = "resultados"

    if "ultimo mes" in folded or "ultimos 30 dias" in folded:
        spec.fecha_desde = date.today() - timedelta(days=30)
    m_desde = re.search(r"desde\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", folded)
    if m_desde:
        y = int(m_desde.group(3))
        if y < 100:
            y += 2000
        try:
            spec.fecha_desde = date(y, int(m_desde.group(2)), int(m_desde.group(1)))
        except ValueError:
            pass

    secciones: list[str] = []
    if any(w in folded for w in ("minuto", "aportacion", "titular")):
        secciones.append("plantilla")
    if any(w in folded for w in ("tarjeta", "disciplina", "amarilla")):
        secciones.append("disciplina")
    if any(w in folded for w in ("resultado", "marcador")):
        secciones.append("resultados")
    if "cifra" in folded or "kpi" in folded:
        secciones.append("resumen")
    if spec.asunto == "jugador":
        secciones.append("jugador")
    if spec.asunto == "microciclo":
        secciones.append("microciclo")
    if "sin lectura" not in folded and "sin narrativa" not in folded:
        secciones.append("narrativa")
        secciones.append("resumen")
    spec.secciones = secciones or list(DEFAULT_SECCIONES[spec.asunto])

    if jugadores and spec.asunto == "jugador":
        spec.jugador_id = _match_persona(folded, jugadores)
    if microciclos and spec.asunto == "microciclo" and microciclos:
        spec.microciclo_id = str(microciclos[0].get("id") or "") or None

    spec.titulo = _titulo_sugerido(spec)
    return spec.normalized()


def _match_persona(folded: str, jugadores: list[dict]) -> Optional[str]:
    best_id = None
    best_len = 0
    for j in jugadores:
        nombre = _fold(f"{j.get('nombre', '')} {j.get('apellidos', '')} {j.get('apodo') or ''}")
        tokens = [t for t in nombre.split() if len(t) > 2]
        for token in tokens:
            if token in folded and len(token) > best_len:
                best_id = str(j.get("id"))
                best_len = len(token)
        full = _fold(f"{j.get('nombre', '')} {j.get('apellidos', '')}").strip()
        if full and full in folded:
            return str(j.get("id"))
    return best_id


def _titulo_sugerido(spec: InformeSpec) -> str:
    base = ASUNTOS.get(spec.asunto, "Informe")
    prof = PROFUNIDADES.get(spec.profundidad, "")
    return f"Informe {base.lower()} · {prof.lower()}".strip(" ·")


async def interpretar_prompt_ai(
    texto: str,
    spec: InformeSpec,
    *,
    jugadores: Optional[list[dict]] = None,
) -> InformeSpec:
    """Refina el spec con un modelo rápido. Si falla, se queda el parser local."""
    raw = (texto or "").strip()
    if len(raw) < 12:
        return spec
    try:
        from app.config import get_settings
        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            return spec
        from app.services.claude_service import _get_async_client
        client = _get_async_client()
        names = []
        for j in (jugadores or [])[:40]:
            names.append(
                f"{j.get('id')}: {j.get('nombre', '')} {j.get('apellidos', '')}".strip()
            )
        system = (
            "Eres el archivero de un club de fútbol. Devuelves SOLO JSON válido con claves: "
            "asunto (temporada|plantilla|jugador|microciclo|resultados), "
            "profundidad (breve|estandar|extendido), "
            "audiencia (cuerpo_tecnico|metodologia|direccion|staff), "
            "ambito (competicion|amistosos|todos), "
            "secciones (array de resumen|resultados|plantilla|disciplina|jugador|microciclo|narrativa), "
            "ultimos_n (int o null), jugador_id (uuid o null), titulo (string). "
            "Los amistosos no cuentan en competición salvo que el usuario lo pida."
        )
        user = f"Pedido: {raw}\nJugadores:\n" + "\n".join(names[:25])
        response = await client.messages.create(
            model=getattr(settings, "CLAUDE_MODEL_FAST", None) or settings.CLAUDE_MODEL,
            max_tokens=400,
            temperature=0,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        out = ""
        for block in response.content:
            if getattr(block, "type", None) == "text":
                out += block.text
        out = out.strip()
        if out.startswith("```"):
            out = re.sub(r"^```[a-zA-Z]*\n?", "", out)
            out = re.sub(r"\n?```$", "", out).strip()
        data = json.loads(out)
        merged = spec.model_dump()
        for key in (
            "asunto",
            "profundidad",
            "audiencia",
            "ambito",
            "secciones",
            "ultimos_n",
            "jugador_id",
            "titulo",
        ):
            if data.get(key) not in (None, "", []):
                merged[key] = data[key]
        return InformeSpec(**merged).normalized()
    except Exception:
        logger.warning("interpretar_prompt_ai fallback to parser", exc_info=True)
        return spec


def narrativa_periodo(
    resumen: dict[str, Any],
    ambito_label: str,
    profundidad: str,
    audiencia: str = "cuerpo_tecnico",
    racha: Optional[list[str]] = None,
    local: Optional[dict[str, Any]] = None,
    visitante: Optional[dict[str, Any]] = None,
) -> str:
    pj = resumen.get("pj") or 0
    pg = resumen.get("pg") or 0
    pe = resumen.get("pe") or 0
    pp = resumen.get("pp") or 0
    gf = resumen.get("gf") or 0
    gc = resumen.get("gc") or 0
    if pj == 0:
        return f"No hay partidos en el ámbito «{ambito_label}» para este periodo."
    pts = pg * 3 + pe
    media = round(pts / pj, 2)
    dg = (gf or 0) - (gc or 0)
    signo = "+" if dg > 0 else ""
    forma = ""
    if racha:
        forma = f" Forma reciente: {'-'.join(racha)}."

    if audiencia == "direccion":
        cuerpo = (
            f"{pj} partidos de {ambito_label.lower()}. Balance {pg}-{pe}-{pp} "
            f"({pts} pts, {media} por partido). Goles {gf}-{gc} (dif. {signo}{dg}).{forma}"
        )
    elif audiencia == "metodologia":
        cuerpo = (
            f"Muestra de {pj} partidos ({ambito_label.lower()}). Rendimiento {pg}-{pe}-{pp}. "
            f"Diferencia de goles {signo}{dg}. Contrasta el trabajo de semana con el de fin de semana.{forma}"
        )
    elif audiencia == "staff":
        cuerpo = (
            f"En {ambito_label.lower()} el equipo ha jugado {pj} partidos, "
            f"con {pg} victorias, {pe} empates y {pp} derrotas. Goles {gf}-{gc}.{forma}"
        )
    else:
        cuerpo = (
            f"En {ambito_label.lower()} se han disputado {pj} partidos ({pg}-{pe}-{pp}). "
            f"El balance es {gf}-{gc} en goles, {pts} puntos y {media} por partido.{forma}"
        )

    if profundidad != "breve" and local and visitante:
        cuerpo += (
            f" Local {local.get('pj', 0)} PJ ({local.get('pg', 0)}-{local.get('pe', 0)}-{local.get('pp', 0)}); "
            f"visitante {visitante.get('pj', 0)} PJ ({visitante.get('pg', 0)}-{visitante.get('pe', 0)}-{visitante.get('pp', 0)})."
        )
    if profundidad == "extendido":
        if pp > pg:
            cuerpo += " El periodo pide revisión de rendimiento colectivo."
        elif pg > pp:
            cuerpo += " El rendimiento colectivo está por encima del equilibrio."
    return cuerpo


async def redactar_lectura_ai(spec: InformeSpec, ctx: dict[str, Any]) -> Optional[str]:
    """Lectura en prosa a partir de cifras. Si falla, se usa la narrativa numérica."""
    if "narrativa" not in (spec.secciones or []):
        return None
    if not spec.prompt and spec.profundidad == "breve":
        return None
    try:
        from app.config import get_settings
        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            return None
        from app.services.claude_service import _get_async_client
        client = _get_async_client()
        resumen = ctx.get("resumen") or {}
        evolucion = (ctx.get("evolucion") or [])[-8:]
        lineas = [
            f"{e.get('fecha')} {e.get('rival')} {e.get('marcador')} {e.get('resultado')} {e.get('competicion')}"
            for e in evolucion
        ]
        tokens = {"breve": 180, "estandar": 320, "extendido": 520}.get(spec.profundidad, 320)
        system = (
            "Eres analista de un club de fútbol. Redactas la lectura de un dossier interno. "
            "Español de España, frase corta, sin adornos. No inventes cifras ni rivales. "
            "No uses markdown. Ajusta el registro a la audiencia. "
            "cuerpo_tecnico: operativo. metodologia: proceso de semana. "
            "direccion: ejecutivo (puntos, goles, forma). staff: claro y breve."
        )
        user = (
            f"Audiencia: {spec.audiencia}\n"
            f"Profundidad: {spec.profundidad}\n"
            f"Ámbito: {ctx.get('ambito_label')}\n"
            f"Periodo: {ctx.get('periodo')}\n"
            f"Pedido: {spec.prompt or '—'}\n"
            f"Cifras: {json.dumps(resumen, ensure_ascii=False)}\n"
            f"Resultados recientes:\n" + "\n".join(lineas)
        )
        if spec.notas:
            user += f"\nNotas del cuerpo técnico: {spec.notas[:400]}"
        response = await client.messages.create(
            model=settings.CLAUDE_MODEL_FAST,
            max_tokens=tokens,
            temperature=0.2,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        out = ""
        for block in response.content:
            if getattr(block, "type", None) == "text":
                out += block.text
        text = " ".join(out.strip().split())
        return text[:1200] if len(text) > 40 else None
    except Exception:
        logger.warning("redactar_lectura_ai fallback", exc_info=True)
        return None
