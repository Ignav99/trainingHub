from app.api.v1.sesiones import (
    DuplicarYEditarTareaRequest,
    _build_session_variant_row,
    _copy_tarea_columns,
    _ensure_required_tarea_fields,
    _is_madre,
    _sanitize_tarea_constraints,
    _should_fork_tarea,
)


class TestDuplicarYEditarTareaRequest:
    def test_accepts_creator_ficha_fields(self):
        req = DuplicarYEditarTareaRequest(
            titulo="Rondo 4+3",
            modalidad="global",
            categoria_id="RND",
            num_porteros=2,
            orientaciones_fisicas=["resistencia"],
            etiquetas_fisicas=["RSA"],
            complejidad="Alta",
            dificultad=4,
            complejidad_go=4,
            complejidad_pes=2,
            objetivos_tacticos=["amplitud"],
            objetivos_tecnicos=["pase"],
            tipo_variante="original",
            m2_por_jugador=80,
            tipo_esfuerzo="fuerza-resistencia",
            fc_esperada_min=140,
            fc_esperada_max=170,
            espacio_forma="rectangular",
        )
        dumped = req.model_dump(exclude_none=True)
        assert dumped["modalidad"] == "global"
        assert dumped["categoria_id"] == "RND"
        assert dumped["num_porteros"] == 2
        assert dumped["orientaciones_fisicas"] == ["resistencia"]
        assert dumped["etiquetas_fisicas"] == ["RSA"]
        assert dumped["objetivos_tacticos"] == ["amplitud"]
        assert dumped["m2_por_jugador"] == 80
        assert dumped["tipo_esfuerzo"] == "fuerza-resistencia"
        assert dumped["complejidad_go"] == 4
        assert dumped["complejidad_pes"] == 2


class TestCopyTareaColumns:
    def test_copies_creator_fields_and_skips_plantilla(self):
        original = {
            "titulo": "Rondo",
            "modalidad": "global",
            "num_porteros": 2,
            "orientaciones_fisicas": ["resistencia"],
            "etiquetas_fisicas": ["RSA"],
            "complejidad": "Alta",
            "objetivos_tacticos": ["amplitud"],
            "objetivos_tecnicos": ["pase"],
            "tipo_variante": "original",
            "es_plantilla": True,
            "creado_por": "user-1",
            "es_publica": True,
        }
        copied = _copy_tarea_columns(original)
        assert copied["modalidad"] == "global"
        assert copied["num_porteros"] == 2
        assert copied["orientaciones_fisicas"] == ["resistencia"]
        assert copied["objetivos_tacticos"] == ["amplitud"]
        assert "es_plantilla" not in copied
        assert "creado_por" not in copied
        assert "es_publica" not in copied


