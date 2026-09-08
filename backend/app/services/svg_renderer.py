"""
TrainingHub Pro - SVG Renderer (v2 Professional)
Converts DiagramData JSON → SVG strings for PDF rendering.
Top-down player view (body ellipse + head circle), SVG markers for arrows,
professional grass stripes and field lines.
Pure Python, no external dependencies.
"""

import math
import re
from typing import Optional

# ============ Constants ============

TEAM_COLORS = {
    "team1": "#3B82F6",
    "team2": "#EF4444",
    "neutral": "#F59E0B",
    "goalkeeper": "#22C55E",
}

# Mapping from app team colors to PDF peto style
# The PDF uses a dark theme, so we map to high-contrast colors
PETO_COLORS = {
    "#3B82F6": {"body": "#0a0a0a", "head": "#1a1a1a", "stroke": "white", "label": "white"},   # team1 → Negro
    "#EF4444": {"body": "#ffffff", "head": "#dddddd", "stroke": "#111", "label": "#111"},       # team2 → Blanco
    "#F59E0B": {"body": "#888888", "head": "#999999", "stroke": "#aaa", "label": "white"},      # neutral → Gris
    "#22C55E": {"body": "#2ecc71", "head": "#27ae60", "stroke": "#111", "label": "white"},      # goalkeeper → Verde
}

GRASS_COLOR = "#2d7a2d"
GRASS_STRIPE = "rgba(0,0,0,0.06)"

# ViewBox configs — all pitch types use the same full-field canvas (100×60m scale)
# "full" = complete field with goals and lines (for finishing exercises)
# "green" = just grass, no lines (for rondos, analytical exercises)
# "half"/"quarter" kept for backward compatibility
PITCH_CONFIGS = {
    "full": {"viewbox": "0 0 1050 680", "width": 1050, "height": 680},
    "green": {"viewbox": "0 0 1050 680", "width": 1050, "height": 680},
    "half": {"viewbox": "0 0 525 680", "width": 525, "height": 680},
    "quarter": {"viewbox": "0 0 525 340", "width": 525, "height": 340},
}

_arrow_counter = 0


def _next_arrow_id() -> str:
    """Generate unique marker IDs to avoid SVG collisions."""
    global _arrow_counter
    _arrow_counter += 1
    return f"arr{_arrow_counter}"


def _reset_arrow_counter():
    global _arrow_counter
    _arrow_counter = 0


# ============ Grass & Field ============

def _render_grass(width: int, height: int) -> str:
    """Render green background with alternating vertical grass stripes."""
    svg = f'<rect width="{width}" height="{height}" fill="{GRASS_COLOR}"/>'
    # Vertical stripes every ~20% of width
    stripe_w = max(width // 5, 20)
    x = 0
    alt = False
    while x < width:
        if alt:
            svg += f'<rect x="{x}" y="0" width="{stripe_w}" height="{height}" fill="{GRASS_STRIPE}"/>'
        x += stripe_w
        alt = not alt
    return svg


def render_pitch_svg(pitch_type: str = "full") -> str:
    """
    Render football pitch lines as SVG markup (no wrapper).
    Horizontal orientation: left goal ← → right goal.
    "green" type renders only grass (for rondos / analytical exercises).
    """
    config = PITCH_CONFIGS.get(pitch_type, PITCH_CONFIGS["full"])
    w = config["width"]
    h = config["height"]

    svg = _render_grass(w, h)

    # "green" = grass only, no lines or goals
    if pitch_type == "green":
        return svg

    lc = "white"  # line color
    lw = "2"      # line width
    lw_thin = "1.5"

    if pitch_type == "full":
        # Outer boundary
        svg += f'<rect x="25" y="25" width="1000" height="630" fill="none" stroke="{lc}" stroke-width="{lw}"/>'
        # Left penalty area
        svg += f'<rect x="25" y="138" width="165" height="404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Left goal area
        svg += f'<rect x="25" y="236" width="55" height="208" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Left goal
        svg += f'<rect x="10" y="305" width="15" height="70" fill="white" stroke="#111" stroke-width="1"/>'
        # Left penalty spot
        svg += f'<circle cx="135" cy="340" r="3" fill="white"/>'
        # Left penalty arc
        svg += f'<path d="M 190 276 A 91.5 91.5 0 0 1 190 404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Center line
        svg += f'<line x1="525" y1="25" x2="525" y2="655" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Center circle
        svg += f'<circle cx="525" cy="340" r="91.5" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<circle cx="525" cy="340" r="3" fill="white"/>'
        # Right penalty area
        svg += f'<rect x="860" y="138" width="165" height="404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Right goal area
        svg += f'<rect x="970" y="236" width="55" height="208" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Right goal
        svg += f'<rect x="1025" y="305" width="15" height="70" fill="white" stroke="#111" stroke-width="1"/>'
        svg += f'<circle cx="915" cy="340" r="3" fill="white"/>'
        # Right penalty arc
        svg += f'<path d="M 860 276 A 91.5 91.5 0 0 0 860 404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        # Corners
        for cx, cy, sweep in [("25","25","0,1"), ("1025","25","0,0"), ("25","655","1,0"), ("1025","655","1,1")]:
            svg += f'<path d="M {cx} {int(cy)+10 if "25" == cy else int(cy)-10} A 10 10 0 0 {sweep.split(",")[1]} {int(cx)+10 if cx == "25" else int(cx)-10} {cy}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'

    elif pitch_type == "half":
        svg += f'<rect x="25" y="25" width="475" height="630" fill="none" stroke="{lc}" stroke-width="{lw}"/>'
        svg += f'<rect x="25" y="138" width="165" height="404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<rect x="25" y="236" width="55" height="208" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<rect x="10" y="305" width="15" height="70" fill="white" stroke="#111" stroke-width="1"/>'
        svg += f'<circle cx="135" cy="340" r="3" fill="white"/>'
        svg += f'<path d="M 190 276 A 91.5 91.5 0 0 1 190 404" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<line x1="500" y1="25" x2="500" y2="655" stroke="{lc}" stroke-width="{lw_thin}" stroke-dasharray="8,6"/>'

    elif pitch_type == "quarter":
        svg += f'<rect x="25" y="25" width="475" height="290" fill="none" stroke="{lc}" stroke-width="{lw}"/>'
        svg += f'<line x1="500" y1="25" x2="500" y2="315" stroke="{lc}" stroke-width="{lw_thin}" stroke-dasharray="8,6"/>'
        svg += f'<line x1="25" y1="315" x2="500" y2="315" stroke="{lc}" stroke-width="{lw_thin}" stroke-dasharray="8,6"/>'

    return svg


# ============ ABP Pitch (goal at bottom — matching ABPPitch.tsx) ============

ABP_PITCH_CONFIGS = {
    "abp_half": {"viewbox": "0 0 680 525", "width": 680, "height": 525},
    "abp_full": {"viewbox": "0 0 680 1050", "width": 680, "height": 1050},
}


def _svg_id(raw: str, fallback: str = "abp") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "", raw or "")
    return cleaned or fallback


