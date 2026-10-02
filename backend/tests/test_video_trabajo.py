from app.services.video_trabajo import trabajo_descripcion, video_trabajo_marks


def test_saved_mark_wins_over_an_old_local_session():
    marks = video_trabajo_marks([
        {"partido_id": "p1", "tipo": "local_session", "descripcion": None},
        {
            "partido_id": "p1",
            "tipo": "trabajo_marca",
            "descripcion": trabajo_descripcion("informe_rival", "Herrera"),
        },
        {"partido_id": "p2", "tipo": "local_session"},
        {"partido_id": None, "tipo": "local_session"},
    ])
    by_id = {mark["partido_id"]: mark for mark in marks}
    assert by_id["p1"] == {
        "partido_id": "p1",
        "modo": "informe_rival",
        "rival_visto": "Herrera",
    }
    assert by_id["p2"]["modo"] == "revision"
    assert None not in by_id


def test_revision_mark_drops_the_other_opponent():
    raw = trabajo_descripcion("revision", "Herrera")
    marks = video_trabajo_marks([
        {"partido_id": "p1", "tipo": "trabajo_marca", "descripcion": raw},
    ])
    assert marks == [{"partido_id": "p1", "modo": "revision", "rival_visto": None}]
