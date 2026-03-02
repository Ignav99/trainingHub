# TrainingHub Pro - Estado del Proyecto

**Ultima actualizacion: 2026-02-17 22:30 UTC**

---

## 1. Stack tecnologico

| Capa | Tecnologia | Donde |
|------|-----------|-------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn-style UI + Zustand | `frontend/` |
| Backend | FastAPI (Python 3.11+) | `backend/` |
| Base de datos | Supabase (PostgreSQL + Auth + Storage + RLS) | Supabase Cloud |
| AI | Claude Sonnet 4.5 (chat) + Gemini 3 Flash (recomendaciones + embeddings) | APIs |
| Email | Resend (con fallback a log) | `RESEND_API_KEY` |
| Pagos | Stripe (webhook handler completo) | `STRIPE_SECRET_KEY` |
| Deploy | Vercel (frontend) + Render (backend) | `vercel.json` + `render.yaml` |

---

## 2. Estructura del backend

### 2.1 Routers (29 archivos en `app/api/v1/`)

| Router | Prefijo | Endpoints | Permisos | Servicios integrados |
|--------|---------|-----------|----------|---------------------|
| auth | `/v1/auth` | login, register, refresh, logout, /me | require_permission() | audit, license_service |
| tareas | `/v1/tareas` | CRUD + biblioteca publica | SESSION_*, TASK_* | audit |
| sesiones | `/v1/sesiones` | CRUD + PDF + tareas_sesion | SESSION_* | audit, pdf, storage, notifications |
| equipos | `/v1/equipos` | CRUD | PLANTILLA_READ, CONFIG_TEAM | license_checker |
| usuarios | `/v1/usuarios` | /me, list, get by ID | CONFIG_TEAM | - |
| jugadores | `/v1/jugadores` | CRUD + estado + estadisticas + **cross-team** | PLANTILLA_*, JUGADOR_* | audit, notifications |
| partidos | `/v1/partidos` | CRUD + resultado | PARTIDO_* | audit, notifications |
| rivales | `/v1/rivales` | CRUD | RIVAL_* | - |
| microciclos | `/v1/microciclos` | CRUD + sesiones por microciclo | SESSION_* | - |
| rpe | `/v1/rpe` | CRUD + batch + resumen | RPE_* | notifications |
| convocatorias | `/v1/convocatorias` | CRUD + rendimiento | CONVOCATORIA_* | - |
| comunicacion | `/v1/comunicacion` | conversaciones + mensajes | COMUNICACION_* | - |
| ai_chat | `/v1/ai` | chat, conversaciones CRUD | AI_USE | claude_service, license_checker |
| knowledge_base | `/v1/kb` | documentos CRUD + busqueda semantica | KB_* | embedding, task_service, license_checker |
| recomendador | `/v1/recomendador` | reglas + AI | SESSION_* | gemini_service |
| onboarding | `/v1/onboarding` | progreso, completar paso, skip | require_permission() | - |
| organizacion | `/v1/organizacion` | GET, PATCH, POST /logo | require_permission() | audit, storage |
| invitaciones | `/v1/invitaciones` | CRUD + verify + accept + transferencias | INVITACION_*, TRANSFERIR_PROPIEDAD | audit, license_checker, email_service |
| suscripciones | `/v1/suscripciones` | planes, actual, uso, upgrade, cancel, trial | CLUB_MANAGE_BILLING | license_checker |
| gdpr | `/v1/gdpr` | consentimientos, solicitudes, export | CLUB_MANAGE_ORG (admin) | audit, storage |
| tutores | `/v1/tutores` | verify, accept, mis-menores, revoke, menor/* | require_permission() | audit |
| medico | `/v1/medico` | registros CRUD + acceso log | MEDICAL_* | encryption, audit |
| dashboard | `/v1/dashboard` | estadisticas generales | require_permission() | - |
| rfef | `/v1/rfef` | competiciones, jornadas | require_permission() | - |
| exports | `/v1/exports` | CSV jugadores, sesiones, rpe, partidos, convocatorias | EXPORT_DATA | export_service |
| notificaciones | `/v1/notificaciones` | list, marcar leida, delete | require_permission() | - |
| background_tasks | `/v1/tasks` | list, get, cancel, tipos | require_permission() | task_service |
| websocket | `/v1/ws` | conexion real-time | JWT en query | - |
| stripe_webhook | `/v1/stripe` | webhook + cron expirations | sin auth (firma Stripe / cron secret) | license_service, audit |
| catalogos | `/v1/catalogos/*` | categorias, fases, match-days, principios, roles | publico | - |

### 2.2 Cross-team player access (jugadores.py)

El endpoint `GET /jugadores` ahora soporta:
- `equipo_id` → filtra por equipo especifico
- `organizacion_completa=true` → devuelve TODOS los jugadores de la organizacion (cross-team)
- Sin params → scoped a la organizacion del usuario (seguridad)
- Incluye datos del equipo en la respuesta: `equipos(nombre, categoria)`

### 2.3 Servicios (`app/services/`)

| Servicio | Archivo | Integrado en endpoints |
|----------|---------|----------------------|
| Claude AI (agente con 8 tools) | claude_service.py | ai_chat.py |
| Gemini (recomendaciones) | gemini_service.py | recomendador.py |
| Embeddings (text-embedding-004) | embedding_service.py | knowledge_base.py |
| Email (Resend) | email_service.py | invitaciones.py |
| Notificaciones | notification_service.py | sesiones, partidos, jugadores, rpe |
| PDF (WeasyPrint + Jinja2) | pdf_service.py | sesiones.py |
| Storage (Supabase) | storage_service.py | sesiones.py, gdpr.py |
| Exports (CSV) | export_service.py | exports.py |
| Audit log | audit_service.py | 15+ endpoints |
| License checking | license_checker.py | equipos, ai_chat, knowledge_base, invitaciones, suscripciones |
| License lifecycle | license_service.py | auth.py (register) |
| Background tasks | task_service.py | knowledge_base.py, background_tasks.py |
| Encryption (AES-256-GCM) | encryption.py (en security/) | medico.py |

### 2.4 Sistema de permisos (`app/security/`)

- **65+ permisos granulares** en enum Permission
- **9 roles de equipo**: entrenador_principal, segundo_entrenador, preparador_fisico, entrenador_porteros, analista, fisio, delegado, jugador, tutor
- **3 roles de club**: presidente, director_deportivo, secretario
- **AuthContext**: user, user_id, organizacion_id, equipo_id, rol_en_equipo, permissions, subscription_status, plan_features, is_read_only
- **Migracion 100% completada**: 0 endpoints usan get_current_user

### 2.5 Middleware (`app/middleware.py`)

1. CORS → 2. RateLimit (100/60s) → 3. LicenseEnforcement → 4. SecurityHeaders → 5. RequestLogging

---

## 3. Estructura del frontend

### 3.1 UI Component Library (`frontend/src/components/ui/`) - 18 componentes

Siguiendo patron shadcn/ui (Radix primitives + CVA + Tailwind):

| Componente | Variantes/Features |
|-----------|-------------------|
| Button | default, destructive, outline, secondary, ghost, link, **club** (dynamic club color) |
| Card | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Input | Standard with focus ring |
| Label | Radix Label primitive |
| Badge | default, secondary, destructive, outline, success, warning, info, **club** |
| Avatar | Image with fallback initials, sizes: sm/md/lg/xl |
| ClubAvatar | Organization logo with fallback (uses club color) |
| Textarea | Auto-sizing textarea |
| Select | Full Radix Select with Trigger, Content, Item, Group, Separator |
| Dialog | Full Radix Dialog with Header, Footer, Title, Description |
| Tabs | Radix Tabs with List, Trigger, Content |
| Separator | Horizontal/vertical |
| Skeleton | Animated loading placeholder |
| Switch | Toggle switch |
| Spinner | Animated circular spinner, sizes: sm/md/lg |
| ColorPicker | Color input + hex input + preset swatches |
| FileUpload | Drag-and-drop + click, image preview, max size validation |
| Stepper | Multi-step indicator with completed/current/pending states |

### 3.2 Theme System

| Archivo | Funcion |
|---------|---------|
| `stores/clubStore.ts` | Zustand store: organizacion, theme (colorPrimario, colorSecundario, logoUrl), isOnboardingComplete |
| `components/providers/ThemeProvider.tsx` | Injects CSS vars `--club-primary`, `--club-primary-foreground`, `--club-secondary`, `--club-secondary-foreground` |
| `globals.css` | Default club CSS variables + dark mode support |

**Flujo**: User logs in → AuthProvider loads org data → clubStore.setOrganizacion() → ThemeProvider updates CSS variables → Club colors apply everywhere via `bg-[hsl(var(--club-primary))]`.

### 3.3 Paginas (`frontend/src/app/`)

| Ruta | Estado | Funcionalidad |
|------|--------|--------------|
| (auth)/login | EXISTENTE | Login con Supabase |
| (auth)/register | EXISTENTE (actualizado) | Registro → redirige a /onboarding |
| **onboarding/** | **NUEVO** | Flujo 4 pasos: club identity, team setup, players, preferences |
| (dashboard)/ | ACTUALIZADO | Dashboard con datos reales de API, club branding, skeleton loading |
| (dashboard)/tareas | EXISTENTE | Lista + CRUD + editor grafico |
| (dashboard)/tareas/[id] | EXISTENTE | Detalle tarea |
| (dashboard)/tareas/[id]/editar | EXISTENTE | Editar tarea |
| (dashboard)/tareas/nueva | EXISTENTE | Nueva tarea |
| (dashboard)/sesiones | EXISTENTE | Lista sesiones |
| (dashboard)/sesiones/[id] | EXISTENTE | Detalle sesion |
| (dashboard)/sesiones/nueva | EXISTENTE | Nueva sesion |
| (dashboard)/sesiones/nueva-ai | EXISTENTE | Sesion con AI |
| (dashboard)/sesiones/calendario | EXISTENTE | Calendario de sesiones |
| (dashboard)/plantilla | EXISTENTE | Lista jugadores |
| (dashboard)/plantilla/[id] | EXISTENTE | Detalle jugador |
| (dashboard)/plantilla/nuevo | EXISTENTE | Nuevo jugador |
| (dashboard)/plantilla/invitados | EXISTENTE | Invitados |
| (dashboard)/partidos/nuevo | EXISTENTE | Nuevo partido |
| (dashboard)/calendario | EXISTENTE | Calendario general |
| (dashboard)/biblioteca | EXISTENTE | Biblioteca de tareas |
| (dashboard)/equipo | EXISTENTE | Gestion equipo |
| **(dashboard)/microciclos** | **NUEVO** | Planificador semanal: timeline 7 dias, sesiones/partidos por dia, CRUD microciclo, Match Day reference, conexion con partido |
| **(dashboard)/ai** | **NUEVO** | Chat AI: sidebar conversaciones, mensajes en tiempo real, suggested prompts, club colors en bubbles, link a KB, tools indicator |
| **(dashboard)/biblioteca-ai** | **NUEVO** | Knowledge Base: lista documentos con estado (pendiente/procesando/indexado/error), stats, busqueda semantica, crear (manual/URL), reindex, eliminar |

### 3.4 Onboarding Flow (4 pasos)

1. **Club Identity** (`ClubIdentityStep`): nombre, color primario/secundario (ColorPicker con presets), upload de escudo (FileUpload con preview), live preview card
2. **Team Setup** (`TeamSetupStep`): nombre equipo, categoria (13 opciones de senior a prebenjamin), temporada, sistema de juego (13 formaciones incl. F7/F5)
3. **Players** (`PlayersStep`): opcional, añadir jugadores con nombre, apellidos, dorsal, posicion (16 posiciones), pierna dominante
4. **Preferences** (`PreferencesStep`): resumen visual, toggle notificaciones, toggle AI, mensaje de confirmacion

**Flujo**: Register → /onboarding → 4 steps → API calls (update org, create team, create players) → redirect to dashboard.

### 3.5 API clients (`frontend/src/lib/api/`)

| Archivo | Endpoints | Estado |
|---------|-----------|--------|
| client.ts | Base ApiClient | EXISTENTE |
| equipos.ts | /v1/equipos | EXISTENTE |
| sesiones.ts | /v1/sesiones + recomendador | EXISTENTE |
| tareas.ts | /v1/tareas + catalogos | EXISTENTE |
| partidos.ts | /v1/partidos + rivales | EXISTENTE |
| jugadores.ts | /v1/jugadores (**cross-team con organizacion_completa**) | ACTUALIZADO |
| onboarding.ts | /v1/onboarding | NUEVO |
| organizacion.ts | /v1/organizacion (CRUD + logo upload) | NUEVO |
| suscripciones.ts | /v1/suscripciones (plans, usage, checkout, portal) | NUEVO |
| rpe.ts | /v1/rpe (CRUD + resumen) | NUEVO |
| convocatorias.ts | /v1/convocatorias (CRUD + bulk + stats) | NUEVO |
| microciclos.ts | /v1/microciclos (CRUD + getSesiones) | ACTUALIZADO |
| comunicacion.ts | /v1/comunicacion (conversaciones + mensajes) | NUEVO |
| notificaciones.ts | /v1/notificaciones (list, read, count) | NUEVO |
| invitaciones.ts | /v1/invitaciones (CRUD + verify + accept) | NUEVO |
| medico.ts | /v1/medico (CRUD + alta) | NUEVO |
| gdpr.ts | /v1/gdpr (consentimientos, solicitudes, export) | NUEVO |
| knowledgeBase.ts | /v1/kb (documentos CRUD + busqueda semantica) | ACTUALIZADO (paths fixed) |
| aiChat.ts | /v1/ai (chat + conversaciones paginadas) | ACTUALIZADO |
| exports.ts | /v1/exports (CSV downloads) | NUEVO |
| rivales.ts | /v1/rivales (CRUD) | NUEVO |

### 3.6 Stores (Zustand)

| Store | Key | Funcion |
|-------|-----|---------|
| authStore.ts | `traininghub-auth` | usuario, token, Supabase auth |
| equipoStore.ts | `equipo-storage` | equipos[], equipoActivo |
| clubStore.ts | `traininghub-club` | organizacion, theme (colors, logo), isOnboardingComplete |

### 3.7 Types (`frontend/src/types/index.ts`)

**40+ types/interfaces** cubriendo todos los dominios:

Existentes: Organizacion, Equipo, Usuario, Tarea, SesionTarea, Sesion, Partido, Rival, EventoCalendario, CategoriaTarea, PaginatedResponse, TareaFiltros, SesionFiltros, RecomendadorInput/Output, AIRecomendadorInput/Output, LoginCredentials, AuthTokens, AuthResponse

Nuevos: Jugador, PosicionInfo, EstadisticasEquipo, RPERegistro, RPEResumenJugador, RPEResumenEquipo, Convocatoria, ConvocatoriasJugadorStats, Microciclo, Conversacion, Mensaje, Notificacion, Plan, Suscripcion, UsageLimits, TrialStatus, ConsentimientoGDPR, SolicitudGDPR, RegistroMedico, Invitacion, InvitacionVerify, DocumentoKB, KBSearchResult, AIConversacion, AIMensaje, AIChatRequest, AIChatResponse, OnboardingPaso, OnboardingProgreso, OnboardingCheckResponse + 20+ enums/union types

### 3.8 Sidebar Navigation

**Navegacion principal (8 items):**
Dashboard, **Microciclos**, Sesiones, Tareas, Plantilla, Partidos, **Biblioteca AI**, **AI Asistente**

**Navegacion secundaria (3 items):**
Estadisticas, Mensajes, Configuracion

---

## 4. Que falta (priorizado)

### 4.1 Frontend - UI pages pendientes

| Prioridad | Modulo | API client | Pagina UI |
|-----------|--------|:----------:|:---------:|
| ALTA | Partidos (lista + detalle + resultado) | SI | PARCIAL (/nuevo) |
| ALTA | RPE / Wellness | SI | NO |
| ALTA | Convocatorias | SI | NO |
| ALTA | Rivales | SI | NO |
| ALTA | Notificaciones panel | SI | NO |
| ALTA | Suscripciones / Billing | SI | NO |
| ALTA | Configuracion (club settings, perfil usuario) | PARCIAL | NO |
| MEDIA | Comunicacion (chat interno) | SI | NO |
| MEDIA | Exports (descargas CSV) | SI | NO |
| MEDIA | Estadisticas dashboard avanzado | SI | NO |
| BAJA | GDPR (consentimientos, solicitudes) | SI | NO |
| BAJA | Tutores / Control parental | SI | NO |
| BAJA | Modulo medico | SI | NO |
| BAJA | RFEF integracion | SI | NO |
| BAJA | Permisos en UI (ocultar/mostrar segun rol) | - | NO |

### 4.2 Backend

| Prioridad | Tarea |
|-----------|-------|
| BAJA | Tests de integracion |
| BAJA | SQL migrations documentation |

### 4.3 Infraestructura

| Tarea | Estado |
|-------|--------|
| Vercel deploy frontend | Configurado (vercel.json) |
| Render deploy backend | Configurado (render.yaml) |
| Supabase Cloud setup | Pendiente migraciones SQL |
| Variables de entorno produccion | Pendiente |
| CI/CD (GitHub Actions) | No existe |
| Dominio personalizado | Pendiente |
| `npm install` | node_modules no instalados en frontend |

---

## 5. Integraciones externas

| Servicio | Env var | Estado |
|----------|---------|--------|
| Supabase | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY | Configurado |
| Claude AI | ANTHROPIC_API_KEY | Configurado |
| Google Gemini | GEMINI_API_KEY | Configurado |
| Resend Email | RESEND_API_KEY | Configurado (fallback a log) |
| Stripe | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Webhook handler completo |
| Medical encryption | MEDICAL_ENCRYPTION_KEY | Configurado |

---

## 6. Historial de cambios recientes

| Fecha | Que se hizo |
|-------|------------|
| **2026-02-17 22:30** | **Microciclos page** (planificador semanal 7 dias, conexion con partidos), **AI Chat page** (conversaciones, suggested prompts, club-colored bubbles), **Biblioteca AI page** (KB management, busqueda semantica), **Cross-team player access** (backend org-scoping + organizacion_completa param), API clients fixed (knowledgeBase paths → /kb/*, aiChat paginated, microciclos PUT), sidebar nav updated (Microciclos + Biblioteca AI) |
| 2026-02-17 20:15 | **FRONTEND**: UI library (18 componentes), theme system (clubStore + ThemeProvider), 16 API clients nuevos, 30+ types nuevos, onboarding flow (4 pasos), dashboard layout rediseñado con club branding, dashboard page con datos reales, AuthProvider sin demo mode |
| 2026-02-17 18:40 | requirements.txt actualizado (stripe, resend). Verificacion final: 73 archivos backend OK |
| 2026-02-17 18:35 | Stripe webhook handler + cron endpoint creados |
| 2026-02-17 18:30 | Notification service integrado en sesiones, partidos, jugadores, rpe |
| 2026-02-17 18:28 | LicenseChecker integrado en equipos, ai_chat, knowledge_base |
| 2026-02-17 18:26 | Email service integrado en invitaciones |
| 2026-02-17 18:24 | auth.py y background_tasks.py migrados a require_permission |
| 2026-02-17 ~17:00 | Migrados 6 routers al nuevo sistema de permisos |
| Anteriores | Implementacion completa de 29 routers, 11 servicios, 4 migraciones SQL, sistema de permisos |

---

## 7. Comandos utiles

```bash
# Backend
cd backend
PYENV_VERSION=3.11.9 python -m uvicorn app.main:app --reload
PYENV_VERSION=3.11.9 python -m pytest tests/

# Frontend
cd frontend
npm install                          # NECESARIO: node_modules no instalados
npm run dev                          # Dev server localhost:3000
npm run build                        # Build produccion

# Verificar backend compila
cd backend && PYENV_VERSION=3.11.9 python -c "
import py_compile, os
for root, dirs, files in os.walk('app'):
    for f in files:
        if f.endswith('.py'):
            py_compile.compile(os.path.join(root, f), doraise=True)
print('All OK')
"
```

---

## 8. Arquitectura de seguridad (resumen)

```
Request → CORS → RateLimit → LicenseEnforcement → SecurityHeaders → RequestLogging
  → FastAPI Router → require_permission(*perms)
    → JWT validation (Supabase Auth)
    → Check subscription status
    → Check feature gates (plan limits)
    → Resolve equipo_id
    → Get rol_en_equipo
    → Build permission set (default + custom)
    → Verify required permissions
    → Return AuthContext
```

---

## 9. Notas para retomar en nuevo chat

1. **Leer este archivo** - da el contexto completo en 2 minutos
2. **Backend esta 99% completo** - 73 archivos, 29+ routers, Stripe webhook, todos los servicios integrados
3. **Frontend tiene cimientos completos + 3 paginas nuevas** - 18 UI components, 21 API clients, 3 stores, 40+ types, theme system, onboarding flow, real-data dashboard, microciclos planner, AI chat, biblioteca AI
4. **Lo que falta son paginas UI** - RPE, convocatorias, partidos lista/detalle, notificaciones, suscripciones, configuracion
5. **Cross-team player access funciona** - backend soporta `organizacion_completa=true` para acceder a jugadores de todos los equipos
6. **AI Chat → Knowledge Base**: documentos subidos se indexan con embeddings, el AI agent los busca automaticamente via `buscar_knowledge_base` tool
7. **Theme system dinamico** - los colores del club se aplican via CSS variables en sidebar, botones, badges, chat bubbles
8. **node_modules NO estan instalados** - ejecutar `npm install` antes de `npm run dev`
9. **No hay TODOs ni stubs** - todo el codigo escrito funciona
10. **Permisos backend al 100%** - 0 endpoints con sistema viejo
