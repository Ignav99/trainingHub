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


def _tiempo_segundos(value: Any) -> Optional[float]:
    """Bronco u otros tiempos: número en segundos, o `m:ss`."""
    n = _num(value)
    if n is not None:
        return n
    if not isinstance(value, str):
        return None
    text = value.strip().replace(",", ".").replace("'", ":")
    if ":" not in text:
        return None
    try:
        minutes_s, seconds_s = text.split(":", 1)
        return float(minutes_s) * 60 + float(seconds_s)
    except (TypeError, ValueError):
        return None


def _fmt_mmss(seconds: Any) -> Optional[str]:
    n = _tiempo_segundos(seconds)
    if n is None:
        return None
    total = int(round(n))
    m, s = divmod(total, 60)
    return f"{m}:{s:02d}"


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


def clasificacion_imc(valor: float | None) -> str | None:
    if valor is None:
        return None
    if valor < 18.5:
        return "bajo_peso"
    if valor < 25:
        return "normopeso"
    if valor < 30:
        return "sobrepeso"
    return "obesidad"


def lectura_ake(deficit: Any) -> Optional[str]:
    v = _num(deficit)
    if v is None:
        return None
    if v <= 20:
        return "normal"
    if v <= 30:
        return "leve"
    return "severo"


def apply_derived(datos: dict[str, Any]) -> dict[str, Any]:
    """Solo medidas que ya pide la hoja: IMC, asimetría dedo-pared, AKE, Y-Balance %."""
    out = dict(datos or {})
    talla = _num(out.get("talla_cm"))
    peso = _num(out.get("peso_kg"))
    valor_imc = imc(peso, talla)
    if valor_imc is not None:
        out["imc"] = valor_imc
        out["imc_clasificacion"] = clasificacion_imc(valor_imc)

    d_pared = _num(out.get("dedo_pared_d"))
    i_pared = _num(out.get("dedo_pared_i"))
    if d_pared is not None and i_pared is not None:
        out["dedo_pared_asimetria"] = round(abs(d_pared - i_pared), 1)

    for side in ("d", "i"):
        lectura = lectura_ake(out.get(f"ake_deficit_{side}"))
        if lectura:
            out[f"ake_lectura_{side}"] = lectura
        limb = _num(out.get(f"longitud_pierna_{side}"))
        if limb and limb > 0:
            for prefix in ("ybt_ant", "ybt_pm", "ybt_pl"):
                dist = _num(out.get(f"{prefix}_{side}"))
                if dist is not None:
                    out[f"{prefix}_pct_{side}"] = round((dist / limb) * 100, 1)
    return out


def snapshot_para_informe(row: dict[str, Any]) -> dict[str, Any]:
    datos = apply_derived(row.get("datos") or {})
    talla = _num(datos.get("talla_cm"))
    peso = _num(datos.get("peso_kg"))
    return {
        "fecha": row.get("fecha"),
        "momento": MOMENTO_LABELS.get(row.get("momento") or "", row.get("momento") or ""),
        "titulo": row.get("titulo"),
        "notas": row.get("notas"),
        "talla_cm": talla,
        "peso_kg": peso,
        "imc": _num(datos.get("imc")) or imc(peso, talla),
        "imc_clasificacion": datos.get("imc_clasificacion"),
        "bronco_1200": _tiempo_segundos(datos.get("bronco_1200")),
        "bronco_1200_txt": _fmt_mmss(datos.get("bronco_1200")),
        "bronco_20": _num(datos.get("bronco_20")),
        "bronco_40": _num(datos.get("bronco_40")),
        "bronco_60x5": _num(datos.get("bronco_60x5")),
        "hallazgos": _hallazgos(datos),
    }


def _hallazgos(datos: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    pelvis = datos.get("pelvis")
    if pelvis and pelvis not in ("neutra", "no_valorado"):
        flags.append(f"Pelvis: {str(pelvis).replace('_', ' ')}")
    columna = datos.get("columna")
    if columna and columna not in ("curvaturas_conservadas", "no_valorado"):
        flags.append(f"Columna: {str(columna).replace('_', ' ')}")
    for side, lado in (("d", "D"), ("i", "I")):
        for key, label in (
            (f"rodilla_alineacion_{side}", f"Rodilla {lado}"),
            (f"retropie_{side}", f"Retropié {lado}"),
            (f"arco_plantar_{side}", f"Arco {lado}"),
        ):
            val = datos.get(key)
            if val and val not in ("neutro", "normal", "valgo_fisiologico", "no_valorado"):
                flags.append(f"{label}: {str(val).replace('_', ' ')}")
        lectura = datos.get(f"ake_lectura_{side}")
        if lectura in ("leve", "severo"):
            flags.append(f"AKE {lado}: acortamiento {lectura}")
        if datos.get(f"thomas_lado_{side}") == "positivo":
            flags.append(f"Thomas {lado} positivo")
        if datos.get(f"valgo_dinamico_{side}") == "si":
            flags.append(f"Valgo dinámico {lado}")
    if datos.get("thomas_global") == "positivo":
        flags.append("Thomas global positivo")
    if datos.get("hip_hinge") in ("compensa", "no_logra"):
        flags.append(f"Hip hinge: {datos.get('hip_hinge')}")
    if datos.get("hip_hinge_lumbar") == "si":
        flags.append("Compensación lumbar en hip hinge")
    asim = _num(datos.get("dedo_pared_asimetria"))
    if asim is not None and asim >= 2:
        flags.append(f"Asimetría dedo-pared {asim} cm")
    return flags[:8]
