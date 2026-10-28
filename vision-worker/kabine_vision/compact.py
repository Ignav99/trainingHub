"""JSON corto del partido, para que quepa en GitHub (la web corta en 25 MB).

El programa sigue trabajando con muestras `{t, px, py, x, y}`. En disco van
empaquetadas: la primera de cada track es absoluta y el resto son diferencias.
Así un partido entero se queda en unos pocos MB y se puede abrir igual.
"""

from __future__ import annotations

import json
from pathlib import Path

ENCODING = "pack1"
PHYSICAL_NOTE = "solo lo que se ve"
PACK_NOTE = (
    "pack1. track.s y ball van separados por ';'. "
    "La letra es P (solo píxel), F (césped), R (césped y velocidad rechazada), "
    "B (balón) o H (balón retenido). "
    "Números: tiempo en milisegundos, px y py en décimas de píxel, "
    "x e y en diezmilésimas del campo (1 = 105 m × 68 m). "
    "La primera muestra de cada serie es absoluta; las siguientes son diferencias. "
    "Después de una P, la siguiente F lleva x,y absolutos otra vez. "
    "Homografía: H en millonésimas, t en diferencias de milisegundos, a es 0/1 por fila. "
    "m en el track son los metros visibles. n es el número de muestras."
)


def dumps_document(doc: dict) -> str:
    payload = {
        "schema": doc.get("schema") or "kabine.vision.v0",
        "encoding": ENCODING,
        "pack": PACK_NOTE,
    }
    for key in (
        "metrics",
        "whistles",
        "kits",
        "roster",
        "source",
        "job",
        "our_team",
        "our_kit",
        "spans",
        "preview",
        "events",
        "phases",
        "reader",
    ):
        if key in doc:
            payload[key] = doc[key]
    metres = {
        int(row["track_id"]): round(float(row.get("visible_m") or 0), 2)
        for row in doc.get("physical") or []
        if isinstance(row, dict) and row.get("track_id") is not None
    }
    payload["tracks"] = [_pack_track(track, metres) for track in doc.get("tracks") or []]
    payload["ball"] = _pack_ball(doc.get("ball") or [])
    payload["homography"] = _pack_homography(doc.get("homography") or [])
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def unpack_document(raw: dict) -> dict:
    doc = {
        key: value
        for key, value in raw.items()
        if key not in {"encoding", "pack", "tracks", "ball", "homography", "physical"}
    }
    tracks = [_unpack_track(track) for track in raw.get("tracks") or []]
    doc["tracks"] = tracks
    doc["ball"] = _unpack_ball(raw.get("ball") or "")
    doc["homography"] = _unpack_homography(raw.get("homography") or [])
    doc["physical"] = [
        {"track_id": track["id"], "visible_m": track.pop("_m"), "note": PHYSICAL_NOTE}
        for track in tracks
        if track.get("role") == "player"
    ]
    for track in tracks:
        track.pop("_m", None)
    return doc


