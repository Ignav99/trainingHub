"""Comentarios Rival (coach notes) must persist on rivales.scout_manual."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_extract_persistent_scout_keeps_comentarios_rival():
    src = (ROOT / "frontend/src/lib/rivalScoutSync.ts").read_text()
    extract = src.split("export function extractPersistentScout")[1].split(
        "export function extractWeeklyContext"
    )[0]
    assert "notas: estrategia.notas" in extract
    assert "dimensiones_campo: estrategia.dimensiones_campo" in extract
    assert "actitud_estilo: estrategia.actitud_estilo" in extract


def test_merge_scout_prefers_saved_comentarios_over_empty_weekly():
    src = (ROOT / "frontend/src/lib/rivalScoutSync.ts").read_text()
    merge = src.split("export function mergeScoutOnLoad")[1].split(
        "export type RivalOnceProbable"
    )[0]
    assert "pickText(saved.estrategia?.notas, weekly.notas)" in merge
    assert "weekly.notas ?? ''" not in merge


def test_informe_autosave_uses_persistent_extract():
    tab = (ROOT / "frontend/src/components/rivales/RivalInformeTab.tsx").read_text()
    assert "extractPersistentScout(scout)" in tab
    scout_ui = (ROOT / "frontend/src/components/microciclos/RivalScout.tsx").read_text()
    assert "Comentarios Rival" in scout_ui
    assert "estrategia.notas" in scout_ui


def test_put_scout_manual_stores_body_as_is():
    src = (ROOT / "backend/app/api/v1/rivales.py").read_text()
    put = src.split("async def put_scout_manual")[1].split("async def get_plan_partido_manual")[0]
    assert '"scout_manual": body' in put
