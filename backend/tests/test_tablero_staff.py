"""Tablero del cuerpo técnico: menciones, avisos, tareas y actividad."""

from datetime import datetime, timedelta, timezone

import pytest

from app.services import staff_board_service as tb
from tests.fake_supabase import FakeSupabase

EQ = "eeeeeeee-0000-0000-0000-000000000001"
OTRO_EQ = "eeeeeeee-0000-0000-0000-000000000002"
ANA = "aaaaaaaa-0000-0000-0000-000000000001"
LUIS = "bbbbbbbb-0000-0000-0000-000000000002"
PACO = "cccccccc-0000-0000-0000-000000000003"
JUGADOR = "dddddddd-0000-0000-0000-000000000004"
FUERA = "ffffffff-0000-0000-0000-000000000005"


def tok(nombre, uid):
    return f"@[{nombre}]({uid})"


def db():
    fake = FakeSupabase({
        "usuarios_equipos": [
            {"usuario_id": ANA, "equipo_id": EQ, "rol_en_equipo": "entrenador_principal"},
            {"usuario_id": LUIS, "equipo_id": EQ, "rol_en_equipo": "analista"},
            {"usuario_id": PACO, "equipo_id": EQ, "rol_en_equipo": "preparador_fisico"},
            {"usuario_id": JUGADOR, "equipo_id": EQ, "rol_en_equipo": "jugador"},
            {"usuario_id": FUERA, "equipo_id": OTRO_EQ, "rol_en_equipo": "analista"},
        ],
        "usuarios": [],
        "staff_posts": [],
        "notificaciones": [],
        "sesiones": [{"titulo": "Activación", "fecha": "2026-11-07", "equipo_id": EQ}],
    })
    for uid, nombre, apellidos in [
        (ANA, "Ana", "Ruiz Gil"), (LUIS, "Luis", "Mora"), (PACO, "Paco", "Vela"),
        (JUGADOR, "Juan", "Pérez"), (FUERA, "Eva", "Sanz"),
    ]:
        fake.tables["usuarios"].append({"id": uid, "nombre": nombre, "apellidos": apellidos, "activo": True})
    return fake


ACTOR_ANA = {"id": ANA, "nombre": "Ana", "apellidos": "Ruiz Gil"}
ACTOR_LUIS = {"id": LUIS, "nombre": "Luis", "apellidos": "Mora"}


def notifs(fake, uid=None):
    filas = fake.tables["notificaciones"]
    return [n for n in filas if uid is None or n["usuario_id"] == uid]


# ─── Menciones ────────────────────────────────────────────────────────────────

def test_menciones_se_extraen_en_orden_y_sin_repetir():
    texto = f"Hola {tok('Luis Mora', LUIS)} y {tok('Paco', PACO)}, {tok('Luis Mora', LUIS)} otra vez"
    assert tb.extraer_menciones(texto) == [LUIS, PACO]
    assert tb.texto_plano(texto) == "Hola @Luis Mora y @Paco, @Luis Mora otra vez"


def test_mencion_a_alguien_de_fuera_queda_como_texto():
    texto, menciones = tb.limpiar_menciones(f"{tok('Eva', FUERA)} mira esto", {LUIS, PACO})
    assert texto == "@Eva mira esto"
    assert menciones == []


def test_staff_excluye_jugadores_y_otros_equipos():
    ids = [m["id"] for m in tb.miembros_staff(db(), EQ)]
    assert ids == [ANA, LUIS, PACO]


# ─── A quién se avisa ─────────────────────────────────────────────────────────

def test_asignacion_gana_a_mencion_y_nunca_se_avisa_al_autor():
    avisos = tb.destinatarios_post_nuevo(tb.ContextoPost(
        actor_id=ANA, tipo="tarea", menciones=[LUIS, ANA, JUGADOR],
        staff_ids=[ANA, LUIS, PACO], asignado_a=LUIS, actor_nombre="Ana Ruiz",
    ))
    assert [(a.usuario_id, a.tipo) for a in avisos] == [(LUIS, "tarea_asignada")]
    assert avisos[0].titulo == "Ana Ruiz te ha asignado una tarea"


