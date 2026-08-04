# Media Analysis

Этот файл является точкой передачи результатов анализа изображений, видео, PDF, логов и других вложений из Claude Desktop или Codex App обратно в Claude Code CLI и Codex CLI.

## Status

PENDING

Допустимые значения:

- PENDING — анализ ещё не завершён;
- READY — Desktop закончил анализ, CLI может продолжать;
- CONSUMED — CLI прочитал и использовал результаты;
- NEEDS_MORE_INPUT — приложенных материалов недостаточно.

## Analysis ID

UNKNOWN

Формат:

MEDIA-YYYYMMDD-HHMMSS

Создавать реальный ID только во время настоящего анализа медиа.

## Source

UNKNOWN

Допустимые значения:

- Claude Desktop;
- Codex App;
- Other.

## Attachments

Пока материалы не анализировались:

- UNKNOWN

Во время анализа указывать имя файла, понятный идентификатор вложения или описание материала.

## User-reported problem

UNKNOWN

## Confirmed observations

- UNKNOWN

## Expected behavior

UNKNOWN

## Actual behavior

UNKNOWN

## Confirmed bugs

- UNKNOWN

## Assumptions

- UNKNOWN

## Needs verification

- UNKNOWN

## Affected platforms

- UNKNOWN

Для скриншотов интерфейса LaVenta по умолчанию считать mobile, если явно не указано обратное.

Функциональные изменения всё равно проверять на mobile и desktop.

## Likely affected files or modules

- UNKNOWN

## Regression risks

- UNKNOWN

## Recommended next CLI action

UNKNOWN

## Desktop completion note

После настоящего анализа Desktop должен:

1. заменить Status на READY;
2. создать реальный Analysis ID;
3. заполнить только подтверждённые данные;
4. пометить неизвестное как UNKNOWN;
5. обновить docs/HANDOFF.md;
6. не изменять исходный код, если пользователь просил только анализ;
7. остановиться.

## CLI consumption note

Когда пользователь возвращается в CLI и пишет «Сделано», CLI должен:

1. прочитать этот файл;
2. убедиться, что Status = READY;
3. проверить Analysis ID;
4. прочитать docs/HANDOFF.md;
5. сверить выводы с текущим кодом;
6. продолжить задачу;
7. после использования изменить Status на CONSUMED;
8. не удалять сам анализ до завершения задачи.
