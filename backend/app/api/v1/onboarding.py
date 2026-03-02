"""
TrainingHub Pro - Router de Onboarding
Flujo guiado para nuevos usuarios.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext

router = APIRouter()

# Pasos del onboarding
PASOS_ONBOARDING = [
    {
        "numero": 1,
        "clave": "perfil",
        "titulo": "Completa tu perfil",
        "descripcion": "Nombre, avatar y datos de contacto",
    },
    {
        "numero": 2,
        "clave": "organizacion",
        "titulo": "Configura tu club",
        "descripcion": "Nombre, colores y logo de la organizacion",
    },
    {
        "numero": 3,
        "clave": "equipo",
        "titulo": "Crea tu primer equipo",
        "descripcion": "Nombre, categoria y temporada",
    },
    {
        "numero": 4,
        "clave": "jugadores",
        "titulo": "Anade jugadores",
        "descripcion": "Importa o crea la plantilla de jugadores",
    },
    {
        "numero": 5,
        "clave": "rival",
        "titulo": "Registra un rival",
        "descripcion": "Crea al menos un equipo rival para planificar partidos",
    },
    {
        "numero": 6,
        "clave": "partido",
        "titulo": "Crea tu primer partido",
        "descripcion": "Programa un partido en el calendario",
    },
    {
        "numero": 7,
        "clave": "sesion",
        "titulo": "Planifica tu primera sesion",
        "descripcion": "Crea una sesion de entrenamiento con tareas",
    },
]


@router.get("/progreso")
async def get_onboarding_progreso(
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene el progreso de onboarding del usuario."""
    supabase = get_supabase()

    response = supabase.table("onboarding_progreso").select("*").eq(
        "usuario_id", auth.user_id
    ).execute()

    if not response.data:
        # Crear registro de onboarding si no existe
        nuevo = supabase.table("onboarding_progreso").insert({
            "usuario_id": auth.user_id,
            "paso_actual": 1,
            "pasos_completados": {},
            "completado": False,
        }).execute()
        progreso = nuevo.data[0]
    else:
        progreso = response.data[0]

    return {
        "progreso": progreso,
        "pasos": PASOS_ONBOARDING,
        "total_pasos": len(PASOS_ONBOARDING),
    }


@router.post("/completar-paso/{paso}")
async def completar_paso(
    paso: str,
    auth: AuthContext = Depends(require_permission()),
):
    """Marca un paso del onboarding como completado."""
    supabase = get_supabase()

    # Verificar que el paso existe
    paso_valido = any(p["clave"] == paso for p in PASOS_ONBOARDING)
    if not paso_valido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Paso '{paso}' no valido"
        )

    # Obtener progreso actual
    response = supabase.table("onboarding_progreso").select("*").eq(
        "usuario_id", auth.user_id
    ).execute()

    if not response.data:
        # Crear si no existe
        pasos_completados = {paso: True}
        supabase.table("onboarding_progreso").insert({
            "usuario_id": auth.user_id,
            "paso_actual": 2,
            "pasos_completados": pasos_completados,
            "completado": False,
        }).execute()
    else:
        progreso = response.data[0]
        pasos_completados = progreso.get("pasos_completados", {})
        pasos_completados[paso] = True

        # Calcular siguiente paso
        siguiente = 1
        for p in PASOS_ONBOARDING:
            if p["clave"] in pasos_completados:
                siguiente = p["numero"] + 1

        completado = len(pasos_completados) >= len(PASOS_ONBOARDING)

        supabase.table("onboarding_progreso").update({
            "pasos_completados": pasos_completados,
            "paso_actual": min(siguiente, len(PASOS_ONBOARDING)),
            "completado": completado,
        }).eq("usuario_id", auth.user_id).execute()

    return {"message": f"Paso '{paso}' completado", "paso": paso}


@router.post("/skip")
async def skip_onboarding(
    auth: AuthContext = Depends(require_permission()),
):
    """Salta el onboarding completo."""
    supabase = get_supabase()

    response = supabase.table("onboarding_progreso").select("id").eq(
        "usuario_id", auth.user_id
    ).execute()

    if response.data:
        supabase.table("onboarding_progreso").update({
            "completado": True,
            "paso_actual": len(PASOS_ONBOARDING),
        }).eq("usuario_id", auth.user_id).execute()
    else:
        supabase.table("onboarding_progreso").insert({
            "usuario_id": auth.user_id,
            "paso_actual": len(PASOS_ONBOARDING),
            "pasos_completados": {},
            "completado": True,
        }).execute()

    return {"message": "Onboarding saltado"}


