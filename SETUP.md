# 🚀 GUÍA DE INSTALACIÓN - TrainingHub Pro

Esta guía te llevará paso a paso para configurar TrainingHub Pro en tu Mac.

---

## 📋 REQUISITOS PREVIOS

Asegúrate de tener instalado:

### 1. Node.js 18+
```bash
# Verificar versión
node --version  # Debe ser 18.x o superior

# Si no lo tienes, instalar con Homebrew
brew install node
```

### 2. Python 3.11+
```bash
# Verificar versión
python3 --version  # Debe ser 3.11 o superior

# Si no lo tienes, instalar con Homebrew
brew install python@3.11
```

### 3. Git
```bash
# Verificar
git --version

# Si no lo tienes
brew install git
```

---

## 📁 PASO 1: DESCOMPRIMIR Y UBICAR EL PROYECTO

1. Descomprime el archivo `traininghub-pro.zip`
2. Mueve la carpeta a tu ubicación deseada (ej: `~/Proyectos/`)
3. Abre Terminal y navega a la carpeta:

```bash
cd ~/Proyectos/traininghub-pro
```

---

## 🗄️ PASO 2: CONFIGURAR SUPABASE

### 2.1 Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto:
   - Nombre: `traininghub-pro`
   - Contraseña: genera una segura
   - Región: la más cercana a ti
3. Espera ~2 minutos a que se cree

### 2.2 Ejecutar el esquema SQL

1. En Supabase, ve a **SQL Editor** (menú izquierdo)
2. Crea un nuevo query
3. Copia todo el contenido de `database/schema.sql`
4. Pégalo y ejecuta (botón **Run**)
5. Deberías ver: "Success. No rows returned"

### 2.3 Obtener las credenciales

1. Ve a **Project Settings** → **API**
2. Copia estos valores:
   - **Project URL** (ej: `https://xxxx.supabase.co`)
   - **anon public** key (la larga que empieza con `eyJ...`)
   - **service_role** key (en "Project API keys", la que dice "service_role")

---

## ⚙️ PASO 3: CONFIGURAR VARIABLES DE ENTORNO

### 3.1 Crear archivo .env

```bash
# Desde la raíz del proyecto
cp .env.example .env
```

### 3.2 Editar .env con tus valores

Abre `.env` con VS Code o cualquier editor y rellena:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key

# Backend
SECRET_KEY=genera-una-clave-secreta-larga-aqui
DEBUG=true
CORS_ORIGINS=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
```

**💡 Para generar SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 3.3 Copiar .env al frontend y backend

```bash
# Copiar al frontend
cp .env frontend/.env.local

# Copiar al backend
cp .env backend/.env
```

---

## 🐍 PASO 4: CONFIGURAR BACKEND (FastAPI)

```bash
# Entrar a la carpeta del backend
cd backend

# Crear entorno virtual de Python
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Verificar que funciona
uvicorn app.main:app --reload
```

Si todo va bien, verás:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Abre en navegador:** http://localhost:8000 → Deberías ver `{"status": "healthy"}`

**Para parar:** `Ctrl+C`

---

## ⚛️ PASO 5: CONFIGURAR FRONTEND (Next.js)

Abre **otra terminal** (deja el backend corriendo):

```bash
# Entrar a la carpeta del frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Si todo va bien, verás:
```
▲ Next.js 14.x
- Local:        http://localhost:3000
✓ Ready
```

**Abre en navegador:** http://localhost:3000 → Deberías ver la página de login

---

## ✅ PASO 6: VERIFICAR QUE TODO FUNCIONA

### Checklist:
- [ ] Backend corriendo en http://localhost:8000
- [ ] Frontend corriendo en http://localhost:3000
- [ ] Base de datos configurada en Supabase
- [ ] Página de login visible

### Prueba rápida de la API:
```bash
# En otra terminal
curl http://localhost:8000/health
# Respuesta esperada: {"status":"healthy","database":"connected","version":"1.0.0"}
```

---

## 🛠️ COMANDOS ÚTILES

### Desarrollo diario:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Otros comandos:

```bash
# Backend: Ver documentación API (Swagger)
# Abre: http://localhost:8000/docs

# Frontend: Build de producción
cd frontend && npm run build

# Frontend: Verificar tipos TypeScript
cd frontend && npm run type-check
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Module not found"
```bash
# Backend
pip install -r requirements.txt

# Frontend
rm -rf node_modules && npm install
```

### Error: "Port already in use"
```bash
# Matar proceso en puerto 8000
lsof -ti:8000 | xargs kill -9

# Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9
```

### Error de Supabase "Invalid API key"
- Verifica que copiaste bien las keys
- Verifica que el archivo .env está en la ubicación correcta
- Reinicia los servidores después de cambiar .env

---

## 📚 SIGUIENTE PASO

Una vez configurado, lee `docs/MASTER_PLAN.md` para entender:
- La arquitectura completa
- El modelo de datos
- Los flujos de usuario
- El plan de desarrollo

---

**¿Problemas?** Revisa la documentación en `/docs` o abre un issue en GitHub.
