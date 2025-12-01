"""
TrainingHub Pro - Router de Autenticación
Endpoints para login, registro y gestión de tokens.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from app.models import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.database import get_supabase

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """
    Inicia sesión con email y contraseña.
    Devuelve tokens JWT para usar en siguientes requests.
    """
    try:
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        # Obtener datos del usuario desde nuestra tabla
        user_data = supabase.table("usuarios").select("*").eq(
            "id", response.user.id
        ).single().execute()
        
        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user=UsuarioResponse(**user_data.data)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UsuarioCreate):
    """
    Registra un nuevo usuario.
    Si se proporciona organizacion_nombre, crea una nueva organización.
    """
    try:
        supabase = get_supabase()
        
        # Crear usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al crear usuario"
            )
        
        # Crear organización si es necesario
        org_id = None
        if user_data.organizacion_nombre:
            org_response = supabase.table("organizaciones").insert({
                "nombre": user_data.organizacion_nombre
            }).execute()
            org_id = org_response.data[0]["id"]
        
        # Crear registro en nuestra tabla de usuarios
        usuario_db = supabase.table("usuarios").insert({
            "id": auth_response.user.id,
            "email": user_data.email,
            "nombre": user_data.nombre,
            "apellidos": user_data.apellidos,
            "rol": user_data.rol.value if user_data.rol else "tecnico_asistente",
            "organizacion_id": org_id,
        }).execute()
        
        return UsuarioResponse(**usuario_db.data[0])
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/logout")
async def logout():
    """Cierra la sesión actual."""
    # El logout real se maneja en el frontend borrando los tokens
    return {"message": "Sesión cerrada correctamente"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresca el access token usando el refresh token."""
    try:
        supabase = get_supabase()
        response = supabase.auth.refresh_session(refresh_token)
        
        user_data = supabase.table("usuarios").select("*").eq(
            "id", response.user.id
        ).single().execute()
        
        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user=UsuarioResponse(**user_data.data)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
