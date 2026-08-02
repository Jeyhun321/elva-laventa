<!--
READING RULE: at session start read ONLY this file + `git log -3` + `git status`.
Do NOT open DAILY.md or HISTORY.md unless explicitly asked (saves usage limit).
This file is fully REWRITTEN after each major task, never appended. Keep it short.
Full raw day-by-day log lives in DAILY.md; project changelog in HISTORY.md.
-->

# Current Status

Продакшн опубликован и живой (Elva LaVenta). Последняя публикация — commit `5dedcd9` в `main`, GitHub Pages workflow `success`. Фаза: полировка mobile/desktop и стабилизация cart/favorites. Открыты **два ручных production-действия владельца** (см. Next Recommended Step) — без них email-покупатель не оформит заказ.

# Current Branch

`main`

# Last Completed Task

**Изменение QA-политики регрессии (только документация).** Убрано правило обязательной полной регрессии после каждого исправленного бага. Новая политика: после фикса QA выполняет **Fix Verification** — проверяет **только сам исправленный сценарий** (чек-лист этого бага); полная Regression Suite (весь `BUGS.md`) прогоняется **только** перед релизом, перед крупными обновлениями и после значительных изменений архитектуры. Все исправленные баги остаются в `docs/BUGS.md`; `BUGS.md` — единый Regression Suite. Обновлены: `docs/BUGS.md` (раздел Regression Strategy переписан: Fix Verification / полная Suite по триггерам / пострелизная / опциональный daily smoke), `docs/BUG_PROCESS.md` (переходы `READY FOR QA → REGRESSION PASSED` = Fix Verification; полная Suite только на `→ READY FOR RELEASE`; секция «Связь со стратегией регрессии»). `src/` не трогался. Ссылки в START.md/AI_WORKFLOW.md остаются валидными — правок не потребовалось.

Предыдущий контекст: система Bug Tracking (единый 20-полевой шаблон, 12 багов LAV-BUG-001…012, официальные правила, жизненный цикл в `docs/BUG_PROCESS.md`) построена ранее и сохранена. Незакоммиченная правка админ-OTP (6-значный код, `LAV-BUG-012`) — на месте.

# Files Changed

Эта задача (только документация): `docs/BUGS.md` (раздел Regression Strategy), `docs/BUG_PROCESS.md` (переходы READY FOR QA/REGRESSION PASSED + секция связи со стратегией), `docs/HANDOFF.md`.

Незакоммиченная правка (админ-OTP): `src/pages/AdminPage.jsx` (6-значный OTP, `LAV-BUG-012`) — в этой задаче не менялась.

Актуальный кластер правок последних задач:
- `src/components/Header.jsx`, `src/styles/index.css`, `src/pages/CatalogPage.jsx`, `src/context/CatalogContext.jsx`, `src/App.jsx` — навигация, поиск, каталог, loading-state.
- `src/context/ShopContext.jsx`, `src/pages/ProductPage.jsx` — синхронизация cart/favorites (уже в истории; в рабочем дереве этих правок нет).
- `src/lib/orders.js`, `src/pages/CheckoutPage.jsx` — заказ для любого вошедшего (не только Google).
- `supabase/fix-order-any-auth.sql` — новая SQL-правка `place_order` (применяет владелец вручную).
- `docs/*` — документация.

# Current Architecture Notes

- Cart и favorites жёстко привязаны к `user.id`; **гостевая корзина намеренно отключена**; localStorage не источник и не цель записи для вошедшего.
- Каталог грузится из Supabase; `catalog.json` — fallback только после двух неудачных запросов (основной + анонимный). До загрузки показывается `RouteLoading`, старый каталог не мелькает.
- Favorites/cart защищены **session-token + monotonic request-version**: устаревший async SELECT/DELETE/UPSERT не применяется к state/cache (защита от гонок A→B→A).
- `place_order` — серверный источник истины: цена, проверка размеров, `order_items`, Telegram-уведомление, очистка корзины.
- Галерея цветовых вариантов строится по **папке изображения**, не по коду товара.
- **Админ-OTP:** второй фактор после входа по паролю/Google + gate роли `admin`. Механизм — встроенный **Supabase Auth OTP** (`signInWithOtp`/`verifyOtp`, `type: 'email'`). Формат — **стандартный 6-значный код**; длина задаётся в **Supabase Dashboard** (Email OTP length = 6), в репозитории не конфигурируется. Клиент (`EmailOtpScreen`) принимает ровно 6 цифр, шлёт код только по явному клику, cooldown 30 с. Флаг подтверждения — в sessionStorage на 15 мин (`ADMIN_OTP_TTL`), только для gate панели; сам код в клиенте не хранится.
- i18n через `t()` на трёх языках (az/ru/en); новые тексты — во всех трёх.
- **Bug Tracking / QA:** `docs/BUGS.md` — главный QA-документ и постоянный Regression Suite (единый 20-полевой шаблон, официальные правила, Regression Strategy). Жизненный цикл статусов — `docs/BUG_PROCESS.md`. Правила: до Release 1.0 нет `CLOSED`; подтверждённый баг не удаляется; каждый фикс навсегда входит в Regression Suite; новый баг заводится в BUGS.md ДО начала правки. **Политика регрессии:** после обычного фикса — только **Fix Verification** (проверка самого исправленного сценария); полная Regression Suite — только перед релизом / крупными обновлениями / после значительных изменений архитектуры.

