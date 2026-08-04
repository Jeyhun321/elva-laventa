# Codex Integration Policy

## Roles

Claude Code is the primary engineer and lead.

OpenAI Codex is an internal specialist and engineering tool.

The user communicates with Claude Code. Claude Code coordinates the work, evaluates Codex output, makes the final decisions, and delivers the final result.

Codex must never be treated as the source of truth.

The source of truth is:

- the current repository;
- current project files;
- verified runtime behaviour;
- tests and checks;
- current Git state.

## When to use Codex

Use Codex when an independent engineering perspective is likely to improve the result, including:

- meaningful code review;
- adversarial review;
- architecture analysis;
- difficult debugging;
- complex multi-file changes;
- risky refactoring;
- authentication or authorization changes;
- security-sensitive work;
- database migrations;
- performance investigations;
- hidden edge cases;
- regression analysis;
- validating important assumptions;
- pre-release verification.

## When not to use Codex

Do not waste Codex limits on:

- spelling corrections;
- formatting;
- simple text changes;
- tiny CSS adjustments;
- obvious one-line fixes;
- routine renaming;
- straightforward low-risk tasks;
- tasks already fully verified by appropriate tests.

## Cost/benefit gate before every Codex call

Before every Codex invocation, first evaluate whether the benefit truly exceeds the token cost. Use Codex only when there is real engineering value.

The primary goal is to conserve Codex limits as much as possible without reducing project quality.

Do not use Codex when:

- the task can be figured out independently within a few minutes;
- it is just writing code;
- it is a small bug fix;
- it is a text change;
- it is a CSS change;
- it touches only one small file;
- the task is already obvious.

Use Codex when:

- the solution is ambiguous;
- there are several possible architectures;
- the change touches many files;
- an independent review is needed;
- hidden bugs must be found;
- security is involved;
- performance is involved;
- the logic is complex;
- there is regression risk.

If the cost/benefit check does not clearly favour Codex, continue independently.

## Tool selection

Choose the smallest suitable capability:

- `/codex:review` for an independent review of relevant changes;
- `/codex:adversarial-review` for high-risk, security-sensitive, architectural, or release-critical work;
- `/codex:rescue` when blocked by a difficult implementation or debugging problem;
- background execution only when parallel work provides real value;
- `/codex:status` and `/codex:result` for background tasks;
- `/codex:cancel` when a running task is no longer useful;
- `/codex:transfer` only when intentionally handing substantial work to a Codex session is appropriate.

Do not use transfer for ordinary review.

## Evaluation workflow

When Codex is used:

1. Give it a focused task and enough relevant context.
2. Do not delegate the entire responsibility unnecessarily.
3. Read its result critically.
4. Verify claims against the current code.
5. Reject false positives, stale assumptions, and unnecessary complexity.
6. Apply only confirmed improvements.
7. Run relevant tests and checks afterward.
8. Re-review only if the resulting changes justify it.

Claude Code remains responsible for the final implementation.

## Codex limit or availability failure

If Codex reports a usage limit, authentication error, temporary failure, timeout, or other unavailability:

- continue the task without Codex;
- do not block or pause the main work;
- do not repeatedly retry and waste Claude limits;
- do not enable automatic review gates that could create retry loops;
- retain a note only when a later Codex review would provide meaningful value.

When Codex becomes available again, use it on the current project state. Do not assume an old Codex context is still accurate.

Use a fresh review when Claude has changed the implementation substantially since the previous Codex invocation.

## Review gate

Do not enable an automatic Codex review gate by default.

Use deliberate Codex calls so that temporary limit failures do not block Claude Code and do not unnecessarily consume both services.

## User interaction

Do not ask the user to coordinate ordinary internal tool usage.

Use Codex directly when the integration permits it.

When explicit user action is technically required, provide one exact command and briefly explain why.
