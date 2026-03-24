"""
TrainingHub Pro - Router Modulo de Nutricion
CRUD para perfiles nutricionales, plantillas, planes diarios,
suplementacion y composicion corporal.
"""

from typing import Optional, List
from uuid import UUID
from datetime import date, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_supabase
from app.models.nutricion import (
    PerfilNutricionalCreate, PerfilNutricionalUpdate, PerfilNutricionalResponse,
    PlantillaNutricionalCreate, PlantillaNutricionalUpdate, PlantillaNutricionalResponse,
    PlanNutricionalDiaCreate, PlanNutricionalDiaUpdate, PlanNutricionalDiaResponse,
    SuplementacionCreate, SuplementacionUpdate, SuplementacionResponse,
    ComposicionCorporalCreate, ComposicionCorporalResponse,
    NutricionOverviewResponse,
)
from app.security.dependencies import require_permission, require_any_permission, AuthContext
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# PERFILES NUTRICIONALES
# ============================================================

@router.get("/perfil", response_model=PerfilNutricionalResponse)
async def get_perfil_nutricional(
    equipo_id: UUID,
    jugador_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Obtiene el perfil nutricional de un jugador."""
    supabase = get_supabase()
    result = (
        supabase.table("perfiles_nutricionales")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("jugador_id", str(jugador_id))
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil nutricional no encontrado.")
    return PerfilNutricionalResponse(**result.data)


@router.post("/perfil", response_model=PerfilNutricionalResponse, status_code=status.HTTP_201_CREATED)
async def upsert_perfil_nutricional(
    data: PerfilNutricionalCreate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Crea o actualiza el perfil nutricional de un jugador."""
    supabase = get_supabase()
    record = data.model_dump(exclude_unset=True)
    record["jugador_id"] = str(record["jugador_id"])
    record["equipo_id"] = str(record["equipo_id"])
    if record.get("objetivo"):
        record["objetivo"] = record["objetivo"].value if hasattr(record["objetivo"], "value") else record["objetivo"]

    # Check if profile exists
    existing = (
        supabase.table("perfiles_nutricionales")
        .select("id")
        .eq("equipo_id", record["equipo_id"])
        .eq("jugador_id", record["jugador_id"])
        .maybe_single()
        .execute()
    )

    if existing.data:
        # Update
        update_data = {k: v for k, v in record.items() if k not in ("jugador_id", "equipo_id")}
        result = (
            supabase.table("perfiles_nutricionales")
            .update(update_data)
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        result = supabase.table("perfiles_nutricionales").insert(record).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Error al guardar perfil nutricional.")
    return PerfilNutricionalResponse(**result.data[0])


@router.put("/perfil/{perfil_id}", response_model=PerfilNutricionalResponse)
async def update_perfil_nutricional(
    perfil_id: UUID,
    data: PerfilNutricionalUpdate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Actualiza un perfil nutricional."""
    supabase = get_supabase()
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("objetivo"):
        update_data["objetivo"] = update_data["objetivo"].value if hasattr(update_data["objetivo"], "value") else update_data["objetivo"]

    result = (
        supabase.table("perfiles_nutricionales")
        .update(update_data)
        .eq("id", str(perfil_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil nutricional no encontrado.")
    return PerfilNutricionalResponse(**result.data[0])


# ============================================================
# PLANTILLAS NUTRICIONALES
# ============================================================

@router.get("/plantillas", response_model=List[PlantillaNutricionalResponse])
async def list_plantillas(
    equipo_id: UUID,
    tipo_comida: Optional[str] = None,
    contexto: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Lista plantillas de comida del equipo."""
    supabase = get_supabase()
    query = (
        supabase.table("plantillas_nutricionales")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("tipo_comida")
        .order("nombre")
    )
    if tipo_comida:
        query = query.eq("tipo_comida", tipo_comida)
    if contexto:
        query = query.eq("contexto", contexto)

    result = query.execute()
    return [PlantillaNutricionalResponse(**r) for r in result.data]


@router.post("/plantillas", response_model=PlantillaNutricionalResponse, status_code=status.HTTP_201_CREATED)
async def create_plantilla(
    data: PlantillaNutricionalCreate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Crea una plantilla de comida."""
    supabase = get_supabase()
    record = data.model_dump(exclude_unset=True)
    record["equipo_id"] = str(record["equipo_id"])
    if record.get("tipo_comida"):
        record["tipo_comida"] = record["tipo_comida"].value if hasattr(record["tipo_comida"], "value") else record["tipo_comida"]
    if record.get("contexto"):
        record["contexto"] = record["contexto"].value if hasattr(record["contexto"], "value") else record["contexto"]
    # Serialize alimentos
    if "alimentos" in record:
        record["alimentos"] = [a.model_dump() if hasattr(a, "model_dump") else a for a in record["alimentos"]]

    result = supabase.table("plantillas_nutricionales").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear plantilla.")
    return PlantillaNutricionalResponse(**result.data[0])


@router.put("/plantillas/{plantilla_id}", response_model=PlantillaNutricionalResponse)
async def update_plantilla(
    plantilla_id: UUID,
    data: PlantillaNutricionalUpdate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Actualiza una plantilla de comida."""
    supabase = get_supabase()
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("tipo_comida"):
        update_data["tipo_comida"] = update_data["tipo_comida"].value if hasattr(update_data["tipo_comida"], "value") else update_data["tipo_comida"]
    if update_data.get("contexto"):
        update_data["contexto"] = update_data["contexto"].value if hasattr(update_data["contexto"], "value") else update_data["contexto"]
    if "alimentos" in update_data and update_data["alimentos"] is not None:
        update_data["alimentos"] = [a.model_dump() if hasattr(a, "model_dump") else a for a in update_data["alimentos"]]

    result = (
        supabase.table("plantillas_nutricionales")
        .update(update_data)
        .eq("id", str(plantilla_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")
    return PlantillaNutricionalResponse(**result.data[0])


@router.delete("/plantillas/{plantilla_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plantilla(
    plantilla_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Elimina una plantilla de comida."""
    supabase = get_supabase()
    supabase.table("plantillas_nutricionales").delete().eq("id", str(plantilla_id)).execute()
    return None


# ============================================================
# PLANES NUTRICIONALES DIARIOS
# ============================================================

@router.get("/planes", response_model=List[PlanNutricionalDiaResponse])
async def list_planes(
    equipo_id: UUID,
    fecha: Optional[date] = None,
    jugador_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Lista planes nutricionales. Filtra por fecha y/o jugador."""
    supabase = get_supabase()
    query = (
        supabase.table("planes_nutricionales_dia")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("fecha", desc=True)
    )
    if fecha:
        query = query.eq("fecha", fecha.isoformat())
    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))

    result = query.execute()
    return [PlanNutricionalDiaResponse(**r) for r in result.data]


@router.get("/planes/semana", response_model=List[PlanNutricionalDiaResponse])
async def get_planes_semana(
    equipo_id: UUID,
    fecha_inicio: date,
    jugador_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Obtiene planes de una semana completa."""
    supabase = get_supabase()
    fecha_fin = fecha_inicio + timedelta(days=6)
    query = (
        supabase.table("planes_nutricionales_dia")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .gte("fecha", fecha_inicio.isoformat())
        .lte("fecha", fecha_fin.isoformat())
        .order("fecha")
    )
    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))

    result = query.execute()
    return [PlanNutricionalDiaResponse(**r) for r in result.data]


@router.post("/planes", response_model=PlanNutricionalDiaResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: PlanNutricionalDiaCreate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Crea un plan nutricional diario."""
    supabase = get_supabase()
    record = data.model_dump(exclude_unset=True)
    record["equipo_id"] = str(record["equipo_id"])
    record["fecha"] = record["fecha"].isoformat()
    record["created_by"] = auth.user_id
    if record.get("jugador_id"):
        record["jugador_id"] = str(record["jugador_id"])
    if record.get("contexto"):
        record["contexto"] = record["contexto"].value if hasattr(record["contexto"], "value") else record["contexto"]
    if "comidas" in record:
        record["comidas"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in record["comidas"]]

    result = supabase.table("planes_nutricionales_dia").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear plan nutricional.")
    return PlanNutricionalDiaResponse(**result.data[0])


@router.put("/planes/{plan_id}", response_model=PlanNutricionalDiaResponse)
async def update_plan(
    plan_id: UUID,
    data: PlanNutricionalDiaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Actualiza un plan nutricional diario."""
    supabase = get_supabase()
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("jugador_id"):
        update_data["jugador_id"] = str(update_data["jugador_id"])
    if update_data.get("fecha"):
        update_data["fecha"] = update_data["fecha"].isoformat()
    if update_data.get("contexto"):
        update_data["contexto"] = update_data["contexto"].value if hasattr(update_data["contexto"], "value") else update_data["contexto"]
    if "comidas" in update_data and update_data["comidas"] is not None:
        update_data["comidas"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in update_data["comidas"]]

    result = (
        supabase.table("planes_nutricionales_dia")
        .update(update_data)
        .eq("id", str(plan_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Plan nutricional no encontrado.")
    return PlanNutricionalDiaResponse(**result.data[0])


@router.delete("/planes/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Elimina un plan nutricional diario."""
    supabase = get_supabase()
    supabase.table("planes_nutricionales_dia").delete().eq("id", str(plan_id)).execute()
    return None


class CopiarSemanaRequest(BaseModel):
    equipo_id: UUID
    fecha_origen: date
    fecha_destino: date
    jugador_id: Optional[UUID] = None


@router.post("/planes/copiar-semana", response_model=List[PlanNutricionalDiaResponse])
async def copiar_semana(
    data: CopiarSemanaRequest,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Copia planes de una semana a otra."""
    supabase = get_supabase()
    fecha_fin_origen = data.fecha_origen + timedelta(days=6)

    query = (
        supabase.table("planes_nutricionales_dia")
        .select("*")
        .eq("equipo_id", str(data.equipo_id))
        .gte("fecha", data.fecha_origen.isoformat())
        .lte("fecha", fecha_fin_origen.isoformat())
    )
    if data.jugador_id:
        query = query.eq("jugador_id", str(data.jugador_id))

    planes_origen = query.execute()
    if not planes_origen.data:
        raise HTTPException(status_code=404, detail="No hay planes en la semana de origen.")

    dias_diff = (data.fecha_destino - data.fecha_origen).days
    nuevos = []
    for plan in planes_origen.data:
        fecha_original = date.fromisoformat(plan["fecha"])
        nueva_fecha = fecha_original + timedelta(days=dias_diff)
        nuevo = {
            "equipo_id": plan["equipo_id"],
            "jugador_id": plan.get("jugador_id"),
            "fecha": nueva_fecha.isoformat(),
            "contexto": plan.get("contexto"),
            "comidas": plan.get("comidas", []),
            "calorias_objetivo": plan.get("calorias_objetivo"),
            "proteinas_objetivo_g": plan.get("proteinas_objetivo_g"),
            "carbohidratos_objetivo_g": plan.get("carbohidratos_objetivo_g"),
            "grasas_objetivo_g": plan.get("grasas_objetivo_g"),
            "hidratacion_litros": plan.get("hidratacion_litros"),
            "notas": plan.get("notas"),
            "created_by": auth.user_id,
        }
        nuevos.append(nuevo)

    result = supabase.table("planes_nutricionales_dia").insert(nuevos).execute()
    return [PlanNutricionalDiaResponse(**r) for r in result.data]


# ============================================================
# SUPLEMENTACION
# ============================================================

@router.get("/suplementos", response_model=List[SuplementacionResponse])
async def list_suplementos(
    equipo_id: UUID,
    jugador_id: Optional[UUID] = None,
    activo: Optional[bool] = None,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Lista suplementos. Filtra por jugador y/o estado activo."""
    supabase = get_supabase()
    query = (
        supabase.table("suplementacion_jugador")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("created_at", desc=True)
    )
    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))
    if activo is not None:
        query = query.eq("activo", activo)

    result = query.execute()
    return [SuplementacionResponse(**r) for r in result.data]


@router.post("/suplementos", response_model=SuplementacionResponse, status_code=status.HTTP_201_CREATED)
async def create_suplemento(
    data: SuplementacionCreate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Agrega un suplemento a un jugador."""
    supabase = get_supabase()
    record = data.model_dump(exclude_unset=True)
    record["jugador_id"] = str(record["jugador_id"])
    record["equipo_id"] = str(record["equipo_id"])
    if record.get("fecha_inicio"):
        record["fecha_inicio"] = record["fecha_inicio"].isoformat()
    if record.get("fecha_fin"):
        record["fecha_fin"] = record["fecha_fin"].isoformat()

    result = supabase.table("suplementacion_jugador").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al crear suplemento.")
    return SuplementacionResponse(**result.data[0])


@router.put("/suplementos/{suplemento_id}", response_model=SuplementacionResponse)
async def update_suplemento(
    suplemento_id: UUID,
    data: SuplementacionUpdate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Actualiza un suplemento."""
    supabase = get_supabase()
    update_data = data.model_dump(exclude_unset=True)
    for date_field in ("fecha_inicio", "fecha_fin"):
        if date_field in update_data and update_data[date_field] is not None:
            update_data[date_field] = update_data[date_field].isoformat()

    result = (
        supabase.table("suplementacion_jugador")
        .update(update_data)
        .eq("id", str(suplemento_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado.")
    return SuplementacionResponse(**result.data[0])


@router.delete("/suplementos/{suplemento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_suplemento(
    suplemento_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Elimina un suplemento."""
    supabase = get_supabase()
    supabase.table("suplementacion_jugador").delete().eq("id", str(suplemento_id)).execute()
    return None


# ============================================================
# COMPOSICION CORPORAL
# ============================================================

@router.get("/composicion", response_model=List[ComposicionCorporalResponse])
async def list_composicion(
    equipo_id: UUID,
    jugador_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Historial de composicion corporal."""
    supabase = get_supabase()
    query = (
        supabase.table("composicion_corporal")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("fecha", desc=True)
    )
    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))

    result = query.execute()
    return [ComposicionCorporalResponse(**r) for r in result.data]


@router.post("/composicion", response_model=ComposicionCorporalResponse, status_code=status.HTTP_201_CREATED)
async def create_composicion(
    data: ComposicionCorporalCreate,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_CREATE)),
):
    """Registra una medicion de composicion corporal."""
    supabase = get_supabase()
    record = data.model_dump(exclude_unset=True)
    record["jugador_id"] = str(record["jugador_id"])
    record["equipo_id"] = str(record["equipo_id"])
    record["fecha"] = record["fecha"].isoformat()

    result = supabase.table("composicion_corporal").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Error al registrar medicion.")
    return ComposicionCorporalResponse(**result.data[0])


@router.delete("/composicion/{composicion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_composicion(
    composicion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_UPDATE)),
):
    """Elimina una medicion de composicion corporal."""
    supabase = get_supabase()
    supabase.table("composicion_corporal").delete().eq("id", str(composicion_id)).execute()
    return None


# ============================================================
# OVERVIEW (aggregated for player detail tab)
# ============================================================

@router.get("/overview/{jugador_id}", response_model=NutricionOverviewResponse)
async def get_nutricion_overview(
    jugador_id: UUID,
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Vista completa de nutricion para un jugador. Incluye perfil, plan de hoy,
    suplementos activos, ultima composicion, tendencia de peso y recomendaciones."""
    supabase = get_supabase()
    hoy = date.today().isoformat()

    # Perfil
    perfil_result = (
        supabase.table("perfiles_nutricionales")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("jugador_id", str(jugador_id))
        .maybe_single()
        .execute()
    )
    perfil = PerfilNutricionalResponse(**perfil_result.data) if perfil_result.data else None

    # Plan de hoy
    plan_result = (
        supabase.table("planes_nutricionales_dia")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("fecha", hoy)
        .or_(f"jugador_id.eq.{str(jugador_id)},jugador_id.is.null")
        .order("jugador_id", desc=True)  # player-specific first
        .limit(1)
        .execute()
    )
    plan_hoy = PlanNutricionalDiaResponse(**plan_result.data[0]) if plan_result.data else None

    # Suplementos activos
    suplementos_result = (
        supabase.table("suplementacion_jugador")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("jugador_id", str(jugador_id))
        .eq("activo", True)
        .order("created_at", desc=True)
        .execute()
    )
    suplementos = [SuplementacionResponse(**s) for s in suplementos_result.data]

    # Ultima composicion
    comp_result = (
        supabase.table("composicion_corporal")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .eq("jugador_id", str(jugador_id))
        .order("fecha", desc=True)
        .limit(1)
        .execute()
    )
    ultima_comp = ComposicionCorporalResponse(**comp_result.data[0]) if comp_result.data else None

    # Peso trend (last 20 measurements)
    peso_result = (
        supabase.table("composicion_corporal")
        .select("fecha, peso_kg")
        .eq("equipo_id", str(equipo_id))
        .eq("jugador_id", str(jugador_id))
        .order("fecha")
        .limit(20)
        .execute()
    )
    peso_trend = peso_result.data or []

    # Contextual recommendations
    recomendaciones = []
    try:
        # Check if match tomorrow
        manana = (date.today() + timedelta(days=1)).isoformat()
        partido_result = (
            supabase.table("partidos")
            .select("id, fecha")
            .eq("equipo_id", str(equipo_id))
            .eq("fecha", manana)
            .limit(1)
            .execute()
        )
        if partido_result.data:
            recomendaciones.append({
                "tipo": "pre_partido",
                "mensaje": "Partido mañana: se recomienda nutricion pre-partido (alta en carbohidratos, hidratacion extra).",
                "prioridad": "alta",
            })

        # Check ACWR from carga
        carga_result = (
            supabase.table("carga_jugador")
            .select("ratio_acwr, nivel_carga")
            .eq("equipo_id", str(equipo_id))
            .eq("jugador_id", str(jugador_id))
            .maybe_single()
            .execute()
        )
        if carga_result.data:
            acwr = carga_result.data.get("ratio_acwr")
            nivel = carga_result.data.get("nivel_carga")
            if acwr and acwr > 1.3:
                recomendaciones.append({
                    "tipo": "carga_alta",
                    "mensaje": f"ACWR alto ({acwr:.2f}): se recomienda aumentar ingesta calorica y proteica para recuperacion.",
                    "prioridad": "alta",
                })
            elif nivel == "critico":
                recomendaciones.append({
                    "tipo": "carga_critica",
                    "mensaje": "Carga critica: priorizar nutricion de recuperacion (proteinas + carbohidratos complejos).",
                    "prioridad": "alta",
                })

        # Check medical records for active injuries
        medico_result = (
            supabase.table("registros_medicos")
            .select("id, tipo, titulo")
            .eq("jugador_id", str(jugador_id))
            .neq("estado", "alta")
            .limit(1)
            .execute()
        )
        if medico_result.data:
            recomendaciones.append({
                "tipo": "lesion_activa",
                "mensaje": f"Lesion activa ({medico_result.data[0]['titulo']}): se recomienda dieta de recuperacion (rica en proteinas, omega-3, vitamina C).",
                "prioridad": "media",
            })

    except Exception as e:
        logger.warning(f"Error generating nutrition recommendations: {e}")

    return NutricionOverviewResponse(
        perfil=perfil,
        plan_hoy=plan_hoy,
        suplementos_activos=suplementos,
        ultima_composicion=ultima_comp,
        peso_trend=peso_trend,
        recomendaciones=recomendaciones,
    )


# ============================================================
# MATCH DAY CONTEXT
# ============================================================

@router.get("/dia-partido")
async def get_dia_partido_context(
    equipo_id: UUID,
    fecha: date,
    auth: AuthContext = Depends(require_permission(Permission.NUTRITION_READ)),
):
    """Detecta contexto de dia de partido para una fecha.
    Devuelve si es dia de partido, MD-1, MD+1, etc."""
    supabase = get_supabase()

    # Check 3 days range
    fecha_inicio = (fecha - timedelta(days=1)).isoformat()
    fecha_fin = (fecha + timedelta(days=1)).isoformat()

    partidos = (
        supabase.table("partidos")
        .select("id, fecha, rival_id")
        .eq("equipo_id", str(equipo_id))
        .gte("fecha", fecha_inicio)
        .lte("fecha", fecha_fin)
        .execute()
    )

    if not partidos.data:
        return {"contexto_sugerido": "dia_normal", "partido": None, "label": "Dia normal"}

    for p in partidos.data:
        partido_fecha = date.fromisoformat(p["fecha"])
        diff = (fecha - partido_fecha).days

        if diff == 0:
            return {"contexto_sugerido": "pre_partido", "partido": p, "label": "Dia de partido (MD)"}
        elif diff == -1:
            return {"contexto_sugerido": "pre_partido", "partido": p, "label": "Dia previo al partido (MD-1)"}
        elif diff == 1:
            return {"contexto_sugerido": "post_partido", "partido": p, "label": "Dia posterior al partido (MD+1)"}

    return {"contexto_sugerido": "dia_normal", "partido": None, "label": "Dia normal"}
