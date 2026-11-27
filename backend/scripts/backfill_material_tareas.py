#!/usr/bin/env python3
"""Rellena `tareas.material` donde esté vacío, con `sugerir_material`.

Seguro por diseño:
  * Por defecto es --dry-run: solo lee y escribe una propuesta (CSV + JSON).
  * --apply escribe. Antes guarda un backup JSON con los valores previos.
  * Nunca toca tareas que ya tienen material. Es idempotente (segunda pasada = 0 cambios).
  * --restore <backup.json> devuelve el material previo guardado en el backup.

Uso (desde backend/):
  python scripts/backfill_material_tareas.py                    # propuesta, no escribe
  python scripts/backfill_material_tareas.py --apply            # aplica
  python scripts/backfill_material_tareas.py --restore backup_material_tareas_<ts>.json
Usa la misma configuración de Supabase que la app (app.database.get_supabase).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.material import (  # noqa: E402
    _lista,
    nombre_material,
    sincronizar_materiales_sesiones_de_tarea,
)
from app.services.material_sugerido import sugerir_material  # noqa: E402

COLUMNAS = (
    "id, titulo, descripcion, desarrollo, reglas, anotaciones, estructura_equipos, "
    "num_jugadores_min, espacio_largo, espacio_ancho, equipamiento, grafico_data, material, "
    "categorias_tarea(codigo)"
)
PAGINA = 500


def leer_tareas(supabase) -> list[dict]:
    filas: list[dict] = []
    desde = 0
    while True:
        res = (
            supabase.table("tareas")
            .select(COLUMNAS)
            .order("id")
            .range(desde, desde + PAGINA - 1)
            .execute()
        )
        lote = res.data or []
        filas.extend(lote)
        if len(lote) < PAGINA:
            return filas
        desde += PAGINA


def construir_propuesta(tareas: list[dict]) -> list[dict]:
    propuesta = []
    for t in tareas:
        if _lista(t.get("material")):
            continue  # nunca sobrescribir
        sug = sugerir_material({**t, "categoria": t.get("categorias_tarea")})
        if not sug:
            continue
        cat = t.get("categorias_tarea") or {}
        propuesta.append(
            {
                "id": t["id"],
                "titulo": t.get("titulo"),
                "categoria": cat.get("codigo") if isinstance(cat, dict) else None,
                "material_previo": t.get("material") or [],
                "material_sugerido": sug,
            }
        )
    return propuesta


def escribir_propuesta(propuesta: list[dict], salida: Path, sello: str) -> tuple[Path, Path]:
    salida.mkdir(parents=True, exist_ok=True)
    ruta_json = salida / f"propuesta_material_tareas_{sello}.json"
    ruta_csv = salida / f"propuesta_material_tareas_{sello}.csv"
    ruta_json.write_text(json.dumps(propuesta, ensure_ascii=False, indent=2))
    with ruta_csv.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "titulo", "categoria", "material_sugerido"])
        for p in propuesta:
            w.writerow([p["id"], p["titulo"], p["categoria"], "; ".join(nombre_material(c) for c in p["material_sugerido"])])
    return ruta_json, ruta_csv


def aplicar(supabase, propuesta: list[dict], salida: Path, sello: str) -> int:
    backup = salida / f"backup_material_tareas_{sello}.json"
    backup.write_text(
        json.dumps({p["id"]: p["material_previo"] for p in propuesta}, ensure_ascii=False, indent=2)
    )
    if not backup.exists() or backup.stat().st_size == 0:
        raise SystemExit("No se pudo escribir el backup: abortado sin cambios.")
    print(f"Backup escrito: {backup}")
    hechas = 0
    for p in propuesta:
        supabase.table("tareas").update({"material": p["material_sugerido"]}).eq("id", p["id"]).execute()
        sincronizar_materiales_sesiones_de_tarea(supabase, p["id"])
        hechas += 1
    return hechas


def restaurar(supabase, ruta: Path) -> int:
    previos: dict[str, list] = json.loads(ruta.read_text())
    for tarea_id, material in previos.items():
        supabase.table("tareas").update({"material": material or []}).eq("id", tarea_id).execute()
        sincronizar_materiales_sesiones_de_tarea(supabase, tarea_id)
    return len(previos)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="(por defecto) solo escribe la propuesta")
    ap.add_argument("--apply", action="store_true", help="escribe en la base de datos (tras backup)")
    ap.add_argument("--restore", type=Path, help="restaura desde un backup JSON")
    ap.add_argument("--out-dir", type=Path, default=Path("material_backfill_out"))
    args = ap.parse_args()
    if args.apply and args.restore:
        ap.error("--apply y --restore son excluyentes")

    from app.database import get_supabase

    supabase = get_supabase()
    sello = datetime.now().strftime("%Y%m%d_%H%M%S")

    if args.restore:
        print(f"Restauradas {restaurar(supabase, args.restore)} tareas desde {args.restore}")
        return

    tareas = leer_tareas(supabase)
    propuesta = construir_propuesta(tareas)
    ruta_json, ruta_csv = escribir_propuesta(propuesta, args.out_dir, sello)
    sin_material = sum(1 for t in tareas if not _lista(t.get("material")))
    print(f"Tareas: {len(tareas)} · sin material: {sin_material} · con propuesta: {len(propuesta)}")
    print(f"Propuesta: {ruta_csv} / {ruta_json}")

    if not args.apply:
        print("Modo dry-run: no se ha escrito nada. Añade --apply para aplicar.")
        return
    print(f"Aplicadas {aplicar(supabase, propuesta, args.out_dir, sello)} tareas.")


if __name__ == "__main__":
    main()
