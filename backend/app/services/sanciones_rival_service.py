"""Sancionados y apercibidos del rival para un partido concreto.

Fuente: actas del Comité de Competición (rfef_sanciones). El comité publica el
viernes las sanciones de la jornada anterior; hasta entonces lo del último
partido es provisional (tarjetas del acta).

Cumplimiento: las suspensiones de una persona se suman y se cumplen en orden,
una por cada partido de liga que su equipo juega después de la jornada de la
sanción y antes de nuestro partido. Los aplazados no cuentan. No tenemos copa
ni otras competiciones: si cuentan para el reglamento, aquí no se ven.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, timedelta

CICLO_AMARILLAS = 5

_ORDINALES = {
    "PRIMERA": 1, "SEGUNDA": 2, "TERCERA": 3, "CUARTA": 4, "QUINTA": 5,
    "SEXTA": 6, "SEPTIMA": 7, "OCTAVA": 8, "NOVENA": 9, "DECIMA": 10,
}
_NUM_PALABRA = {"UN": 1, "UNO": 1, "DOS": 2, "TRES": 3, "CUATRO": 4, "CINCO": 5, "SEIS": 6, "SIETE": 7, "OCHO": 8}
_RE_PARTIDOS = re.compile(r"(\d+|UN|UNO|DOS|TRES|CUATRO|CINCO|SEIS|SIETE|OCHO)\s*(?:\(\d+\)\s*)?PARTIDOS?\b")
_RE_TIEMPO = re.compile(r"(\d+|UN|UNO|DOS|TRES|CUATRO|CINCO|SEIS)\s*(MES|MESES|ANO|ANOS)\b")


def _plano(texto: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in sin_tildes if not unicodedata.combining(c)).upper()


def clave_persona(nombre: str) -> str:
    return re.sub(r"\s+", " ", _plano(nombre)).strip(" ,.")


def ordinal_amonestacion(descripcion: str) -> int | None:
    d = _plano(descripcion)
    if "AMONESTACION" not in d or "DOBLE AMONESTACION" in d:
        return None
    for palabra, n in _ORDINALES.items():
        if re.search(rf"\b{palabra}\b", d):
            return n
    return None


def partidos_suspension(descripcion: str) -> int | None:
    d = _plano(descripcion)
    if "SUSPENSION" not in d:
        return None
    m = _RE_PARTIDOS.search(d)
    if not m:
        return None
    raw = m.group(1)
    return int(raw) if raw.isdigit() else _NUM_PALABRA.get(raw)


def suspension_temporal(descripcion: str) -> tuple[int, str] | None:
    """(cantidad, 'meses'|'anos') si la sanción es por tiempo y no por partidos."""
    d = _plano(descripcion)
    if "SUSPENSION" not in d and "INHABILITACION" not in d:
        return None
    m = _RE_TIEMPO.search(d)
    if not m:
        return None
    raw = m.group(1)
    n = int(raw) if raw.isdigit() else _NUM_PALABRA.get(raw, 0)
    return (n, "meses" if m.group(2).startswith("MES") else "anos") if n else None


def _motivo(descripcion: str) -> str:
    d = _plano(descripcion)
    if "DOBLE AMONESTACION" in d:
        return "Doble amarilla"
    if "ACUMULACION" in d or "CICLO" in d:
        return "Ciclo de amarillas"
    m = re.search(r"\bPOR\s+(.+?)(?:\s*\(\d+\s*PARTIDOS?\)|$)", descripcion or "", re.IGNORECASE)
    if m:
        texto = m.group(1).strip().rstrip(".")
        return texto[:1].upper() + texto[1:110]
    return (descripcion or "Sanción")[:110]


def viernes_comite(fecha_partido: date) -> date:
    """Viernes anterior (o el mismo día si el partido es viernes)."""
    return fecha_partido - timedelta(days=(fecha_partido.weekday() - 4) % 7)


@dataclass
class PartidoRival:
    jornada: int
    fecha: date | None
    jugado: bool


@dataclass
class _Suspension:
    jornada: int
    partidos: int
    motivo: str
    articulo: str = ""
    descripcion: str = ""
    deducida: bool = False
    cumplidos: int = 0
    cumplidos_en: list[int] = field(default_factory=list)

    @property
    def pendientes(self) -> int:
        return max(0, self.partidos - self.cumplidos)


def _fecha_iso(valor) -> date | None:
    if isinstance(valor, date):
        return valor
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10])
    except ValueError:
        return None


def calcular_sanciones_partido(
    sanciones_rival: list[dict],
    jornadas_con_comite: set[int],
    partidos_rival: list[PartidoRival],
    *,
    jornada_objetivo: int | None,
    fecha_partido: date | None,
    hoy: date,
    tarjetas_ultimo_acta: list[dict] | None = None,
) -> dict:
    jugados = sorted(p.jornada for p in partidos_rival if p.jugado)
    if jornada_objetivo is None:
        jornada_objetivo = (jugados[-1] + 1) if jugados else 1
    previos = [j for j in jugados if j < jornada_objetivo]
    ultima = previos[-1] if previos else None
    fecha_ultima = next((p.fecha for p in partidos_rival if p.jornada == ultima), None)

    avisos: list[str] = []
    aplazados = sorted(
        p.jornada for p in partidos_rival
        if not p.jugado and p.jornada < jornada_objetivo and p.fecha is not None and p.fecha < hoy
    )
    programados = sorted(
        p.jornada for p in partidos_rival
        if not p.jugado and p.jornada < jornada_objetivo and (p.fecha is None or p.fecha >= hoy)
        and (fecha_partido is None or p.fecha is None or p.fecha < fecha_partido)
    )
    if aplazados:
        avisos.append(
            "Sin resultado en J" + ", J".join(map(str, aplazados))
            + ": no cuentan como partido cumplido."
        )
    sin_comite = [j for j in previos if j not in jornadas_con_comite and j != ultima]
    if sin_comite:
        avisos.append(
            "No hay acta del comité de la J" + ", J".join(map(str, sin_comite))
            + ": puede faltar alguna sanción."
        )

    personas: dict[str, dict] = {}
    for s in sorted(sanciones_rival, key=lambda x: x.get("jornada_numero") or 0):
        nombre = (s.get("persona_nombre") or "").strip()
        jornada = s.get("jornada_numero")
        if not nombre or jornada is None or jornada >= jornada_objetivo:
            continue
        p = personas.setdefault(clave_persona(nombre), {
            "nombre": nombre,
            "categoria": s.get("categoria") or "jugador",
            "suspensiones": [],
            "ciclo": None,
            "jornada_amarilla": None,
            "temporales": [],
        })
        desc = s.get("descripcion") or ""
        ordinal = ordinal_amonestacion(desc)
        if ordinal is not None:
            if p["jornada_amarilla"] is None or (jornada, ordinal) >= (p["jornada_amarilla"], p["ciclo"] or 0):
                p["ciclo"], p["jornada_amarilla"] = ordinal, jornada
            continue
        n = partidos_suspension(desc)
        if n:
            p["suspensiones"].append(_Suspension(
                jornada=jornada, partidos=n, motivo=_motivo(desc),
                articulo=s.get("articulo") or "", descripcion=desc,
            ))
            continue
        tiempo = suspension_temporal(desc)
        if tiempo:
            p["temporales"].append({
                "jornada": jornada,
                "cantidad": tiempo[0],
                "unidad": tiempo[1],
                "desde": _fecha_iso(s.get("reunion_fecha")) or _fecha_iso(s.get("jornada_fecha")),
                "motivo": _motivo(desc),
            })

    for p in personas.values():
        ordinal = p["ciclo"]
        if ordinal and ordinal % CICLO_AMARILLAS == 0:
            j = p["jornada_amarilla"]
            ya = any(x.jornada == j and x.motivo == "Ciclo de amarillas" for x in p["suspensiones"])
            if not ya:
                p["suspensiones"].append(_Suspension(
                    jornada=j, partidos=1, motivo="Ciclo de amarillas",
                    descripcion=f"{ordinal}ª amonestación", deducida=True,
                ))
        p["suspensiones"].sort(key=lambda x: x.jornada)
        for jornada in previos:
            cola = [x for x in p["suspensiones"] if x.jornada < jornada and x.pendientes > 0]
            if cola:
                cola[0].cumplidos += 1
                cola[0].cumplidos_en.append(jornada)

    sancionados, cumplidas, apercibidos = [], [], []
    for p in personas.values():
        susp = p["suspensiones"]
        pendientes = sum(x.pendientes for x in susp)
        para_partido = max(0, pendientes - len(programados))
        temporales_vigentes = [
            t for t in p["temporales"]
            if fecha_partido is None or t["desde"] is None
            or fecha_partido < _sumar_tiempo(t["desde"], t["cantidad"], t["unidad"])
        ]
        fila = {
            "nombre": p["nombre"],
            "categoria": p["categoria"],
            "partidos_total": sum(x.partidos for x in susp),
            "cumplidos": sum(x.cumplidos for x in susp),
            "pendientes": pendientes,
            "pendientes_para_partido": para_partido,
            "baja": para_partido > 0 or bool(temporales_vigentes),
            "temporal": temporales_vigentes[0] if temporales_vigentes else None,
            "sanciones": [
                {
                    "jornada": x.jornada,
                    "partidos": x.partidos,
                    "cumplidos": x.cumplidos,
                    "pendientes": x.pendientes,
                    "cumplidos_en": x.cumplidos_en,
                    "motivo": x.motivo,
                    "articulo": x.articulo,
                    "deducida": x.deducida,
                }
                for x in susp
            ],
        }
        if fila["temporal"] and fila["temporal"].get("desde"):
            fila["temporal"] = {**fila["temporal"], "desde": fila["temporal"]["desde"].isoformat()}
        if pendientes > 0 or temporales_vigentes:
            sancionados.append(fila)
        elif susp and ultima is not None and susp[-1].jornada >= ultima - 2:
            cumplidas.append(fila)
        ciclo = p["ciclo"] or 0
        if p["categoria"] == "jugador" and ciclo and ciclo % CICLO_AMARILLAS == CICLO_AMARILLAS - 1:
            apercibidos.append({
                "nombre": p["nombre"],
                "amarillas": ciclo,
                "jornada": p["jornada_amarilla"],
            })

    sancionados.sort(key=lambda f: (
        not f["baja"], f["categoria"] != "jugador", -f["pendientes_para_partido"], -f["pendientes"], f["nombre"],
    ))
    cumplidas.sort(key=lambda f: (-(f["sanciones"][-1]["jornada"]), f["nombre"]))
    apercibidos.sort(key=lambda f: f["nombre"])

    comite = _estado_comite(ultima, jornadas_con_comite, fecha_partido, fecha_ultima, hoy)
    if programados:
        comite = {
            **comite,
            "estado": "faltan_partidos",
            "jornadas_por_jugar": programados,
            "fecha_esperada": viernes_comite(fecha_partido).isoformat() if fecha_partido else None,
        }
    provisionales: list[dict] = []
    if comite["estado"] not in ("publicado", "sin_partidos") and ultima is not None and (
        ultima not in jornadas_con_comite
    ):
        provisionales = _provisionales(tarjetas_ultimo_acta, ultima, personas)
        if tarjetas_ultimo_acta is None:
            avisos.append(f"No tenemos el acta de la J{ultima}: no se ven expulsiones de ese partido.")

    return {
        "jornada_objetivo": jornada_objetivo,
        "fecha_partido": fecha_partido.isoformat() if fecha_partido else None,
        "ultima_jornada_rival": ultima,
        "partidos_previos": len(previos),
        "partidos_por_jugar": programados,
        "comite": comite,
        "sancionados": sancionados,
        "provisionales": provisionales,
        "apercibidos": apercibidos,
        "cumplidas_recientes": cumplidas[:8],
        "avisos": avisos,
        "sin_datos": not sanciones_rival and not jornadas_con_comite,
    }


def _sumar_tiempo(desde: date, cantidad: int, unidad: str) -> date:
    meses = cantidad * (12 if unidad == "anos" else 1)
    y, m = divmod(desde.month - 1 + meses, 12)
    dia = min(desde.day, 28)
    return date(desde.year + y, m + 1, dia)


def _estado_comite(
    ultima: int | None,
    jornadas_con_comite: set[int],
    fecha_partido: date | None,
    fecha_ultima: date | None,
    hoy: date,
) -> dict:
    if ultima is None:
        return {"estado": "sin_partidos", "jornada": None, "fecha_esperada": None}
    if ultima in jornadas_con_comite:
        return {"estado": "publicado", "jornada": ultima, "fecha_esperada": None}
    if fecha_partido:
        esperada = viernes_comite(fecha_partido)
    elif fecha_ultima:
        esperada = viernes_comite(fecha_ultima + timedelta(days=7))
    else:
        esperada = None
    estado = "retrasado" if esperada and hoy > esperada else "pendiente"
    return {
        "estado": estado,
        "jornada": ultima,
        "fecha_esperada": esperada.isoformat() if esperada else None,
    }


def _provisionales(tarjetas: list[dict] | None, jornada: int, personas: dict) -> list[dict]:
    if not tarjetas:
        return []
    amarillas: dict[str, int] = {}
    rojas: dict[str, str] = {}
    for t in tarjetas:
        nombre = (t.get("jugador") or "").strip()
        tipo = (t.get("tipo") or "").lower()
        if not nombre:
            continue
        if "roja" in tipo:
            rojas[nombre] = nombre
        elif "amarilla" in tipo:
            amarillas[nombre] = amarillas.get(nombre, 0) + 1
    out = []
    for nombre in rojas:
        doble = amarillas.get(nombre, 0) >= 1
        out.append({
            "nombre": nombre,
            "tipo": "doble_amarilla" if doble else "roja",
            "jornada": jornada,
            "detalle": (
                f"Expulsado en la J{jornada} (doble amarilla): mínimo 1 partido, pendiente de comité"
                if doble else
                f"Roja en la J{jornada}: suspensión pendiente de comité"
            ),
        })
    for nombre, n in amarillas.items():
        if nombre in rojas or n != 1:
            continue
        previo = personas.get(clave_persona(nombre))
        ciclo = (previo or {}).get("ciclo") or 0
        if previo and (previo.get("jornada_amarilla") or 0) < jornada and ciclo % CICLO_AMARILLAS == CICLO_AMARILLAS - 1:
            out.append({
                "nombre": nombre,
                "tipo": "ciclo",
                "jornada": jornada,
                "detalle": f"Vio la {ciclo + 1}ª amarilla en la J{jornada}: cumple ciclo, pendiente de comité",
            })
    return out
