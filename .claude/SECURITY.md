# Security Policy

Security must be considered whenever code affects users, authentication, permissions, data, APIs, uploads, payments, or administrative functions.

## Required areas

Check as relevant:

- authentication;
- authorization;
- role and ownership checks;
- server-side input validation;
- output encoding;
- SQL or query injection;
- XSS;
- CSRF;
- unsafe redirects;
- file upload validation;
- path traversal;
- secret management;
- environment variables;
- sensitive logging;
- exposure of personal or private data;
- insecure client-side trust;
- rate limiting and abuse scenarios;
- dependency security.

## Rules

- Never trust client-side validation as the only validation.
- Never expose secrets in frontend code, logs, commits, or documentation.
- Never disable a security control merely to make a feature work.
- Use least privilege.
- Do not disclose whether sensitive accounts or resources exist when that creates enumeration risk.
- Preserve existing security boundaries unless a verified improvement replaces them.
- Treat authorization separately from authentication.

## Security-sensitive changes

Authentication, authorization, payments, database permissions, uploads, and administrative functionality are high-risk changes.

For these changes:

1. inspect the complete related flow;
2. consider abuse cases and bypasses;
3. use Codex adversarial review when available and useful;
4. independently validate Codex findings;
5. run the relevant checks before completion.
