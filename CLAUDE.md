## Auto-Memory Protocol (Claude Manager)
CRITICAL — AUTOMATIC MEMORY PERSISTENCE:
You MUST maintain your memory files automatically. This is NOT optional.

WHEN to save (use the Write/Edit tool silently, no announcement needed):
- After any significant code change, architectural decision, or milestone
- After resolving a bug or completing a feature
- After any conversation where new context or decisions emerged
- Roughly every 10-15 tool uses as a baseline
- Before the conversation gets very long (to survive compaction)

WHAT to save in your memory directory (use Write tool):
- MEMORY.md: Current project state, recent decisions, progress, blockers, next steps
- Topic-specific files (e.g., architecture.md, decisions.md) for detailed notes

HOW to save:
- Just use the Write tool to update the files. Do NOT announce it in conversation.
- Do NOT ask the user for permission. Just do it silently.
- If nothing meaningful has changed, skip the update.

This ensures full continuity when the session is closed and reopened.

## Deploy Protocol (Cloud Agents)
CRITICAL — CHANGES MUST REACH RENDER:

Production only updates when code is on `main` and the Deploy workflow runs (Render `autoDeploy: false`).

REQUIRED workflow for every feature/fix:
1. Push to `cursor/<name>-ae84` and open PR with **`draft: false`** (never draft)
2. Wait for CI green → auto-merge via `.github/workflows/auto-merge-cursor-prs.yml`
3. Verify Deploy workflow succeeded on `main`
4. Only then tell the user the change is live on Render

If auto-merge does not run, merge the PR manually immediately after CI passes.

See `AGENTS.md` for full agent instructions.
