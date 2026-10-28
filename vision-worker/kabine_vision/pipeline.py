"""De un tramo con detecciones a un JSON kabine.vision.v0.

El detector (RF-DETR en el Mac) no vive aquí. Esta pieza recibe las cajas
y los puntos del campo y escribe tracks, balón, homografía y metros visibles.
"""

from __future__ import annotations

from collections import defaultdict

import numpy as np

from .homography import (
    BALL_MAX_SPEED_M_S,
    H_HOLD_S,
    MAX_SPEED_M_S,
    apply_h,
    blend_homography,
    dlt_homography,
    homography_keeps_center_on_pitch,
    homography_step_is_calm,
    length_is_pitch,
    on_pitch,
)
from .tracking import Box, Track, assign_teams, iou, keep_unique_dorsals, smooth_xy, step_metres, vote_dorsal, vote_team

SCHEMA = "kabine.vision.v0"
HOLD_BALL_FRAMES = 3
BALL_CONFIRM = 3


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
    last_accept_t: float | None = None
    last_ball_xy: tuple[float, float] | None = None
    last_ball_v: tuple[float, float] = (0.0, 0.0)
    last_ball_t: float | None = None
    ball_gap = 0
    ball_streak: list[tuple[float, tuple[float, float]]] = []
    ball_confirmed = False

    for t in sorted(by_t):
        frame = by_t[t]
        keypoints = [box for box in frame if box.kind == "keypoint" and box.pitch_xy is not None]
        fitted = _fit(keypoints, width, height)
        accepted = fitted is not None
        if fitted is not None and last_h is not None:
            calm = homography_step_is_calm(last_h, fitted, width, height)
            agrees = _calibration_agrees(fitted, tracks, t)
            if not calm or not agrees:
                fitted = None
                accepted = False
            else:
                blended = blend_homography(last_h, fitted)
                blend_ok = (
                    homography_step_is_calm(last_h, blended, width, height)
                    and homography_keeps_center_on_pitch(blended, width, height)
                    and _calibration_agrees(blended, tracks, t)
                )
                if blend_ok:
                    fitted = blended
        if fitted is None:
            held = (
                last_h is not None
                and last_accept_t is not None
                and t - last_accept_t <= H_HOLD_S
            )
            h = last_h if held else None
            if not held:
                last_h = None
        else:
            h = fitted
            last_h = fitted
            last_accept_t = t
        if h is not None:
            homographies.append({
                "t": t,
                "H": np.round(h.reshape(-1), 6).tolist(),
                "accepted": accepted,
            })

        bodies = [box for box in frame if box.kind in {"player", "referee"}]
        rejected = 0
        kept = 0
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
            flag = _touch(track, box, t, h)
            if flag == "reject":
                rejected += 1
            elif flag == "ok":
                kept += 1
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
            flag = _touch(track, box, t, h)
            if flag == "reject":
                rejected += 1
            elif flag == "ok":
                kept += 1
            tracks.append(track)
            if role == "player":
                alive_players += 1
            else:
                alive_referees += 1
        if h is not None and rejected >= 3 and rejected > kept:
            last_h = None
            last_accept_t = None

        anchor_xy = ball_streak[-1][1] if ball_streak else None
        anchor_t = ball_streak[-1][0] if ball_streak else None
        point = _plausible_ball(
            [box for box in frame if box.kind == "ball"],
            h,
            anchor_xy,
            anchor_t,
            t,
        )
        if point is not None:
            ball_streak.append((t, point))
            ball_streak = [(stamp, xy) for stamp, xy in ball_streak if t - stamp <= 0.45]
            if len(ball_streak) >= BALL_CONFIRM:
                fresh = ball_streak if not ball_confirmed else [(t, point)]
                for stamp, xy in fresh:
                    if ball and abs(float(ball[-1]["t"]) - stamp) < 1e-6:
                        continue
                    ball.append({
                        "t": stamp,
                        "x": _unit_x(xy[0]),
                        "y": _unit_y(xy[1]),
                        "in_air": None,
                        "held": False,
                    })
                if anchor_xy is not None and anchor_t is not None and t > anchor_t:
                    dt = t - anchor_t
                    last_ball_v = ((point[0] - anchor_xy[0]) / dt, (point[1] - anchor_xy[1]) / dt)
                ball_confirmed = True
                last_ball_xy = point
                last_ball_t = t
                ball_gap = 0
        elif (
            ball_confirmed
            and last_ball_xy is not None
            and last_ball_t is not None
            and ball_gap < HOLD_BALL_FRAMES
            and h is not None
            and float(np.hypot(*last_ball_v)) <= 20.0
        ):
            ball_gap += 1
            dt = 1.0 / fps if fps else 0.0
            held_point = (last_ball_xy[0] + last_ball_v[0] * dt, last_ball_xy[1] + last_ball_v[1] * dt)
            if on_pitch(held_point[0], held_point[1], margin_m=1.0):
                last_ball_xy = held_point
                last_ball_t = t
                ball_streak.append((t, held_point))
                ball.append({
                    "t": t,
                    "x": _unit_x(held_point[0]),
                    "y": _unit_y(held_point[1]),
                    "in_air": None,
                    "held": True,
                })
            else:
                ball_confirmed = False
                ball_streak = []
        else:
            ball_confirmed = False
            ball_streak = []

    assign_teams(tracks, our_kit, kits)
    keep_unique_dorsals(tracks)
    return {"tracks": tracks, "ball": ball, "homography": homographies}