class TestSessionVariantFork:
    def test_madre_always_forks(self):
        assert _is_madre({"id": "m1"})
        assert _should_fork_tarea({"id": "m1", "es_plantilla": True})
        assert _should_fork_tarea({"id": "m1", "es_plantilla": False})

    def test_session_variant_updates_in_place(self):
        tarea = {"id": "v1", "tarea_origen_id": "m1", "es_plantilla": False}
        assert not _is_madre(tarea)
        assert not _should_fork_tarea(tarea)

    def test_shared_library_variant_forks(self):
        tarea = {"id": "v1", "tarea_origen_id": "m1", "es_plantilla": True}
        assert _should_fork_tarea(tarea)

    def test_fork_links_to_madre_and_keeps_title(self):
        original = {
            "id": "madre-1",
            "titulo": "(Editada) Rondo 4+3",
            "tipo_variante": "original",
            "modalidad": "global",
            "desarrollo": "base",
            "es_plantilla": True,
        }
        row = _build_session_variant_row(original, {"desarrollo": "nuevo"}, "user-1")
        assert row["tarea_origen_id"] == "madre-1"
        assert row["tipo_variante"] == "adaptacion"
        assert row["es_plantilla"] is False
        assert row["titulo"] == "Rondo 4+3"
        assert row["desarrollo"] == "nuevo"
        assert row["creado_por"] == "user-1"

    def test_fork_of_variant_keeps_madre_id(self):
        original = {
            "id": "var-1",
            "tarea_origen_id": "madre-1",
            "titulo": "Rondo estrecho",
            "tipo_variante": "espacio",
            "es_plantilla": True,
        }
        row = _build_session_variant_row(original, {"reglas": "2 toques"}, "user-1")
        assert row["tarea_origen_id"] == "madre-1"
        assert row["tipo_variante"] == "espacio"
        assert row["es_plantilla"] is False
        assert row["reglas"] == "2 toques"

    def test_duration_only_edit_does_not_wipe_titulo(self):
        original = {
            "id": "madre-1",
            "titulo": "Movilidad + activación",
            "tipo_variante": "original",
            "organizacion_id": "org-1",
            "equipo_id": "eq-1",
            "duracion_total": 8,
            "num_jugadores_min": 16,
            "es_plantilla": True,
        }
        row = _build_session_variant_row(
            original,
            {"titulo": "", "duracion_total": 12, "espacio_forma": "rectangular"},
            "user-1",
        )
        assert row["titulo"] == "Movilidad + activación"
        assert row["duracion_total"] == 12
        assert row["organizacion_id"] == "org-1"
        assert row["creado_por"] == "user-1"
        assert row["num_jugadores_min"] == 16

    def test_blank_original_titulo_gets_fallback(self):
        original = {"id": "madre-1", "titulo": None, "tipo_variante": "original"}
        row = _build_session_variant_row(original, {"duracion_total": 10}, "user-1")
        assert row["titulo"] == "Sin titulo"
        assert "titulo" in row
        assert row["titulo"] not in (None, "")

    def test_null_titulo_in_cambios_keeps_original(self):
        original = {
            "id": "madre-1",
            "titulo": "Circuito COD",
            "tipo_variante": "original",
            "duracion_total": 6,
        }
        row = _build_session_variant_row(
            original, {"titulo": None, "duracion_total": 7}, "user-1"
        )
        assert row["titulo"] == "Circuito COD"
        assert row["duracion_total"] == 7


class TestSanitizeDoesNotWipeTarea:
    def test_movilidad_without_space_keeps_titulo(self):
        data = {
            "titulo": "Movilidad cadera",
            "duracion_total": 10,
            "categoria_id": "MOV",
            "espacio_forma": "rectangular",
            "creado_por": "user-1",
            "organizacion_id": "org-1",
        }
        _sanitize_tarea_constraints(data)
        assert data["titulo"] == "Movilidad cadera"
        assert data["duracion_total"] == 10
        assert data["organizacion_id"] == "org-1"
        assert data["creado_por"] == "user-1"

    def test_fork_then_sanitize_keeps_required_fields(self):
        original = {
            "id": "madre-1",
            "titulo": "Activación MOV",
            "tipo_variante": "original",
            "organizacion_id": "org-1",
            "duracion_total": 8,
            "num_jugadores_min": 18,
            "es_plantilla": True,
        }
        row = _build_session_variant_row(original, {"duracion_total": 11}, "user-1")
        _sanitize_tarea_constraints(row)
        _ensure_required_tarea_fields(row, original, "user-1")
        assert row["titulo"] == "Activación MOV"
        assert row["duracion_total"] == 11
        assert row["organizacion_id"] == "org-1"
        assert row["num_jugadores_min"] == 18
        assert row["creado_por"] == "user-1"

    def test_ensure_restores_titulo_after_wipe(self):
        original = {
            "id": "madre-1",
            "titulo": "Movilidad",
            "organizacion_id": "org-1",
            "duracion_total": 8,
            "num_jugadores_min": 16,
        }
        wiped = {"es_plantilla": False, "espacio_forma": "rectangular"}
        _ensure_required_tarea_fields(wiped, original, "user-1")
        assert wiped["titulo"] == "Movilidad"
        assert wiped["organizacion_id"] == "org-1"
        assert wiped["duracion_total"] == 8
        assert wiped["num_jugadores_min"] == 16
        assert wiped["creado_por"] == "user-1"