@router.get("/check")
async def check_onboarding_auto(
    auth: AuthContext = Depends(require_permission()),
):
    """
    Verifica automaticamente que pasos del onboarding estan hechos
    basandose en el estado real de la base de datos.
    """
    supabase = get_supabase()
    org_id = auth.organizacion_id
    user_id = auth.user_id

    pasos_detectados = {}

    # Paso 1: perfil - usuario tiene nombre
    if auth.user.nombre and len(auth.user.nombre) > 1:
        pasos_detectados["perfil"] = True

    # Paso 2: organizacion - org existe con nombre
    if auth.user.organizacion and auth.user.organizacion.nombre:
        pasos_detectados["organizacion"] = True

    # Paso 3: equipo - al menos un equipo
    equipos = supabase.table("equipos").select("id", count="exact").eq(
        "organizacion_id", org_id
    ).eq("activo", True).limit(0).execute()
    if (equipos.count or 0) > 0:
        pasos_detectados["equipo"] = True

    # Paso 4: jugadores - al menos 5 jugadores
    if pasos_detectados.get("equipo"):
        equipo_ids_resp = supabase.table("equipos").select("id").eq(
            "organizacion_id", org_id
        ).execute()
        if equipo_ids_resp.data:
            eids = [e["id"] for e in equipo_ids_resp.data]
            jugadores = supabase.table("jugadores").select("id", count="exact").in_(
                "equipo_id", eids
            ).limit(0).execute()
            if (jugadores.count or 0) >= 5:
                pasos_detectados["jugadores"] = True

    # Paso 5: rival - al menos un rival
    rivales = supabase.table("rivales").select("id", count="exact").eq(
        "organizacion_id", org_id
    ).limit(0).execute()
    if (rivales.count or 0) > 0:
        pasos_detectados["rival"] = True

    # Paso 6: partido - al menos un partido
    if pasos_detectados.get("equipo"):
        equipo_ids_resp = supabase.table("equipos").select("id").eq(
            "organizacion_id", org_id
        ).execute()
        if equipo_ids_resp.data:
            eids = [e["id"] for e in equipo_ids_resp.data]
            partidos = supabase.table("partidos").select("id", count="exact").in_(
                "equipo_id", eids
            ).limit(0).execute()
            if (partidos.count or 0) > 0:
                pasos_detectados["partido"] = True

    # Paso 7: sesion - al menos una sesion
    if pasos_detectados.get("equipo"):
        equipo_ids_resp = supabase.table("equipos").select("id").eq(
            "organizacion_id", org_id
        ).execute()
        if equipo_ids_resp.data:
            eids = [e["id"] for e in equipo_ids_resp.data]
            sesiones = supabase.table("sesiones").select("id", count="exact").in_(
                "equipo_id", eids
            ).limit(0).execute()
            if (sesiones.count or 0) > 0:
                pasos_detectados["sesion"] = True

    # Actualizar progreso
    completado = len(pasos_detectados) >= len(PASOS_ONBOARDING)
    siguiente = 1
    for p in PASOS_ONBOARDING:
        if p["clave"] in pasos_detectados:
            siguiente = p["numero"] + 1

    existing = supabase.table("onboarding_progreso").select("id").eq(
        "usuario_id", user_id
    ).execute()

    if existing.data:
        supabase.table("onboarding_progreso").update({
            "pasos_completados": pasos_detectados,
            "paso_actual": min(siguiente, len(PASOS_ONBOARDING)),
            "completado": completado,
        }).eq("usuario_id", user_id).execute()
    else:
        supabase.table("onboarding_progreso").insert({
            "usuario_id": user_id,
            "paso_actual": min(siguiente, len(PASOS_ONBOARDING)),
            "pasos_completados": pasos_detectados,
            "completado": completado,
        }).execute()

    return {
        "pasos_completados": pasos_detectados,
        "total_completados": len(pasos_detectados),
        "total_pasos": len(PASOS_ONBOARDING),
        "completado": completado,
        "siguiente_paso": siguiente if not completado else None,
    }