def render_abp_pitch_svg(pitch_type: str = "abp_half", pattern_id: str = "abpGrass") -> str:
    """
    Render ABP football pitch SVG (goal at BOTTOM).
    Matches ABPPitch.tsx coordinate system exactly.
    """
    config = ABP_PITCH_CONFIGS.get(pitch_type, ABP_PITCH_CONFIGS["abp_half"])
    vbW = config["width"]
    vbH = config["height"]
    is_half = pitch_type == "abp_half"
    pid = _svg_id(pattern_id, "abpGrass")

    grassColor = "#2D5016"
    grassLight = "#3D6B1E"
    lc = "#FFFFFF"
    lw = "2"
    lw_thin = "1.5"

    # Grass stripes (horizontal)
    svg = f'<defs><pattern id="{pid}" patternUnits="userSpaceOnUse" width="680" height="60">'
    svg += f'<rect width="680" height="30" fill="{grassColor}"/>'
    svg += f'<rect y="30" width="680" height="30" fill="{grassLight}"/>'
    svg += '</pattern></defs>'
    svg += f'<rect width="{vbW}" height="{vbH}" fill="url(#{pid})"/>'

    # Field boundaries (25-unit padding)
    L = 25
    R = vbW - 25   # 655
    T = 25
    B = 500 if is_half else 1025  # goal line
    FW = R - L      # 630
    CX = vbW / 2    # 340

    # Penalty area: 201.5 each side of center
    paL = CX - 201.5
    paR = CX + 201.5
    paT = B - 165

    # Goal area
    gaL = CX - 91.5
    gaR = CX + 91.5
    gaT = B - 55

    # Penalty spot
    penY = B - 110

    # Penalty arc
    arcR = 91.5
    dY = paT - penY
    arcHalfX = math.sqrt(arcR * arcR - dY * dY)
    arcX1 = CX - arcHalfX
    arcX2 = CX + arcHalfX

    # Goal posts
    gpL = CX - 36.5
    gpR = CX + 36.5

    # Field outline
    svg += f'<rect x="{L}" y="{T}" width="{FW}" height="{B - T}" fill="none" stroke="{lc}" stroke-width="{lw}"/>'

    # Centre line / half-field top line
    if is_half:
        svg += f'<line x1="{L}" y1="{T}" x2="{R}" y2="{T}" stroke="{lc}" stroke-width="{lw_thin}" stroke-dasharray="10,5" opacity="0.5"/>'
        svg += f'<circle cx="{CX}" cy="{T}" r="91.5" fill="none" stroke="{lc}" stroke-width="{lw_thin}" stroke-dasharray="10,5" opacity="0.5"/>'
    else:
        mid = vbH / 2
        svg += f'<line x1="{L}" y1="{mid}" x2="{R}" y2="{mid}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<circle cx="{CX}" cy="{mid}" r="91.5" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<circle cx="{CX}" cy="{mid}" r="3" fill="{lc}"/>'

    # Bottom penalty area
    svg += f'<rect x="{paL}" y="{paT}" width="{paR - paL}" height="{B - paT}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    # Goal area
    svg += f'<rect x="{gaL}" y="{gaT}" width="{gaR - gaL}" height="{B - gaT}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    # Penalty spot
    svg += f'<circle cx="{CX}" cy="{penY}" r="3" fill="{lc}"/>'
    # Penalty arc (outside box)
    svg += f'<path d="M {arcX1} {paT} A {arcR} {arcR} 0 0 1 {arcX2} {paT}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    # Goal (below goal line)
    svg += f'<rect x="{gpL}" y="{B}" width="{gpR - gpL}" height="15" fill="none" stroke="{lc}" stroke-width="3"/>'
    svg += f'<rect x="{gpL + 2}" y="{B}" width="{gpR - gpL - 4}" height="12" fill="{lc}" opacity="0.15"/>'

    # Corner arcs
    svg += f'<path d="M {L} {B - 10} A 10 10 0 0 0 {L + 10} {B}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    svg += f'<path d="M {R - 10} {B} A 10 10 0 0 0 {R} {B - 10}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    svg += f'<path d="M {L + 10} {T} A 10 10 0 0 0 {L} {T + 10}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
    svg += f'<path d="M {R} {T + 10} A 10 10 0 0 0 {R - 10} {T}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'

    # Full-field: top penalty area + goal
    if not is_half:
        topPaT = T + 165
        topPenY = T + 110
        topDY = topPenY - T  # not needed, we draw arc at topPaT
        topArcDY = topPaT - topPenY
        topArcHalfX = math.sqrt(arcR * arcR - topArcDY * topArcDY)
        svg += f'<rect x="{paL}" y="{T}" width="{paR - paL}" height="165" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<rect x="{gaL}" y="{T}" width="{gaR - gaL}" height="55" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<circle cx="{CX}" cy="{topPenY}" r="3" fill="{lc}"/>'
        svg += f'<path d="M {CX - topArcHalfX} {topPaT} A {arcR} {arcR} 0 0 0 {CX + topArcHalfX} {topPaT}" fill="none" stroke="{lc}" stroke-width="{lw_thin}"/>'
        svg += f'<rect x="{gpL}" y="{T - 15}" width="{gpR - gpL}" height="15" fill="none" stroke="{lc}" stroke-width="3"/>'

    return svg


