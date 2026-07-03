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