def test_aviso_llega_a_todo_el_staff_y_pregunta_sin_mencion_tambien():
    staff = [ANA, LUIS, PACO]
    aviso = tb.destinatarios_post_nuevo(tb.ContextoPost(actor_id=ANA, tipo="aviso", menciones=[], staff_ids=staff))
    assert {(a.usuario_id, a.tipo) for a in aviso} == {(LUIS, "aviso_staff"), (PACO, "aviso_staff")}

    pregunta = tb.destinatarios_post_nuevo(tb.ContextoPost(actor_id=ANA, tipo="pregunta", menciones=[], staff_ids=staff))
    assert {a.tipo for a in pregunta} == {"pregunta_staff"}

    dirigida = tb.destinatarios_post_nuevo(
        tb.ContextoPost(actor_id=ANA, tipo="pregunta", menciones=[PACO], staff_ids=staff)
    )
    assert [(a.usuario_id, a.tipo) for a in dirigida] == [(PACO, "mencion")]

    comentario = tb.destinatarios_post_nuevo(tb.ContextoPost(actor_id=ANA, tipo="comentario", menciones=[], staff_ids=staff))
    assert comentario == []


def test_respuesta_avisa_al_autor_y_a_quien_participa():
    avisos = tb.destinatarios_post_nuevo(tb.ContextoPost(
        actor_id=PACO, tipo="comentario", menciones=[], staff_ids=[ANA, LUIS, PACO],
        raiz={"autor_id": ANA, "tipo": "pregunta"}, participantes_hilo=[LUIS, PACO], actor_nombre="Paco",
    ))
    assert [(a.usuario_id, a.titulo) for a in avisos] == [
        (ANA, "Paco ha respondido a tu pregunta"),
        (LUIS, "Paco ha respondido en un hilo en el que participas"),
    ]


# ─── Publicar, responder, cerrar ─────────────────────────────────────────────

def test_publicar_con_mencion_crea_notificacion_con_enlace():
    fake = db()
    hilo = tb.crear_post(fake, EQ, ACTOR_ANA, {
        "tipo": "pregunta",
        "contenido": f"{tok('Luis Mora', LUIS)} ¿tienes los cortes del rival? {tok('Eva', FUERA)}",
    })
    assert hilo["menciones"] == [LUIS]
    assert "@Eva" in hilo["contenido"] and FUERA not in hilo["contenido"]
    assert hilo["autor"]["nombre"] == "Ana"
    [n] = notifs(fake)
    assert n["usuario_id"] == LUIS and n["tipo"] == "mencion"
    assert n["url"] == f"/tablero?post={hilo['id']}"
    assert n["actor_id"] == ANA and n["equipo_id"] == EQ
    assert n["titulo"] == "Ana Ruiz te ha mencionado en una pregunta"
    assert n["contenido"].startswith("@Luis Mora ¿tienes")


def test_respuesta_cuelga_de_la_raiz_y_avisa_al_autor():
    fake = db()
    raiz = tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "comentario", "contenido": "Plan de la semana listo"})
    antes = raiz["ultima_actividad_at"]
    tb.crear_post(fake, EQ, ACTOR_LUIS, {"parent_id": raiz["id"], "contenido": "Perfecto", "tipo": "tarea"})
    hilo = tb.obtener_hilo(fake, EQ, raiz["id"])
    assert hilo["respuestas_count"] == 1
    assert hilo["respuestas"][0]["tipo"] == "comentario"
    assert hilo["ultima_actividad_at"] >= antes
    [n] = notifs(fake, ANA)
    assert n["tipo"] == "respuesta" and n["titulo"] == "Luis Mora ha respondido a tu comentario"

    respuesta_id = hilo["respuestas"][0]["id"]
    tb.crear_post(fake, EQ, {"id": PACO, "nombre": "Paco"}, {"parent_id": respuesta_id, "contenido": "Ok"})
    hilo = tb.obtener_hilo(fake, EQ, raiz["id"])
    assert hilo["respuestas_count"] == 2
    assert {n["usuario_id"] for n in notifs(fake) if n["tipo"] == "respuesta"} == {ANA, LUIS}