def render_abp_diagram_svg(
    diagram_data: dict,
    width: str = "100%",
    height: str = "100%",
    diagram_id: str = "",
    *,
    horizontal_full: bool = False,
    name_by_element: Optional[dict] = None,
    include_trails: bool = True,
) -> str:
    """Render a complete ABP diagram with ABP pitch (goal at bottom).

    Coordinates match ABPPitch.tsx / the ABP editor (goal at bottom).
    If horizontal_full=True and pitch is full, rotate the whole diagram like
    the frontend editor (TV view: goals left/right) so players stay aligned.
    """
    _reset_arrow_counter()

    if not diagram_data:
        return ""

    snap = prepare_abp_playbook_snapshot(diagram_data, include_trails=include_trails)
    if not snap:
        snap = {
            "pitchType": diagram_data.get("pitchType") or "half",
            "elements": [],
            "arrows": [],
            "zones": [],
            "ghosts": [],
        }

    if name_by_element:
        for el in snap.get("elements") or []:
            name = name_by_element.get(str(el.get("id", "")))
            if name:
                el["jugador"] = name
        for el in snap.get("ghosts") or []:
            name = name_by_element.get(str(el.get("id", "")))
            if name:
                el["jugador"] = name

    pitch_type = snap.get("pitchType", "half")
    if pitch_type == "full":
        abp_type = "abp_full"
    else:
        abp_type = "abp_half"

    config = ABP_PITCH_CONFIGS.get(abp_type, ABP_PITCH_CONFIGS["abp_half"])
    vb_w = config["width"]
    vb_h = config["height"]
    pid = _svg_id(diagram_id or "abp")

    inner = render_abp_pitch_svg(abp_type, pattern_id=f"grass{pid}")

    for zone in snap.get("zones") or []:
        inner += _render_zone_svg(zone)
    for arrow in snap.get("arrows") or []:
        inner += render_arrow_svg(arrow, id_prefix=pid)
    for ghost in snap.get("ghosts") or []:
        inner += render_element_svg(ghost)
    for element in snap.get("elements") or []:
        inner += render_element_svg(element)

    # Full field horizontal: same transform as ABPPitch frontend
    if horizontal_full and abp_type == "abp_full":
        rotated = f'<g transform="translate({vb_h}, 0) rotate(90)">{inner}</g>'
        return (
            f'<svg width="{width}" height="{height}" viewBox="0 0 {vb_h} {vb_w}" '
            f'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" '
            f'style="display:block;">{rotated}</svg>'
        )

    viewbox = config["viewbox"]
    return (
        f'<svg width="{width}" height="{height}" viewBox="{viewbox}" '
        f'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" '
        f'style="display:block;">{inner}</svg>'
    )


