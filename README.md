# 🏟️ TrainingHub Pro

**Sistema profesional de gestión de sesiones y tareas de entrenamiento de fútbol**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Descripción

TrainingHub Pro es una aplicación web completa para que cuerpos técnicos de fútbol puedan:

- ✅ Crear y gestionar **tareas de entrenamiento** con metodología UEFA
- ✅ Planificar **sesiones** siguiendo periodización táctica (Match Day)
- ✅ Utilizar un **recomendador inteligente** de tareas
- ✅ Generar **PDFs profesionales** con branding del club
- ✅ Gestionar **múltiples equipos** con roles de usuario

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI (Python 3.11+), Pydantic v2 |
| **Base de Datos** | Supabase (PostgreSQL + Auth + Storage) |
| **PDFs** | WeasyPrint + Jinja2 |
| **Deploy** | Vercel (frontend) + Render (backend) |

## 📁 Estructura del Proyecto

```
traininghub-pro/
├── docs/                    # Documentación
│   └── MASTER_PLAN.md      # Especificación completa
├── frontend/               # App Next.js
│   └── src/
├── backend/                # API FastAPI
│   └── app/
├── database/               # Scripts SQL
│   └── schema.sql
└── docker-compose.yml      # Desarrollo local
```

## 🚀 Instalación Rápida

### Requisitos Previos

- Node.js 18+
- Python 3.11+
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### 1. Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/traininghub-pro.git
cd traininghub-pro

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor y ejecutar `database/schema.sql`
3. Copiar las keys a tu archivo `.env`

### 3. Iniciar Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
uvicorn app.main:app --reload
```

Backend corriendo en: http://localhost:8000

### 4. Iniciar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Frontend corriendo en: http://localhost:3000

## 🐳 Desarrollo con Docker (Alternativo)

```bash
# Iniciar todo con Docker Compose
docker-compose up -d

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Docs:     http://localhost:8000/docs
```

## 📖 Documentación

- **[MASTER_PLAN.md](docs/MASTER_PLAN.md)** - Especificación completa del proyecto
- **[API Docs](http://localhost:8000/docs)** - Swagger UI (en desarrollo)

## 🏗️ Plan de Desarrollo

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1. MVP | 🔄 En progreso | Auth, CRUD tareas/sesiones, PDF básico |
| 2. Core | ⏳ Pendiente | Editor gráfico, recomendador, filtros |
| 3. Multi-equipo | ⏳ Pendiente | Organizaciones, roles, permisos |
| 4. Optimización | ⏳ Pendiente | Tests, docs, onboarding |

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

**Desarrollado para Club Atlético Central** 🏆
