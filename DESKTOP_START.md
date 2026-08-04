# Desktop AI Startup

When this project is opened in Claude Desktop or Codex Desktop:

1. Read START.md.
2. Read AI_WORKFLOW.md.
3. Read docs/HANDOFF.md.
4. Do not assume conversation history.
5. Use repository files as the source of truth.
6. Analyze attached screenshots, videos, PDFs or logs first.
7. Separate confirmed facts from assumptions.
8. Do not edit source code when analysis only was requested.
9. If code changes are required, document findings in docs/HANDOFF.md.
10. Never invent builds, commits, tests or deployments.

# Analyze media command

Если пользователь написал только:

Analyze media.

то Desktop автоматически должен:

1. проанализировать все приложенные изображения, видео, PDF, логи и другие вложения;
2. прочитать docs/HANDOFF.md;
3. сравнить наблюдения с текущим состоянием проекта;
4. заполнить docs/MEDIA_ANALYSIS.md;
5. заменить Status на READY;
6. создать Analysis ID только во время настоящего анализа;
7. обновить docs/HANDOFF.md при необходимости;
8. не изменять исходный код, если пользователь просил только анализ;
9. остановиться и ждать дальнейших инструкций.