def _diagram_has_content(data: Optional[dict]) -> bool:
    if not data:
        return False
    if (
        (data.get("elements") or [])
        or (data.get("arrows") or [])
        or (data.get("zones") or [])
    ):
        return True
    frames = data.get("frames")
    if isinstance(frames, list):
        for fr in frames:
            if not isinstance(fr, dict):
                continue
            if fr.get("elements") or fr.get("arrows") or fr.get("zones"):
                return True
    return False


def _el_pos(el: dict) -> dict:
    pos = el.get("position") or {}
    return {
        "x": float(pos.get("x", el.get("x", 0)) or 0),
        "y": float(pos.get("y", el.get("y", 0)) or 0),
    }


def prepare_board_snapshot(grafico_data: Optional[dict]) -> Optional[dict]:
    """Usa top-level o frame 0 (igual que TacticalBoardMini.staticBoardSnapshot)."""
    if not grafico_data or not isinstance(grafico_data, dict):
        return None
    top_has = bool(
        (grafico_data.get("elements") or [])
        or (grafico_data.get("arrows") or [])
        or (grafico_data.get("zones") or [])
    )
    if top_has:
        return {
            "pitchType": grafico_data.get("pitchType") or "half",
            "elements": grafico_data.get("elements") or [],
            "arrows": grafico_data.get("arrows") or [],
            "zones": grafico_data.get("zones") or [],
        }
    frames = grafico_data.get("frames")
    if isinstance(frames, list) and frames:
        f0 = frames[0] or {}
        return {
            "pitchType": grafico_data.get("pitchType") or "half",
            "elements": f0.get("elements") or [],
            "arrows": f0.get("arrows") or [],
            "zones": f0.get("zones") or [],
        }
    return {
        "pitchType": grafico_data.get("pitchType") or "half",
        "elements": [],
        "arrows": [],
        "zones": [],
    }


def prepare_abp_playbook_snapshot(
    diagram_data: Optional[dict],
    *,
    include_trails: bool = True,
) -> Optional[dict]:
    """Snapshot for player-facing ABP PDFs.

    Uses frame 0 (or top-level) for tokens, merges arrows/zones from every
    keyframe, and infers movement trails when a token travels between frames
    and no arrow already starts near it.
    """
    snap = prepare_board_snapshot(diagram_data)
    if not snap:
        return None

    frames = diagram_data.get("frames") if isinstance(diagram_data, dict) else None
    if not isinstance(frames, list):
        frames = []

    arrows_by_id: dict = {}

    def _put_arrows(arrs):
        for ar in arrs or []:
            if not isinstance(ar, dict):
                continue
            key = str(ar.get("id") or "")
            if not key:
                fr = ar.get("from") or {}
                to = ar.get("to") or {}
                key = f"{fr.get('x')},{fr.get('y')}->{to.get('x')},{to.get('y')}"
            arrows_by_id[key] = ar

    _put_arrows(snap.get("arrows"))
    for fr in frames:
        if isinstance(fr, dict):
            _put_arrows(fr.get("arrows"))

    zones = list(snap.get("zones") or [])
    if not zones:
        for fr in frames:
            if isinstance(fr, dict) and fr.get("zones"):
                zones = list(fr["zones"])
                break

    elements = list(snap.get("elements") or [])
    ghosts: list = []
    extra_arrows: list = []

    last_by_id: dict = {}
    if frames:
        last = frames[-1] if isinstance(frames[-1], dict) else {}
        for el in last.get("elements") or []:
            eid = str(el.get("id", ""))
            if eid:
                last_by_id[eid] = el

    existing_from = []
    for ar in arrows_by_id.values():
        fr = ar.get("from") or {}
        existing_from.append((float(fr.get("x", 0) or 0), float(fr.get("y", 0) or 0)))

    if include_trails and last_by_id:
        for el in elements:
            eid = str(el.get("id", ""))
            if eid not in last_by_id:
                continue
            start = _el_pos(el)
            end = _el_pos(last_by_id[eid])
            dist = math.hypot(end["x"] - start["x"], end["y"] - start["y"])
            if dist < 12:
                continue
            ghost = dict(last_by_id[eid])
            ghost["_pdf_ghost"] = True
            ghosts.append(ghost)
            if any(math.hypot(ax - start["x"], ay - start["y"]) < 18 for ax, ay in existing_from):
                continue
            extra_arrows.append({
                "id": f"trail-{eid}",
                "type": "movement",
                "from": start,
                "to": end,
                "color": "#FFFF00",
            })

    return {
        "pitchType": snap.get("pitchType") or "half",
        "elements": elements,
        "arrows": list(arrows_by_id.values()) + extra_arrows,
        "zones": zones,
        "ghosts": ghosts,
    }


