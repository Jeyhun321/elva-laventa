# Code Style and Engineering Standards

## General standards

Write production-quality code that is:

- readable;
- maintainable;
- testable;
- consistent with the existing project;
- as simple as the requirements allow.

Prefer reliable, explicit solutions over clever or surprising solutions.

## Before coding

- Read the relevant existing implementation.
- Reuse established patterns where they are sound.
- Check whether equivalent functionality already exists.
- Understand data flow and dependencies before editing.

## Implementation rules

- Use clear and meaningful names.
- Keep functions and components focused.
- Avoid duplicated business logic.
- Avoid unnecessary abstractions.
- Avoid premature optimization.
- Do not introduce a new dependency unless it has a real benefit.
- Do not create parallel implementations of the same concept.
- Preserve public interfaces unless changing them is necessary.
- Keep backward compatibility where practical.

## Bug fixes

For every bug:

1. Reproduce or understand the failing behaviour.
2. Identify the root cause.
3. Check related code paths for the same defect.
4. Implement the smallest complete fix.
5. Add or update regression coverage when practical.
6. Verify the fix did not create another problem.

Do not hide errors with broad exception handling or temporary workarounds unless clearly documented and necessary.

## Refactoring

Refactor only when it supports the current task or removes a demonstrated risk.

Large refactors must be divided into safe, verifiable steps.

Do not mix unrelated cleanup into a focused bug fix.

## Comments and documentation

Comments should explain why, constraints, or non-obvious behaviour.

Do not add comments that merely repeat the code.

Update relevant documentation when behaviour, setup, or architecture changes.