def test_tarea_solo_se_asigna_a_staff_y_al_completarla_avisa():
    fake = db()
    with pytest.raises(tb.TableroError) as err:
        tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "tarea", "contenido": "x", "asignado_a": JUGADOR})
    assert err.value.status == 400

    tarea = tb.crear_post(fake, EQ, ACTOR_ANA, {
        "tipo": "tarea", "contenido": "Cortar el vídeo del rival", "asignado_a": LUIS, "fecha_limite": "2026-11-07",
    })
    assert tarea["asignado"]["id"] == LUIS and tarea["fecha_limite"] == "2026-11-07"
    assert [n["tipo"] for n in notifs(fake, LUIS)] == ["tarea_asignada"]

    hecha = tb.actualizar_post(fake, EQ, tarea["id"], ACTOR_LUIS, {"estado": "resuelta"})
    assert hecha["estado"] == "resuelta" and hecha["resuelto_por"]["id"] == LUIS
    assert [n["titulo"] for n in notifs(fake, ANA)] == ["Luis Mora ha completado tu tarea"]

    reabierta = tb.actualizar_post(fake, EQ, tarea["id"], ACTOR_ANA, {"estado": "abierta"})
    assert reabierta["estado"] == "abierta" and reabierta["resuelto_por"] is None


def test_solo_el_autor_edita_y_las_menciones_nuevas_avisan():
    fake = db()
    post = tb.crear_post(fake, EQ, ACTOR_ANA, {"contenido": "Revisad la carga"})
    with pytest.raises(tb.TableroError) as err:
        tb.actualizar_post(fake, EQ, post["id"], ACTOR_LUIS, {"contenido": "otra cosa"})
    assert err.value.status == 403

    editado = tb.actualizar_post(fake, EQ, post["id"], ACTOR_ANA, {"contenido": f"Revisad la carga {tok('Paco', PACO)}"})
    assert editado["editado_at"] and editado["menciones"] == [PACO]
    assert [n["tipo"] for n in notifs(fake, PACO)] == ["mencion"]
    tb.actualizar_post(fake, EQ, post["id"], ACTOR_ANA, {"contenido": f"Revisad {tok('Paco', PACO)} ya"})
    assert len(notifs(fake, PACO)) == 1


def test_borrar_solo_autor_o_primer_entrenador():
    fake = db()
    post = tb.crear_post(fake, EQ, ACTOR_LUIS, {"tipo": "aviso", "contenido": "Mañana se entrena a las 9"})
    assert len(notifs(fake)) == 2
    with pytest.raises(tb.TableroError):
        tb.borrar_post(fake, EQ, post["id"], PACO)
    tb.borrar_post(fake, EQ, post["id"], ANA, es_responsable=True)
    assert fake.tables["staff_posts"] == [] or all(p["id"] != post["id"] for p in fake.tables["staff_posts"])
    assert notifs(fake) == []


def test_enlazar_algo_de_otro_equipo_falla():
    fake = db()
    sesion_id = fake.tables["sesiones"][0]["id"]
    ok = tb.crear_post(fake, EQ, ACTOR_ANA, {"contenido": "Ojo", "entidad_tipo": "sesion", "entidad_id": sesion_id})
    assert ok["entidad_titulo"] == "Activación · 2026-11-07"
    assert ok["entidad_href"] == f"/sesiones/{sesion_id}"
    with pytest.raises(tb.TableroError) as err:
        tb.crear_post(fake, OTRO_EQ, {"id": FUERA, "nombre": "Eva"}, {
            "contenido": "x", "entidad_tipo": "sesion", "entidad_id": sesion_id,
        })
    assert err.value.status == 404


# ─── Listados ─────────────────────────────────────────────────────────────────

