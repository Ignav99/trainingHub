"""
TrainingHub Pro - API Router Principal
Agrupa todos los routers de la API v1.
"""

from fastapi import APIRouter

from app.api.v1 import auth, tareas, sesiones, equipos, usuarios, recomendador, jugadores

api_router = APIRouter()

# Incluir todos los routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"]
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
    recomendador.router,
    prefix="/recomendador",
    tags=["Recomendador"]
)

api_router.include_router(
    jugadores.router,
    prefix="/jugadores",
    tags=["Jugadores"]
)


# Endpoints de catálogos
@api_router.get("/catalogos/categorias-tarea", tags=["Catálogos"])
async def get_categorias_tarea():
    """Obtiene todas las categorías de tareas."""
    # TODO: Implementar
    return {
        "data": [
            {"codigo": "RND", "nombre": "Rondo", "color": "#3B82F6"},
            {"codigo": "JDP", "nombre": "Juego de Posición", "color": "#10B981"},
            {"codigo": "POS", "nombre": "Posesión/Conservación", "color": "#8B5CF6"},
            {"codigo": "EVO", "nombre": "Evoluciones/Oleadas", "color": "#F59E0B"},
            {"codigo": "AVD", "nombre": "Ataque vs Defensa", "color": "#EF4444"},
            {"codigo": "PCO", "nombre": "Partido Condicionado", "color": "#EC4899"},
            {"codigo": "ACO", "nombre": "Acciones Combinadas", "color": "#6B7280"},
            {"codigo": "SSG", "nombre": "Fútbol Reducido (SSG)", "color": "#14B8A6"},
            {"codigo": "ABP", "nombre": "Balón Parado (ABP)", "color": "#F97316"},
        ]
    }


@api_router.get("/catalogos/fases-juego", tags=["Catálogos"])
async def get_fases_juego():
    """Obtiene todas las fases de juego."""
    return {
        "data": [
            {
                "codigo": "ataque_organizado",
                "nombre": "Ataque Organizado",
                "descripcion": "Fase de posesión del balón con el equipo organizado"
            },
            {
                "codigo": "defensa_organizada",
                "nombre": "Defensa Organizada",
                "descripcion": "Fase sin balón con el equipo organizado"
            },
            {
                "codigo": "transicion_ataque_defensa",
                "nombre": "Transición Ataque-Defensa",
                "descripcion": "Momento de pérdida del balón"
            },
            {
                "codigo": "transicion_defensa_ataque",
                "nombre": "Transición Defensa-Ataque",
                "descripcion": "Momento de recuperación del balón"
            },
        ]
    }


@api_router.get("/catalogos/match-days", tags=["Catálogos"])
async def get_match_days():
    """Obtiene configuración de todos los Match Days."""
    return {
        "data": [
            {
                "codigo": "MD+1",
                "nombre": "Recuperación",
                "dias_desde_partido": 1,
                "carga_fisica": "Recuperación activa",
                "nivel_cognitivo_max": 1,
                "categorias_preferidas": ["RND", "ACO"],
                "categorias_evitar": ["SSG", "AVD", "PCO"],
                "color": "#22C55E"
            },
            {
                "codigo": "MD-4",
                "nombre": "Fuerza/Tensión",
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
                "carga_fisica": "Velocidad máxima",
                "nivel_cognitivo_max": 2,
                "categorias_preferidas": ["EVO", "JDP"],
                "categorias_evitar": ["SSG", "PCO"],
                "color": "#3B82F6"
            },
            {
                "codigo": "MD-1",
                "nombre": "Activación",
                "dias_desde_partido": -1,
                "carga_fisica": "Activación/Reacción",
                "nivel_cognitivo_max": 2,
                "categorias_preferidas": ["RND", "ABP", "ACO"],
                "categorias_evitar": ["SSG", "AVD", "PCO"],
                "color": "#8B5CF6"
            },
        ]
    }


@api_router.get("/catalogos/principios/{fase}", tags=["Catálogos"])
async def get_principios_por_fase(fase: str):
    """Obtiene principios tácticos por fase de juego."""
    principios = {
        "ataque_organizado": [
            "Salida de balón",
            "Progresión",
            "Creación de ocasiones",
            "Finalización",
            "Ataque por bandas",
            "Ataque por interior",
            "Juego entre líneas",
            "Amplitud",
            "Profundidad",
        ],
        "defensa_organizada": [
            "Presión alta",
            "Bloque medio",
            "Bloque bajo",
            "Basculación",
            "Vigilancias",
            "Marcaje zonal",
            "Marcaje individual",
            "Coberturas",
        ],
        "transicion_ataque_defensa": [
            "Presión tras pérdida",
            "Repliegue intensivo",
            "Equilibrio defensivo",
            "Faltas tácticas",
        ],
        "transicion_defensa_ataque": [
            "Contraataque",
            "Ataque rápido",
            "Conservación de balón",
            "Cambio de orientación",
        ],
    }
    
    return {"data": principios.get(fase, [])}
