from app.services.task_load_metrics import apply_auto_load, compute_task_load_metrics


class TestApplyAutoLoadCopy:
    def test_returns_copy_when_metrics_cannot_be_computed(self):
        original = {"titulo": "Movilidad cadera", "duracion_total": 8, "categoria_id": "MOV"}
        loaded = apply_auto_load(original)
        assert loaded is not original
        assert loaded["titulo"] == "Movilidad cadera"
        original["titulo"] = "mutated"
        assert loaded["titulo"] == "Movilidad cadera"

    def test_overlays_metrics_without_dropping_titulo(self):
        original = {
            "titulo": "Rondo 4v2",
            "espacio_largo": 20,
            "espacio_ancho": 20,
            "num_jugadores_min": 6,
            "num_porteros": 0,
            "espacio_forma": "rectangular",
        }
        loaded = apply_auto_load(original)
        assert loaded is not original
        assert loaded["titulo"] == "Rondo 4v2"
        metrics = compute_task_load_metrics(
            espacio_largo=20,
            espacio_ancho=20,
            num_jugadores=6,
            num_porteros=0,
            espacio_forma="rectangular",
        )
        assert metrics is not None
        assert loaded["densidad"] == metrics["densidad"]
        assert loaded["m2_por_jugador"] == metrics["m2_por_jugador"]