def _link_score(track: Track, box: Box, t: float) -> float:
    if not _seen_recently(track, t, gap=2.0) and track.samples:
        return 0.0
    if track._last_box is None:
        return 0.0
    if (
        track.team is not None
        and box.team is not None
        and track.team != box.team
        and track._team_votes.get(track.team, 0) >= 2
    ):
        return 0.0
    overlap = iou(track._last_box, (box.px, box.py, box.w, box.h))
    ax, ay = _predicted_center(track, t)
    bx = box.px + box.w / 2.0
    by = box.py + box.h / 2.0
    dist = float(np.hypot(ax - bx, ay - by))
    gate = max(float(track._last_box[3]), float(box.h), 24.0) * 1.25
    if overlap < 0.05 and dist > gate:
        return 0.0
    color = 0.5
    if track.rgb is not None and box.rgb is not None:
        color = max(0.0, 1.0 - float(np.linalg.norm(np.subtract(track.rgb, box.rgb))) / 160.0)
    near = max(0.0, 1.0 - dist / gate) if gate else 0.0
    return 0.35 * overlap + 0.45 * near + 0.20 * color


def _predicted_center(track: Track, t: float) -> tuple[float, float]:
    x, y, w, h = track._last_box or (0.0, 0.0, 0.0, 0.0)
    cx = x + w / 2.0
    cy = y + h / 2.0
    if track._pixel_v is not None and track.samples:
        dt = min(0.4, max(0.0, t - float(track.samples[-1]["t"])))
        cx += track._pixel_v[0] * dt
        cy += track._pixel_v[1] * dt
    return cx, cy


