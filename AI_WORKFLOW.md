# AI Workflow

## 1. Shared source of truth

All AI tools working on this repository use the same local project directory and the same project files.

The current project state is determined by:

- the repository files;
- git status;
- git diff;
- git log -3;
- docs/HANDOFF.md.

Conversation history is not the source of truth.

Never assume that another AI session completed work unless the repository and documentation confirm it.

## 2. Roles

Claude Code CLI is normally the primary engineer and technical lead.

Codex CLI is:

- an implementation specialist;
- an independent reviewer;
- a debugging and rescue tool;
- a temporary fallback when Claude Code is unavailable.

Claude Code Desktop and Codex App are primarily used for:

- analyzing screenshots;
- analyzing videos;
- analyzing PDFs and documents;
- analyzing logs and other attachments;
- transferring confirmed findings back to CLI through project documentation.

Desktop sessions must not modify source code when the user requested analysis only.

## 3. Session startup

Before any work, every AI must:

1. Read START.md.
2. Read its own project instructions:
   - Claude reads CLAUDE.md;
   - Codex reads AGENTS.md.
3. Read AI_WORKFLOW.md.
4. Read docs/HANDOFF.md.
5. Check git status and git diff.
6. Preserve all existing unfinished work.

## 4. Media workflow

When screenshots, videos, PDFs, documents, logs, HAR files, CSV files or other attachments are provided:

1. Analyze the attachment before changing code.
2. Record the exact filename or a clear attachment identifier.
3. Separate:
   - confirmed observations;
   - assumptions;
   - items requiring verification.
4. For LaVenta interface screenshots, treat them as mobile by default unless clearly stated otherwise.
5. Functional changes must still be checked on both mobile and desktop.
6. Update the Media Context section in docs/HANDOFF.md.
7. Add confirmed bugs to docs/BUGS.md if that file exists.
8. Do not claim that a video, image or test was analyzed if it was not actually available.
9. Do not change source code when the user requested media analysis only.

## 5. Desktop to CLI handoff

After a Desktop session analyzes media:

- update docs/HANDOFF.md;
- record confirmed findings;
- record required verification;
- record the recommended next CLI action;
- do not invent test, build, Git or deployment results.

When CLI resumes:

- reread docs/HANDOFF.md;
- inspect git status and git diff;
- critically verify Desktop findings against the current code;
- continue from the actual repository state.

## 6. CLI to Desktop handoff

Before pausing CLI work for media analysis:

- update docs/HANDOFF.md with the real current task;
- list modified files;
- list unfinished work;
- list risks;
- state whether source-code changes are currently uncommitted;
- leave clear instructions for the Desktop media-analysis session.

## 7. Concurrent work safety

Do not let two AI tools modify the same working directory at the same time.

Use one active writer at a time.

Before switching tools:

1. Finish or safely pause the current small step.
2. Update docs/HANDOFF.md.
3. Check git status.
4. Stop the current writer.
5. Start the next tool.

Do not overwrite unrelated or unfinished changes from another session.

## 8. Task completion

Before declaring a task complete:

- inspect git diff;
- run the real available checks;
- verify mobile and desktop when functionality changed;
- update docs/HANDOFF.md;
- update other documentation only when the relevant event actually occurred;
- clearly mark unverified items as NOT VERIFIED or UNKNOWN.

Never invent:

- test results;
- build results;
- commits;
- deployments;
- database state;
- dates;
- times;
- screenshots;
- video observations.

## 9. Limit and recovery workflow

When Claude Code has low remaining usage:

- prefer small finished stages instead of one large unfinished change;
- update docs/HANDOFF.md before stopping;
- preserve enough context for Codex CLI to continue safely.

When Claude Code becomes unavailable:

- Codex CLI may continue from the current repository state and docs/HANDOFF.md;
- Codex must preserve unfinished Claude work;
- Codex must document its own changes clearly.

When Claude Code returns:

- Claude becomes the primary engineer again;
- Claude reviews git status, git diff and Codex changes;
- Claude verifies the implementation before continuing.

## 10. Documentation responsibilities

docs/HANDOFF.md:
- current state only;
- must remain immediately usable by the next session.

docs/DAILY.md:
- detailed chronological work log, if it exists.

docs/HISTORY.md:
- major completed milestones, releases and architectural changes only.

docs/BUGS.md:
- confirmed bugs and their statuses, if it exists;
- main QA document and permanent Regression Suite;
- bug lifecycle and status-transition rules are defined in docs/BUG_PROCESS.md.

docs/BUG_PROCESS.md:
- bug lifecycle model (NEW → CONFIRMED → IN PROGRESS → FIXED → READY FOR QA →
  REGRESSION PASSED → READY FOR RELEASE → POST-RELEASE VERIFIED → ARCHIVED);
- who moves each status, when, transition conditions and which documents to update.

docs/FEATURES.md:
- completed features, if it exists.

docs/DECISIONS.md:
- real architectural decisions, if it exists.

docs/TODO.md:
- genuine open work only, if it exists.

Do not duplicate the same information unnecessarily across files.

## 11. Mobile browser testing (playwright-mobile MCP)

The project has a working `playwright-mobile` MCP for real mobile browser
automation. It is confirmed operational and must be used as described below.
This complements the existing mobile-first rule in CLAUDE.md and the bug
lifecycle in docs/BUG_PROCESS.md — it does not replace them.

1. When a task is MOBILE and can be checked through a browser, Claude Code must
   use the available `playwright-mobile` MCP to reproduce and verify it.

2. For a bug fix:
   - first try to reproduce the bug;
   - check console errors;
   - check failed network requests, if they are relevant to the problem;
   - only then analyze the root cause and change code;
   - after the fix, replay the same mobile scenario.

3. For UI/UX changes:
   - after implementation, verify the result through the mobile browser when
     that is possible.

4. Desktop browser testing is never a substitute for mobile testing.

5. Do not change Desktop behaviour when a task is explicitly limited to MOBILE.

6. Do not claim that real touch/swipe or OS-specific mobile behaviour was
   verified if the Playwright MCP could not technically reproduce it (for
   example, synthetic touch events do not trigger native scrolling).

7. For behaviour that cannot be reliably checked through emulation, explicitly
   state that final real-device verification is still required.

8. Do not run browser testing pointlessly for tasks that need no runtime or UI
   verification.

9. Preserve the existing project workflow:
   fix → targeted verification → commit → push → start deploy.
   Do not wait for GitHub Actions to finish.