def atomic_write_document(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(dumps_document(doc), encoding="utf-8")
    temporary.replace(path)


def read_document(path: Path, *, repack: bool = False, metrics_fn=None) -> dict | None:
    """Lee el JSON del disco. Si es el formato largo, lo reescribe en pack1."""
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return None
    if data.get("encoding") == ENCODING:
        return unpack_document(data)
    if metrics_fn is not None and not data.get("metrics"):
        data["metrics"] = metrics_fn(data)
    if repack:
        before = path.stat().st_size
        atomic_write_document(path, data)
        after = path.stat().st_size
        fits = "cabe en la subida de GitHub" if after < 25 * 1024 * 1024 else "sigue por encima de 25 MB"
        print(f"Visión comprimió {path}: {_mb(before)} → {_mb(after)} ({fits}).", flush=True)
        _repack_program_copy(data, sidecar=path)
    return data


def _repack_program_copy(doc: dict, *, sidecar: Path) -> None:
    other = (doc.get("preview") or {}).get("program_path")
    if not other:
        return
    program = Path(other)
    if program.resolve() == sidecar.resolve() or not program.is_file():
        return
    try:
        saved = json.loads(program.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(saved, dict) or saved.get("encoding") == ENCODING:
        return
    before = program.stat().st_size
    if "metrics" not in saved and "metrics" in doc:
        saved["metrics"] = doc["metrics"]
    atomic_write_document(program, saved)
    print(
        f"Visión comprimió la copia del programa {program}: {_mb(before)} → {_mb(program.stat().st_size)}.",
        flush=True,
    )


def _mb(size: int) -> str:
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    return f"{max(1, size // 1024)} KB"


def _pack_track(track: dict, metres: dict[int, float]) -> dict:
    samples = track.get("samples") or []
    if not isinstance(samples, list):
        raise ValueError("el track tiene que traer la lista de muestras")
    packed: dict = {"id": track.get("id"), "role": track.get("role") or "player", "n": len(samples)}
    if track.get("team") is not None:
        packed["team"] = track["team"]
    if track.get("dorsal") is not None:
        packed["dorsal"] = track["dorsal"]
    visible = metres.get(int(track["id"])) if track.get("id") is not None else None
    if visible:
        packed["m"] = visible
    packed["s"] = _pack_player_samples(samples)
    return packed


def _unpack_track(track: dict) -> dict:
    expanded = {
        "id": track.get("id"),
        "team": track.get("team"),
        "role": track.get("role") or "player",
        "dorsal": track.get("dorsal"),
        "samples": _unpack_player_samples(str(track.get("s") or "")),
        "_m": round(float(track.get("m") or 0), 2),
    }
    return expanded


def _pack_player_samples(samples: list) -> str:
    prev: tuple | None = None
    parts: list[str] = []
    for sample in samples:
        t, px, py = _pixel_triple(sample)
        has_xy = sample.get("x") is not None and sample.get("y") is not None
        x = int(round(float(sample["x"]) * 10000)) if has_xy else None
        y = int(round(float(sample["y"]) * 10000)) if has_xy else None
        rejected = bool(sample.get("rejected_speed")) and has_xy
        if prev is None:
            nums = [t, px, py]
        else:
            nums = [t - prev[0], px - prev[1], py - prev[2]]
        kind = "P"
        if has_xy:
            if prev is None or prev[3] is None:
                nums.extend([x, y])
            else:
                nums.extend([x - prev[3], y - prev[4]])
            kind = "R" if rejected else "F"
        parts.append(kind + ",".join(str(number) for number in nums))
        prev = (t, px, py, x, y)
    return ";".join(parts)


def _unpack_player_samples(blob: str) -> list[dict]:
    if not blob:
        return []
    samples: list[dict] = []
    prev: tuple | None = None
    for record in blob.split(";"):
        kind = record[0]
        nums = [int(piece) for piece in record[1:].split(",") if piece != ""]
        if prev is None:
            t, px, py = nums[0], nums[1], nums[2]
            rest = nums[3:]
        else:
            t = prev[0] + nums[0]
            px = prev[1] + nums[1]
            py = prev[2] + nums[2]
            rest = nums[3:]
        sample = {"t": round(t / 1000, 3), "px": round(px / 10, 2), "py": round(py / 10, 2)}
        x = y = None
        if kind in {"F", "R"}:
            if prev is None or prev[3] is None:
                x, y = rest[0], rest[1]
            else:
                x = prev[3] + rest[0]
                y = prev[4] + rest[1]
            sample["x"] = round(x / 10000, 4)
            sample["y"] = round(y / 10000, 4)
            if kind == "R":
                sample["rejected_speed"] = True
        samples.append(sample)
        prev = (t, px, py, x, y)
    return samples


def _pixel_triple(sample: dict) -> tuple[int, int, int]:
    return (
        int(round(float(sample["t"]) * 1000)),
        int(round(float(sample["px"]) * 10)),
        int(round(float(sample["py"]) * 10)),
    )


def _pack_ball(samples: list) -> str:
    prev: tuple | None = None
    parts: list[str] = []
    for sample in samples:
        t = int(round(float(sample["t"]) * 1000))
        x = int(round(float(sample["x"]) * 10000))
        y = int(round(float(sample["y"]) * 10000))
        if prev is None:
            nums = [t, x, y]
        else:
            nums = [t - prev[0], x - prev[1], y - prev[2]]
        kind = "H" if sample.get("held") else "B"
        parts.append(kind + ",".join(str(number) for number in nums))
        prev = (t, x, y)
    return ";".join(parts)


def _unpack_ball(blob: str) -> list[dict]:
    if not blob:
        return []
    samples: list[dict] = []
    prev: tuple | None = None
    for record in blob.split(";"):
        kind = record[0]
        nums = [int(piece) for piece in record[1:].split(",") if piece != ""]
        if prev is None:
            t, x, y = nums
        else:
            t = prev[0] + nums[0]
            x = prev[1] + nums[1]
            y = prev[2] + nums[2]
        samples.append({
            "t": round(t / 1000, 3),
            "x": round(x / 10000, 4),
            "y": round(y / 10000, 4),
            "in_air": None,
            "held": kind == "H",
        })
        prev = (t, x, y)
    return samples


def _pack_homography(rows: list) -> list[dict]:
    groups: list[dict] = []
    for row in rows:
        if not isinstance(row, dict) or row.get("t") is None or not row.get("H"):
            continue
        key = tuple(int(round(float(value) * 1_000_000)) for value in row["H"])
        stamp = int(round(float(row["t"]) * 1000))
        flag = "1" if row.get("accepted") else "0"
        if groups and groups[-1]["key"] == key:
            groups[-1]["t"].append(stamp)
            groups[-1]["a"].append(flag)
        else:
            groups.append({"key": key, "t": [stamp], "a": [flag]})
    packed = []
    for group in groups:
        stamps = group["t"]
        deltas = [stamps[0]] + [stamps[index] - stamps[index - 1] for index in range(1, len(stamps))]
        packed.append({
            "H": list(group["key"]),
            "t": ",".join(str(delta) for delta in deltas),
            "a": "".join(group["a"]),
        })
    return packed


def _unpack_homography(groups: list) -> list[dict]:
    rows: list[dict] = []
    for group in groups:
        matrix = [round(int(value) / 1_000_000, 6) for value in group["H"]]
        deltas = [int(piece) for piece in str(group["t"]).split(",") if piece != ""]
        flags = str(group["a"])
        stamp = 0
        for index, delta in enumerate(deltas):
            stamp = delta if index == 0 else stamp + delta
            rows.append({
                "t": round(stamp / 1000, 3),
                "H": list(matrix),
                "accepted": flags[index] == "1",
            })
    return rows
