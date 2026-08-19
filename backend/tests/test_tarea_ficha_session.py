from app.api.v1.sesiones import (
    DuplicarYEditarTareaRequest,
    _build_session_variant_row,
    _copy_tarea_columns,
    _is_madre,
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
