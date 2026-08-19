from app.api.v1.sesiones import DuplicarYEditarTareaRequest, _copy_tarea_columns


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
