# Guía: Pipeline de Seguridad y Producción para GitHub + Render

Pipeline profesional de CI/CD con revisión de código automática por IA (Anthropic), análisis estático (CodeQL), versionado automático (Google release-please) y deploy controlado a Render.

---

## ¿Qué incluye este pipeline?

| Herramienta | Qué hace | Cuándo corre |
|-------------|----------|--------------|
| **CI** (GitHub Actions) | Lint + type check + tests | Cada PR y push a main |
| **CodeQL** (GitHub) | Análisis estático de vulnerabilidades | Cada PR + lunes semanal |
| **Dependency Review** (GitHub) | Detecta deps con vulnerabilidades conocidas | Cada PR |
| **Claude AI Security Review** (Anthropic) | Revisión semántica de seguridad con IA | Cada PR humano |
| **Dependabot** (GitHub) | Actualiza dependencias automáticamente | Lunes semanal |
| **Release Please** (Google) | Genera CHANGELOG + tags de versión | Merge a main |
| **Deploy a Render** | Deploy automático solo cuando CI pasa | Merge a main |

---

## Opción A: Proyecto nuevo (recomendada)

### Paso 1 — Creá el repo desde el template

1. Ir a `github.com/TU-USUARIO/trainingHub` (o donde tengas el repo base)
2. **Settings → Template repository → Enable**
3. Ahora cuando creés un repo nuevo, en la pantalla de creación aparecerá "Use this template"

---

## Opción B: Proyecto existente con script

### Desde la carpeta de TrainingHub:

```bash
./scripts/setup-github-pipeline.sh /ruta/a/tu/nuevo-proyecto
```

El script copia todo `.github/`, `render.yaml` y la config de release-please. Después seguís con los pasos manuales que imprime.

---

## Pasos manuales (aplican a ambas opciones)

### Paso 1 — Adaptar `ci.yml` a tu stack

Abrí `.github/workflows/ci.yml` y ajustá según tu proyecto:

**Solo frontend (Next.js/React):** borrá el job `backend` y el `needs: [backend, frontend]` → `needs: [frontend]`

**Solo backend (Python/FastAPI):** borrá el job `frontend` y ajustá el `needs`

**Stack diferente (Node.js, Go, etc.):** reemplazá los pasos de instalación/testing según corresponda

---

### Paso 2 — Secrets en GitHub

`GitHub → Settings → Secrets and variables → Actions → Repository secrets`

| Secret | Cómo obtenerlo | Obligatorio |
|--------|----------------|-------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | ✅ |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render → servicio → Settings → Deploy Hooks → Create | Si tenés backend en Render |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Render → servicio → Settings → Deploy Hooks → Create | Si tenés frontend en Render |

> Si no usás Render, eliminá o reemplazá `deploy.yml` con el servicio que uses (Railway, Fly.io, etc.)

---

### Paso 3 — Permisos de GitHub Actions

`GitHub → Settings → Actions → General`

- **Workflow permissions** → `Read and write permissions`
- **Allow GitHub Actions to create and approve pull requests** → ✅ activado

> Sin esto, release-please no puede crear PRs automáticos con el CHANGELOG.

---

### Paso 4 — Dependency Graph

`GitHub → Settings → Security & Analysis`

- **Dependency graph** → Enable (botón rojo = activo)
- **Dependabot alerts** → Enable

---

### Paso 5 — Branch Protection en `main`

`GitHub → Settings → Branches → Add branch ruleset`

| Campo | Valor |
|-------|-------|
| Ruleset name | `main protection` |
| Enforcement status | **Active** |
| Target branches | `main` |

**Require a pull request before merging:**
- Required approvals: `1`
- Dismiss stale reviews when new commits pushed: ✅
- Require review from Code Owners: ✅
- Require conversation resolution: ✅

**Require status checks to pass:**
- Require branches to be up to date: ✅
- Status checks requeridos: `CI Passed`, `CodeQL — python`, `CodeQL — javascript-typescript`

