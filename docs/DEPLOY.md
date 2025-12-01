# Guía de Deploy - TrainingHub Pro

Esta guía explica cómo desplegar TrainingHub Pro en producción usando servicios gratuitos.

## Arquitectura de Deploy

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     Vercel      │      │     Render      │      │    Supabase     │
│   (Frontend)    │─────▶│   (Backend)     │─────▶│   (Database)    │
│   Next.js 14    │      │   FastAPI       │      │   PostgreSQL    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Costes

| Servicio | Plan | Coste |
|----------|------|-------|
| Supabase | Free | $0/mes |
| Vercel | Hobby | $0/mes |
| Render | Free | $0/mes |

**Total: $0/mes** para empezar.

---

## Paso 1: Configurar Supabase (ya hecho)

Si aún no has configurado Supabase:

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ejecutar `database/schema.sql` en el SQL Editor
4. Copiar las credenciales de API

---

## Paso 2: Deploy del Backend en Render

### Opción A: Deploy automático (recomendado)

1. Crear cuenta en [render.com](https://render.com)
2. Conectar tu repositorio de GitHub
3. Hacer clic en "New +" → "Blueprint"
4. Seleccionar el repositorio con `render.yaml`
5. Configurar las variables de entorno:
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase
   - `CORS_ORIGINS`: URL de tu frontend (ej: `https://tu-app.vercel.app`)

### Opción B: Deploy manual

1. Ir a Render Dashboard → New Web Service
2. Conectar repositorio de GitHub
3. Configuración:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Añadir variables de entorno (las mismas que arriba)
5. Deploy

**URL del backend**: `https://tu-servicio.onrender.com`

---

## Paso 3: Deploy del Frontend en Vercel

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Hacer clic en "Add New..." → "Project"
3. Importar repositorio de GitHub
4. Configuración:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. Configurar Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `NEXT_PUBLIC_API_URL`: URL del backend en Render (ej: `https://tu-api.onrender.com/v1`)
6. Deploy

**URL del frontend**: `https://tu-app.vercel.app`

---

## Paso 4: Configuración Post-Deploy

### Actualizar CORS en Backend

Después de obtener la URL de Vercel, actualizar la variable `CORS_ORIGINS` en Render:

```
CORS_ORIGINS=https://tu-app.vercel.app
```

### Verificar conexión

1. Abrir `https://tu-api.onrender.com/health` - debe devolver `{"status": "healthy"}`
2. Abrir `https://tu-api.onrender.com/docs` - debe mostrar la documentación Swagger
3. Abrir `https://tu-app.vercel.app` - debe mostrar la página de login

---

## Dominio Personalizado (Opcional)

### En Vercel

1. Ir a Settings → Domains
2. Añadir tu dominio (ej: `app.miclub.com`)
3. Configurar DNS según instrucciones

### En Render

1. Ir a Settings → Custom Domains
2. Añadir dominio (ej: `api.miclub.com`)
3. Configurar DNS

---

## Troubleshooting

### Error "CORS blocked"

Verificar que `CORS_ORIGINS` incluye la URL exacta del frontend (sin trailing slash).

### Error "Database connection failed"

1. Verificar que las credenciales de Supabase son correctas
2. Verificar que el proyecto Supabase está activo (los proyectos free se pausan tras inactividad)

### Backend muy lento (cold start)

El plan gratuito de Render "duerme" el servicio tras 15 minutos de inactividad. La primera petición puede tardar 30-60 segundos.

**Solución**: Usar un servicio como [cron-job.org](https://cron-job.org) para hacer ping cada 14 minutos al endpoint `/health`.

---

## Siguientes Pasos

Una vez en producción:

1. **Crear primer usuario**: Registrarse en `/register`
2. **Crear organización**: Durante el registro
3. **Crear equipo**: En Configuración
4. **Crear tareas**: En la sección Tareas
5. **Planificar sesiones**: En la sección Sesiones

---

## Upgrade a Planes de Pago

Cuando crezcas, considera:

| Servicio | Plan | Coste | Beneficios |
|----------|------|-------|------------|
| Supabase | Pro | $25/mes | 8GB DB, sin pausas |
| Vercel | Pro | $20/mes | Analytics, más funciones |
| Render | Starter | $7/mes | Sin cold starts |

---

¿Problemas? Revisa la documentación o abre un issue en GitHub.
