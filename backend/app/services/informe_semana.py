"""Plantilla de Sala del Lunes: sintetiza objetivos y contexto de toda la semana."""

from __future__ import annotations

from typing import Any, Optional

from app.services.informe_boards import as_list, clip, md_chrome

TIPO_MC_LABEL = {
    "pretemporada": "Pretemporada",
    "competicion": "Competición",
    "carga": "Carga",
    "choque": "Choque",
    "aproximacion": "Aproximación",
    "recuperacion": "Recuperación",
}

MODO_PARTIDO_LABEL = {
    "none": "Solo sesiones",
    "amistoso_interno": "Amistoso interno",
    "amistoso_externo": "Amistoso externo",
    "oficial": "Partido oficial",
}

MD_ORDER = ["MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD"]


def _txt(val: Any) -> str:
    return " ".join(str(val or "").split()).strip()


def _uniq(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        key = raw.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(raw.strip())
    return out


def _plan_text(plan: dict, *keys: str) -> str:
    for key in keys:
        val = _txt(plan.get(key))
        if val:
            return clip(val, 280)
    return ""


def _fase_notas(fases: Any, limit: int = 3) -> list[str]:
    out: list[str] = []
    if not isinstance(fases, list):
        return out
    for fase in fases:
        if not isinstance(fase, dict):
            continue
        nombre = _txt(fase.get("fase") or "").replace("_", " ")
        bits = []
        if fase.get("texto"):
            bits.append(_txt(fase.get("texto")))
        if fase.get("sistema"):
            bits.append("Sistema " + _txt(fase.get("sistema")))
        subs = fase.get("subfases") or {}
        if isinstance(subs, dict):
            for sub in subs.values():
                if isinstance(sub, dict) and sub.get("notas"):
                    bits.append(_txt(sub.get("notas")))
        if not bits:
            continue
        linea = clip(" · ".join(bits), 160)
        out.append(f"{nombre}: {linea}" if nombre else linea)
        if len(out) >= limit:
            break
    return out


def sintetizar_sala_lunes(
    *,
    micro: dict,
    plan_ct: Optional[dict],
    sesiones: list[dict],
    reflexion: Optional[dict] = None,
    plantilla: Optional[dict] = None,
) -> dict:
    """Une Sala del Lunes + sesiones + reflexión en una plantilla fija. Sin vídeo."""
    plan = plan_ct if isinstance(plan_ct, dict) else {}
    objetivos = _uniq(
        as_list(plan.get("objetivos_semana"), 8)
        + ([_txt(micro.get("objetivo"))] if micro.get("objetivo") else [])
        + ([_txt(s.get("objetivo")) for s in sesiones if s.get("objetivo")])
    )[:8]

    tactico = _txt(micro.get("objetivo_tactico"))
    fisico = _txt(micro.get("objetivo_fisico"))
    olfato = _txt(plan.get("olfato_ct") or plan.get("notas_ct"))
    observaciones = _txt(plan.get("observaciones_ct") or micro.get("notas"))
    tipo = TIPO_MC_LABEL.get(str(plan.get("tipo_microciclo") or ""), "")
    modo = MODO_PARTIDO_LABEL.get(str(plan.get("modo_partido") or ""), "")
    rival_nombre = _txt(micro.get("rival"))

    scout = plan.get("rival_scout") if isinstance(plan.get("rival_scout"), dict) else {}
    plan_partido = plan.get("plan_partido") if isinstance(plan.get("plan_partido"), dict) else {}
    estrategia = scout.get("estrategia") if isinstance(scout.get("estrategia"), dict) else {}
    sistema_rival = _txt(scout.get("sistema") or estrategia.get("sistema"))
    fortalezas = as_list(scout.get("fortalezas"), 4)
    debilidades = as_list(scout.get("debilidades"), 4)
    estilo = _txt(estrategia.get("actitud_estilo") or scout.get("anotaciones") or estrategia.get("notas"))

    plan_resumen = {
        "ataque": _plan_text(plan_partido, "ataque_organizado"),
        "defensa": _plan_text(plan_partido, "defensa_organizada"),
        "transicion_of": _plan_text(plan_partido, "transicion_ofensiva"),
        "transicion_df": _plan_text(plan_partido, "transicion_defensiva"),
        "abp_of": _plan_text(plan_partido, "abp_ofensiva"),
        "abp_df": _plan_text(plan_partido, "abp_defensiva"),
        "fases": _fase_notas(plan_partido.get("fases")),
    }
    has_plan = any(plan_resumen.get(k) for k in ("ataque", "defensa", "transicion_of", "transicion_df", "abp_of", "abp_df")) or bool(plan_resumen["fases"])

    once_src = plan.get("once_probable") if isinstance(plan.get("once_probable"), dict) else {}
    once = {
        "sistema": _txt(once_src.get("sistema")),
        "notas": clip(_txt(once_src.get("notas")), 220),
    }

    dias_src = plan.get("dias") if isinstance(plan.get("dias"), dict) else {}
    dias = []
    for md in MD_ORDER:
        d = dias_src.get(md)
        if not isinstance(d, dict):
            continue
        if d.get("descanso") and not _txt(d.get("objetivo_dia") or d.get("notas")):
            chrome = md_chrome(md)
            dias.append({
                "md": md,
                "label": chrome["label"],
                "bar": chrome["bar"],
                "ink": chrome["ink"],
                "wash": chrome["wash"],
                "objetivo": "Descanso",
                "tactico": "",
                "notas": _txt(d.get("notas")),
                "descanso": True,
                "carga": chrome["carga"],
            })
            continue
        chrome = md_chrome(md)
        dias.append({
            "md": md,
            "label": chrome["label"],
            "bar": chrome["bar"],
            "ink": chrome["ink"],
            "wash": chrome["wash"],
            "objetivo": _txt(d.get("objetivo_dia")),
            "tactico": _txt(d.get("objetivo_tactico") or d.get("objetivo_tecnico_tactico")),
            "notas": _txt(d.get("observacion_importante") or d.get("notas")),
            "descanso": bool(d.get("descanso")),
            "carga": chrome["carga"],
        })

    # Sesiones cubren MDs que el morfociclo no rellenó
    have_md = {d["md"] for d in dias}
    for s in sesiones:
        md = str(s.get("md") or "")
        if not md or md in have_md:
            continue
        chrome = md_chrome(md)
        dias.append({
            "md": md,
            "label": chrome["label"],
            "bar": chrome["bar"],
            "ink": chrome["ink"],
            "wash": chrome["wash"],
            "objetivo": _txt(s.get("objetivo")),
            "tactico": _txt(s.get("fase_juego")),
            "notas": "",
            "descanso": False,
            "carga": s.get("carga") or chrome["carga"],
        })
        have_md.add(md)
    dias.sort(key=lambda d: MD_ORDER.index(d["md"]) if d["md"] in MD_ORDER else 99)

    reflex = None
    if reflexion and _txt(reflexion.get("texto")):
        reflex = {
            "rival": _txt(reflexion.get("rival_nombre")) or "el rival anterior",
            "texto": clip(_txt(reflexion.get("texto")), 360),
        }

    plant = plantilla if isinstance(plantilla, dict) else {}
    por = plant.get("por_disponibilidad") if isinstance(plant.get("por_disponibilidad"), dict) else {}
    lesionados = []
    for j in plant.get("jugadores_lesionados") or []:
        if not isinstance(j, dict):
            continue
        nombre = f"{j.get('nombre', '')} {j.get('apellidos', '')}".strip()
        if nombre:
            lesionados.append(nombre)

    mensaje = _mensaje_semana(
        rango=micro.get("rango") or "",
        rival=rival_nombre,
        tipo=tipo,
        modo=modo,
        objetivos=objetivos,
        tactico=tactico,
        fisico=fisico,
        olfato=olfato,
        reflex=reflex,
        sesiones=sesiones,
        sistema_rival=sistema_rival,
    )

    return {
        "mensaje": mensaje,
        "objetivos": objetivos,
        "tactico": tactico,
        "fisico": fisico,
        "olfato": olfato,
        "observaciones": observaciones,
        "tipo": tipo,
        "modo": modo,
        "reflexion": reflex,
        "rival": {
            "nombre": rival_nombre,
            "sistema": sistema_rival,
            "fortalezas": fortalezas,
            "debilidades": debilidades,
            "estilo": estilo,
            "plan": plan_resumen if has_plan else None,
        },
        "once": once if (once["sistema"] or once["notas"]) else None,
        "dias": dias,
        "plantilla": {
            "pleno": por.get("pleno") or plant.get("disponibles") or 0,
            "adaptado": por.get("grupo_adaptado") or 0,
            "individual": por.get("individual") or plant.get("en_recuperacion") or 0,
            "fuera": por.get("fuera") or plant.get("lesionados") or 0,
            "lesionados": lesionados[:8],
        } if plant else None,
    }


def _mensaje_semana(
    *,
    rango: str,
    rival: str,
    tipo: str,
    modo: str,
    objetivos: list[str],
    tactico: str,
    fisico: str,
    olfato: str,
    reflex: Optional[dict],
    sesiones: list[dict],
    sistema_rival: str,
) -> str:
    partes: list[str] = []
    cabeza = "Sala del lunes."
    if rango:
        cabeza += f" Semana {rango}."
    if tipo:
        cabeza += f" Microciclo de {tipo.lower()}."
    if rival:
        extra = f" ({modo.lower()})" if modo else ""
        sis = f", sistema {sistema_rival}" if sistema_rival else ""
        cabeza += f" Frente a {rival}{extra}{sis}."
    elif modo:
        cabeza += f" {modo}."
    partes.append(cabeza)

    if objetivos:
        partes.append("Intención de la semana: " + "; ".join(objetivos[:5]) + ".")
    foco = []
    if tactico:
        foco.append("táctico, " + tactico.rstrip(".") )
    if fisico:
        foco.append("físico, " + fisico.rstrip("."))
    if foco:
        partes.append("Prioridad " + "; ".join(foco) + ".")

    ses_bits = []
    for s in sesiones:
        if s.get("objetivo") and s.get("md"):
            ses_bits.append(f"{s['md']} {clip(s['objetivo'], 70)}")
    if ses_bits:
        partes.append("Por sesión: " + "; ".join(ses_bits[:6]) + ".")

    if reflex:
        partes.append(f"Del partido anterior vs {reflex['rival']}: {reflex['texto']}")
    if olfato:
        partes.append("Olfato del cuerpo técnico: " + clip(olfato, 220))

    return " ".join(partes)
