# Pipeline de Seguridad y Producción — Template Reutilizable

Pipeline profesional de CI/CD + seguridad, basado en herramientas de Google y Anthropic.
Funciona en cualquier proyecto con GitHub + Render.

---

## ¿Qué hace este pipeline?

Cada vez que abrís un **Pull Request**:

1. **CI** — corre lint, type check y tests automáticamente
2. **CodeQL** — análisis estático de vulnerabilidades (Python + JS/TS)
3. **Claude AI Security Review** — IA de Anthropic lee el código del PR y comenta vulnerabilidades semánticas
4. **Dependency Review** — bloquea PRs que introducen dependencias con CVEs críticos

Cuando se **mergea a `main`**:

5. **Deploy automático a Render** — solo si CI pasó (nunca deploya código roto)
6. **Release Please** — gestiona versiones semánticas y genera CHANGELOG automáticamente

Cada **lunes**:

7. **Dependabot** — crea PRs automáticos para actualizar dependencias de npm, pip y GitHub Actions

---

## Archivos incluidos

```
pipeline-template/
├── README.md                          ← Este archivo
├── setup-github-pipeline.sh           ← Script de instalación automática
├── release-please-config.json         ← Configuración de Release Please (Google)
├── .release-please-manifest.json      ← Versiones iniciales por paquete
└── .github/
    ├── CODEOWNERS                     ← Define quién debe revisar cada parte del repo
    ├── dependabot.yml                 ← Actualizaciones automáticas de dependencias
    ├── pull_request_template.md       ← Template para todos los PRs
    └── workflows/
        ├── ci.yml                     ← Gate principal: lint + types + tests
        ├── deploy.yml                 ← Deploy a Render (solo si CI pasa)
        ├── security.yml               ← CodeQL + Claude AI + Dependency Review
        └── release-please.yml         ← Versionado automático (Google)
```

---

## Cómo usarlo en un proyecto nuevo

### Opción A — Script automático (recomendada)

```bash
# Desde la carpeta del TrainingHub, corré:
./scripts/setup-github-pipeline.sh ~/ruta/a/tu-nuevo-proyecto
```

El script copia todos los archivos y te muestra los pasos manuales pendientes.

### Opción B — Manual

1. Copiá la carpeta `.github/` al root de tu proyecto
2. Copiá `release-please-config.json` y `.release-please-manifest.json` al root
3. Seguí los pasos de configuración de abajo

---

## Pasos de configuración manual (obligatorios)

### 1. Adaptar `ci.yml` a tu stack

El `ci.yml` tiene dos jobs: `backend` (Python) y `frontend` (Node). Ajustalo según tu proyecto:

- **Solo frontend**: borrá el job `backend` y sus dependencias en `ci-passed`
- **Solo backend**: borrá el job `frontend`
- **Stack diferente** (Go, Ruby, etc.): reemplazá los pasos de instalación y test

### 2. Secrets en GitHub

GitHub → Settings → Secrets and variables → Actions → **Repository secrets**

| Secret | Valor | Obligatorio |
|--------|-------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic | ✅ Siempre |
| `RENDER_DEPLOY_HOOK_BACKEND` | URL del deploy hook de Render | Solo si tenés backend en Render |
| `RENDER_DEPLOY_HOOK_FRONTEND` | URL del deploy hook de Render | Solo si tenés frontend en Render |

**Cómo obtener los deploy hooks de Render:**
Render Dashboard → tu servicio → Settings → Deploy Hooks → Create Deploy Hook

### 3. Permisos de GitHub Actions

GitHub → Settings → Actions → General → Workflow permissions:
- Seleccioná **"Read and write permissions"**
- Marcá **"Allow GitHub Actions to create and approve pull requests"**

### 4. Activar Dependency Graph

GitHub → Settings → Security & analysis → **Dependency graph → Enable**

### 5. Branch Protection en `main`

GitHub → Settings → Branches → Add branch ruleset:

| Setting | Valor |
|---------|-------|
| Branch name pattern | `main` |
| Enforcement status | `Active` |
| Require a pull request | ✅ (1 approval) |
| Dismiss stale reviews on new commits | ✅ |
| Require review from Code Owners | ✅ |
| Require conversation resolution | ✅ |
| Require status checks to pass | ✅ |
| Status checks requeridos | `CI Passed`, `CodeQL — python`, `CodeQL — javascript-typescript` |
| Require branches up to date | ✅ |
| Restrict deletions | ✅ |
| Bypass list | **Vacía** (nadie puede saltarse las reglas) |

> ⚠️ Los status checks solo aparecen en el buscador **después del primer push** con los workflows.

### 6. Actualizar CODEOWNERS

En `.github/CODEOWNERS`, reemplazá `@Ignav99` con tu usuario de GitHub:

```
* @TU_USUARIO_GITHUB
.github/ @TU_USUARIO_GITHUB
```

### 7. Primer commit

```bash
git add .github/ release-please-config.json .release-please-manifest.json
git commit -m "ci: setup security and production pipeline"
git push origin main
```

---

## Cómo funciona Release Please (Google)

Release Please analiza tus commit messages con formato [Conventional Commits](https://www.conventionalcommits.org/):

| Prefijo | Efecto |
|---------|--------|
| `feat:` | Nueva versión **minor** (1.0.0 → 1.1.0) |
| `fix:` | Nueva versión **patch** (1.0.0 → 1.0.1) |
| `feat!:` o `BREAKING CHANGE` | Nueva versión **major** (1.0.0 → 2.0.0) |
| `chore:`, `ci:`, `docs:` | Sin nueva versión |

Cuando hay cambios acumulados, Release Please crea automáticamente un PR con el CHANGELOG actualizado y el bump de versión. Al mergear ese PR, crea el tag y el release en GitHub.

---

## Cómo funciona Claude AI Security Review (Anthropic)

El action `anthropics/claude-code-security-review` lee el diff del PR y usa Claude para detectar:
- SQL injection, XSS, CSRF
- Secrets hardcodeados
- Manejo inseguro de autenticación
- Dependencias vulnerables introducidas en el PR

Los resultados aparecen como comentarios directamente en el PR. Solo corre en PRs de humanos (excluye Dependabot automáticamente).

---

## Requisitos

- Cuenta en **GitHub** con el repo
- Cuenta en **Anthropic** con API key
- Servicios en **Render** con deploy hooks configurados
- Stack: **Python (backend)** + **Node/Next.js (frontend)** — adaptable a cualquier stack

---

## Soporte

Este template fue creado para el proyecto TrainingHub. Para adaptar los workflows a tu stack específico, modificá `ci.yml` siguiendo los comentarios inline.
