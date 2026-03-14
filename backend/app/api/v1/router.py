"""
TrainingHub Pro - API Router Principal
Agrupa todos los routers de la API v1.
"""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    tareas,
    sesiones,
    equipos,
    usuarios,
    recomendador,
    jugadores,
    rivales,
    partidos,
    microciclos,
    rpe,
    carga,
    wellness,
    convocatorias,
    estadisticas_partido,
    notificaciones,
    comunicacion,
    ai_chat,
    knowledge_base,
    onboarding,
    rfef,
    dashboard,
    exports,
    background_tasks,
    organizacion,
    # New modules
    invitaciones,
    suscripciones,
    gdpr,
    tutores,
    medico,
    stripe_webhook,
    admin,
    descansos,
    abp,
    portero_tareas,
)

api_router = APIRouter()

# ============ Core ============

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticacion"]
)

api_router.include_router(
    tareas.router,
    prefix="/tareas",
    tags=["Tareas"]
)

api_router.include_router(
    sesiones.router,
    prefix="/sesiones",
    tags=["Sesiones"]
)

api_router.include_router(
    equipos.router,
    prefix="/equipos",
    tags=["Equipos"]
)

api_router.include_router(
    usuarios.router,
    prefix="/usuarios",
    tags=["Usuarios"]
)

api_router.include_router(
    organizacion.router,
    prefix="/organizacion",
    tags=["Organizacion"]
)

api_router.include_router(
    recomendador.router,
    prefix="/recomendador",
    tags=["Recomendador"]
)

api_router.include_router(
    jugadores.router,
    prefix="/jugadores",
    tags=["Jugadores"]
)

api_router.include_router(
    rivales.router,
    prefix="/rivales",
    tags=["Rivales"]
)

api_router.include_router(
    partidos.router,
    prefix="/partidos",
    tags=["Partidos"]
)

# ============ Nuevos modulos ============

api_router.include_router(
    microciclos.router,
    prefix="/microciclos",
    tags=["Microciclos"]
)

api_router.include_router(
    rpe.router,
    prefix="/rpe",
    tags=["RPE"]
)

api_router.include_router(
    carga.router,
    prefix="/carga",
    tags=["Carga"]
)

api_router.include_router(
    wellness.router,
    prefix="/wellness",
    tags=["Wellness"]
)

api_router.include_router(
    convocatorias.router,
    prefix="/convocatorias",
    tags=["Convocatorias"]
)

api_router.include_router(
    estadisticas_partido.router,
    prefix="/estadisticas-partido",
    tags=["Estadisticas Partido"]
)

api_router.include_router(
    notificaciones.router,
    prefix="/notificaciones",
    tags=["Notificaciones"]
)

api_router.include_router(
    comunicacion.router,
    prefix="/comunicacion",
    tags=["Comunicacion"]
)

api_router.include_router(
    ai_chat.router,
    prefix="/ai",
    tags=["AI Chat"]
)

api_router.include_router(
    knowledge_base.router,
    prefix="/kb",
    tags=["Knowledge Base"]
)

api_router.include_router(
    onboarding.router,
    prefix="/onboarding",
    tags=["Onboarding"]
)

api_router.include_router(
    rfef.router,
    prefix="/rfef",
    tags=["RFEF"]
)

api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"]
)

api_router.include_router(
    exports.router,
    prefix="/exports",
    tags=["Exportaciones"]
)

api_router.include_router(
    background_tasks.router,
    prefix="/tasks",
    tags=["Background Tasks"]
)

# ============ Licencias, Roles y Seguridad ============

api_router.include_router(
    invitaciones.router,
    prefix="/invitaciones",
    tags=["Invitaciones"]
)

api_router.include_router(
    suscripciones.router,
    prefix="/suscripciones",
    tags=["Suscripciones"]
)

api_router.include_router(
    gdpr.router,
    prefix="/gdpr",
    tags=["GDPR/RGPD"]
)