> ⚠️ Los status checks solo aparecen en el buscador DESPUÉS de hacer al menos un push con los workflows activos.

**Bypass list:** vacía (nadie puede saltarse las reglas)

---

### Paso 6 — Primer push

```bash
git add .github/ render.yaml release-please-config.json .release-please-manifest.json
git commit -m "ci: setup security and production pipeline"
git push origin main
```

Después de este push, en la pestaña **Actions** de GitHub vas a ver todos los workflows corriendo por primera vez.

---

## Cómo funciona el flujo completo

```
Desarrollador abre PR
        │
        ├─── CI (lint + type + tests)
        ├─── CodeQL (análisis estático Python + JS/TS)
        ├─── Dependency Review (deps vulnerables)
        └─── Claude AI Security Review (IA semántica)
               │
         Todos verde → merge habilitado
               │
         Merge a main
               │
        ├─── Deploy a Render (backend + frontend vía hooks)
        └─── Release Please crea PR con CHANGELOG + bump de versión
```

---

## Archivos clave del pipeline

```
.github/
├── CODEOWNERS                    # Quién aprueba cada parte del repo
├── dependabot.yml                # Config de Dependabot (npm + pip + actions)
├── pull_request_template.md      # Template estándar para PRs
└── workflows/
    ├── ci.yml                    # Gate principal: lint + type + tests
    ├── deploy.yml                # Deploy a Render (solo cuando CI pasa)
    ├── release-please.yml        # Versionado automático (Google)
    └── security.yml              # CodeQL + Dep Review + Claude AI

render.yaml                       # Config de Render (autoDeploy: false)
release-please-config.json        # Config de release-please (monorepo)
.release-please-manifest.json     # Versiones actuales por componente
```

---

## Personalización por tipo de proyecto

### Proyecto solo frontend (Next.js)

En `ci.yml`, reemplazá el contenido de jobs con:

```yaml
jobs:
  frontend:
    name: Frontend CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npx next lint
      - run: npx tsc --noEmit
      - run: npm test -- --passWithNoTests

  ci-passed:
    name: CI Passed
    needs: [frontend]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - run: |
          if [[ "${{ needs.frontend.result }}" != "success" ]]; then exit 1; fi
```

En `security.yml`, eliminá el job `codeql-python`.

En `release-please-config.json`, simplificá a un solo componente.

---

### Proyecto solo backend (Python/FastAPI)

En `ci.yml`, eliminá el job `frontend`.

En `security.yml`, eliminá el job `codeql-javascript`.

---

### Deploy a Railway / Fly.io en vez de Render

Reemplazá `deploy.yml` con el webhook que use tu plataforma. El patrón es el mismo: POST a una URL cuando CI pasa.

---

## Preguntas frecuentes

**¿Por qué Dependabot crea tantos PRs?**
Es normal — al activarlo por primera vez escanea todas las deps. Los PRs de patch/minor son seguros de mergear. Los major requieren revisión manual.

**¿Por qué Claude AI no revisa los PRs de Dependabot?**
Por diseño. El job tiene `if: github.actor != 'dependabot[bot]'` — no tiene sentido revisar bumps de versión automatizados con IA. Solo revisa código humano.

**¿Qué pasa si falla el deploy hook de Render?**
El workflow falla y lo ves en GitHub Actions. El código ya mergeó — el deploy simplemente no se disparó. Podés re-run el workflow manualmente.

**¿Cómo creo los deploy hooks de Render?**
Render Dashboard → tu servicio → Settings → Deploy Hooks → "Create Deploy Hook" → copiá la URL.

---

## Recursos

- [Google release-please](https://github.com/googleapis/release-please)
- [Anthropic Claude Code Security Review](https://github.com/anthropics/claude-code-security-review)
- [GitHub CodeQL](https://github.com/github/codeql-action)
- [Dependabot docs](https://docs.github.com/en/code-security/dependabot)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
