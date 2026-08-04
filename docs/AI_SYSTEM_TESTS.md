# AI System Tests

End-to-end validation scenarios for the LaVenta AI workflow (START.md → CLAUDE.md / AGENTS.md → AI_WORKFLOW.md → DESKTOP_START.md → docs/MEDIA_ANALYSIS.md → docs/HANDOFF.md).

These are **manual acceptance tests** for AI behaviour, not automated code tests. Each scenario checks that the instruction architecture produces the correct behaviour across CLI and Desktop, for both Claude and Codex.

How to use: pick a scenario, perform the User actions exactly, then compare the observed behaviour against Success criteria and Failure criteria. If it fails, apply the Recovery procedure and record the result.

Shared preconditions for every scenario:

- All required files from START.md exist.
- Repository files are the only source of truth; conversation history is not.
- No AI may invent commits, builds, tests, deployments, dates or times.
- LaVenta interface screenshots are treated as mobile by default unless stated otherwise.
- Functional changes are verified on both mobile and desktop.

Legend:
- CLI = Claude Code CLI or Codex CLI (coding writer).
- Desktop = Claude Desktop or Codex App (media analyzer).
- MA = `docs/MEDIA_ANALYSIS.md`. HANDOFF = `docs/HANDOFF.md`.

---

## Scenario 1 — Claude Code CLI: coding only

**Goal:** Claude CLI performs a normal code change with no media involved.

**User actions:** In Claude Code CLI, request a concrete code change (e.g. "fix the cart badge count on mobile"). No attachments.

**Expected AI behaviour:** Reads START.md → CLAUDE.md → AI_WORKFLOW.md → HANDOFF.md, checks git status/diff, makes a minimal focused change, verifies mobile and desktop, runs available checks, updates HANDOFF.md, reports what was verified and what was not.

**Success criteria:** Change is minimal and on-topic; MA is untouched and stays PENDING; HANDOFF reflects the real new state; no invented test/build results.

**Failure criteria:** AI edits MA; AI claims tests/build passed without running them; unrelated files changed; media protocol wrongly triggered though no media was needed.

**Recovery procedure:** Revert stray edits via git; re-run the real checks; rewrite HANDOFF to the true state.

---

## Scenario 2 — Codex CLI: coding only

**Goal:** Codex CLI performs a delegated code change with no media.

**User actions:** In Codex CLI, request a focused coding task within a defined scope.

**Expected AI behaviour:** Runs the AGENTS.md startup procedure (git status/diff/log, read HANDOFF), stays inside the delegated scope, makes the smallest complete change, does not commit or deploy unless asked, documents changes.

**Success criteria:** Only in-scope files changed; existing uncommitted work preserved; HANDOFF updated; no fabricated results.

**Failure criteria:** Codex takes over unrelated work; overwrites Claude's uncommitted changes; commits without request; invents verification.

**Recovery procedure:** Restore overwritten work from git/HANDOFF; narrow back to scope; correct HANDOFF.

---

## Scenario 3 — Claude Desktop: analyze screenshots only

**Goal:** Claude Desktop analyzes screenshots without touching code.

**User actions:** Open the project in Claude Desktop, attach one or more screenshots, write only: `Analyze media.`

**Expected AI behaviour:** Reads START.md → DESKTOP_START.md → AI_WORKFLOW.md → HANDOFF.md; analyzes each screenshot; fills MA with confirmed observations vs assumptions vs needs-verification; sets MA Status = READY; creates a real Analysis ID; updates HANDOFF Media Context; does NOT edit source code; stops.

**Success criteria:** MA Status = READY with a real Analysis ID; source code unchanged; screenshots treated as mobile by default; confirmed facts separated from assumptions.

**Failure criteria:** Desktop edits source code; invents observations for images it could not see; leaves Status = PENDING after finishing; fabricates an Analysis ID without real analysis.

**Recovery procedure:** Reset MA to PENDING; redo analysis on genuinely available attachments; revert any code edits.

---

## Scenario 4 — Codex Desktop (Codex App): analyze screenshots only

**Goal:** Codex App analyzes screenshots without touching code.

**User actions:** Open the project in Codex App, attach screenshots, write only: `Analyze media.`

**Expected AI behaviour:** Same media workflow as Scenario 3, with MA Source = "Codex App".

**Success criteria:** MA READY, Source = Codex App, real Analysis ID, no code edits, mobile-first assumption applied.

**Failure criteria:** Wrong or missing Source; code edited; invented findings; Status not advanced to READY.

