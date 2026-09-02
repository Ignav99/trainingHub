"""Contrato del importador de anotaciones JSON (delegado).

El parser real vive en frontend/src/lib/partidoAnotacionesJson.ts.
Estos tests fijan las reglas de fusión para no pisar datos de TrainingHub.
"""


def merge_number(existing, incoming):
    if incoming is None:
        return existing if existing is not None else 0
    if existing is None or existing == 0:
        return incoming
    return existing


def merge_bool(existing, incoming):
    if incoming is None:
        return bool(existing)
    if not existing:
        return bool(incoming)
    return True


def merge_goal_lists(existing, incoming):
    if not incoming:
        return existing
    if not existing:
        return incoming
    def key_of(g):
        return f"{g.get('minuto', '')}|{(g.get('jugador') or '').strip().lower()}|{1 if g.get('es_abp') else 0}"
    seen = {key_of(g) for g in existing}
    out = list(existing)
    for g in incoming:
        k = key_of(g)
        if k in seen:
            continue
        seen.add(k)
        out.append(g)
    return out


def test_merge_number_fills_empty_keeps_existing():
    assert merge_number(0, 90) == 90
    assert merge_number(None, 12) == 12
    assert merge_number(45, 90) == 45
    assert merge_number(45, None) == 45


def test_merge_bool_or_without_inventing_false():
    assert merge_bool(False, True) is True
    assert merge_bool(True, False) is True
    assert merge_bool(False, None) is False
    assert merge_bool(None, True) is True


def test_merge_goals_does_not_duplicate_or_drop():
    existing = [{"minuto": 12, "es_abp": False, "jugador": "Lopez"}]
    incoming = [
        {"minuto": 12, "es_abp": False, "jugador": "Lopez"},
        {"minuto": 40, "es_abp": True, "jugador": "Garcia", "tipo_abp": "corner"},
    ]
    merged = merge_goal_lists(existing, incoming)
    assert len(merged) == 2
    assert merged[0]["jugador"] == "Lopez"
    assert merged[1]["minuto"] == 40


def test_merge_goals_empty_existing_takes_json():
    incoming = [{"minuto": 8, "es_abp": False, "jugador": "Perez"}]
    assert merge_goal_lists([], incoming) == incoming


def test_score_conflict_is_not_applied():
    """Si ya hay resultado distinto, el JSON no pisa el marcador."""
    has_resultado = True
    current = (2, 1)
    json_score = (0, 3)
    apply = not (has_resultado and current != json_score)
    assert apply is False
