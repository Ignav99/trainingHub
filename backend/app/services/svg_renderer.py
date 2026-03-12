"""
TrainingHub Pro - SVG Renderer (v2 Professional)
Converts DiagramData JSON → SVG strings for PDF rendering.
Top-down player view (body ellipse + head circle), SVG markers for arrows,
professional grass stripes and field lines.
Pure Python, no external dependencies.
"""

import math
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


def render_abp_pitch_svg(pitch_type: str = "abp_half") -> str:
    """
    Render ABP football pitch SVG (goal at BOTTOM).
    Matches ABPPitch.tsx coordinate system exactly.
    """
    config = ABP_PITCH_CONFIGS.get(pitch_type, ABP_PITCH_CONFIGS["abp_half"])
    vbW = config["width"]
    vbH = config["height"]
    is_half = pitch_type == "abp_half"

    grassColor = "#2D5016"
    grassLight = "#3D6B1E"
    lc = "#FFFFFF"
    lw = "2"
    lw_thin = "1.5"

    # Grass stripes (horizontal)
    svg = f'<defs><pattern id="abpGrass" patternUnits="userSpaceOnUse" width="680" height="60">'
    svg += f'<rect width="680" height="30" fill="{grassColor}"/>'
    svg += f'<rect y="30" width="680" height="30" fill="{grassLight}"/>'
    svg += '</pattern></defs>'
    svg += f'<rect width="{vbW}" height="{vbH}" fill="url(#abpGrass)"/>'

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
) -> str:
    """Render a complete ABP diagram with ABP pitch (goal at bottom)."""
    _reset_arrow_counter()

    if not diagram_data:
        return ""

    pitch_type = diagram_data.get("pitchType", "half")
    # Map standard pitch types to ABP equivalents
    if pitch_type == "full":
        abp_type = "abp_full"
    else:
        abp_type = "abp_half"

    config = ABP_PITCH_CONFIGS.get(abp_type, ABP_PITCH_CONFIGS["abp_half"])
    viewbox = config["viewbox"]

    inner = render_abp_pitch_svg(abp_type)

    for zone in diagram_data.get("zones", []):
        inner += _render_zone_svg(zone)
    for arrow in diagram_data.get("arrows", []):
        inner += render_arrow_svg(arrow)
    for element in diagram_data.get("elements", []):
        inner += render_element_svg(element)

    return f'<svg width="{width}" height="{height}" viewBox="{viewbox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display:block;">{inner}</svg>'


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


def render_element_svg(element: dict) -> str:
    """
    Render a diagram element as SVG.
    Players use top-down cenital view: body ellipse + head circle.
    """
    el_type = element.get("type", "player")
    # Support both flat x/y and nested position:{x,y} formats
    pos = element.get("position", {})
    x = pos.get("x", element.get("x", 0))
    y = pos.get("y", element.get("y", 0))
    color = element.get("color", TEAM_COLORS.get("team1", "#3B82F6"))
    label = element.get("label", "")

    if el_type in ("player", "opponent", "player_gk"):
        peto = _get_peto_style(color)
        svg = f'<g transform="translate({x},{y})">'
        # Body (ellipse, slightly below center)
        svg += f'<ellipse cx="0" cy="5" rx="11" ry="8" fill="{peto["body"]}" stroke="{peto["stroke"]}" stroke-width="1.5"/>'
        # Head (circle, above body)
        svg += f'<circle cx="0" cy="-4" r="7" fill="{peto["head"]}" stroke="{peto["stroke"]}" stroke-width="1.5"/>'
        # Label inside body area
        if label:
            svg += f'<text x="0" y="-1" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-size="7" fill="{peto["label"]}" font-weight="700">{_escape_xml(str(label))}</text>'
        svg += "</g>"
        return svg

    elif el_type == "cone":
        svg = f'<g transform="translate({x},{y})">'
        svg += f'<polygon points="0,-8 7,7 -7,7" fill="{color}" stroke="#000" stroke-width="1"/>'
        svg += "</g>"
        return svg

    elif el_type == "ball":
        svg = f'<g transform="translate({x},{y})">'
        svg += '<circle cx="0" cy="0" r="7" fill="white" stroke="#333" stroke-width="1.5"/>'
        svg += '<circle cx="0" cy="0" r="2.5" fill="#333"/>'
        svg += "</g>"
        return svg

    elif el_type == "mini_goal":
        svg = f'<g transform="translate({x},{y})">'
        svg += '<rect x="-20" y="-8" width="40" height="16" fill="white" stroke="#111" stroke-width="1.5"/>'
        # Net pattern
        for i in range(-15, 20, 10):
            svg += f'<line x1="{i}" y1="-8" x2="{i+5}" y2="8" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>'
        svg += "</g>"
        return svg

    return ""


# ============ Arrow Rendering (SVG markers) ============

def render_arrow_svg(arrow: dict) -> str:
    """
    Render an arrow using SVG path + marker for arrowhead.
    Pass = dashed white, Movement = solid green/white.
    """
    from_pos = arrow.get("from", {})
    to_pos = arrow.get("to", {})
    x1 = from_pos.get("x", 0)
    y1 = from_pos.get("y", 0)
    x2 = to_pos.get("x", 0)
    y2 = to_pos.get("y", 0)
    color = arrow.get("color", "#FFFFFF")
    arrow_type = arrow.get("type", "movement")

    marker_id = _next_arrow_id()

    # Marker definition
    svg = f'<defs><marker id="{marker_id}" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">'
    svg += f'<path d="M0,0 L8,4 L0,8 Z" fill="{color}"/>'
    svg += '</marker></defs>'

    if arrow_type == "pass":
        # Dashed line for passes
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.5" stroke-dasharray="5,3" stroke-opacity="0.7" marker-end="url(#{marker_id})"/>'
    else:
        # Solid line for movements
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2.5" stroke-opacity="0.9" marker-end="url(#{marker_id})"/>'

    return svg


# ============ Zone Rendering ============

def _render_zone_svg(zone: dict) -> str:
    """Render a zone/area highlight."""
    x = zone.get("x", 0)
    y = zone.get("y", 0)
    w = zone.get("width", 100)
    h = zone.get("height", 100)
    color = zone.get("color", "rgba(46,204,113,0.08)")
    label = zone.get("label", "")

    svg = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-dasharray="6,4"/>'
    if label:
        cx = x + w / 2
        cy = y + 15
        svg += f'<text x="{cx}" y="{cy}" font-family="Barlow Condensed,sans-serif" font-size="8" fill="rgba(255,255,255,0.5)" font-weight="600" text-anchor="middle">{_escape_xml(str(label))}</text>'
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


def render_diagram_thumbnail(
    grafico_data: Optional[dict],
    diagram_id: str = "",
) -> str:
    """Render a thumbnail (fluid size, fits container)."""
    return render_diagram_svg(grafico_data, width="100%", height="100%", diagram_id=diagram_id)