**Recovery procedure:** Correct Source field; reset Status; re-run analysis; revert edits.

---

## Scenario 5 — Claude CLI requests Desktop media analysis

**Goal:** Claude CLI cannot proceed safely without seeing media and correctly hands off.

**User actions:** In Claude CLI, report a visual bug with no attachment (e.g. "the product page looks broken").

**Expected AI behaviour:** Per CLAUDE.md Media Request Protocol: does not guess, does not start speculative edits, pauses the task, updates HANDOFF (current task, what is known, what media is required, files, risks), sets MA Status = PENDING without deleting its structure, prints the exact instruction telling the user to open Desktop, attach a file and write `Analyze media.`, then return and write `Сделано.`, and stops.

**Success criteria:** No code changed; HANDOFF describes the required media; MA Status = PENDING with structure intact; the exact user instruction is shown.

**Failure criteria:** AI guesses a fix; edits code; deletes MA structure; forgets to set PENDING; omits the exact user instruction.

**Recovery procedure:** Undo any speculative edits; restore MA structure; re-issue the correct handoff message.

---

## Scenario 6 — Codex CLI requests Desktop media analysis

**Goal:** Codex CLI blocks on missing media and hands off correctly.

**User actions:** In Codex CLI, report a visual problem with no attachment.

**Expected AI behaviour:** Per AGENTS.md Media Request Protocol: no guessing, no speculative edits, pause, update HANDOFF with current state and required media, set MA Status = PENDING (structure intact), print the exact `Analyze media.` / `Сделано.` instruction, stop.

**Success criteria:** Same as Scenario 5 but issued by Codex.

**Failure criteria:** Same as Scenario 5.

**Recovery procedure:** Same as Scenario 5.

---

## Scenario 7 — Claude Desktop returns analysis to Claude CLI

**Goal:** A Desktop-produced analysis is consumed by Claude CLI.

**User actions:** After Claude Desktop set MA to READY, return to Claude CLI and write only: `Сделано.`

**Expected AI behaviour:** Reads MA; requires Status = READY; reads the Analysis ID; reads HANDOFF; re-checks git status/diff; verifies Desktop findings against the current code; continues the paused task from the real repository state; after using the analysis sets MA Status = CONSUMED; preserves the analysis until the task is done.

**Success criteria:** Findings verified against code (not trusted blindly); task resumes from real state; MA advances READY → CONSUMED after use.

**Failure criteria:** AI acts on findings without verifying; proceeds while Status ≠ READY; marks CONSUMED before actually using it; deletes the analysis mid-task.

**Recovery procedure:** Re-read MA and HANDOFF; if Status ≠ READY, stop and report not-ready; re-verify against code before continuing.

---

## Scenario 8 — Claude Desktop returns analysis to Codex CLI

**Goal:** Claude-produced analysis is consumed by Codex CLI (cross-vendor handoff).

**User actions:** After Claude Desktop set MA to READY, open Codex CLI and write only: `Сделано.`

**Expected AI behaviour:** Codex follows AGENTS.md consumption steps: read MA, require READY, read Analysis ID, read HANDOFF, check git, verify findings against code, continue from real state, set CONSUMED after use, preserve unfinished work from Claude or another agent.

**Success criteria:** Cross-vendor handoff works purely through repository files; findings verified; Status → CONSUMED; no loss of prior work.

**Failure criteria:** Codex relies on assumed conversation context; ignores READY gate; discards Claude's unfinished work.

**Recovery procedure:** Restore lost work from git/HANDOFF; re-verify MA gate; continue from real state.

---

## Scenario 9 — Codex Desktop returns analysis to Claude CLI

**Goal:** Codex-App-produced analysis is consumed by Claude CLI.

**User actions:** After Codex App set MA to READY (Source = Codex App), open Claude CLI and write only: `Сделано.`

**Expected AI behaviour:** Claude follows CLAUDE.md consumption steps regardless of which Desktop produced the analysis; verifies findings against code; READY → CONSUMED after use.

**Success criteria:** Source vendor does not matter; handoff works through MA + HANDOFF; findings independently verified.

**Failure criteria:** Claude refuses valid Codex-App analysis solely because of Source; skips verification; mishandles the READY gate.

**Recovery procedure:** Re-read MA; treat any valid READY analysis regardless of Source; verify then continue.

---

## Scenario 10 — Codex Desktop returns analysis to Codex CLI

**Goal:** End-to-end all-Codex media round trip.

**User actions:** After Codex App set MA to READY, open Codex CLI and write only: `Сделано.`