def _calibration_agrees(h: np.ndarray, tracks: list[Track], t: float) -> bool:
    """Una calibración nueva no vale si los jugadores que ya seguimos salen disparados."""
    speeds: list[float] = []
    for track in tracks:
        if track.role != "player" or track._raw_xy is None or track._last_box is None or not track.samples:
            continue
        prev_t = float(track.samples[-1]["t"])
        dt = t - prev_t
        if dt <= 1e-6 or dt > 0.6:
            continue
        foot = track.foot()
        if foot is None:
            continue
        xy = apply_h(h, np.array([foot]))[0]
        dist = float(np.hypot(float(xy[0]) - track._raw_xy[0], float(xy[1]) - track._raw_xy[1]))
        speeds.append(dist / dt)
    if len(speeds) < 2:
        return True
    speeds.sort()
    return speeds[len(speeds) // 2] <= MAX_SPEED_M_S * 1.25


def _seen_recently(track: Track, t: float, gap: float = 1.5) -> bool:
    if not track.samples:
        return False
    return t - float(track.samples[-1]["t"]) <= gap


def _touch(track: Track, box: Box, t: float, h: np.ndarray | None) -> str:
    prev_c = None
    prev_t = float(track.samples[-1]["t"]) if track.samples else None
    if track._last_box is not None:
        x, y, w, h_box = track._last_box
        prev_c = (x + w / 2.0, y + h_box / 2.0)
    track._last_box = (box.px, box.py, box.w, box.h)
    if prev_c is not None and prev_t is not None and t > prev_t:
        dt = t - prev_t
        vx = (box.px + box.w / 2.0 - prev_c[0]) / dt
        vy = (box.py + box.h / 2.0 - prev_c[1]) / dt
        if abs(vx) < 2500 and abs(vy) < 2500:
            if track._pixel_v is None:
                track._pixel_v = (vx, vy)
            else:
                track._pixel_v = (0.5 * track._pixel_v[0] + 0.5 * vx, 0.5 * track._pixel_v[1] + 0.5 * vy)
    if box.rgb is not None:
        track.rgb = box.rgb
    vote_team(track, box.team)
    vote_dorsal(track, box.dorsal)
    return _record(track, box, t, h)


def _plausible_ball(
    balls: list[Box],
    h: np.ndarray | None,
    last_xy: tuple[float, float] | None,
    last_t: float | None,
    t: float,
) -> tuple[float, float] | None:
    """Se queda el balón que sigue en el césped y no atraviesa el campo de un fotograma a otro."""
    if h is None or not balls:
        return None
    best: tuple[float, tuple[float, float]] | None = None
    for box in balls:
        xy = apply_h(h, np.array([[box.px, box.py]]))[0]
        point = (float(xy[0]), float(xy[1]))
        if not on_pitch(point[0], point[1], margin_m=1.0):
            continue
        if last_xy is not None and last_t is not None and t > last_t:
            speed = float(np.hypot(point[0] - last_xy[0], point[1] - last_xy[1])) / (t - last_t)
            if speed > BALL_MAX_SPEED_M_S:
                continue
            rank = speed
        else:
            rank = float(np.hypot(point[0] - 52.5, point[1] - 34.0))
        if best is None or rank < best[0]:
            best = (rank, point)
    return None if best is None else best[1]


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


def _record(track: Track, box: Box, t: float, h: np.ndarray | None) -> str:
    foot = np.array([[box.px + box.w / 2.0, box.py + box.h]])
    sample: dict = {"t": t, "px": round(float(foot[0, 0]), 2), "py": round(float(foot[0, 1]), 2)}
    if h is None:
        track.samples.append(sample)
        return "pixel"
    xy = apply_h(h, foot)[0]
    raw = (float(xy[0]), float(xy[1]))
    prev_t = track.samples[-1]["t"] if track.samples else None
    off_pitch = not on_pitch(raw[0], raw[1], margin_m=6.0)
    too_fast = (
        track._raw_xy is not None
        and prev_t is not None
        and step_metres(track._raw_xy, raw, t - prev_t) is None
    )
    if off_pitch or too_fast:
        if track._smooth_xy is not None or track._raw_xy is not None:
            held = track._smooth_xy if track._smooth_xy is not None else track._raw_xy
            sample["x"] = _unit_x(held[0])
            sample["y"] = _unit_y(held[1])
            sample["rejected_speed"] = True
        track.samples.append(sample)
        return "reject"
    track._raw_xy = raw
    smoothed = smooth_xy(track._smooth_xy, raw)
    if track._smooth_xy is not None:
        track.visible_m += float(np.hypot(smoothed[0] - track._smooth_xy[0], smoothed[1] - track._smooth_xy[1]))
    track._smooth_xy = smoothed
    sample["x"] = _unit_x(smoothed[0])
    sample["y"] = _unit_y(smoothed[1])
    track.samples.append(sample)
    return "ok"


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
