#!/usr/bin/env bash
# =============================================================================
# setup-github-pipeline.sh
# Configura el pipeline completo de CI/CD + seguridad en cualquier repo.
# Uso: ./scripts/setup-github-pipeline.sh <ruta-al-nuevo-proyecto>
# =============================================================================

set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.github"
TARGET="${1:-}"

# ── Validaciones ──────────────────────────────────────────────────────────────
if [[ -z "$TARGET" ]]; then
  echo "Uso: $0 <ruta-al-nuevo-proyecto>"
  echo "Ejemplo: $0 ~/proyectos/mi-nuevo-proyecto"
  exit 1
fi

if [[ ! -d "$TARGET" ]]; then
  echo "Error: el directorio '$TARGET' no existe."
  exit 1
fi

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Error: no se encontró el directorio .github en $(dirname "$TEMPLATE_DIR")"
  exit 1
fi

# ── Copia el pipeline ─────────────────────────────────────────────────────────
echo ""
echo "▶ Copiando pipeline a $TARGET/.github ..."
cp -r "$TEMPLATE_DIR" "$TARGET/"
echo "  ✓ .github/ copiado"

# ── Copia render.yaml si no existe ───────────────────────────────────────────
RENDER_TEMPLATE="$(dirname "$TEMPLATE_DIR")/render.yaml"
if [[ -f "$RENDER_TEMPLATE" && ! -f "$TARGET/render.yaml" ]]; then
  cp "$RENDER_TEMPLATE" "$TARGET/render.yaml"
  echo "  ✓ render.yaml copiado"
fi

# ── Copia config de release-please si no existe ──────────────────────────────
RP_CONFIG="$(dirname "$TEMPLATE_DIR")/release-please-config.json"
RP_MANIFEST="$(dirname "$TEMPLATE_DIR")/.release-please-manifest.json"

if [[ -f "$RP_CONFIG" && ! -f "$TARGET/release-please-config.json" ]]; then
  cp "$RP_CONFIG" "$TARGET/release-please-config.json"
  echo "  ✓ release-please-config.json copiado"
fi

if [[ -f "$RP_MANIFEST" && ! -f "$TARGET/.release-please-manifest.json" ]]; then
  cp "$RP_MANIFEST" "$TARGET/.release-please-manifest.json"
  echo "  ✓ .release-please-manifest.json copiado"
fi

# ── Instrucciones post-setup ──────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Pipeline copiado. Pasos manuales que debés completar:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  1. ADAPTAR WORKFLOWS al stack de tu proyecto:"
echo "     .github/workflows/ci.yml"
echo "     → Ajustá los jobs de backend/frontend según tu stack"
echo "     → Si es solo frontend, borrá el job 'backend'"
echo "     → Si es solo backend, borrá el job 'frontend'"
echo ""
echo "  2. SECRETS en GitHub → Settings → Secrets → Repository secrets:"
echo "     • ANTHROPIC_API_KEY          → API key de Anthropic"
echo "     • RENDER_DEPLOY_HOOK_BACKEND → Deploy hook de Render (backend)"
echo "     • RENDER_DEPLOY_HOOK_FRONTEND → Deploy hook de Render (frontend)"
echo "     (Omitir los que no apliquen a tu proyecto)"
echo ""
echo "  3. GITHUB SETTINGS → Actions → General:"
echo "     → 'Workflow permissions' → 'Read and write permissions'"
echo "     → 'Allow GitHub Actions to create and approve pull requests' ✓"
echo ""
echo "  4. GITHUB SETTINGS → Branches → Add branch ruleset en 'main':"
echo "     → Required status checks: 'CI Passed', 'CodeQL — python',"
echo "       'CodeQL — javascript-typescript'"
echo "     → Require pull request before merging (1 approval)"
echo "     → Do not allow bypassing (bypass list vacío)"
echo ""
echo "  5. GITHUB SETTINGS → Security & Analysis:"
echo "     → Dependency graph: Enable"
echo "     → Dependabot alerts: Enable"
echo ""
echo "  6. Hacer el primer commit y push a main:"
echo "     cd $TARGET"
echo "     git add .github/ render.yaml release-please-config.json"
echo "     git commit -m 'ci: setup security and production pipeline'"
echo "     git push origin main"
echo ""
echo "  Referencia completa: docs/PIPELINE-GUIDE.md"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Setup completado."