def render_diagram_for_pdf(
    grafico_data: Optional[dict],
    diagram_id: str = "",
) -> tuple:
    """
    SVG optimizado para PDF reducido.
    - Medio campo: vertical (portería abajo), coords ABP 680×525
    - Campo entero: horizontal (rotado), 1050×680
    Returns: (svg_string, pitch_kind) where pitch_kind is 'half'|'full'|''
    """
    snap = prepare_board_snapshot(grafico_data)
    if not snap or not _diagram_has_content(snap):
        # Still show empty pitch of the right type if pitchType known
        if not snap:
            return "", ""
    pitch = (snap or {}).get("pitchType") or "half"
    is_full = pitch == "full"
    try:
        svg = render_abp_diagram_svg(
            snap or {"pitchType": pitch},
            width="100%",
            height="100%",
            diagram_id=diagram_id,
            horizontal_full=is_full,
        )
    except Exception:
        return "", ""
    return svg or "", ("full" if is_full else "half")


def render_diagram_thumbnail(
    grafico_data: Optional[dict],
    diagram_id: str = "",
) -> str:
    """Render a thumbnail using ABP pitch (matches editor coordinates)."""
    svg, _ = render_diagram_for_pdf(grafico_data, diagram_id=diagram_id)
    return svg


# ============ XML helpers ============