**Expected AI behaviour:** Codex CLI consumes MA per AGENTS.md, verifies against code, continues from real state, sets CONSUMED.

**Success criteria:** Full Codex loop works through repository files only; READY gate honoured; Status → CONSUMED.

**Failure criteria:** READY gate skipped; findings unverified; unfinished work lost.

**Recovery procedure:** Re-read MA and HANDOFF; enforce READY gate; verify then continue.

---

## Scenario 11 — Interrupted CLI session recovery

**Goal:** A CLI session stops mid-task (limit/crash) and the next session resumes safely.

**User actions:** Interrupt an active coding task, then start a fresh CLI session and ask it to continue.

**Expected AI behaviour:** New session recovers context from HANDOFF + git status + git log -3 (not from chat history); identifies the paused task, modified files and next step; preserves all uncommitted work; continues from the real state.

**Success criteria:** Resumes exactly from HANDOFF's Next Recommended Step; no uncommitted work lost; no duplicated/restarted work.

**Failure criteria:** Restarts the task from zero; overwrites uncommitted changes; assumes chat history; invents prior results.

**Recovery procedure:** Re-read HANDOFF + git status/diff; reconcile against actual files; rebuild HANDOFF if it was stale.

---

## Scenario 12 — Repository handoff recovery (Claude ↔ Codex)

**Goal:** Work handed from Claude to Codex (or back) continues from the real repository state.

**User actions:** With a valid HANDOFF and its RECOVERY PROMPT block, paste the recovery block into the other agent and ask it to continue.

**Expected AI behaviour:** The receiving agent reads HANDOFF (RECOVERY PROMPT + SESSION CHECKSUM), verifies git state, preserves unfinished work, continues from the exact next step; when Claude returns it re-reviews Codex changes and resumes as lead.

**Success criteria:** Recovery block is self-contained (no "see above" references); Recovery ID present; state in the block matches real git state; work continues without loss.

**Failure criteria:** Recovery block references external context; SESSION CHECKSUM contradicts git; receiving agent restarts or overwrites work.

**Recovery procedure:** Rewrite the RECOVERY PROMPT to match real state with a fresh Recovery ID; set Recovery confidence honestly (HIGH/MEDIUM/LOW).

---

## Scenario 13 — Multiple screenshots

**Goal:** Desktop analyzes several screenshots in one request.

**User actions:** Attach multiple screenshots in Desktop, write only: `Analyze media.`

**Expected AI behaviour:** Analyzes every attachment; in MA Attachments lists each filename/identifier; consolidates confirmed observations, assumptions and needs-verification per image; mobile-first assumption applied; Status = READY.

**Success criteria:** All screenshots referenced individually; none silently skipped; per-image findings separated.

**Failure criteria:** Only the first image analyzed; images merged into a vague summary; claims about an image that was not actually available.

**Recovery procedure:** Reset MA; re-analyze each attachment explicitly; if an image was unavailable, mark it and set NEEDS_MORE_INPUT.

---

## Scenario 14 — Multiple videos

**Goal:** Desktop analyzes several videos.

**User actions:** Attach multiple videos in Desktop, write only: `Analyze media.`

**Expected AI behaviour:** Analyzes each video only if genuinely available; records identifiers; separates confirmed vs assumed; never claims a video observation that was not actually possible; Status = READY, or NEEDS_MORE_INPUT if a video could not be processed.

**Success criteria:** Each processable video analyzed; unprocessable ones clearly flagged; no invented frame-by-frame claims.

**Failure criteria:** Fabricated video observations; unprocessable video reported as analyzed; Status advanced despite missing content.

**Recovery procedure:** Set Status = NEEDS_MORE_INPUT; list which videos failed; request re-upload or a different format.

---

## Scenario 15 — Screenshot + video together

**Goal:** Mixed media in a single Desktop request.

**User actions:** Attach at least one screenshot and one video, write only: `Analyze media.`

**Expected AI behaviour:** Analyzes both media types; MA Attachments distinguishes each item and type; findings reconciled across media; mobile-first for interface screenshots; Status = READY.

**Success criteria:** Both media types covered; contradictions between them flagged under Needs verification; no type silently ignored.

**Failure criteria:** One media type ignored; contradictions hidden; invented content for either.

**Recovery procedure:** Re-analyze the ignored type; log contradictions explicitly; downgrade Status if any item was unavailable.

---

## Scenario 16 — User requested analysis only

**Goal:** Enforce "analysis only means no code edits".

**User actions:** Explicitly ask for analysis only (in Desktop or CLI), optionally with attachments.