# Known Issues

- Админ-OTP этап 1 (`LAV-BUG-012`) **не проверен вживую** — из окружения нет авторизованной админ-сессии/почты владельца. Сценарии H/I/J/N (старый код после resend не работает, код старше TTL не работает, код одноразовый, ведущий ноль) зависят от Supabase-backend и требуют живой проверки владельцем. Изменения в рабочем дереве, не закоммичены.
- Пункты 6/7/8 запроса (ровно 4 цифры, ровно 30 с TTL, серверная инвалидация предыдущих кодов) на встроенном Supabase Auth OTP **невозможны** — нужен кастомный backend (этап 2).
- Production favorites-сценарий A→B→A **не проверен вживую** — в браузере нет авторизованных пользовательских сессий, аккаунты создаёт только владелец.
- SQL-функция `place_order` в базе всё ещё требует `provider = 'google'` → `GOOGLE_AUTH_REQUIRED` (фронт починен, БД — нет; файл-фикс готов, не применён).
- Подтверждение email в Supabase всё ещё включено (`mailer_autoconfirm: false`).

# Risks

- **Остаточный риск потери корзины:** Codex убрал автоперенос локального кэша (`mustPush`). Если у кого-то корзина жила ТОЛЬКО в браузере и не доехала в базу — пропадёт молча. По данным базы таких случаев не видно.
- В рабочем дереве незакоммиченными остаются только файлы документации и постоянных инструкций (`CLAUDE.md`, `.claude/*.md`, `docs/*`); изменений в `src/` нет. Источники — на `5dedcd9`.

# Next Recommended Step

Ждать команды владельца. Варианты:
1. Живая проверка админ-OTP этапа 1 (сценарии A–N в `LAV-BUG-012`), затем — по команде — commit/deploy.
2. Старт этапа 2: кастомный 4-значный OTP-backend (таблица + RPC + email-провайдер) для пунктов 6/7/8.

Ранее открытые ручные действия владельца (не связаны с OTP):
3. Применить `supabase/fix-order-any-auth.sql` в SQL Editor; выключить Confirm email; живая проверка заказа email-покупателя и favorites A→B→A.

# Context For Next Session

- Читать при старте только этот файл + `git log -3` + `git status`.
- Незакоммиченные правки Codex в дереве — **не закоммитить их случайно**.
- Постоянные правила: изменения проверять на mobile **и** desktop; тексты только через `t()` (az/ru/en); при проблеме со скриншотом — сначала логи и база, доложить, чинить после согласия.
- Полный подневный лог — `DAILY.md`; крупные вехи — `HISTORY.md`; решения — `DECISIONS.md`; баги — `BUGS.md`; функции — `FEATURES.md`; задачи — `TODO.md`.

---