def test_filtros_mis_tareas_menciones_y_fijados():
    fake = db()
    t1 = tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "tarea", "contenido": "A", "asignado_a": LUIS})
    tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "tarea", "contenido": "B", "asignado_a": PACO})
    p = tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "pregunta", "contenido": "¿Quién lleva el GPS?"})
    tb.crear_post(fake, EQ, ACTOR_ANA, {"parent_id": p["id"], "contenido": f"{tok('Luis', LUIS)} tú"})
    fijo = tb.crear_post(fake, EQ, ACTOR_ANA, {"tipo": "aviso", "contenido": "Normas del vestuario"})
    tb.actualizar_post(fake, EQ, fijo["id"], ACTOR_LUIS, {"fijado": True})
    for i, row in enumerate(fake.tables["staff_posts"]):
        row["ultima_actividad_at"] = f"2026-11-0{i + 1}T10:00:00+00:00"

    mis = tb.listar_hilos(fake, EQ, LUIS, filtro="mis_tareas")["data"]
    assert [h["id"] for h in mis] == [t1["id"]]

    menciones = tb.listar_hilos(fake, EQ, LUIS, filtro="menciones")["data"]
    assert [h["id"] for h in menciones] == [p["id"]]

    todo = tb.listar_hilos(fake, EQ, LUIS)["data"]
    assert todo[0]["id"] == fijo["id"]
    assert len(todo) == 4

    preguntas = tb.listar_hilos(fake, EQ, LUIS, filtro="preguntas")["data"]
    assert [h["id"] for h in preguntas] == [p["id"]]

    r = tb.resumen(fake, EQ, LUIS)
    assert r["mis_tareas_total"] == 1 and r["tareas_abiertas"] == 2 and r["preguntas_abiertas_total"] == 1


def test_paginacion_por_ultima_actividad():
    fake = db()
    for i in range(5):
        tb.crear_post(fake, EQ, ACTOR_ANA, {"contenido": f"post {i}"})
    for i, row in enumerate(fake.tables["staff_posts"]):
        row["ultima_actividad_at"] = f"2026-11-0{i + 1}T10:00:00+00:00"
    p1 = tb.listar_hilos(fake, EQ, ANA, limite=2)
    assert [h["contenido"] for h in p1["data"]] == ["post 4", "post 3"]
    p2 = tb.listar_hilos(fake, EQ, ANA, limite=2, antes=p1["siguiente"])
    assert [h["contenido"] for h in p2["data"]] == ["post 2", "post 1"]


# ─── Actividad ────────────────────────────────────────────────────────────────

def test_autoguardados_seguidos_cuentan_como_una_entrada():
    base = datetime(2026, 11, 4, 18, 0, tzinfo=timezone.utc)
    registros = [
        {"id": str(i), "usuario_id": ANA, "accion": "actualizar", "entidad_tipo": "sesion",
         "entidad_id": "s1", "created_at": (base - timedelta(minutes=10 * i)).isoformat()}
        for i in range(6)
    ] + [
        {"id": "old", "usuario_id": ANA, "accion": "actualizar", "entidad_tipo": "sesion",
         "entidad_id": "s1", "created_at": (base - timedelta(hours=6)).isoformat()},
        {"id": "otro", "usuario_id": ANA, "accion": "actualizar", "entidad_tipo": "sesion",
         "entidad_id": "s-de-otro-equipo", "created_at": base.isoformat()},
        {"id": "login", "usuario_id": ANA, "accion": "login", "entidad_tipo": "auth",
         "entidad_id": None, "created_at": base.isoformat()},
    ]
    titulos = {("sesion", "s1"): {"titulo": "MD-1", "href": "/sesiones/s1"}}
    salida = tb.agrupar_actividad(registros, titulos, {ANA: {"id": ANA, "nombre": "Ana"}})
    assert [(e["cambios"], e["titulo"]) for e in salida] == [(6, "MD-1"), (1, "MD-1")]
    assert salida[0]["texto"] == "ha editado la sesión"
    assert salida[0]["usuario"]["nombre"] == "Ana"