api_router.include_router(
    tutores.router,
    prefix="/tutores",
    tags=["Control Parental"]
)

api_router.include_router(
    medico.router,
    prefix="/medico",
    tags=["Modulo Medico"]
)

api_router.include_router(
    stripe_webhook.router,
    prefix="/stripe",
    tags=["Stripe"]
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin Panel"]
)

api_router.include_router(
    descansos.router,
    prefix="/descansos",
    tags=["Descansos"]
)

api_router.include_router(
    abp.router,
    prefix="/abp",
    tags=["ABP (Balon Parado)"]
)

api_router.include_router(
    portero_tareas.router,
    prefix="/sesiones",
    tags=["Portero Tareas"]
)


# ============ Catalogos ============

@api_router.get("/catalogos/categorias-tarea", tags=["Catalogos"])
async def get_categorias_tarea():
    """Obtiene todas las categorias de tareas."""
    return {
        "data": [
            {"codigo": "RND", "nombre": "Rondo", "color": "#3B82F6"},
            {"codigo": "JDP", "nombre": "Juego de Posicion", "color": "#10B981"},
            {"codigo": "POS", "nombre": "Posesion/Conservacion", "color": "#8B5CF6"},
            {"codigo": "EVO", "nombre": "Evoluciones/Oleadas", "color": "#F59E0B"},
            {"codigo": "AVD", "nombre": "Ataque vs Defensa", "color": "#EF4444"},
            {"codigo": "PCO", "nombre": "Partido Condicionado", "color": "#EC4899"},
            {"codigo": "ACO", "nombre": "Acciones Combinadas", "color": "#6B7280"},
            {"codigo": "SSG", "nombre": "Futbol Reducido (SSG)", "color": "#14B8A6"},
            {"codigo": "ABP", "nombre": "Balon Parado (ABP)", "color": "#F97316"},
            {"codigo": "POR", "nombre": "Portero (GK)", "color": "#22C55E"},
        ]
    }


@api_router.get("/catalogos/fases-juego", tags=["Catalogos"])
async def get_fases_juego():
    """Obtiene todas las fases de juego."""
    return {
        "data": [
            {
                "codigo": "ataque_organizado",
                "nombre": "Ataque Organizado",
                "descripcion": "Fase de posesion del balon con el equipo organizado"
            },
            {
                "codigo": "defensa_organizada",
                "nombre": "Defensa Organizada",
                "descripcion": "Fase sin balon con el equipo organizado"
            },
            {
                "codigo": "transicion_ataque_defensa",
                "nombre": "Transicion Ataque-Defensa",
                "descripcion": "Momento de perdida del balon"
            },
            {
                "codigo": "transicion_defensa_ataque",
                "nombre": "Transicion Defensa-Ataque",
                "descripcion": "Momento de recuperacion del balon"
            },
        ]
    }


