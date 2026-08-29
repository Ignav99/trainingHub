"""Cálculos clínicos para comparación y dossier (ISAK / Faulkner / asimetrías)."""

from __future__ import annotations

from typing import Any, Optional

MOMENTO_LABELS = {
    "pretemporada": "Pretemporada",
    "inicio_temporada": "Inicio de temporada",
    "control": "Control",
    "post_lesion": "Post lesión",
    "fin_temporada": "Fin de temporada",
    "otro": "Otro",
}

PLIEGUES_FAULKNER = ("pliegue_tricipital", "pliegue_subescapular", "pliegue_suprailiaco", "pliegue_abdominal")


def _num(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def imc(peso_kg: Any, talla_cm: Any) -> Optional[float]:
    peso = _num(peso_kg)
    talla = _num(talla_cm)
    if not peso or not talla or talla <= 0:
        return None
    metros = talla / 100.0
    return round(peso / (metros * metros), 1)


def suma_pliegues_faulkner(datos: dict[str, Any]) -> Optional[float]:
    valores = [_num(datos.get(k)) for k in PLIEGUES_FAULKNER]
    if any(v is None for v in valores):
        return None
    return round(sum(valores), 1)  # type: ignore[arg-type]


def porcentaje_grasa_faulkner(datos: dict[str, Any], sexo: str | None = None) -> Optional[float]:
    """Faulkner (modificación de Yuhasz), habitual en clubes españoles.

    Hombres: %G = 0.153 * Σ4 + 5.783
    Mujeres: %G = 0.213 * Σ4 + 7.9
    Σ4 = tricipital + subescapular + suprailiaco + abdominal (mm).
    """
    suma = suma_pliegues_faulkner(datos)
    if suma is None:
        return None
    formula = (sexo or datos.get("sexo_formula") or "hombre").lower()
    if formula.startswith("muj"):
        return round(0.213 * suma + 7.9, 1)
    return round(0.153 * suma + 5.783, 1)


def asimetria_pct(derecho: Any, izquierdo: Any) -> Optional[float]:
    d = _num(derecho)
    i = _num(izquierdo)
    if d is None or i is None:
        return None
    base = max(abs(d), abs(i), 0.0001)
    return round(abs(d - i) / base * 100.0, 1)


def lsi_pct(lado_a: Any, lado_b: Any) -> Optional[float]:
    """Limb Symmetry Index: menor / mayor * 100. <90% suele marcarse como déficit."""
    a = _num(lado_a)
    b = _num(lado_b)
    if a is None or b is None or max(a, b) <= 0:
        return None
    return round(min(a, b) / max(a, b) * 100.0, 1)


def snapshot_para_informe(row: dict[str, Any]) -> dict[str, Any]:
    datos = row.get("datos") or {}
    talla = _num(datos.get("talla_cm"))
    peso = _num(datos.get("peso_kg"))
    fat = _num(datos.get("porcentaje_grasa")) or porcentaje_grasa_faulkner(datos)
    return {
        "fecha": row.get("fecha"),
        "momento": MOMENTO_LABELS.get(row.get("momento") or "", row.get("momento") or ""),
        "titulo": row.get("titulo"),
        "notas": row.get("notas"),
        "talla_cm": talla,
        "peso_kg": peso,
        "imc": _num(datos.get("imc")) or imc(peso, talla),
        "porcentaje_grasa": fat,
        "cmj_cm": _num(datos.get("cmj_cm")),
        "sj_cm": _num(datos.get("sj_cm")),
        "sprint_10_s": _num(datos.get("sprint_10_s")),
        "squeeze_45_mmhg": _num(datos.get("squeeze_45_mmhg")),
        "ktw_d": _num(datos.get("ktw_d")),
        "ktw_i": _num(datos.get("ktw_i")),
        "hallazgos": _hallazgos(datos),
    }


def _hallazgos(datos: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    ktw = asimetria_pct(datos.get("ktw_d"), datos.get("ktw_i"))
    if ktw is not None and ktw >= 10:
        flags.append(f"Asimetría knee-to-wall {ktw}%")
    hop = lsi_pct(datos.get("single_hop_d"), datos.get("single_hop_i"))
    if hop is not None and hop < 90:
        flags.append(f"LSI hop {hop}%")
    dolor = _num(datos.get("squeeze_45_dolor"))
    if dolor is not None and dolor >= 3:
        flags.append(f"Dolor squeeze 45° VAS {dolor}")
    for key, label in (
        ("hombros_posterior", "Hombros"),
        ("escapulas", "Escápulas"),
        ("pelvis_sagital", "Pelvis"),
        ("rodillas_posterior", "Rodillas"),
        ("pies_posterior", "Pies"),
    ):
        val = datos.get(key)
        if val and val not in ("neutro", "neutras", "simetricos", "simetricas", "no_valorado"):
            flags.append(f"{label}: {str(val).replace('_', ' ')}")
    return flags[:8]
