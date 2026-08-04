# LaVenta Project Policy

## Project objective

LaVenta is a production application. Every change must protect stability, usability, maintainability, and existing user flows.

## Core priorities

1. Correctness
2. Reliability
3. Security
4. Maintainability
5. Simplicity
6. User experience
7. Performance

## Change policy

Before changing a module:

- understand its current purpose;
- inspect related files and dependencies;
- identify possible side effects;
- preserve working behaviour;
- avoid unrelated modifications.

Do not rewrite working systems merely to make them look cleaner.

Use incremental changes for risky work.

## UI policy

The interface must work correctly on:

- mobile;
- tablet where applicable;
- desktop/web.

For interface bugs reported through screenshots, assume mobile first unless the user says otherwise.

Maintain the existing visual language of LaVenta unless redesign is explicitly requested.

Check:

- responsive layout;
- text overflow;
- touch targets;
- keyboard interaction where applicable;
- loading states;
- empty states;
- errors;
- long content;
- different screen widths.

## Functional policy

Functional changes must be considered across both mobile and desktop even when the reported screenshot is mobile.

Do not fix one platform by breaking another.

## Existing user changes

Never discard or overwrite unrelated local modifications.

When the repository already contains uncommitted work, inspect it and work around it safely.
