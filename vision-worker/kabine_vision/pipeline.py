"""De un tramo con detecciones a un JSON kabine.vision.v0.

El detector (RF-DETR en el Mac) no vive aquí. Esta pieza recibe las cajas
y los puntos del campo y escribe tracks, balón, homografía y metros visibles.
"""

from __future__ import annotations

from collections import defaultdict

import numpy as np

from .homography import (
    apply_h,
    blend_homography,
    dlt_homography,
    homography_keeps_center_on_pitch,
    length_is_pitch,
)
from .tracking import Box, Track, assign_teams, iou, keep_unique_dorsals, smooth_xy, step_metres, vote_dorsal

SCHEMA = "kabine.vision.v0"
HOLD_BALL_FRAMES = 10


def run_span(
    boxes: list[Box],
    *,
    start_s: float,
    end_s: float,
    width: float,
    height: float,
    fps: float,
    our_kit: str = "white",
    kits: dict | None = None,
) -> dict:
    if end_s < start_s:
        raise ValueError("el final es anterior al inicio")
    chosen = [box for box in boxes if start_s - 1e-6 <= box.t <= end_s + 1e-6]
    return _assemble(
        _track_clean(chosen, width, height, fps, our_kit, kits),
        fps=fps,
        width=width,
        height=height,
        start_s=start_s,
        end_s=end_s,
        our_kit=our_kit,
    )


def _track_clean(boxes: list[Box], width: float, height: float, fps: float, our_kit: str, kits: dict | None) -> dict:
    by_t: dict[float, list[Box]] = defaultdict(list)
    for box in boxes:
        by_t[round(box.t, 3)].append(box)
    tracks: list[Track] = []
    next_id = 1
    homographies: list[dict] = []
    ball: list[dict] = []
    last_h: np.ndarray | None = None
    last_ball_xy: tuple[float, float] | None = None
    last_ball_v: tuple[float, float] = (0.0, 0.0)
    last_ball_t: float | None = None
    ball_gap = 0

    for t in sorted(by_t):
        frame = by_t[t]
        keypoints = [box for box in frame if box.kind == "keypoint" and box.pitch_xy is not None]
        fitted = _fit(keypoints, width, height)
        accepted = fitted is not None
        if fitted is not None and last_h is not None:
            blended = blend_homography(last_h, fitted)
            if homography_keeps_center_on_pitch(blended, width, height):
                fitted = blended
            else:
                accepted = False
                fitted = None
        if fitted is None:
            h = last_h
        else:
            h = fitted
            last_h = fitted
        if h is not None:
            homographies.append({
                "t": t,
                "H": np.round(h.reshape(-1), 6).tolist(),
                "accepted": accepted,
            })

        bodies = [box for box in frame if box.kind in {"player", "referee"}]
        used: set[int] = set()
        pairs: list[tuple[float, Track, Box]] = []
        for track in tracks:
            if track._last_box is None:
                continue
            for box in bodies:
                if track.kind != box.kind:
                    continue
                score = _link_score(track, box, t)
                if score >= 0.22:
                    pairs.append((score, track, box))
        pairs.sort(key=lambda item: item[0], reverse=True)
        taken_tracks: set[int] = set()
        for _score, track, box in pairs:
            if track.id in taken_tracks or id(box) in used:
                continue
            taken_tracks.add(track.id)
            used.add(id(box))
            _touch(track, box, t, h)
        alive_players = sum(1 for track in tracks if track.role == "player" and _seen_recently(track, t))
        alive_referees = sum(1 for track in tracks if track.role == "referee" and _seen_recently(track, t))
        for box in bodies:
            if id(box) in used:
                continue
            role = "referee" if box.kind == "referee" else "player"
            if role == "player" and alive_players >= 26:
                continue
            if role == "referee" and alive_referees >= 4:
                continue
            track = Track(id=next_id, kind=box.kind, role=role, rgb=box.rgb, team=box.team)
            next_id += 1
            _touch(track, box, t, h)
            tracks.append(track)
            if role == "player":
                alive_players += 1
            else:
                alive_referees += 1

        ball_box = next((box for box in frame if box.kind == "ball"), None)
        if ball_box is not None and h is not None:
            xy = apply_h(h, np.array([[ball_box.px, ball_box.py]]))[0]
            point = (float(xy[0]), float(xy[1]))
            if last_ball_xy is not None and last_ball_t is not None and t > last_ball_t:
                dt = t - last_ball_t
                last_ball_v = ((point[0] - last_ball_xy[0]) / dt, (point[1] - last_ball_xy[1]) / dt)
            last_ball_xy = point
            last_ball_t = t
            ball_gap = 0
            ball.append({
                "t": t,
                "x": _unit_x(point[0]),
                "y": _unit_y(point[1]),
                "in_air": None,
                "held": False,
            })
        elif last_ball_xy is not None and last_ball_t is not None and ball_gap < HOLD_BALL_FRAMES:
            ball_gap += 1
            dt = 1.0 / fps if fps else 0.0
            point = (last_ball_xy[0] + last_ball_v[0] * dt, last_ball_xy[1] + last_ball_v[1] * dt)
            last_ball_xy = point
            last_ball_t = t
            ball.append({
                "t": t,
                "x": _unit_x(point[0]),
                "y": _unit_y(point[1]),
                "in_air": None,
                "held": True,
            })

    assign_teams(tracks, our_kit, kits)
    keep_unique_dorsals(tracks)
    return {"tracks": tracks, "ball": ball, "homography": homographies}


