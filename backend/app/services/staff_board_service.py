"""
Tablero del cuerpo técnico: menciones, destinatarios de avisos y actividad.

Las menciones viajan dentro del texto como ``@[Nombre visible](uuid)``. El
frontend inserta el token al elegir a alguien en el autocompletado; aquí se
extraen y se validan contra el staff del equipo, así nadie puede notificar a
usuarios de fuera.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

MENCION_RE = re.compile(
    r"@\[([^\]\n]{1,80})\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)"
)

ROLES_NO_STAFF = {"jugador", "tutor"}
# Administradores del club sin plaza en el equipo: se les puede mencionar y
# asignar, pero los avisos y preguntas a todo el staff no les llegan.
ROL_CLUB = "club"
ROLES_CLUB_MENCIONABLES = ("admin",)

TIPOS_POST = ("comentario", "pregunta", "tarea", "aviso")

# Notificaciones dirigidas a una persona: salen como aviso emergente al entrar.
TIPOS_EMERGENTES = ("mencion", "tarea_asignada", "respuesta", "aviso_staff")
# «Para ti» en la campana: lo personal del tablero, sin el ruido automático.
TIPOS_PARA_TI = TIPOS_EMERGENTES + ("tarea_resuelta", "pregunta_resuelta", "pregunta_staff")

TIPO_LABEL = {
    "comentario": "un comentario",
    "pregunta": "una pregunta",
    "tarea": "una tarea",
    "aviso": "un aviso",
}


def extraer_menciones(contenido: str) -> list[str]:
    """Ids mencionados en orden de aparición, sin repetir."""
    vistos: list[str] = []
    for _nombre, uid in MENCION_RE.findall(contenido or ""):
        uid = uid.lower()
        if uid not in vistos:
            vistos.append(uid)
    return vistos


def texto_plano(contenido: str) -> str:
    """El texto tal como se lee: ``@[Ana Ruiz](id)`` pasa a ``@Ana Ruiz``."""
    return MENCION_RE.sub(lambda m: f"@{m.group(1)}", contenido or "")


def extracto(contenido: str, n: int = 140) -> str:
    plano = " ".join(texto_plano(contenido).split())
    return plano if len(plano) <= n else plano[: n - 1].rstrip() + "…"


def nombre_corto(usuario: Optional[dict]) -> str:
    if not usuario:
        return "Alguien"
    nombre = (usuario.get("nombre") or "").strip()
    apellidos = (usuario.get("apellidos") or "").strip()
    if nombre and apellidos:
        return f"{nombre} {apellidos.split()[0]}"
    return nombre or apellidos or (usuario.get("email") or "Alguien")


@dataclass
class Aviso:
    usuario_id: str
    tipo: str
    titulo: str
    prioridad: str = "normal"


@dataclass
class ContextoPost:
    """Lo necesario para decidir a quién avisar de una publicación nueva."""

    actor_id: str
    tipo: str
    menciones: list[str]
    staff_ids: list[str]
    asignado_a: Optional[str] = None
    raiz: Optional[dict] = None
    participantes_hilo: list[str] = field(default_factory=list)
    actor_nombre: str = "Alguien"
    difusion_ids: Optional[list[str]] = None


def destinatarios_post_nuevo(ctx: ContextoPost) -> list[Aviso]:
    """
    Una persona recibe como mucho un aviso por publicación, el más concreto:
    asignación > mención > respuesta en su hilo > aviso/pregunta al staff.
    Nunca se avisa a quien publica.
    """
    staff = set(ctx.staff_ids)
    avisos: dict[str, Aviso] = {}

    def poner(uid: Optional[str], aviso: Aviso) -> None:
        if not uid or uid == ctx.actor_id or uid not in staff or uid in avisos:
            return
        avisos[uid] = aviso

    quien = ctx.actor_nombre
    es_respuesta = ctx.raiz is not None
    tipo_hilo = (ctx.raiz or {}).get("tipo", ctx.tipo)

    if not es_respuesta and ctx.tipo == "tarea" and ctx.asignado_a:
        poner(ctx.asignado_a, Aviso(ctx.asignado_a, "tarea_asignada", f"{quien} te ha asignado una tarea", "alta"))

    donde = "una respuesta" if es_respuesta else TIPO_LABEL.get(ctx.tipo, "el tablero")
    for uid in ctx.menciones:
        poner(uid, Aviso(uid, "mencion", f"{quien} te ha mencionado en {donde}", "alta"))

    if es_respuesta:
        raiz = ctx.raiz or {}
        autor_raiz = raiz.get("autor_id")
        suyo = {
            "pregunta": "tu pregunta",
            "tarea": "tu tarea",
            "aviso": "tu aviso",
        }.get(tipo_hilo, "tu comentario")
        poner(autor_raiz, Aviso(autor_raiz, "respuesta", f"{quien} ha respondido a {suyo}"))
        asignado_raiz = raiz.get("asignado_a")
        if tipo_hilo == "tarea":
            poner(asignado_raiz, Aviso(asignado_raiz, "respuesta", f"{quien} ha comentado una tarea tuya"))
        for uid in ctx.participantes_hilo:
            poner(uid, Aviso(uid, "respuesta", f"{quien} ha respondido en un hilo en el que participas"))
        return list(avisos.values())

    difusion = ctx.staff_ids if ctx.difusion_ids is None else ctx.difusion_ids
    if ctx.tipo == "aviso":
        for uid in difusion:
            poner(uid, Aviso(uid, "aviso_staff", f"Aviso de {quien}", "alta"))
    elif ctx.tipo == "pregunta" and not ctx.menciones:
        for uid in difusion:
            poner(uid, Aviso(uid, "pregunta_staff", f"{quien} pregunta al staff"))

    return list(avisos.values())


def aviso_resuelto(post: dict, actor_id: str, actor_nombre: str) -> Optional[Aviso]:
    """Al cerrar una tarea o pregunta se avisa a quien la abrió (si no fue él)."""
    autor = post.get("autor_id")
    if not autor or autor == actor_id:
        return None
    if post.get("tipo") == "tarea":
        return Aviso(autor, "tarea_resuelta", f"{actor_nombre} ha completado tu tarea")
    if post.get("tipo") == "pregunta":
        return Aviso(autor, "pregunta_resuelta", f"{actor_nombre} ha dado por resuelta tu pregunta")
    return None


# ─── Actividad del staff ────────────────────────────────────────────────────────

ACTIVIDAD_ENTIDADES = ("sesion", "partido", "jugador")
VENTANA_AGRUPAR = timedelta(hours=2)

# Sin borrados: lo borrado ya no se puede atribuir a un equipo concreto y
# alguien con varios equipos filtraría actividad de otro.
VERBOS = {
    ("crear", "sesion"): "ha creado la sesión",
    ("actualizar", "sesion"): "ha editado la sesión",
    ("crear", "partido"): "ha creado el partido",
    ("actualizar", "partido"): "ha actualizado el partido",
    ("crear", "jugador"): "ha dado de alta a",
    ("actualizar", "jugador"): "ha actualizado la ficha de",
}


def _ts(valor) -> datetime:
    if isinstance(valor, datetime):
        return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)
    texto = str(valor).replace("Z", "+00:00")
    dt = datetime.fromisoformat(texto)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def agrupar_actividad(
    registros: Iterable[dict],
    titulos: dict[tuple[str, str], dict],
    usuarios: dict[str, dict],
    *,
    limite: int = 40,
) -> list[dict]:
    """
    Convierte filas del audit log en entradas legibles. Varias ediciones
    seguidas de la misma persona sobre lo mismo (autoguardado) en menos de
    dos horas cuentan como una sola entrada con su número de cambios.

    ``titulos`` mapea (entidad_tipo, entidad_id) a ``{"titulo", "href"}``.
    Un registro sin título es de otro equipo y se descarta.
    """
    ordenados = sorted(registros, key=lambda r: _ts(r["created_at"]), reverse=True)
    salida: list[dict] = []
    abiertos: dict[tuple, dict] = {}

    for r in ordenados:
        accion, ent = r.get("accion"), r.get("entidad_tipo")
        verbo = VERBOS.get((accion, ent))
        if not verbo:
            continue
        uid = r.get("usuario_id")
        ent_id = r.get("entidad_id")
        info = titulos.get((ent, str(ent_id))) if ent_id else None
        if not info:
            continue
        cuando = _ts(r["created_at"])
        clave = (uid, accion, ent, str(ent_id))
        previo = abiertos.get(clave)
        if previo and accion == "actualizar" and _ts(previo["desde"]) - cuando <= VENTANA_AGRUPAR:
            previo["cambios"] += 1
            previo["desde"] = cuando.isoformat()
            continue
        entrada = {
            "id": str(r.get("id")),
            "usuario_id": uid,
            "usuario": usuarios.get(uid),
            "accion": accion,
            "entidad_tipo": ent,
            "entidad_id": str(ent_id) if ent_id else None,
            "texto": verbo,
            "titulo": info.get("titulo"),
            "href": info.get("href"),
            "created_at": cuando.isoformat(),
            "desde": cuando.isoformat(),
            "cambios": 1,
        }
        abiertos[clave] = entrada
        salida.append(entrada)
        if len(salida) >= limite:
            break
    return salida


# ─── Base de datos ──────────────────────────────────────────────────────────────

USUARIO_CAMPOS = "id, nombre, apellidos, avatar_url, email"
ENTIDADES_ENLAZABLES = ("sesion", "partido", "jugador")


class TableroError(Exception):
    def __init__(self, status: int, detalle: str):
        super().__init__(detalle)
        self.status = status
        self.detalle = detalle


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _orden(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()


def _administradores_club(supabase, equipo_id: str) -> list[dict]:
    equipo = (
        supabase.table("equipos").select("organizacion_id").eq("id", equipo_id).execute().data or []
    )
    org = equipo[0].get("organizacion_id") if equipo else None
    if not org:
        return []
    return (
        supabase.table("usuarios")
        .select(USUARIO_CAMPOS + ", activo")
        .eq("organizacion_id", org)
        .in_("rol", list(ROLES_CLUB_MENCIONABLES))
        .eq("activo", True)
        .execute()
        .data
        or []
    )


def miembros_staff(supabase, equipo_id: str) -> list[dict]:
    """Staff activo del equipo (sin jugadores ni tutores) y administración del club, por nombre."""
    filas = (
        supabase.table("usuarios_equipos")
        .select("usuario_id, rol_en_equipo")
        .eq("equipo_id", equipo_id)
        .execute()
        .data
        or []
    )
    roles = {
        f["usuario_id"]: f.get("rol_en_equipo")
        for f in filas
        if (f.get("rol_en_equipo") or "") not in ROLES_NO_STAFF
    }
    usuarios = (
        supabase.table("usuarios")
        .select(USUARIO_CAMPOS + ", activo")
        .in_("id", list(roles))
        .execute()
        .data
        or []
    ) if roles else []
    for u in _administradores_club(supabase, equipo_id):
        if u["id"] not in roles:
            roles[u["id"]] = ROL_CLUB
            usuarios.append(u)
    salida = []
    for u in usuarios:
        if u.get("activo") is False:
            continue
        salida.append({
            "id": u["id"],
            "nombre": u.get("nombre") or "",
            "apellidos": u.get("apellidos") or "",
            "avatar_url": u.get("avatar_url"),
            "rol_en_equipo": roles.get(u["id"]),
        })
    salida.sort(key=lambda m: (_orden(m["nombre"]), _orden(m["apellidos"])))
    return salida


def _usuarios_por_id(supabase, ids: Iterable[str], roles: Optional[dict] = None) -> dict[str, dict]:
    ids = [i for i in {str(i) for i in ids if i}]
    if not ids:
        return {}
    filas = supabase.table("usuarios").select(USUARIO_CAMPOS).in_("id", ids).execute().data or []
    roles = roles or {}
    return {
        f["id"]: {
            "id": f["id"],
            "nombre": f.get("nombre") or "",
            "apellidos": f.get("apellidos") or "",
            "avatar_url": f.get("avatar_url"),
            "rol_en_equipo": roles.get(f["id"]),
        }
        for f in filas
    }


def limpiar_menciones(contenido: str, validos: set[str]) -> tuple[str, list[str]]:
    """Deja como texto las menciones a gente que no es del staff del equipo."""
    def sub(m):
        return m.group(0) if m.group(2).lower() in validos else f"@{m.group(1)}"

    limpio = MENCION_RE.sub(sub, contenido)
    return limpio, extraer_menciones(limpio)


def titulo_entidad(supabase, equipo_id: str, tipo: str, entidad_id: str) -> Optional[str]:
    """Título legible de lo enlazado, o None si no es de este equipo."""
    if tipo == "sesion":
        fila = (
            supabase.table("sesiones").select("id, titulo, fecha, equipo_id")
            .eq("id", entidad_id).eq("equipo_id", equipo_id).execute().data
        )
        if not fila:
            return None
        s = fila[0]
        return f"{s.get('titulo') or 'Sesión'} · {s.get('fecha') or ''}".strip(" ·")
    if tipo == "partido":
        fila = (
            supabase.table("partidos").select("id, fecha, equipo_id, rivales(nombre)")
            .eq("id", entidad_id).eq("equipo_id", equipo_id).execute().data
        )
        if not fila:
            return None
        p = fila[0]
        rival = (p.get("rivales") or {}).get("nombre") if isinstance(p.get("rivales"), dict) else None
        return f"vs {rival or 'rival'} · {p.get('fecha') or ''}".strip(" ·")
    if tipo == "jugador":
        fila = (
            supabase.table("jugadores").select("id, nombre, apellidos, equipo_id")
            .eq("id", entidad_id).eq("equipo_id", equipo_id).execute().data
        )
        if not fila:
            return None
        j = fila[0]
        return f"{j.get('nombre') or ''} {j.get('apellidos') or ''}".strip() or "Jugador"
    return None


def href_entidad(tipo: Optional[str], entidad_id: Optional[str]) -> Optional[str]:
    if not tipo or not entidad_id:
        return None
    return {
        "sesion": f"/sesiones/{entidad_id}",
        "partido": f"/partidos/{entidad_id}",
        "jugador": f"/plantilla/{entidad_id}",
    }.get(tipo)


def _forma(post: dict, usuarios: dict[str, dict]) -> dict:
    return {
        "id": post["id"],
        "equipo_id": post.get("equipo_id"),
        "parent_id": post.get("parent_id"),
        "tipo": post.get("tipo") or "comentario",
        "contenido": post.get("contenido") or "",
        "menciones": [str(m) for m in (post.get("menciones") or [])],
        "autor": usuarios.get(str(post.get("autor_id"))) if post.get("autor_id") else None,
        "asignado": usuarios.get(str(post.get("asignado_a"))) if post.get("asignado_a") else None,
        "fecha_limite": post.get("fecha_limite"),
        "estado": post.get("estado") or "abierta",
        "resuelto_por": usuarios.get(str(post.get("resuelto_por"))) if post.get("resuelto_por") else None,
        "resuelto_at": post.get("resuelto_at"),
        "entidad_tipo": post.get("entidad_tipo"),
        "entidad_id": post.get("entidad_id"),
        "entidad_titulo": post.get("entidad_titulo"),
        "entidad_href": href_entidad(post.get("entidad_tipo"), post.get("entidad_id")),
        "fijado": bool(post.get("fijado")),
        "editado_at": post.get("editado_at"),
        "created_at": post.get("created_at"),
        "ultima_actividad_at": post.get("ultima_actividad_at") or post.get("created_at"),
    }


def _roles_equipo(supabase, equipo_id: str) -> dict[str, str]:
    filas = (
        supabase.table("usuarios_equipos").select("usuario_id, rol_en_equipo")
        .eq("equipo_id", equipo_id).execute().data or []
    )
    return {f["usuario_id"]: f.get("rol_en_equipo") for f in filas}


def componer_hilos(supabase, equipo_id: str, raices: list[dict]) -> list[dict]:
    """Raíces con sus respuestas y los usuarios ya resueltos."""
    if not raices:
        return []
    ids = [r["id"] for r in raices]
    respuestas = (
        supabase.table("staff_posts").select("*").in_("parent_id", ids)
        .order("created_at").execute().data or []
    )
    respuestas.sort(key=lambda r: str(r.get("created_at") or ""))
    usuarios_ids = set()
    for p in raices + respuestas:
        for campo in ("autor_id", "asignado_a", "resuelto_por"):
            if p.get(campo):
                usuarios_ids.add(str(p[campo]))
    usuarios = _usuarios_por_id(supabase, usuarios_ids, _roles_equipo(supabase, equipo_id))
    por_padre: dict[str, list[dict]] = {}
    for r in respuestas:
        por_padre.setdefault(str(r["parent_id"]), []).append(_forma(r, usuarios))
    salida = []
    for raiz in raices:
        hilo = _forma(raiz, usuarios)
        hilo["respuestas"] = por_padre.get(str(raiz["id"]), [])
        hilo["respuestas_count"] = len(hilo["respuestas"])
        salida.append(hilo)
    return salida


FILTROS = ("todo", "preguntas", "tareas", "mis_tareas", "menciones", "avisos")


def listar_hilos(
    supabase,
    equipo_id: str,
    usuario_id: str,
    *,
    filtro: str = "todo",
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    antes: Optional[str] = None,
    limite: int = 20,
) -> dict:
    if filtro not in FILTROS:
        raise TableroError(400, "Filtro no válido")

    def base():
        q = supabase.table("staff_posts").select("*").eq("equipo_id", equipo_id).is_("parent_id", "null")
        if entidad_tipo and entidad_id:
            q = q.eq("entidad_tipo", entidad_tipo).eq("entidad_id", entidad_id)
        return q

    q = base()
    if filtro == "preguntas":
        q = q.eq("tipo", "pregunta").eq("estado", "abierta")
    elif filtro == "tareas":
        q = q.eq("tipo", "tarea")
    elif filtro == "mis_tareas":
        q = q.eq("tipo", "tarea").eq("estado", "abierta").eq("asignado_a", usuario_id)
    elif filtro == "avisos":
        q = q.eq("tipo", "aviso")
    elif filtro == "menciones":
        menciona = (
            supabase.table("staff_posts").select("id, parent_id")
            .eq("equipo_id", equipo_id).contains("menciones", [usuario_id])
            .execute().data or []
        )
        raiz_ids = list({str(m.get("parent_id") or m["id"]) for m in menciona})
        if not raiz_ids:
            return {"data": [], "siguiente": None}
        q = q.in_("id", raiz_ids)

    if antes:
        q = q.lt("ultima_actividad_at", antes)
    filas = q.order("ultima_actividad_at", desc=True).limit(limite + 1).execute().data or []
    filas.sort(key=lambda r: str(r.get("ultima_actividad_at") or r.get("created_at") or ""), reverse=True)
    hay_mas = len(filas) > limite
    filas = filas[:limite]
    siguiente = filas[-1].get("ultima_actividad_at") if hay_mas and filas else None

    if filtro in ("todo",) and not antes:
        fijados = base().eq("fijado", True).execute().data or []
        vistos = {f["id"] for f in fijados}
        fijados.sort(key=lambda r: str(r.get("ultima_actividad_at") or ""), reverse=True)
        filas = fijados + [f for f in filas if f["id"] not in vistos]
    elif filtro == "todo":
        filas = [f for f in filas if not f.get("fijado")]

    return {"data": componer_hilos(supabase, equipo_id, filas), "siguiente": siguiente}


def obtener_hilo(supabase, equipo_id: str, post_id: str) -> dict:
    fila = supabase.table("staff_posts").select("*").eq("id", post_id).eq("equipo_id", equipo_id).execute().data
    if not fila:
        raise TableroError(404, "Publicación no encontrada")
    post = fila[0]
    if post.get("parent_id"):
        return obtener_hilo(supabase, equipo_id, str(post["parent_id"]))
    return componer_hilos(supabase, equipo_id, [post])[0]


def _participantes(supabase, raiz_id: str) -> list[str]:
    filas = supabase.table("staff_posts").select("autor_id").eq("parent_id", raiz_id).execute().data or []
    vistos: list[str] = []
    for f in filas:
        uid = f.get("autor_id")
        if uid and str(uid) not in vistos:
            vistos.append(str(uid))
    return vistos


def enviar_avisos(
    supabase,
    avisos: list[Aviso],
    *,
    actor_id: str,
    equipo_id: str,
    raiz_id: str,
    contenido: str,
) -> int:
    """Inserta las notificaciones; si faltan las columnas nuevas, sin ellas."""
    if not avisos:
        return 0
    filas = [
        {
            "usuario_id": a.usuario_id,
            "tipo": a.tipo,
            "titulo": a.titulo[:255],
            "contenido": extracto(contenido, 240),
            "entidad_tipo": "staff_post",
            "entidad_id": raiz_id,
            "prioridad": a.prioridad,
            "leida": False,
            "presentada": False,
            "actor_id": actor_id,
            "equipo_id": equipo_id,
            "url": f"/tablero?post={raiz_id}",
        }
        for a in avisos
    ]
    try:
        supabase.table("notificaciones").insert(filas).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Notificaciones del tablero sin columnas nuevas (%s); reintento básico", exc)
        try:
            basicas = [
                {k: v for k, v in f.items() if k not in ("actor_id", "equipo_id", "url", "presentada")}
                for f in filas
            ]
            supabase.table("notificaciones").insert(basicas).execute()
        except Exception as exc2:  # noqa: BLE001
            logger.error("No se pudieron crear notificaciones del tablero: %s", exc2)
            return 0
    return len(filas)


def crear_post(
    supabase,
    equipo_id: str,
    actor: dict,
    datos: dict,
) -> dict:
    actor_id = str(actor["id"])
    contenido = (datos.get("contenido") or "").strip()
    if not contenido:
        raise TableroError(400, "Escribe algo antes de publicar")
    if len(contenido) > 5000:
        raise TableroError(400, "El texto no puede pasar de 5000 caracteres")

    staff = miembros_staff(supabase, equipo_id)
    staff_ids = [m["id"] for m in staff]
    validos = {s.lower() for s in staff_ids}
    contenido, menciones = limpiar_menciones(contenido, validos)
    menciones = [m for m in menciones if m in validos]
    por_lower = {s.lower(): s for s in staff_ids}
    menciones = [por_lower[m] for m in menciones]

    raiz = None
    parent_id = datos.get("parent_id")
    if parent_id:
        padre = (
            supabase.table("staff_posts").select("*").eq("id", str(parent_id))
            .eq("equipo_id", equipo_id).execute().data
        )
        if not padre:
            raise TableroError(404, "La publicación a la que respondes ya no existe")
        raiz = padre[0]
        if raiz.get("parent_id"):
            raiz = (
                supabase.table("staff_posts").select("*").eq("id", str(raiz["parent_id"]))
                .execute().data or [raiz]
            )[0]

    tipo = "comentario" if raiz else (datos.get("tipo") or "comentario")
    if tipo not in TIPOS_POST:
        raise TableroError(400, "Tipo de publicación no válido")

    asignado = None
    fecha_limite = None
    if tipo == "tarea":
        asignado = datos.get("asignado_a") or None
        if asignado and str(asignado) not in staff_ids:
            raise TableroError(400, "Solo puedes asignar tareas a alguien del cuerpo técnico")
        fecha_limite = datos.get("fecha_limite") or None

    entidad_tipo = entidad_id = entidad_titulo = None
    if raiz:
        entidad_tipo, entidad_id, entidad_titulo = (
            raiz.get("entidad_tipo"), raiz.get("entidad_id"), raiz.get("entidad_titulo")
        )
    elif datos.get("entidad_tipo") and datos.get("entidad_id"):
        entidad_tipo = datos["entidad_tipo"]
        if entidad_tipo not in ENTIDADES_ENLAZABLES:
            raise TableroError(400, "Solo se pueden enlazar sesiones, partidos o jugadores")
        entidad_id = str(datos["entidad_id"])
        entidad_titulo = titulo_entidad(supabase, equipo_id, entidad_tipo, entidad_id)
        if not entidad_titulo:
            raise TableroError(404, "Lo que intentas enlazar no es de este equipo")

    ahora = _ahora()
    fila = {
        "equipo_id": equipo_id,
        "autor_id": actor_id,
        "parent_id": str(raiz["id"]) if raiz else None,
        "tipo": tipo,
        "contenido": contenido,
        "menciones": menciones,
        "asignado_a": str(asignado) if asignado else None,
        "fecha_limite": str(fecha_limite) if fecha_limite else None,
        "estado": "abierta",
        "entidad_tipo": entidad_tipo,
        "entidad_id": entidad_id,
        "entidad_titulo": entidad_titulo,
        "ultima_actividad_at": ahora,
        "created_at": ahora,
    }
    creado = supabase.table("staff_posts").insert(fila).execute().data[0]

    raiz_id = str(raiz["id"]) if raiz else str(creado["id"])
    if raiz:
        supabase.table("staff_posts").update({"ultima_actividad_at": ahora}).eq("id", raiz_id).execute()

    ctx = ContextoPost(
        actor_id=actor_id,
        tipo=tipo,
        menciones=menciones,
        staff_ids=staff_ids,
        difusion_ids=[m["id"] for m in staff if m.get("rol_en_equipo") != ROL_CLUB],
        asignado_a=fila["asignado_a"],
        raiz=raiz,
        participantes_hilo=_participantes(supabase, raiz_id) if raiz else [],
        actor_nombre=nombre_corto(actor),
    )
    enviar_avisos(
        supabase,
        destinatarios_post_nuevo(ctx),
        actor_id=actor_id,
        equipo_id=equipo_id,
        raiz_id=raiz_id,
        contenido=contenido,
    )
    return obtener_hilo(supabase, equipo_id, raiz_id)


def actualizar_post(
    supabase,
    equipo_id: str,
    post_id: str,
    actor: dict,
    cambios: dict,
    *,
    es_responsable: bool = False,
) -> dict:
    actor_id = str(actor["id"])
    fila = supabase.table("staff_posts").select("*").eq("id", post_id).eq("equipo_id", equipo_id).execute().data
    if not fila:
        raise TableroError(404, "Publicación no encontrada")
    post = fila[0]
    es_autor = str(post.get("autor_id")) == actor_id
    es_asignado = str(post.get("asignado_a") or "") == actor_id
    update: dict = {}
    staff = miembros_staff(supabase, equipo_id)
    staff_ids = [m["id"] for m in staff]
    nuevos_avisos: list[Aviso] = []
    quien = nombre_corto(actor)

    if "contenido" in cambios and cambios["contenido"] is not None:
        if not es_autor:
            raise TableroError(403, "Solo quien lo escribió puede editarlo")
        texto = cambios["contenido"].strip()
        if not texto:
            raise TableroError(400, "El texto no puede quedar vacío")
        if len(texto) > 5000:
            raise TableroError(400, "El texto no puede pasar de 5000 caracteres")
        validos = {s.lower() for s in staff_ids}
        texto, menciones = limpiar_menciones(texto, validos)
        por_lower = {s.lower(): s for s in staff_ids}
        menciones = [por_lower[m] for m in menciones if m in por_lower]
        previas = {str(m) for m in (post.get("menciones") or [])}
        for uid in menciones:
            if uid not in previas and uid != actor_id:
                nuevos_avisos.append(Aviso(uid, "mencion", f"{quien} te ha mencionado", "alta"))
        update.update({"contenido": texto, "menciones": menciones, "editado_at": _ahora()})

    if "estado" in cambios and cambios["estado"] is not None:
        estado = cambios["estado"]
        if estado not in ("abierta", "resuelta"):
            raise TableroError(400, "Estado no válido")
        if post.get("parent_id") or post.get("tipo") not in ("tarea", "pregunta"):
            raise TableroError(400, "Solo las tareas y preguntas se cierran")
        if estado != post.get("estado"):
            if estado == "resuelta":
                update.update({"estado": "resuelta", "resuelto_por": actor_id, "resuelto_at": _ahora()})
                aviso = aviso_resuelto(post, actor_id, quien)
                if aviso:
                    nuevos_avisos.append(aviso)
            else:
                update.update({"estado": "abierta", "resuelto_por": None, "resuelto_at": None})

    if "asignado_a" in cambios or "fecha_limite" in cambios:
        if post.get("tipo") != "tarea" or post.get("parent_id"):
            raise TableroError(400, "Solo las tareas tienen responsable y fecha")
        if not (es_autor or es_asignado or es_responsable):
            raise TableroError(403, "Solo quien creó la tarea o su responsable pueden cambiarla")
        if "asignado_a" in cambios:
            nuevo = cambios["asignado_a"] or None
            if nuevo and str(nuevo) not in staff_ids:
                raise TableroError(400, "Solo puedes asignar tareas a alguien del cuerpo técnico")
            if str(nuevo or "") != str(post.get("asignado_a") or ""):
                update["asignado_a"] = str(nuevo) if nuevo else None
                if nuevo and str(nuevo) != actor_id:
                    nuevos_avisos.append(
                        Aviso(str(nuevo), "tarea_asignada", f"{quien} te ha asignado una tarea", "alta")
                    )
        if "fecha_limite" in cambios:
            update["fecha_limite"] = str(cambios["fecha_limite"]) if cambios["fecha_limite"] else None

    if "fijado" in cambios and cambios["fijado"] is not None:
        if post.get("parent_id"):
            raise TableroError(400, "Solo se fijan publicaciones, no respuestas")
        update["fijado"] = bool(cambios["fijado"])

    if update:
        supabase.table("staff_posts").update(update).eq("id", post_id).execute()

    raiz_id = str(post.get("parent_id") or post["id"])
    contenido = update.get("contenido", post.get("contenido") or "")
    enviar_avisos(
        supabase,
        [a for a in nuevos_avisos if a.usuario_id in staff_ids],
        actor_id=actor_id,
        equipo_id=equipo_id,
        raiz_id=raiz_id,
        contenido=contenido,
    )
    return obtener_hilo(supabase, equipo_id, raiz_id)


def borrar_post(supabase, equipo_id: str, post_id: str, actor_id: str, *, es_responsable: bool = False) -> None:
    fila = supabase.table("staff_posts").select("*").eq("id", post_id).eq("equipo_id", equipo_id).execute().data
    if not fila:
        raise TableroError(404, "Publicación no encontrada")
    post = fila[0]
    if str(post.get("autor_id")) != actor_id and not es_responsable:
        raise TableroError(403, "Solo quien lo escribió o el primer entrenador pueden borrarlo")
    supabase.table("staff_posts").delete().eq("id", post_id).execute()
    if not post.get("parent_id"):
        supabase.table("notificaciones").delete().eq("entidad_tipo", "staff_post").eq("entidad_id", post_id).execute()


def resumen(supabase, equipo_id: str, usuario_id: str) -> dict:
    abiertas = (
        supabase.table("staff_posts").select("*").eq("equipo_id", equipo_id)
        .is_("parent_id", "null").eq("estado", "abierta").in_("tipo", ["tarea", "pregunta"])
        .execute().data or []
    )
    mias = [p for p in abiertas if p.get("tipo") == "tarea" and str(p.get("asignado_a")) == usuario_id]
    mias.sort(key=lambda p: (p.get("fecha_limite") is None, str(p.get("fecha_limite") or ""), str(p.get("created_at") or "")))
    preguntas = [p for p in abiertas if p.get("tipo") == "pregunta"]
    preguntas.sort(key=lambda p: str(p.get("created_at") or ""), reverse=True)
    usuarios = _usuarios_por_id(
        supabase,
        [p.get("autor_id") for p in mias + preguntas[:5]] + [p.get("asignado_a") for p in mias],
    )
    return {
        "mis_tareas": [_forma(p, usuarios) for p in mias[:8]],
        "mis_tareas_total": len(mias),
        "tareas_abiertas": sum(1 for p in abiertas if p.get("tipo") == "tarea"),
        "preguntas_abiertas": [_forma(p, usuarios) for p in preguntas[:5]],
        "preguntas_abiertas_total": len(preguntas),
    }


def actividad_equipo(supabase, equipo_id: str, *, dias: int = 14, limite: int = 40) -> list[dict]:
    staff = miembros_staff(supabase, equipo_id)
    if not staff:
        return []
    usuarios = {m["id"]: m for m in staff}
    desde = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()

    registros = (
        supabase.table("audit_log")
        .select("id, usuario_id, accion, entidad_tipo, entidad_id, created_at")
        .in_("usuario_id", list(usuarios))
        .in_("entidad_tipo", list(ACTIVIDAD_ENTIDADES))
        .in_("accion", ["crear", "actualizar"])
        .gte("created_at", desde)
        .order("created_at", desc=True)
        .limit(800)
        .execute()
        .data
        or []
    )

    por_tipo: dict[str, set[str]] = {}
    for r in registros:
        if r.get("entidad_id"):
            por_tipo.setdefault(r["entidad_tipo"], set()).add(str(r["entidad_id"]))

    titulos: dict[tuple[str, str], dict] = {}
    if por_tipo.get("sesion"):
        for s in (
            supabase.table("sesiones").select("id, titulo, fecha")
            .in_("id", list(por_tipo["sesion"])).eq("equipo_id", equipo_id).execute().data or []
        ):
            titulos[("sesion", str(s["id"]))] = {
                "titulo": f"{s.get('titulo') or 'Sesión'} · {s.get('fecha') or ''}".strip(" ·"),
                "href": f"/sesiones/{s['id']}",
            }
    if por_tipo.get("partido"):
        for p in (
            supabase.table("partidos").select("id, fecha, rivales(nombre)")
            .in_("id", list(por_tipo["partido"])).eq("equipo_id", equipo_id).execute().data or []
        ):
            rival = (p.get("rivales") or {}).get("nombre") if isinstance(p.get("rivales"), dict) else None
            titulos[("partido", str(p["id"]))] = {
                "titulo": f"vs {rival or 'rival'} · {p.get('fecha') or ''}".strip(" ·"),
                "href": f"/partidos/{p['id']}",
            }
    if por_tipo.get("jugador"):
        for j in (
            supabase.table("jugadores").select("id, nombre, apellidos")
            .in_("id", list(por_tipo["jugador"])).eq("equipo_id", equipo_id).execute().data or []
        ):
            titulos[("jugador", str(j["id"]))] = {
                "titulo": f"{j.get('nombre') or ''} {j.get('apellidos') or ''}".strip() or "Jugador",
                "href": f"/plantilla/{j['id']}",
            }

    entradas = agrupar_actividad(registros, titulos, usuarios, limite=limite)

    posts = (
        supabase.table("staff_posts").select("*").eq("equipo_id", equipo_id)
        .gte("created_at", desde).order("created_at", desc=True).limit(200).execute().data or []
    )
    creados = {p["id"] for p in posts}
    resueltos = (
        supabase.table("staff_posts").select("*").eq("equipo_id", equipo_id)
        .gte("resuelto_at", desde).limit(100).execute().data or []
    )
    todos = posts + [p for p in resueltos if p["id"] not in creados]

    for p in todos:
        raiz = str(p.get("parent_id") or p["id"])
        base = {
            "entidad_tipo": "staff_post",
            "entidad_id": raiz,
            "titulo": extracto(p.get("contenido") or "", 90),
            "href": f"/tablero?post={raiz}",
            "cambios": 1,
        }
        if p["id"] in creados:
            if p.get("parent_id"):
                texto = "ha respondido en el tablero"
            else:
                texto = {
                    "pregunta": "ha preguntado al staff",
                    "tarea": "ha creado una tarea",
                    "aviso": "ha publicado un aviso",
                }.get(p.get("tipo"), "ha comentado en el tablero")
            cuando = _ts(p["created_at"]).isoformat()
            entradas.append({
                **base,
                "id": f"post-{p['id']}",
                "usuario_id": p.get("autor_id"),
                "usuario": usuarios.get(str(p.get("autor_id"))),
                "accion": "publicar",
                "texto": texto,
                "created_at": cuando,
                "desde": cuando,
            })
        if p.get("resuelto_at") and p.get("resuelto_por") and _ts(p["resuelto_at"]) >= _ts(desde):
            cuando = _ts(p["resuelto_at"]).isoformat()
            entradas.append({
                **base,
                "id": f"resuelto-{p['id']}",
                "usuario_id": p.get("resuelto_por"),
                "usuario": usuarios.get(str(p.get("resuelto_por"))),
                "accion": "resolver",
                "texto": "ha completado la tarea" if p.get("tipo") == "tarea" else "ha resuelto la pregunta",
                "created_at": cuando,
                "desde": cuando,
            })

    entradas.sort(key=lambda e: e["created_at"], reverse=True)
    return entradas[:limite]
