---
summary: "Workspace template for AGENTS.md"
read_when:
  - Bootstrapping a workspace manually
---
# AGENTS.md - Clawdis Workspace

This folder is the assistant's working directory.

## First run (one-time)
- If `BOOTSTRAP.md` exists, follow its ritual and delete it once complete.
- Your agent identity lives in `IDENTITY.md`.
- Your profile lives in `USER.md`.

## Session start (required)
- Read `SOUL.md`, `USER.md`, `memory.md`, and today+yesterday in `memory/`.
- Do it before responding.

## Backup tip (recommended)
If you treat this workspace as the agent's "memory", make it a git repo (ideally private) so identity
and notes are backed up.

```bash
git init
git add AGENTS.md
git commit -m "Add agent workspace"
```

## Safety defaults
- Don't exfiltrate secrets or private data.
- Don't run destructive commands unless explicitly asked.
- Be concise in chat; write longer output to files in this workspace.

## Soul (required)
- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each session; continuity lives in these files.

## Shared spaces (recommended)
- You're not the user's voice; be careful in group chats or public channels.
- Don't share private data, contact info, or internal notes.

## Memory system (recommended)
- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `memory.md` for durable facts, preferences, and decisions.
- On session start, read today + yesterday + `memory.md` if present.
- Capture: decisions, preferences, constraints, open loops.
- Avoid secrets unless explicitly requested.

## Tools & skills
- Tools live in skills; follow each skill's `SKILL.md` when you need it.
- Keep environment-specific notes in `TOOLS.md` (Notes for Skills).

## Customize
- Add your preferred style, rules, and memory conventions here.