def _escape_xml(text: str) -> str:
    """Escape text for XML/SVG content."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


# ============ Player Rendering (Top-down cenital view) ============

def _get_peto_style(color: str) -> dict:
    """Get peto style for a given color. Falls back to sensible defaults."""
    if color in PETO_COLORS:
        return PETO_COLORS[color]
    # For unknown colors, use the color directly
    # Determine if light or dark for contrast
    try:
        r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        is_light = brightness > 128
    except (ValueError, IndexError):
        is_light = False

    return {
        "body": color,
        "head": color,
        "stroke": "#111" if is_light else "white",
        "label": "#111" if is_light else "white",
    }


ABP_ROLE_ABBREV = {
    "lanzador": "LAN",
    "bloqueador": "BLQ",
    "palo_corto": "PC",
    "palo_largo": "PL",
    "borde_area": "BA",
    "señuelo": "SEÑ",
    "rechace": "RCH",
    "referencia": "REF",
    "barrera": "BAR",
    "marcaje_zonal": "MZ",
    "marcaje_individual": "MI",
    "portero": "GK",
    "otro": "?",
}


def _abp_role_abbrev(rol: Optional[str]) -> Optional[str]:
    if not rol:
        return None
    if rol in ABP_ROLE_ABBREV:
        return ABP_ROLE_ABBREV[rol]
    if rol in ABP_ROLE_ABBREV.values():
        return rol
    return None


def render_element_svg(element: dict) -> str:
    """
    Render a diagram element as SVG.
    Players: role abbrev in the circle (ABP), name/dorsal as caption.
    """
    el_type = element.get("type", "player")
    pos = element.get("position", {})
    x = pos.get("x", element.get("x", 0))
    y = pos.get("y", element.get("y", 0))
    color = element.get("color", TEAM_COLORS.get("team1", "#3B82F6"))
    label = element.get("label", "")
    ghost = bool(element.get("_pdf_ghost"))
    opacity = ' opacity="0.38"' if ghost else ""

    if el_type in ("player", "opponent", "player_gk", "player_joker"):
        peto = _get_peto_style(color)
        role_abbrev = _abp_role_abbrev(element.get("rol"))
        circle_text = role_abbrev or (str(label) if label else "")
        name = (element.get("jugador") or "").strip()
        if role_abbrev:
            caption = name or (str(label) if label else "")
        else:
            caption = name or (str(element.get("rol") or "") if not label else "")
            if name and label and str(label) not in name:
                caption = name
        font_size = 11 if circle_text and len(str(circle_text)) > 2 else 14
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += (
            f'<circle cx="0" cy="0" r="16" fill="{peto["body"]}" '
            f'stroke="{peto["stroke"]}" stroke-width="2.5"/>'
        )
        if circle_text:
            svg += (
                f'<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" '
                f'font-family="Barlow Condensed,Arial,sans-serif" font-size="{font_size}" '
                f'fill="{peto["label"]}" font-weight="800">{_escape_xml(str(circle_text))}</text>'
            )
        caption_y = 26
        if caption:
            svg += (
                f'<text x="0" y="{caption_y}" text-anchor="middle" '
                f'font-family="Barlow Condensed,Arial,sans-serif" font-size="9" '
                f'fill="#FFFFFF" font-weight="700" '
                f'stroke="#111" stroke-width="2.4" paint-order="stroke">'
                f'{_escape_xml(str(caption))}</text>'
            )
            caption_y += 11
        if not ghost:
            for fn in (element.get("funciones") or [])[:3]:
                if not isinstance(fn, dict):
                    continue
                text = (fn.get("funcion") or "").strip()
                if not text:
                    continue
                if len(text) > 28:
                    text = text[:26] + "…"
                svg += (
                    f'<text x="0" y="{caption_y}" text-anchor="middle" '
                    f'font-family="Barlow Condensed,Arial,sans-serif" font-size="8" '
                    f'fill="#FDE68A" font-weight="600" '
                    f'stroke="#111" stroke-width="2" paint-order="stroke">'
                    f'{_escape_xml(text)}</text>'
                )
                caption_y += 10
        svg += "</g>"
        return svg

    if el_type == "text":
        font_size = int(element.get("size") or 13)
        fill = color or "#FFFFFF"
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += (
            f'<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Barlow Condensed,Arial,sans-serif" font-size="{font_size}" '
            f'fill="{fill}" font-weight="700" stroke="#111" stroke-width="2.2" '
            f'paint-order="stroke">{_escape_xml(str(label or ""))}</text>'
        )
        svg += "</g>"
        return svg

    if el_type == "cone":
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += f'<polygon points="0,-8 7,7 -7,7" fill="{color}" stroke="#000" stroke-width="1"/>'
        svg += "</g>"
        return svg

    if el_type == "ball":
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += '<circle cx="0" cy="0" r="7" fill="white" stroke="#333" stroke-width="1.5"/>'
        svg += '<circle cx="0" cy="0" r="2.5" fill="#333"/>'
        svg += "</g>"
        return svg

    if el_type == "mini_goal":
        rotation = element.get("rotation", 0)
        svg = f'<g transform="translate({x},{y}) rotate({rotation})"{opacity}>'
        svg += '<rect x="-20" y="-8" width="40" height="16" fill="white" stroke="#111" stroke-width="1.5"/>'
        for i in range(-15, 20, 10):
            svg += f'<line x1="{i}" y1="-8" x2="{i+5}" y2="8" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>'
        svg += "</g>"
        return svg

    if el_type == "mannequin":
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += f'<rect x="-7" y="-16" width="14" height="28" rx="4" fill="{color or "#374151"}" stroke="#111" stroke-width="1"/>'
        svg += f'<circle cx="0" cy="-20" r="6" fill="{color or "#374151"}" stroke="#111" stroke-width="1"/>'
        svg += "</g>"
        return svg

    if el_type in ("pole", "flag", "marker_disc", "hurdle", "ladder", "goal_large", "ball_cart"):
        svg = f'<g transform="translate({x},{y})"{opacity}>'
        svg += f'<rect x="-8" y="-8" width="16" height="16" rx="3" fill="{color or "#F59E0B"}" stroke="#111" stroke-width="1"/>'
        svg += "</g>"
        return svg

    return ""


# ============ Arrow Rendering (SVG markers) ============

ARROW_STYLES = {
    "movement": {"color": "#FFFF00", "stroke": 2.5, "dash": None, "head": "arrow", "shape": "straight"},
    "sprint": {"color": "#FF3B30", "stroke": 2.5, "dash": None, "head": "arrow", "shape": "zigzag", "amp": 4.5, "wl": 14},
    "pass": {"color": "#FFFFFF", "stroke": 2.5, "dash": "9,5", "head": "arrow", "shape": "straight"},
    "dribble": {"color": "#FFFFFF", "stroke": 2.5, "dash": None, "head": "arrow", "shape": "wave", "amp": 4, "wl": 22},
    "shot": {"color": "#FF9500", "stroke": 4.5, "dash": None, "head": "double", "shape": "straight"},
    "cross": {"color": "#34C759", "stroke": 2.5, "dash": "9,5", "head": "arrow", "shape": "curve"},
    "pressure": {"color": "#FF2D55", "stroke": 2.5, "dash": None, "head": "arrow", "shape": "wave", "amp": 3, "wl": 12},
    "block": {"color": "#AF52DE", "stroke": 3, "dash": None, "head": "bar", "shape": "straight"},
}


def _arrow_geometry(arrow: dict) -> dict:
    """Port of frontend arrowPaths.arrowGeometry — path + tip + angle."""
    from_pos = arrow.get("from") or {}
    to_pos = arrow.get("to") or {}
    x1 = float(from_pos.get("x", 0) or 0)
    y1 = float(from_pos.get("y", 0) or 0)
    x2 = float(to_pos.get("x", 0) or 0)
    y2 = float(to_pos.get("y", 0) or 0)
    arrow_type = arrow.get("type", "movement")
    style = ARROW_STYLES.get(arrow_type, ARROW_STYLES["movement"])
    length = math.hypot(x2 - x1, y2 - y1)
    head_size = style["stroke"] * 3.2
    if style["head"] == "bar":
        head_back = 0
    elif style["head"] == "double":
        head_back = head_size * 2.1
    else:
        head_back = head_size

    if length < 1:
        return {
            "d": f"M {x1} {y1} L {x2} {y2}",
            "tip": (x2, y2),
            "angle": 0.0,
            "style": style,
            "head_size": head_size,
            "mid": ((x1 + x2) / 2, (y1 + y2) / 2),
        }

    ux, uy = (x2 - x1) / length, (y2 - y1) / length
    px, py = -uy, ux
    end_x = x2 - ux * head_back
    end_y = y2 - uy * head_back
    draw_len = max(1.0, length - head_back)
    angle = math.atan2(uy, ux)
    shape = style["shape"]

    if shape == "curve":
        k = arrow.get("curvature")
        if k is None:
            k = 0.22
        cx = (x1 + end_x) / 2 + px * length * k
        cy = (y1 + end_y) / 2 + py * length * k
        d = f"M {x1} {y1} Q {cx} {cy} {end_x} {end_y}"
        angle = math.atan2(end_y - cy, end_x - cx)
    elif shape in ("wave", "zigzag"):
        amp = style.get("amp", 4)
        wl = style.get("wl", 18)
        cycles = max(1, round(draw_len / wl))
        parts = [f"M {x1} {y1}"]
        if shape == "wave":
            half = draw_len / (cycles * 2)
            sign = 1
            for i in range(cycles * 2):
                t0 = i * half
                t1 = (i + 1) * half
                xa, ya = x1 + ux * t0, y1 + uy * t0
                xb, yb = x1 + ux * t1, y1 + uy * t1
                c1x = xa + ux * (half / 3) + px * amp * sign
                c1y = ya + uy * (half / 3) + py * amp * sign
                c2x = xb - ux * (half / 3) + px * amp * sign
                c2y = yb - uy * (half / 3) + py * amp * sign
                parts.append(
                    f"C {c1x:.1f} {c1y:.1f} {c2x:.1f} {c2y:.1f} {xb:.1f} {yb:.1f}"
                )
                sign *= -1
        else:
            segments = cycles * 2
            seg = draw_len / segments
            for i in range(1, segments + 1):
                t = i * seg
                off = 0 if i == segments else (amp if i % 2 == 1 else -amp)
                parts.append(f"L {x1 + ux * t + px * off:.1f} {y1 + uy * t + py * off:.1f}")
        d = " ".join(parts)
    else:
        d = f"M {x1} {y1} L {end_x} {end_y}"

    return {
        "d": d,
        "tip": (x2, y2),
        "angle": angle,
        "style": style,
        "head_size": head_size,
        "mid": ((x1 + x2) / 2, (y1 + y2) / 2),
    }


def _arrow_head_points(tip: tuple, angle: float, size: float) -> str:
    a1 = angle - math.pi / 6
    a2 = angle + math.pi / 6
    return (
        f"{tip[0]},{tip[1]} "
        f"{tip[0] - size * math.cos(a1):.1f},{tip[1] - size * math.sin(a1):.1f} "
        f"{tip[0] - size * math.cos(a2):.1f},{tip[1] - size * math.sin(a2):.1f}"
    )


def render_arrow_svg(arrow: dict, id_prefix: str = "") -> str:
    """Render movement/pass/shot arrows matching the ABP editor styles."""
    geo = _arrow_geometry(arrow)
    style = geo["style"]
    color = arrow.get("color") or style["color"]
    width = style["stroke"]
    dash = f' stroke-dasharray="{style["dash"]}"' if style.get("dash") else ""
    tip = geo["tip"]
    angle = geo["angle"]
    head_size = geo["head_size"]

    svg = (
        f'<path d="{geo["d"]}" fill="none" stroke="{color}" stroke-width="{width}"'
        f'{dash} stroke-linecap="round" stroke-linejoin="round"/>'
    )

    if style["head"] == "arrow":
        svg += f'<polygon points="{_arrow_head_points(tip, angle, head_size)}" fill="{color}"/>'
    elif style["head"] == "double":
        svg += f'<polygon points="{_arrow_head_points(tip, angle, head_size)}" fill="{color}"/>'
        back = (
            tip[0] - math.cos(angle) * head_size * 1.25,
            tip[1] - math.sin(angle) * head_size * 1.25,
        )
        svg += f'<polygon points="{_arrow_head_points(back, angle, head_size)}" fill="{color}"/>'
    elif style["head"] == "bar":
        px, py = -math.sin(angle), math.cos(angle)
        half = head_size * 0.8
        svg += (
            f'<line x1="{tip[0] + px * half}" y1="{tip[1] + py * half}" '
            f'x2="{tip[0] - px * half}" y2="{tip[1] - py * half}" '
            f'stroke="{color}" stroke-width="{width + 1}" stroke-linecap="round"/>'
        )

    label = arrow.get("label")
    comment = (arrow.get("comment") or "").strip()
    mid_x, mid_y = geo["mid"]
    if label:
        svg += (
            f'<circle cx="{mid_x}" cy="{mid_y}" r="9.5" fill="rgba(0,0,0,0.72)" '
            f'stroke="{color}" stroke-width="1"/>'
            f'<text x="{mid_x}" y="{mid_y + 0.5}" text-anchor="middle" '
            f'dominant-baseline="middle" fill="#FFFFFF" font-size="9" font-weight="700" '
            f'font-family="Arial">{_escape_xml(str(label))}</text>'
        )
    if comment:
        shown = comment if len(comment) <= 36 else comment[:34] + "…"
        label_offset = 14 if label else 0
        svg += (
            f'<text x="{mid_x}" y="{mid_y + 16 + label_offset}" text-anchor="middle" '
            f'font-family="Barlow Condensed,Arial,sans-serif" font-size="8" '
            f'fill="#FFF7ED" font-weight="600" stroke="#111" stroke-width="2" '
            f'paint-order="stroke">{_escape_xml(shown)}</text>'
        )
    return svg


# ============ Zone Rendering ============

def _render_zone_svg(zone: dict) -> str:
    """Render a zone/area highlight (rectangle or ellipse)."""
    # Support both flat x/y and nested position:{x,y} formats
    pos = zone.get("position", {})
    x = pos.get("x", zone.get("x", 0))
    y = pos.get("y", zone.get("y", 0))
    w = zone.get("width", 100)
    h = zone.get("height", 100)
    color = zone.get("color", "rgba(46,204,113,0.08)")
    opacity = zone.get("opacity", 0.3)
    label = zone.get("label", "")
    shape = zone.get("shape", "rectangle")

    stroke_attrs = 'stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-dasharray="6,4"'

    if shape == "ellipse":
        cx = x + w / 2
        cy = y + h / 2
        rx = w / 2
        ry = h / 2
        svg = f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{color}" opacity="{opacity}" {stroke_attrs}/>'
    else:
        svg = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" opacity="{opacity}" {stroke_attrs}/>'

    if label:
        lx = x + w / 2
        ly = y + 15
        svg += f'<text x="{lx}" y="{ly}" font-family="Barlow Condensed,sans-serif" font-size="8" fill="rgba(255,255,255,0.5)" font-weight="600" text-anchor="middle">{_escape_xml(str(label))}</text>'
    return svg


# ============ Main Rendering ============

def render_diagram_svg(
    grafico_data: Optional[dict],
    width: str = "100%",
    height: str = "100%",
    diagram_id: str = "",
) -> str:
    """
    Render a complete diagram as an SVG string.

    Args:
        grafico_data: DiagramData JSON (pitchType, elements, arrows, zones)
        width: SVG width attribute (can be "100%" for fluid)
        height: SVG height attribute
        diagram_id: Unique prefix for marker IDs to avoid collisions

    Returns:
        Complete <svg> string
    """
    _reset_arrow_counter()

    if not grafico_data:
        grafico_data = {"pitchType": "full", "elements": [], "arrows": [], "zones": []}

    pitch_type = grafico_data.get("pitchType", "full")
    config = PITCH_CONFIGS.get(pitch_type, PITCH_CONFIGS["full"])
    viewbox = config["viewbox"]

    inner = ""
    # 1. Pitch (grass + lines)
    inner += render_pitch_svg(pitch_type)
    # 2. Zones (behind everything)
    for zone in grafico_data.get("zones", []):
        inner += _render_zone_svg(zone)
    # 3. Arrows (behind players)
    for arrow in grafico_data.get("arrows", []):
        inner += render_arrow_svg(arrow)
    # 4. Elements (players, cones, etc. on top)
    for element in grafico_data.get("elements", []):
        inner += render_element_svg(element)

    return f'<svg width="{width}" height="{height}" viewBox="{viewbox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display:block;">{inner}</svg>'