```
==================================================
RECOVERY PROMPT FOR CODEX
==================================================
Recovery ID:
R-20260802-085554

(Полностью самодостаточный блок. Скопируй целиком и вставь в Codex CLI.
 Перезаписывается целиком после каждой задачи; отражает только текущее состояние.)

1. ПРОЕКТ: Elva LaVenta — интернет-магазин одежды.

2. ОПИСАНИЕ: витрина на React + Vite (каталог, корзина, избранное, оформление
   заказа), бэкенд Supabase (БД во Франкфурте) — каталог, авторизация (Google и
   email+пароль), заказы; деплой на GitHub Pages; есть админ-панель; i18n на трёх
   языках (az/ru/en); уведомления о заказах в Telegram.

3. ТЕКУЩЕЕ СОСТОЯНИЕ: продакшн живой на commit 5dedcd9 в main (GitHub Pages success).
   В рабочем дереве незакоммичены: правка админ-OTP (6-значный код) в src/pages/AdminPage.jsx
   (с предыдущего шага) и документация этой задачи (docs/BUGS.md, docs/BUG_PROCESS.md,
   docs/HANDOFF.md, START.md, AI_WORKFLOW.md). НИЧЕГО не закоммичено и не задеплоено.

4. УЖЕ РЕАЛИЗОВАНО: цветовые варианты товара (один код = один товар с цветами-строками);
   вход через Google и email; заказ для любого вошедшего (фронт); мобильная переработка
   (нижний таббар, каталог в 2 колонки, липкая панель покупки, свайп-галерея);
   стабилизация cart/favorites (session-token + monotonic request-version, без
   localStorage-кэша для вошедшего); локальный просмотр логов; премиум-редизайн.
   Админ-вход: пароль/Google → gate роли admin → OTP-подтверждение (Supabase Auth OTP).

5. ПОСЛЕДНЯЯ ЗАДАЧА (ЭТА, только документация): изменена QA-политика регрессии. Убрано
   правило обязательной полной регрессии после каждого исправленного бага. НОВАЯ ПОЛИТИКА:
   после обычного фикса QA выполняет Fix Verification — проверяет ТОЛЬКО сам исправленный
   сценарий (Regression Checklist этого бага); полная Regression Suite (весь BUGS.md) НЕ
   выполняется после каждого бага. Полный прогон Suite — ТОЛЬКО в трёх случаях: перед
   релизом; перед крупными обновлениями; после значительных изменений архитектуры. Все
   исправленные баги остаются в docs/BUGS.md; BUGS.md — единый Regression Suite. Обновлены:
   docs/BUGS.md (раздел Regression Strategy переписан под Fix Verification / полная Suite по
   триггерам / пострелизная / опциональный daily smoke) и docs/BUG_PROCESS.md (переход
   READY FOR QA → REGRESSION PASSED теперь = Fix Verification только исправленного сценария;
   полная Suite требуется только на REGRESSION PASSED → READY FOR RELEASE; обновлена секция
   «Связь со стратегией регрессии»). START.md/AI_WORKFLOW.md — правок не потребовалось (ссылки
   валидны). src/ НЕ трогался. Ранее (предыдущие задачи) построена система Bug Tracking:
   единый 20-полевой шаблон в BUGS.md, 12 багов LAV-BUG-001…012, официальные правила,
   жизненный цикл статусов в BUG_PROCESS.md — всё сохранено.
   Незакоммиченная правка админ-OTP (6-значный Supabase OTP; Dashboard Email OTP length = 6;
   в коде проверка /^\d{6}$/, maxLength="6"; нет авто-отправки, только по клику, cooldown 30 c)
   с более раннего шага — на месте, не закоммичено/не задеплоено.

6. ИЗМЕНЁННЫЕ ФАЙЛЫ (эта задача): docs/BUGS.md (Regression Strategy), docs/BUG_PROCESS.md
   (переходы READY FOR QA/REGRESSION PASSED + связь со стратегией), docs/HANDOFF.md. Код
   (src/) не менялся. Незакоммиченный src/pages/AdminPage.jsx (6-значный OTP) — с предыдущего
   шага, не тронут.

7. ВЫПОЛНЕННЫЕ ПРОВЕРКИ (эта задача): изменения только в документации — сборка/тесты не
   требуются и не запускались. Проверено: политика согласована между BUGS.md (Regression
   Strategy) и BUG_PROCESS.md (переходы статусов); исторические записи багов не тронуты;
   git status подтверждает, что src/ не менялся в этой задаче.

8. ЧТО НЕЛЬЗЯ НАРУШАТЬ: НЕ ломать существующий вход в админку (пункт 13 запроса) — этап 1
   намеренно оставляет Supabase Auth OTP, чтобы вход не сломался; гостевая корзина намеренно
   отключена; cart/favorites привязаны к user.id, localStorage не источник/цель для вошедшего;
   catalog.json — fallback только после двух неудачных запросов; place_order — серверный
   источник истины, не ослаблять; галерея вариантов — по папке изображений; все тексты через
   t() (az/ru/en); каждое изменение проверять на mobile И desktop; НЕ коммитить и НЕ
   деплоить без явной команды владельца; НЕ подметать чужие незакоммиченные файлы.

9. ОБЯЗАТЕЛЬНЫЕ ДОКУМЕНТЫ: docs/HANDOFF.md, docs/DAILY.md, docs/HISTORY.md, docs/TODO.md,
   docs/DECISIONS.md, docs/BUGS.md, docs/FEATURES.md; инструкции CLAUDE.md и
   .claude/{PROJECT,CODE_STYLE,REVIEW,SECURITY,CODEX}.md.

10. ЧТО ОСТАЛОСЬ:
    (а) Админ-OTP этап 2 (по команде владельца): ровно 4 цифры (с ведущим нулём), ровно 30 с
        TTL, серверная инвалидация предыдущих кодов, одноразовость, хранение только хэша —
        невозможно на Supabase Auth OTP; нужен кастомный backend: таблица admin_login_codes
        + RPC request_admin_code/verify_admin_code (security definer, server-side TTL) +
        отправка письма через email-провайдера по образцу Telegram (pg_net net.http_post,
        ключ в app_settings). Фронт переключать на новые RPC только ПОСЛЕ применения backend.
    (б) Существовавшее ранее (ручные действия владельца): применить
        supabase/fix-order-any-auth.sql в SQL Editor; выключить Confirm email в Supabase;
        живая проверка заказа email-покупателя и favorites A→B→A на реальных аккаунтах.

11. ПЕРВЫЙ СЛЕДУЮЩИЙ ШАГ: ждать команды владельца. По команде — либо живая регрессия 6-значного
    OTP по чек-листу LAV-BUG-012 (запрос кода по клику → ввод 6 цифр → вход; refresh/deploy не
    шлют код) и затем коммит/деплой, либо старт этапа 2 (кастомный 4-значный OTP-backend). Новая
    система: любой новый баг заводить в docs/BUGS.md ДО правки; статусы вести по docs/BUG_PROCESS.md.
    Ничего не коммитить/деплоить до явной команды.

12. ПОСЛЕ ЗАВЕРШЕНИЯ ЛЮБОЙ РАБОТЫ: пройти Task Completion Protocol (git diff/status; build
    если менялся код; lint/тесты если есть; mobile+desktop если UI; API если backend;
    миграции если БД), обновить документы по системе docs/, затем ПОЛНОСТЬЮ переписать этот
    блок RECOVERY PROMPT FOR CODEX. Никогда не выдумывать SHA/даты/сборки/тесты/деплои.

==================================================
SESSION CHECKSUM
==================================================
Recovery format:
  v1

Project:
  Elva LaVenta

Branch:
  main

Current task:
  Изменение QA-политики регрессии (только документация): убрана обязательная полная
  регрессия после каждого бага → Fix Verification; полная Suite только перед релизом /
  крупными обновлениями / после значительных изменений архитектуры. src/ не менялся.

Expected modified files:
  - docs/BUGS.md
  - docs/BUG_PROCESS.md
  - docs/HANDOFF.md
  (src/pages/AdminPage.jsx — незакоммичен с предыдущего шага, в этой задаче не менялся)

Git status summary:
  Не закоммичено. В этой задаче изменена только документация (docs/BUGS.md, docs/BUG_PROCESS.md,
  docs/HANDOFF.md). src/pages/AdminPage.jsx — с предыдущего шага (OTP → 6 цифр), не тронут.
  Ранее уже присутствовали в дереве незакоммиченные renames HANDOFF/HISTORY/DAILY -> docs/,
  изменения .codex/hooks.json и untracked-инструкции — их НЕ трогать и НЕ подметать. Ничего
  не коммитилось/деплоилось.

Documentation updated:
  YES (docs/BUGS.md — Regression Strategy под Fix Verification; docs/BUG_PROCESS.md — переходы
  статусов; docs/HANDOFF.md)

Last verified build:
  NOT RUN в этой задаче (менялась только документация). Последняя успешная — vite build SUCCESS
  на предыдущем шаге (npm run build, 118 модулей, 2026-08-02).

Last verified tests:
  NOT VERIFIED (автоматических тестов в проекте нет; lint-скрипта нет)

Recovery confidence:
  HIGH — задача чисто документационная, состояние сверено с git; src/ не менялся; политика
  согласована между BUGS.md и BUG_PROCESS.md; исторические записи багов не тронуты.
  Незакоммиченная правка OTP с предыдущего шага сохранена.
```
