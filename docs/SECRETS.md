# GitHub Secrets Configuration

All secrets must be added under **Settings → Secrets and variables → Actions → Repository secrets**.

## Required Secrets

| Secret name | Where to get it | Used by |
|-------------|-----------------|---------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | `security.yml` — Claude AI review |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render → `traininghub-api` → Settings → Deploy Hooks | `deploy.yml` |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Render → `traininghub-frontend` → Settings → Deploy Hooks | `deploy.yml` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Future E2E tests |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Future E2E tests |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → Service role | Future E2E tests |

> `GITHUB_TOKEN` is automatically provided by GitHub Actions — you do NOT need to create it.

## How to Get Render Deploy Hooks

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Open your service (`traininghub-api` or `traininghub-frontend`)
3. Go to **Settings** → **Deploy Hooks**
4. Click **Create Deploy Hook**, name it `github-ci`
5. Copy the URL and paste it as the secret value

## Rotating Secrets

When rotating any secret:
1. Create the new value in the external service first
2. Update the GitHub secret
3. Verify the next deploy/workflow run succeeds
4. Revoke the old value
