# Agent instructions — TrainingHub

## Deploy requirement (critical)

Everything implemented by cloud agents **must reach Render production** so the user can verify and continue.

Production deploy chain:

```
cursor/* PR → CI passes → auto-merge to main → CI on main → Deploy hooks → Render
```

Render services (`traininghub-frontend-eu`, `traininghub-api-eu`) have **`autoDeploy: false`**. Pushing to a feature branch or opening a PR **does not deploy**.

## Pull requests

1. **Never leave PRs in draft** — use `draft: false` when creating PRs.
2. Branch names: `cursor/<descriptive-name>-ae84`
3. After CI passes on a `cursor/*` PR, **`.github/workflows/auto-merge-cursor-prs.yml`** merges it to `main` automatically (including undrafting if needed).
4. If auto-merge fails, merge manually immediately after CI is green.
5. Auto-merge triggers Render deploy hooks after merge (CI already passed on the PR).
6. Confirm deploy completed before telling the user the change is live on Render.

## Commits and branches

- Work on `cursor/*` branches from `main`
- Commit and push before finishing the turn
- One feature per branch / PR when possible

## What “done” means

A task is not done until:

- [ ] Code merged to `main`
- [ ] GitHub Actions **Deploy** workflow succeeded
- [ ] User can see the change on Render (frontend: `traininghub-frontend-eu.onrender.com`)
