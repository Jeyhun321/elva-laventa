# AI System

Version: 1.0

Required files:

- START.md
- CLAUDE.md
- AGENTS.md
- AI_WORKFLOW.md
- DESKTOP_START.md
- docs/MEDIA_ANALYSIS.md
- docs/HANDOFF.md

QA / Bug tracking:

- docs/BUGS.md — главный QA-документ и постоянный Regression Suite.
- docs/BUG_PROCESS.md — жизненный цикл бага и правила переходов статусов.

Rules:

1. START.md is always the first file every AI must read.
2. Repository files are the only source of truth.
3. Desktop performs media analysis.
4. CLI performs coding.
5. Desktop and CLI exchange information only through repository files.
6. Never assume conversation history exists.
7. Never invent commits, deployments or test results.
8. Preserve unfinished work.
9. Continue only from the real repository state.

Integrity checklist:

Before every task every AI should verify that all required files exist.

If any required file is missing:

- stop;
- explain what is missing;
- do not guess.

# AI START

Before doing any work:

1. Read CLAUDE.md.
2. Read AGENTS.md.
3. Read docs/HANDOFF.md.
4. Check git status and git diff.
5. Preserve all existing uncommitted changes.

Only after that may you continue working.

If images, videos, PDFs, logs, or other files are attached:

- analyze them first;
- compare them with the current state in docs/HANDOFF.md;
- distinguish confirmed facts from assumptions;
- for LaVenta screenshots, treat them as mobile by default unless clearly stated otherwise;
- do not change source code when the user requested analysis only.

Before finishing any task:

- update docs/HANDOFF.md with the real current state;
- update other documentation only when the relevant event actually occurred;
- never invent build results, test results, Git state, commits, deployments, dates, or times.

Claude Code is normally the primary engineer.
Codex is an implementation specialist, independent reviewer, and temporary fallback when Claude Code is unavailable.