def _link_score(track: Track, box: Box, t: float) -> float:
    if not _seen_recently(track, t, gap=1.2) and track.samples:
        return 0.0
    if track._last_box is None:
        return 0.0
    overlap = iou(track._last_box, (box.px, box.py, box.w, box.h))
    ax = track._last_box[0] + track._last_box[2] / 2.0
    ay = track._last_box[1] + track._last_box[3] / 2.0
    bx = box.px + box.w / 2.0
    by = box.py + box.h / 2.0
    dist = float(np.hypot(ax - bx, ay - by))
    gate = max(float(track._last_box[3]), float(box.h), 1.0) * 0.9
    if overlap < 0.05 and dist > gate:
        return 0.0
    color = 0.5
    if track.rgb is not None and box.rgb is not None:
        color = max(0.0, 1.0 - float(np.linalg.norm(np.subtract(track.rgb, box.rgb))) / 160.0)
    near = max(0.0, 1.0 - dist / gate) if gate else 0.0
    return 0.62 * overlap + 0.23 * near + 0.15 * color


def _seen_recently(track: Track, t: float, gap: float = 1.5) -> bool:
    if not track.samples:
        return False
    return t - float(track.samples[-1]["t"]) <= gap


def _touch(track: Track, box: Box, t: float, h: np.ndarray | None) -> None:
    track._last_box = (box.px, box.py, box.w, box.h)
    if box.rgb is not None:
        track.rgb = box.rgb
    if box.team is not None:
        track.team = box.team
    vote_dorsal(track, box.dorsal)
    _record(track, box, t, h)


def _fit(keypoints: list[Box], width: float, height: float) -> np.ndarray | None:
    if len(keypoints) < 4:
        return None
    src = np.array([[box.px, box.py] for box in keypoints], dtype=float)
    dst = np.array([box.pitch_xy for box in keypoints], dtype=float)
    try:
        h = dlt_homography(src, dst)
    except (ValueError, np.linalg.LinAlgError):
        return None
    if not homography_keeps_center_on_pitch(h, width, height):
        return None
    if not length_is_pitch(h, src[0], src[1], float(np.hypot(*(dst[0] - dst[1])))):
        return None
    return h


def _record(track: Track, box: Box, t: float, h: np.ndarray | None) -> None:
    foot = np.array([[box.px + box.w / 2.0, box.py + box.h]])
    sample: dict = {"t": t, "px": round(float(foot[0, 0]), 2), "py": round(float(foot[0, 1]), 2)}
    if h is None:
        track.samples.append(sample)
        return
    xy = apply_h(h, foot)[0]
    raw = (float(xy[0]), float(xy[1]))
    prev_t = track.samples[-1]["t"] if track.samples else None
    if track._raw_xy is not None and prev_t is not None:
        if step_metres(track._raw_xy, raw, t - prev_t) is None:
            held = track._smooth_xy if track._smooth_xy is not None else track._raw_xy
            sample["x"] = _unit_x(held[0])
            sample["y"] = _unit_y(held[1])
            sample["rejected_speed"] = True
            track.samples.append(sample)
            return
    track._raw_xy = raw
    smoothed = smooth_xy(track._smooth_xy, raw)
    if track._smooth_xy is not None:
        track.visible_m += float(np.hypot(smoothed[0] - track._smooth_xy[0], smoothed[1] - track._smooth_xy[1]))
    track._smooth_xy = smoothed
    sample["x"] = _unit_x(smoothed[0])
    sample["y"] = _unit_y(smoothed[1])
    track.samples.append(sample)


def _assemble(
    clean: dict,
    *,
    fps: float,
    width: float,
    height: float,
    start_s: float,
    end_s: float,
    our_kit: str,
) -> dict:
    tracks: list[Track] = clean["tracks"]
    return {
        "schema": SCHEMA,
        "source": {
            "path": "local",
            "fps": fps,
            "width": width,
            "height": height,
            "duration_s": round(end_s - start_s, 3),
        },
        "job": {"status": "done", "start_s": start_s, "end_s": end_s, "error": None},
        "our_team": 0,
        "our_kit": our_kit,
        "tracks": [
            {
                "id": track.id,
                "team": track.team,
                "role": track.role,
                "dorsal": track.dorsal,
                "samples": track.samples,
            }
            for track in tracks
        ],
        "ball": clean["ball"],
        "homography": clean["homography"],
        "events": [],
        "phases": [],
        "physical": [
            {
                "track_id": track.id,
                "visible_m": round(track.visible_m, 2),
                "note": "solo lo que se ve",
            }
            for track in tracks
            if track.role == "player"
        ],
    }


def _unit_x(meters: float) -> float:
    return round(meters / 105.0, 4)


def _unit_y(meters: float) -> float:
    return round(meters / 68.0, 4)
