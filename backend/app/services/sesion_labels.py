"""Etiquetas legibles (ES) para taxonomía de sesión en PDFs."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

FASES_JUEGO: Dict[str, str] = {
    "ataque_organizado": "Ataque organizado",
    "defensa_organizada": "Defensa organizada",
    "transicion_defensa_ataque": "Transición DEF→ATQ",
    "transicion_ataque_defensa": "Transición ATQ→DEF",
    "balon_parado_ofensivo": "ABP ofensivo",
    "balon_parado_defensivo": "ABP defensivo",
}

SUBFASES: Dict[str, str] = {
    "creacion": "Creación",
    "progresion": "Progresión",
    "finalizacion": "Finalización",
    "bloque_alto": "Bloque alto",
    "bloque_medio": "Bloque medio",
    "bloque_bajo": "Bloque bajo",
    "bloque_mixto": "Bloque mixto",
    "inicios_saque_puerta": "Inicios / saque de puerta",
    "saque_puerta": "Saque de puerta",
    "reinicios": "Reinicios",
    "general": "General",
    "presion_saque_meta": "Presión saque de meta",
}

CONTENIDOS: Dict[str, str] = {
    "pase_circulacion": "Pase y circulación",
    "tercer_hombre": "Tercer hombre",
    "pared": "Pared",
    "descargas": "Descargas",
    "desdoblamientos": "Desdoblamientos",
    "desmarques": "Desmarques",
    "conduccion": "Conducción",
    "regate": "Regate",
    "control_orientado": "Control orientado",
    "cobertura_balon": "Cobertura de balón",
    "amplitud": "Amplitud",
    "profundidad": "Profundidad",
    "cambio_orientacion": "Cambio de orientación",
    "superioridad": "Generar superioridad",
    "centro": "Centro",
    "remate": "Remate",
    "tiro": "Tiro",
    "finalizacion": "Finalización",
    "presion_tras_perdida": "Presión tras pérdida",
    "acoso": "Acoso",
    "entrada": "Entrada",
    "vigilancias": "Vigilancias",
    "coberturas": "Coberturas",
    "permutas": "Permutas",
    "basculacion": "Basculación",
    "repliegue": "Repliegue",
    "marcaje": "Marcaje",
    "anticipacion": "Anticipación",
    "temporizacion": "Temporización",
    "achique": "Achique de espacios",
    "fuera_de_juego": "Fuera de juego",
    "repliegue_intensivo": "Repliegue intensivo",
}

TIPOS_ABP: Dict[str, str] = {
    "corner": "Corner",
    "semi_corner": "Semi-corner",
    "falta_lateral": "Falta lateral",
    "falta_frontal": "Falta frontal",
    "falta_lejana": "Falta lejana",
    "penalti": "Penalti",
    "saque_banda": "Saque de banda",
    "saque_puerta": "Saque de puerta",
}


def _label(code: Any, mapping: Dict[str, str]) -> str:
    if code is None:
        return ""
    s = str(code).strip()
    if not s:
        return ""
    return mapping.get(s, s.replace("_", " "))


def label_list(codes: Optional[Iterable[Any]], mapping: Dict[str, str], *, limit: int = 8) -> List[str]:
    out: List[str] = []
    seen = set()
    for c in codes or []:
        lab = _label(c, mapping)
        if lab and lab not in seen:
            seen.add(lab)
            out.append(lab)
        if len(out) >= limit:
            break
    return out


def format_subfases(subfases: Optional[List[Any]], *, limit: int = 8) -> List[str]:
    out: List[str] = []
    seen = set()
    for item in subfases or []:
        if not isinstance(item, dict):
            continue
        fase = _label(item.get("fase"), FASES_JUEGO)
        sf = _label(item.get("subfase"), SUBFASES)
        op = _label(item.get("opcion"), SUBFASES) if item.get("opcion") else ""
        if not sf:
            continue
        # Acortar: "Creación (Reinicios)" sin repetir fase entera
        lab = f"{sf} ({op})" if op else sf
        if fase and sf:
            # Prefijo corto de fase
            prefix = {
                "Ataque organizado": "ATQ",
                "Defensa organizada": "DEF",
            }.get(fase, "")
            if prefix:
                lab = f"{prefix}·{lab}"
        if lab not in seen:
            seen.add(lab)
            out.append(lab)
        if len(out) >= limit:
            break
    return out


def format_abp_parts(abp: Optional[dict]) -> List[str]:
    if not isinstance(abp, dict) or not abp.get("activo"):
        return []
    ofensivo = abp.get("ofensivo") or []
    defensivo = abp.get("defensivo") or []
    if not ofensivo and not defensivo:
        tipos = abp.get("tipos") or []
        lados = abp.get("lados") or ([abp["lado"]] if abp.get("lado") else [])
        if tipos and lados:
            if "ofensivo" in lados:
                ofensivo = list(tipos)
            if "defensivo" in lados:
                defensivo = list(tipos)
    parts: List[str] = []
    if ofensivo:
        labs = label_list(ofensivo, TIPOS_ABP, limit=5)
        parts.append("ABP ofensivo: " + ", ".join(labs))
    if defensivo:
        labs = label_list(defensivo, TIPOS_ABP, limit=5)
        parts.append("ABP defensivo: " + ", ".join(labs))
    return parts


def build_conceptos_line(sesion: dict) -> str:
    """Una línea de conceptos tácticos para el PDF reducido."""
    bits: List[str] = []
    fases = label_list(sesion.get("fases_juego"), FASES_JUEGO, limit=6)
    if fases:
        bits.append(" · ".join(fases))
    subs = format_subfases(sesion.get("subfases"), limit=6)
    if subs:
        bits.append("Sub: " + ", ".join(subs))
    of_labs = label_list(sesion.get("contenidos_tecnicos_of"), CONTENIDOS, limit=5)
    if of_labs:
        bits.append("Of: " + ", ".join(of_labs))
    def_labs = label_list(sesion.get("contenidos_tecnicos_def"), CONTENIDOS, limit=5)
    if def_labs:
        bits.append("Def: " + ", ".join(def_labs))
    bits.extend(format_abp_parts(sesion.get("abp_config")))
    return "  |  ".join(bits)


def chunk_list(items: List[Any], size: int) -> List[List[Any]]:
    if size <= 0:
        return [items]
    return [items[i : i + size] for i in range(0, len(items), size)]