**Expected AI behaviour:** Performs analysis, documents findings in MA/HANDOFF, and does NOT modify any source code.

**Success criteria:** Zero source-code changes; findings recorded; clear statement that code was intentionally not changed.

**Failure criteria:** Any source-code edit despite an analysis-only request.

**Recovery procedure:** Revert all source-code edits via git; keep only the documentation/analysis changes.

---

## Scenario 17 — User requested coding after analysis

**Goal:** Transition from a READY analysis to an actual code change.

**User actions:** After MA is READY (or after `Сделано.`), explicitly ask the CLI to implement the fix.

**Expected AI behaviour:** CLI consumes MA (verifies findings against code), implements the minimal fix, verifies mobile and desktop, runs available checks, sets MA Status = CONSUMED, updates HANDOFF, reports verified vs unverified.

**Success criteria:** Fix is based on verified findings; MA → CONSUMED; HANDOFF updated; both platforms checked.

**Failure criteria:** Code written from unverified assumptions; MA left READY or deleted prematurely; only one platform checked.

**Recovery procedure:** Re-verify findings against code; correct MA Status; re-check the missing platform.

---

## Scenario 18 — Handoff after unfinished work

**Goal:** Safely pause a partially finished task for the next session.

**User actions:** Ask the AI to stop mid-task (e.g. low budget) and hand off.

**Expected AI behaviour:** Finishes or safely pauses the current small step; updates HANDOFF (completed, files changed, real checks + real results, remaining work, risks, exact next step); fully rewrites the RECOVERY PROMPT with a fresh Recovery ID and honest SESSION CHECKSUM; lists uncommitted changes; does not commit unless asked; stops.

**Success criteria:** HANDOFF is immediately usable by the next session; unverified items marked NOT VERIFIED/UNKNOWN; unfinished work preserved and described.

**Failure criteria:** HANDOFF claims completion that did not happen; invents a SHA/build/test result; loses track of uncommitted changes; stale Recovery ID reused.

**Recovery procedure:** Rebuild HANDOFF from git status/diff/log; correct fabricated fields to UNKNOWN/NOT VERIFIED; regenerate Recovery ID.

---

## Scenario 19 — Wrong Desktop used

**Goal:** Handle a mismatch between the Desktop that produced the analysis and expectations.

**User actions:** Produce the analysis in one Desktop (e.g. Codex App) but expect consumption by the other vendor's CLI; or the user names the wrong tool.

**Expected AI behaviour:** Consumption depends only on a valid READY analysis in MA plus HANDOFF, not on which vendor produced it; the CLI still verifies findings against the current code before acting. Source is recorded for traceability but does not block a valid handoff.

**Success criteria:** Valid analysis is consumed regardless of producing Desktop; findings still independently verified; Source field accurate.

**Failure criteria:** CLI blindly trusts analysis because of Source; or wrongly rejects a valid analysis solely due to Source; or proceeds without verifying findings.

**Recovery procedure:** Confirm MA Status = READY and Source is accurate; verify findings against code; if the analysis is actually inadequate, set NEEDS_MORE_INPUT and re-request.

---

## Scenario 20 — Missing attachment

**Goal:** Handle `Analyze media.` when no usable attachment is present.

**User actions:** In Desktop, write `Analyze media.` with no attachment, or with an attachment that cannot be opened.

**Expected AI behaviour:** Does NOT invent observations; sets MA Status = NEEDS_MORE_INPUT; records that no usable media was available; asks the user to attach a valid file; updates HANDOFF if relevant; stops. Does not advance to READY and does not create findings.

**Success criteria:** Status = NEEDS_MORE_INPUT; no fabricated observations; clear request for a valid attachment; no code changes.

**Failure criteria:** AI claims to have analyzed non-existent media; sets READY without content; invents a fix.

**Recovery procedure:** Reset MA to NEEDS_MORE_INPUT (or PENDING); discard any invented findings; re-request a valid attachment.

---

## Cross-scenario invariants (must hold in all tests)

- START.md is always read first; repository files are the only source of truth.
- MA Status lifecycle is respected: PENDING → READY → CONSUMED, with NEEDS_MORE_INPUT for insufficient media; MA structure is never deleted.
- Analysis IDs are created only during a real analysis (format `MEDIA-YYYYMMDD-HHMMSS`).
- Source code is never modified when only analysis was requested.
- No AI invents commits, builds, tests, deployments, dates, times, screenshots or video observations.
- Unfinished work from any agent is always preserved.
- HANDOFF always reflects the real current state before an AI stops.
