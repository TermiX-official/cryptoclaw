---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: {"clawdis":{"requires":{"bins":["gemini"]}}}
---

# Gemini

Use `gemini` in **one-shot mode** via the positional prompt (avoid interactive mode).

Good for:
- Coding agent Q&A and fixes.
- Google search style lookups (ask for sources, dates, and summaries).

Examples:

```bash
gemini "Search Google for the latest X. Return top 5 results with title, URL, date, and 1-line summary."
```

If you need structured output, add `--output-format json`.