@api_router.get("/catalogos/match-days", tags=["Catalogos"])
async def get_match_days():
    """Obtiene configuracion de todos los Match Days."""
    return {
        "data": [
            {
                "codigo": "MD+1",
                "nombre": "Recuperacion",
                "dias_desde_partido": 1,
                "carga_fisica": "Recuperacion activa",
                "nivel_cognitivo_max": 1,
                "categorias_preferidas": ["RND", "ACO"],
                "categorias_evitar": ["SSG", "AVD", "PCO"],
                "color": "#22C55E"
            },
            {
                "codigo": "MD-4",
                "nombre": "Fuerza/Tension",
                "dias_desde_partido": -4,
                "carga_fisica": "Fuerza explosiva",
                "nivel_cognitivo_max": 3,
                "categorias_preferidas": ["SSG", "JDP", "AVD"],
                "categorias_evitar": ["ACO"],
                "color": "#EF4444"
            },
            {
                "codigo": "MD-3",
                "nombre": "Resistencia",
                "dias_desde_partido": -3,
                "carga_fisica": "Resistencia a la potencia",
                "nivel_cognitivo_max": 3,
                "categorias_preferidas": ["JDP", "POS", "PCO", "AVD"],
                "categorias_evitar": ["SSG"],
                "color": "#F59E0B"
            },
            {
                "codigo": "MD-2",
                "nombre": "Velocidad",
                "dias_desde_partido": -2,
                "carga_fisica": "Velocidad maxima",
                "nivel_cognitivo_max": 2,
                "categorias_preferidas": ["EVO", "JDP"],
                "categorias_evitar": ["SSG", "PCO"],
                "color": "#3B82F6"
            },
            {
                "codigo": "MD-1",
                "nombre": "Activacion",
                "dias_desde_partido": -1,
                "carga_fisica": "Activacion/Reaccion",
                "nivel_cognitivo_max": 2,
                "categorias_preferidas": ["RND", "ABP", "ACO"],
                "categorias_evitar": ["SSG", "AVD", "PCO"],
                "color": "#8B5CF6"
            },
        ]
    }


@api_router.get("/catalogos/principios/{fase}", tags=["Catalogos"])
async def get_principios_por_fase(fase: str):
    """Obtiene principios tacticos por fase de juego."""
    principios = {
        "ataque_organizado": [
            "Salida de balon",
            "Progresion",
            "Creacion de ocasiones",
            "Finalizacion",
            "Ataque por bandas",
            "Ataque por interior",
            "Juego entre lineas",
            "Amplitud",
            "Profundidad",
        ],
        "defensa_organizada": [
            "Presion alta",
            "Bloque medio",
            "Bloque bajo",
            "Basculacion",
            "Vigilancias",
            "Marcaje zonal",
            "Marcaje individual",
            "Coberturas",
        ],
        "transicion_ataque_defensa": [
            "Presion tras perdida",
            "Repliegue intensivo",
            "Equilibrio defensivo",
            "Faltas tacticas",
        ],
        "transicion_defensa_ataque": [
            "Contraataque",
            "Ataque rapido",
            "Conservacion de balon",
            "Cambio de orientacion",
        ],
    }

    return {"data": principios.get(fase, [])}


# ============ Roles catalog ============

@api_router.get("/catalogos/roles-equipo", tags=["Catalogos"])
async def get_roles_equipo():
    """Obtiene todos los roles disponibles en un equipo."""
    return {
        "data": [
            {"codigo": "entrenador_principal", "nombre": "Entrenador Principal", "descripcion": "Director tecnico del equipo"},
            {"codigo": "segundo_entrenador", "nombre": "Segundo Entrenador", "descripcion": "Asistente del entrenador principal"},
            {"codigo": "preparador_fisico", "nombre": "Preparador Fisico", "descripcion": "Responsable de la condicion fisica"},
            {"codigo": "entrenador_porteros", "nombre": "Entrenador de Porteros", "descripcion": "Especialista en porteros"},
            {"codigo": "analista", "nombre": "Analista", "descripcion": "Analista tactico y de rivales"},
            {"codigo": "fisio", "nombre": "Fisio/Medico", "descripcion": "Fisioterapeuta o medico del equipo"},
            {"codigo": "delegado", "nombre": "Delegado", "descripcion": "Delegado del equipo"},
        ]
    }


@api_router.get("/catalogos/roles-club", tags=["Catalogos"])
async def get_roles_club():
    """Obtiene todos los roles disponibles a nivel de club."""
    return {
        "data": [
            {"codigo": "presidente", "nombre": "Presidente", "descripcion": "Maximo responsable del club"},
            {"codigo": "director_deportivo", "nombre": "Director Deportivo", "descripcion": "Responsable de la gestion deportiva"},
            {"codigo": "secretario", "nombre": "Secretario", "descripcion": "Responsable administrativo"},
        ]
    }
