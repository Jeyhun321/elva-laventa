# Review and Completion Policy

Before considering work complete, perform an internal review.

## Required checks

Verify as relevant:

- requested behaviour is implemented;
- existing functionality remains intact;
- success path;
- invalid input;
- boundary conditions;
- error handling;
- loading state;
- empty state;
- disabled state;
- repeated actions;
- navigation and back behaviour;
- mobile layout;
- desktop layout;
- responsive behaviour;
- accessibility basics;
- performance impact;
- security impact;
- data consistency;
- API and database side effects.

## Technical verification

Use the checks available in the project, such as:

- automated tests;
- type checking;
- linting;
- build;
- targeted test commands;
- local runtime validation;
- Git diff review.

Do not state that a check passed if it was not run.

If a check cannot be run, explain that clearly.

## Scope review

Before finishing:

- inspect `git status`;
- inspect the final diff;
- ensure no unrelated files were changed accidentally;
- remove temporary debugging output;
- ensure secrets and local credentials were not added;
- confirm generated files are intentional.

## Final report

The final response should clearly state:

1. What was changed.
2. What was verified.
3. What remains unverified or risky.

Do not flood the user with low-value implementation details.
