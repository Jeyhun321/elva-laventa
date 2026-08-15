# BUGS — главный QA-документ проекта Elva LaVenta

Единый постоянный журнал багов проекта и **постоянная база регрессионного тестирования**.
Каждый подтверждённый баг живёт здесь навсегда и одновременно является пунктом
регрессионного чек-листа.

Жизненный цикл статусов и правила переходов описаны в **[BUG_PROCESS.md](BUG_PROCESS.md)**.

---

## Официальные правила проекта (обязательны)

1. **До Release 1.0 статус `CLOSED` не используется.** Баг может дойти максимум до
   `POST-RELEASE VERIFIED` / `ARCHIVED`, но формально не закрывается.
2. **Ни один подтверждённый баг никогда не удаляется** — меняется только его статус и
   история. Исторические записи неприкосновенны.
3. **Каждый исправленный баг становится частью постоянного Regression Suite** — его
   `Regression Checklist` навсегда остаётся в этом файле и прогоняется по стратегии ниже.
4. **Каждый новый баг обязан появиться в BUGS.md ДО начала исправления** (запись со
   статусом `NEW`/`CONFIRMED` создаётся раньше первой строки кода правки).

---

## Шкалы Priority и Severity

- **Priority** (бизнес-срочность): `P0` блокер релиза / чинить немедленно · `P1` высокий ·
  `P2` средний · `P3` низкий.
- **Severity** (техническое влияние): `S1` Critical (потеря данных / блок основной
  функции) · `S2` Major (важная функция работает неверно) · `S3` Minor (косметика /
  мелкое неудобство) · `S4` Trivial.

Примечание по миграции: для исторических багов поля `Priority`/`Severity` присвоены при
переходе на новую систему (инженерная оценка влияния), а не были зафиксированы в момент
находки. Поля `Found By`/`Found Date`/`QA`, где они не фиксировались, помечены `UNKNOWN`
или `NOT VERIFIED` — не выдумываются.

---

## Шаблон записи (единый для всех багов)

```
## LAV-BUG-XXX — Title
- Module:
- Platform:            mobile | desktop | both
- Environment:         Production | Working tree | ...
- Priority:            P0 | P1 | P2 | P3
- Severity:            S1 | S2 | S3 | S4
- Status:              см. BUG_PROCESS.md
- Found By:
- Found Date:
- Developer:
- QA:
- Release:
- Description:
- Steps to Reproduce:
- Expected Result:
- Actual Result:
- Root Cause:
- Fix Summary:
- Regression Checklist: (постоянный набор проверок — часть Regression Suite)
- Regression History:   (даты/результаты реальных прогонов; NOT VERIFIED, если не было)
- Notes:                (коммиты, прежние ID, риски, ссылки)
```

---

## Regression Strategy

**Политика (действующая):** полная Regression Suite **НЕ** выполняется после каждого
исправленного бага. После фикса QA проверяет **только сам исправленный сценарий**
(*Fix Verification*). Полный прогон всего `BUGS.md` выполняется только в трёх случаях:
перед релизом, перед крупными обновлениями, после значительных изменений архитектуры.

`BUGS.md` при этом остаётся **единым Regression Suite**: `Regression Checklist` каждого
бага хранится здесь навсегда и служит источником проверок для полного прогона.

### 1. Fix Verification — после исправления бага (обязательно)
- Когда: сразу после того, как разработчик перевёл баг в `FIXED` и изменения попали в
  проверяемую среду (`READY FOR QA`).
- Объём: **только `Regression Checklist` самого исправленного бага** (сам сценарий).
  Полная Suite и чек-листы соседних багов на этом шаге **НЕ прогоняются**.
- Цель: подтвердить, что конкретный баг исправлен.
- Документы: QA вносит результат в `Regression History` бага и переводит статус в
  `REGRESSION PASSED` (успех) или обратно в `IN PROGRESS`/`REOPENED` (провал).

### 2. Полная Regression Suite (весь BUGS.md) — только по триггерам
Выполняется **только** в одном из трёх случаев:
1. **перед Release;**
2. **перед крупными обновлениями;**
3. **после значительных изменений архитектуры.**
- Объём: **весь** `BUGS.md` — все `Regression Checklist` целиком (приоритет S1–S2, P0–P1),
  на mobile и desktop.
- Цель: гарантировать, что накопленный Regression Suite полностью зелёный.
- Документы: результаты — в `Regression History` каждого прогоняемого бага; сводка вехи
  релиза — в `docs/HISTORY.md`. Прошедшие → `READY FOR RELEASE`.

### 3. Пострелизная проверка (Post-release verification)
- Когда: сразу после деплоя релиза на прод (часть релизного цикла, не после каждого бага).
- Объём: `Regression Checklist` багов, попавших в релиз, на реальном проде (mobile +
  desktop).
- Цель: подтвердить исправления в боевой среде.
- Документы: статус → `POST-RELEASE VERIFIED`; запись в `Regression History`.

### (Опционально) Ежедневный лёгкий smoke
- Не обязателен и **не является полной регрессией**. По желанию — быстрый ручной прогон
  критичных сценариев (заказ, корзина, избранное, вход в админку, загрузка каталога).
- При находке проблемы — новый баг в `BUGS.md` (правило 4) или перевод в `REOPENED`.

### Как использовать BUGS.md как чек-лист
- Каждый `- [ ]` в `Regression Checklist` — отдельная проверка. Прогон = отметить
  `- [x]` в рабочей копии/протоколе (не стирая исходные шаги) и внести строку в
  `Regression History` с датой и результатом.
- После обычного фикса берётся **только** чек-лист исправленного бага (Fix Verification).
  Весь `BUGS.md` как чек-лист прогоняется только по триггерам полной Suite (см. раздел 2).
- Все функциональные проверки выполняются **и на mobile, и на desktop** (правило проекта).
- Пустой `Regression History` = `NOT VERIFIED`: живой проверки ещё не было.

---
---

## LAV-BUG-001 — Выпадающее меню аккаунта уезжало за левый край на мобиле
- **Module:** Header / Account
- **Platform:** mobile
- **Environment:** Production
- **Priority:** P2
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** На мобиле выпадающее меню аккаунта в шапке позиционировалось неверно и уезжало за левый край экрана.
- **Steps to Reproduce:**
  1. Открыть сайт на ширине ~375px.
  2. Нажать кнопку аккаунта в шапке.
- **Expected Result:** Dropdown раскрывается в пределах экрана, не обрезается слева.
- **Actual Result:** Dropdown уезжал за левый край экрана.
- **Root Cause:** Собственное CSS-правило скрывало кнопку аккаунта, из-за чего меню позиционировалось относительно неверного элемента.
- **Fix Summary:** Исправлено позиционирование dropdown на мобиле.
- **Regression Checklist:**
  - [ ] ~375px: меню аккаунта раскрывается в пределах экрана, не обрезано слева (mobile).
  - [ ] Desktop: меню аккаунта открывается корректно.
- **Regression History:** NOT VERIFIED (живой регрессии не проводилось).
- **Notes:** Регрессия от предыдущей mobile-правки. Исправлен в `5b076ac`. Прежний ID: B-001.

## LAV-BUG-002 — Оранжевое платье показывало бежевые фото
- **Module:** Product / Gallery
- **Platform:** both
- **Environment:** Production
- **Priority:** P1
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** Owner (репорт)
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** У товара с цветовыми вариантами при выборе одного цвета показывались фото другого цвета.
- **Steps to Reproduce:**
  1. Открыть товар с несколькими цветовыми вариантами.
  2. Переключить цвет (например, на оранжевый).
- **Expected Result:** Галерея показывает фото именно выбранного цвета.
- **Actual Result:** Для оранжевого варианта подтягивались фото бежевого.
- **Root Cause:** Галерея цветового варианта определялась по общему коду товара, а не по конкретному варианту.
- **Fix Summary:** Определение галереи переведено с кода товара на **папку изображений**.
- **Regression Checklist:**
  - [ ] Товар с несколькими цветами: переключение цвета показывает фото именно выбранного варианта (mobile).
  - [ ] То же на desktop.
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлен в `47ceef9`. См. DECISIONS D-003. Прежний ID: B-002.

## LAV-BUG-003 — Гостевой перенос корзины создавал фантомные товары
- **Module:** Cart
- **Platform:** both
- **Environment:** Production
- **Priority:** P1
- **Severity:** S1
- **Status:** READY FOR QA
- **Found By:** Owner (репорт)
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** В новом аккаунте появлялись товары, которых пользователь не добавлял.
- **Steps to Reproduce:**
  1. Войти в новый/чистый аккаунт.
  2. Открыть корзину.
- **Expected Result:** Корзина пустая, без не добавлявшихся пользователем товаров.
- **Actual Result:** В корзине появлялись фантомные товары (одним пакетом, время создания совпадало до микросекунды).
- **Root Cause:** «Мягкий перенос» старой гостевой корзины из браузера при первом входе.
- **Fix Summary:** Перенос удалён, добавлена одноразовая очистка ключей, фантомные строки удалены из базы.
- **Regression Checklist:**
  - [ ] Вход в новый/чистый аккаунт → корзина пустая (mobile).
  - [ ] То же на desktop.
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлен в `aad6872`. **Остаточный риск:** корзина, жившая ТОЛЬКО в браузере, теперь пропадает молча (см. `docs/TODO.md` → Technical Debt). Прежний ID: B-003.

## LAV-BUG-004 — Favorites возвращались/пропадали после удаления (гонка A→B→A)
- **Module:** Favorites
- **Platform:** both
- **Environment:** Production
- **Priority:** P1
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** Owner (репорт)
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец) — живая проверка на реальных аккаунтах владельца ещё не выполнена
- **Release:** Pre-1.0
- **Description:** Удалённый favorite возвращался после refresh; при быстрой смене аккаунтов A→B→A показывалась чужая/устаревшая память.
- **Steps to Reproduce:**
  1. На аккаунте A удалить favorite, подождать, обновить страницу.
  2. Быстро сменить аккаунты A→B→A.
- **Expected Result:** Удалённый favorite не возвращается; показывается память именно текущего аккаунта.
- **Actual Result:** Favorite возвращался; при A→B→A показывалась устаревшая/чужая память.
- **Root Cause:** Устаревший async SELECT/DELETE/UPSERT приходил позже нового и перезаписывал state старым снимком.
- **Fix Summary:** Введены session-token на каждую активацию аккаунта + monotonic request-version; удалён favorites-cache writer (localStorage больше не источник/цель для вошедшего).
- **Regression Checklist:**
  - [ ] A: удалить favorite → подождать → refresh → не возвращается (mobile).
  - [ ] Смена аккаунтов A→B→A → показывается память текущего аккаунта (mobile).
  - [ ] Те же два сценария на desktop.
- **Regression History:** NOT VERIFIED (живая регрессия на реальных аккаунтах владельца не выполнена).
- **Notes:** Исправлен в `11a751e`, `6c63dd4`, `ff8037f`. См. DECISIONS D-005. Прежний ID: B-004.

## LAV-BUG-005 — Orphan-id давал ложный бейдж и stale cart
- **Module:** Cart / Favorites (badges)
- **Platform:** both
- **Environment:** Production
- **Priority:** P2
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** При пустом избранном бейдж показывал «1»; у корзины была та же проблема устаревших запросов.
- **Steps to Reproduce:**
  1. Иметь в избранном/корзине id товара, которого нет в каталоге.
  2. Посмотреть бейдж; затем добавить товар в корзину.
- **Expected Result:** Бейджи показывают «0» при пустом состоянии; счётчик и состояние обновляются по свежему SELECT.
- **Actual Result:** Бейдж показывал «1» из-за orphan-id; состояние корзины устаревало.
- **Root Cause:** Бейджи учитывали несуществующие в каталоге товары; ProductPage реагировал по truthy Promise, а не по факту записи.
- **Fix Summary:** Бейджи считают только реально существующие товары; cart-мутация → свежий SELECT с request/session-guard; ProductPage реагирует только после успешной записи.
- **Regression Checklist:**
  - [ ] Пустое избранное/корзина → бейджи «0» (mobile + desktop).
  - [ ] Добавление товара в корзину → счётчик и состояние обновляются по свежему SELECT.
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлен в `d68681a`. Прежний ID: B-005.

## LAV-BUG-006 — Email-покупатель не может оформить заказ (GOOGLE_AUTH_REQUIRED)
- **Module:** Checkout / Orders (place_order)
- **Platform:** both
- **Environment:** Production (БД) + Working tree (готовый SQL-фикс)
- **Priority:** P0
- **Severity:** S1
- **Status:** IN PROGRESS (фронт исправлен и задеплоен; серверная БД-функция НЕ исправлена — блокирует)
- **Found By:** Owner (репорт)
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Blocked (ждёт применения SQL владельцем)
- **Release:** Pre-1.0
- **Description:** После email-регистрации оформление заказа падает: не-Google пользователь получает `GOOGLE_AUTH_REQUIRED`.
- **Steps to Reproduce:**
  1. Войти по email (не Google).
  2. Добавить товар, оформить заказ.
- **Expected Result:** Заказ проходит, попадает в БД и вызывает Telegram-уведомление, без `GOOGLE_AUTH_REQUIRED`.
- **Actual Result:** Заказ падает с `GOOGLE_AUTH_REQUIRED`.
- **Root Cause:** Серверная SQL-функция `place_order` всё ещё требует `provider = 'google'`.
- **Fix Summary:** Фронт исправлен (`orders.js`, `CheckoutPage.jsx`). Подготовлен `supabase/fix-order-any-auth.sql` (свежая версия функции минус Google-блок; проверка `auth.uid() is null → AUTH_REQUIRED` сохранена). SQL **не применён** — требует ручного применения владельцем в SQL Editor.
- **Regression Checklist:**
  - [ ] Вход по email (не Google) → заказ проходит (mobile).
  - [ ] Заказ появляется в БД.
  - [ ] Приходит Telegram-уведомление.
  - [ ] Нет ошибки `GOOGLE_AUTH_REQUIRED`.
  - [ ] Тот же сценарий на desktop.
- **Regression History:** NOT VERIFIED (заблокировано применением SQL).
- **Notes:** Фронт исправлен в `535338b`. См. `docs/TODO.md` (High), DECISIONS D-004. Прежний ID: B-006.

## LAV-BUG-007 — При сбое сессии каталог показывал устаревший локальный файл
- **Module:** Catalog (CatalogContext)
- **Platform:** both
- **Environment:** Production
- **Priority:** P2
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** При ошибке сессии Supabase запрос каталога падал, показывался устаревший локальный `catalog.json`.
- **Steps to Reproduce:**
  1. Смоделировать ошибку сессии («JWT issued at future») при загрузке каталога.
- **Expected Result:** Приложение повторяет запрос анонимно, а не показывает устаревшие данные.
- **Actual Result:** Показывался устаревший локальный `catalog.json`.
- **Root Cause:** При сбое сессии запрос не повторялся, сразу шёл fallback на локальный файл.
- **Fix Summary:** При сбое сессии запрос повторяется анонимно; `catalog.json` — fallback только после двух неудачных запросов.
- **Regression Checklist:**
  - [ ] Смоделировать ошибку сессии → каталог повторяет запрос анонимно, устаревшие данные не показываются (mobile + desktop).
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлено 2026-07-27…29 (см. `docs/HISTORY.md`). Прежнего B-ID не было.

## LAV-BUG-008 — Локальный catalog.json мелькал до ответа Supabase
- **Module:** Catalog (CatalogContext)
- **Platform:** both
- **Environment:** Production
- **Priority:** P3
- **Severity:** S3
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** При первичном рендере показывался локальный `catalog.json` до ответа Supabase — старые карточки мелькали перед свежими.
- **Steps to Reproduce:**
  1. Открыть каталог при медленном ответе Supabase.
- **Expected Result:** До загрузки показывается loading-state (`RouteLoading`), старый каталог не мелькает, затем свежие карточки.
- **Actual Result:** Старые карточки из локального файла мелькали.
- **Root Cause:** Локальный каталог попадал в первый render.
- **Fix Summary:** При наличии Supabase локальный каталог больше не попадает в первый render; `catalog.json` — fallback только после двух неудачных запросов.
- **Regression Checklist:**
  - [ ] Каталог при медленном Supabase → сначала loading, без мелькания старых карточек (mobile + desktop).
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлено в кластере правок каталога (`CatalogContext.jsx`, см. DAILY 2026-08-01). Прежнего B-ID не было.

## LAV-BUG-009 — Поиск по коду товара срабатывал по частичному совпадению
- **Module:** Catalog / Search
- **Platform:** both
- **Environment:** Production
- **Priority:** P2
- **Severity:** S2
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** Поиск по коду товара давал ложные совпадения по подстроке.
- **Steps to Reproduce:**
  1. В поиске каталога ввести `2`.
  2. Затем ввести `2002`.
- **Expected Result:** `2` → 0 совпадений по коду; `2002` → ровно 1 совпадение.
- **Actual Result:** Запрос `2` находил товар с кодом `2002`.
- **Root Cause:** Поиск использовал частичный `includes` для кода товара.
- **Fix Summary:** Код товара переведён на полное совпадение (`CatalogPage.jsx`).
- **Regression Checklist:**
  - [ ] Ввод `2` → 0 совпадений по коду (mobile + desktop).
  - [ ] Ввод `2002` → ровно 1 совпадение.
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлено 2026-08-01 (см. DAILY). Прежнего B-ID не было.

## LAV-BUG-010 — Очистка поиска не сбрасывала URL-фильтр
- **Module:** Catalog / Search
- **Platform:** both
- **Environment:** Production
- **Priority:** P3
- **Severity:** S3
- **Status:** READY FOR QA
- **Found By:** UNKNOWN
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** При очистке строки поиска URL-фильтр не сбрасывался, каталог оставался отфильтрованным.
- **Steps to Reproduce:**
  1. Применить поиск/фильтр.
  2. Очистить строку поиска.
- **Expected Result:** Каталог возвращает все товары, URL-фильтр сброшен.
- **Actual Result:** Каталог оставался отфильтрованным.
- **Root Cause:** Очистка поиска не сбрасывала URL-фильтр.
- **Fix Summary:** Очистка поиска теперь сбрасывает URL-фильтр.
- **Regression Checklist:**
  - [ ] Применить фильтр → очистить поиск → показаны все товары, URL-фильтр сброшен (mobile + desktop).
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлено 2026-08-01 (см. DAILY). Прежнего B-ID не было.

## LAV-BUG-011 — Рейтинг отзывов переполнялся на карточках каталога (мобиле)
- **Module:** Catalog / Product Card
- **Platform:** mobile
- **Environment:** Production
- **Priority:** P2
- **Severity:** S3
- **Status:** READY FOR QA
- **Found By:** Owner (скриншот, mobile)
- **Found Date:** UNKNOWN
- **Developer:** Claude Code
- **QA:** Pending (владелец)
- **Release:** Pre-1.0
- **Description:** На ≤640px блок рейтинга/отзывов на карточке товара переполнялся (RU «0 отзывов» переносился, ломал вёрстку); высота нижних частей соседних карточек не совпадала.
- **Steps to Reproduce:**
  1. На ~375px в RU/AZ/EN открыть каталог.
- **Expected Result:** Рейтинг/отзывы в одну строку (nowrap) без переполнения; название в 2 строки; нижние части соседних карточек выровнены.
- **Actual Result:** Блок рейтинга переполнялся, вёрстка ломалась, высоты не совпадали.
- **Root Cause:** Отсутствие nowrap/компактных метрик на узких экранах.
- **Fix Summary:** На ≤640px рейтинг сделан nowrap с компактными метриками, название — 2 строки одинаковой высоты; счётчик результатов каталога удалён.
- **Regression Checklist:**
  - [ ] ~375px, RU/AZ/EN: рейтинг/отзывы в одну строку без переполнения (mobile).
  - [ ] Название ограничено 2 строками; нижние части соседних карточек выровнены (mobile).
  - [ ] Desktop-вёрстка карточек не пострадала.
- **Regression History:** NOT VERIFIED.
- **Notes:** Исправлено 2026-08-01 (`00a63b9`, см. DAILY/HISTORY). Прежнего B-ID не было.

## LAV-BUG-012 — Код подтверждения админки отправлялся автоматически при загрузке/refresh/деплое
- **Module:** Admin / Auth (EmailOtpScreen)
- **Platform:** both
- **Environment:** Production (задеплоено)
- **Priority:** P1
- **Severity:** S2
- **Status:** REGRESSION PASSED (Fix Verification выполнена владельцем на реальной админ-почте 2026-08-02; закоммичено и задеплоено)
- **Found By:** Owner (репорт)
- **Found Date:** 2026-08-01
- **Developer:** Claude Code
- **QA:** Владелец — живая регрессия пройдена 2026-08-02
- **Release:** Pre-1.0
- **Description:** При открытии `/admin`, refresh, hot reload или новом деплое админу автоматически приходило новое письмо с одноразовым кодом — без явного действия. Из-за нескольких писем было непонятно, какой код актуальный.
- **Steps to Reproduce:**
  1. Иметь живую Supabase-сессию админа (localStorage).
  2. Открыть `/admin` / обновить страницу / выполнить новый деплой.
- **Expected Result:** Код отправляется только после явного действия (клик по кнопке входа); загрузка/refresh/deploy код не отправляют.
- **Actual Result:** Код отправлялся автоматически при монтировании экрана OTP.
- **Root Cause:** В `src/pages/AdminPage.jsx` (`EmailOtpScreen`) стоял авто-запуск отправки при монтировании: `useEffect(() => { sendCode() }, [sendCode])`. Экран монтируется всегда, пока жива Supabase-сессия админа, а флаг подтверждения OTP в sessionStorage пуст/истёк — код слался без действия пользователя.
- **Fix Summary:** Авто-запуск удалён; код отправляется только по явному клику. Добавлены cooldown 30 с с обратным отсчётом (`OTP_RESEND_COOLDOWN`) и guard `busy || cooldown > 0` (защита от нескольких писем при быстрых кликах). До первой отправки поле кода скрыто, показана кнопка «Отправить код на почту». Формат OTP приведён к стандартному **6-значному Supabase OTP**: клиентская валидация `/^\d{6,8}$/` → `/^\d{6}$/`, `maxLength="8"` → `maxLength="6"`, placeholder `000000`, текст ошибки «Введите 6-значный код из письма». Длина OTP настраивается в **Supabase Dashboard** (владелец выставил Email OTP length = 6, 2026-08-02); в репозитории не задаётся. Архитектура входа (`signInWithOtp`/`verifyOtp`, gate роли admin) не менялась.
- **Regression Checklist:**
  - [ ] A. Открыть обычный сайт → письмо не приходит.
  - [ ] B. Обновить обычную страницу → письмо не приходит.
  - [ ] C. Новый деплой без попытки входа → письмо не приходит.
  - [ ] D. Открыть форму входа в админку, не нажимая кнопку → письмо не приходит.
  - [ ] E. Нажать «Отправить код на почту» → приходит ровно одно письмо с **6-значным** кодом.
  - [ ] F. Повторно нажать до 30 с → заблокировано, идёт обратный отсчёт.
  - [ ] G. Через 30 с → можно запросить новый код.
  - [ ] Ввести 6 цифр из письма → успешный вход.
  - [ ] K. После успешного входа обновить страницу → новый код не отправляется.
  - [ ] L. Уже подтверждённый админ (сессия жива) не получает код без явного выхода и нового входа.
  - [ ] M. Несколько быстрых кликов → одно письмо (busy + cooldown).
  - [ ] Проверка на mobile (числовая клавиатура) и desktop.
- **Regression History:** 2026-08-02 — Fix Verification выполнена владельцем на реальной админ-почте, PASSED; `vite build` — успешно; закоммичено и задеплоено.
- **Notes:** Остаётся встроенный Supabase Auth OTP. Требования «ровно 4 цифры / ровно 30 с TTL / серверная инвалидация предыдущих кодов» на нём невозможны — запланированы **вторым этапом** (кастомная таблица + RPC + email-провайдер по образцу Telegram через `pg_net`), по отдельной команде владельца. Прежнего B-ID не было.

## LAV-BUG-013 — Пустая корзина не различала ручное удаление и успешный заказ
- **Module:** Cart (CartPage / ShopContext / CheckoutPage)
- **Platform:** both
- **Environment:** Working tree (не закоммичено, не задеплоено)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (репорт)
- **Found Date:** 2026-08-02
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** После любого опустошения корзины показывалась одна и та же кнопка «Alış-verişə başla». Не различались два сценария: пользователь вручную удалил последний товар vs корзина очистилась автоматически после успешного заказа.
- **Steps to Reproduce:**
  1. Оформить успешный заказ (корзина очищается автоматически) и открыть страницу корзины.
- **Expected Result:** После успешного заказа — «Alış-verişə davam et»; после ручного удаления последнего товара — «Alış-verişə başla».
- **Actual Result:** В обоих случаях показывалась «Alış-verişə başla».
- **Root Cause:** `CartPage` рендерил пустое состояние без учёта причины опустошения; не сохранялось состояние причины (ручное удаление vs успешный заказ).
- **Fix Summary:** В `ShopContext` добавлено **кратко­живущее in-memory** состояние `orderJustCompleted` (не localStorage/sessionStorage — чтобы не переживало refresh/новую сессию). `CheckoutPage` вызывает `markOrderCompleted()` **только** после реально успешного заказа (после `clearCart()`; при ошибке строка недостижима). `CartPage` показывает `continue_shopping` при `orderJustCompleted`, иначе `go_shopping`. Флаг сбрасывается: при уходе со страницы корзины (cleanup effect), при добавлении нового товара (`addToCart`), при смене аккаунта (effect на `accountId`) и естественно при refresh. Добавлен i18n-ключ `continue_shopping` (az «Alış-verişə davam et», ru «Продолжить покупки», en «Continue shopping»).
- **Fix Verification checklist:**
  - [ ] A. Удалить последний товар вручную → «Alış-verişə başla».
  - [ ] C. Успешно оформить заказ → корзина очищается, на странице корзины «Alış-verişə davam et».
  - [ ] D. После заказа обновить страницу корзины → ложное состояние не остаётся (снова «başla»).
  - [ ] E. После заказа добавить новый товар, затем удалить вручную → снова «başla».
  - [ ] F. Неуспешный заказ → корзина не очищается, новый текст не показывается.
  - [ ] B. Удаление из избранного → поведение не изменилось.
  - [ ] G. Проверить AZ / RU / EN.
  - [ ] H. Проверить mobile и desktop.
- **Regression History:** NOT VERIFIED (изменения в рабочем дереве, не закоммичены/не задеплоены; `vite build` — успешно). Полная регрессия сейчас не выполняется (политика Fix Verification).
- **Notes:** Исправление затронуло `src/context/ShopContext.jsx`, `src/pages/CheckoutPage.jsx`, `src/pages/CartPage.jsx`, `src/i18n/translations.js`. Существующая очистка корзины после заказа (`clearCart`) не изменена (требование 6). Прежнего B-ID не было. **Уточнение (см. LAV-BUG-014):** эта правка меняла CTA на странице **корзины** (`CartPage`), но реальный экран после заказа — блок `done` в `CheckoutPage`, поэтому визуально CTA не изменился; настоящая первопричина закрыта в LAV-BUG-014.

## LAV-BUG-014 — На экране подтверждения заказа неверный CTA («Alış-verişə başla»)
- **Module:** Checkout / Order confirmation (CheckoutPage `done`)
- **Platform:** both
- **Environment:** Working tree (не закоммичено, не задеплоено)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншот, mobile)
- **Found Date:** 2026-08-02
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** После успешного оформления заказа на экране подтверждения («Sifarişiniz qəbul edildi!») кнопка показывала «Alış-verişə başla» вместо «Alış-verişə davam et».
- **Steps to Reproduce:**
  1. Успешно оформить заказ.
  2. Посмотреть кнопку на экране подтверждения.
- **Expected Result:** AZ «Alış-verişə davam et» / RU «Продолжить покупки» / EN «Continue shopping».
- **Actual Result:** «Alış-verişə başla» (`go_shopping`).
- **Root Cause:** Экран подтверждения — это **отдельный компонент** (блок `done` в `src/pages/CheckoutPage.jsx`), у которого кнопка была жёстко привязана к ключу `go_shopping`. Предыдущая правка (LAV-BUG-013) меняла CTA только в `CartPage` (пустая корзина) и добавляла состояние `orderJustCompleted` — но после заказа пользователь видит **не** `CartPage`, а экран подтверждения `CheckoutPage`, который это состояние не читал. Поэтому текст на реальном экране не менялся.
- **Fix Summary:** Кнопка на экране подтверждения (`CheckoutPage` блок `done`) переведена на ключ `continue_shopping` (`src/pages/CheckoutPage.jsx:190`). Блок `done` рендерится **только** после реально успешного заказа (`if (done)`), поэтому CTA однозначно корректный без доп. флагов. Ключ `continue_shopping` (az «Alış-verişə davam et», ru «Продолжить покупки», en «Continue shopping») уже существует в `translations.js`. Текст не хардкодится. CTA пустой корзины (`CartPage`) остаётся `go_shopping` для обычных сценариев.
- **Fix Verification checklist:**
  - [ ] A/B. Успешно оформить заказ (mobile и desktop) → CTA = «Alış-verişə davam et».
  - [ ] C. Удалить последний товар вручную → CTA пустой корзины = «Alış-verişə başla».
  - [ ] D. Открыть изначально пустую корзину → «Alış-verişə başla».
  - [ ] E. Неуспешный заказ → экран подтверждения не показывается.
  - [ ] F. Проверить AZ / RU / EN.
- **Regression History:** NOT VERIFIED (в рабочем дереве; `vite build` — успешно). Полная регрессия не выполняется (политика Fix Verification).
- **Notes:** Связан с LAV-BUG-013 (та правка не отработала, т.к. таргетила другой компонент). Файл: `src/pages/CheckoutPage.jsx`. Прежнего B-ID не было.

## LAV-BUG-015 — После заказа на мобильном страница остаётся внизу (у футера), карточка подтверждения не видна
- **Module:** Checkout / Order confirmation (CheckoutPage `done`)
- **Platform:** mobile (desktop — без вреда)
- **Environment:** Working tree (не закоммичено, не задеплоено)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншот, mobile)
- **Found Date:** 2026-08-02
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** На мобильном после успешного заказа пользователь оставался в нижней части страницы (рядом с футером/таббаром); блок подтверждения находился выше и не попадал в видимую область.
- **Steps to Reproduce:**
  1. На мобильном заполнить длинную форму заказа (прокрутка вниз к кнопке «Отправить»).
  2. Успешно оформить заказ.
- **Expected Result:** Сразу виден блок подтверждения (иконка успеха, «Sifarişiniz qəbul edildi!», текст про 5 минут, номер заказа, кнопка). Не попадать к футеру.
- **Actual Result:** Пользователь оставался внизу у футера; карточка подтверждения была выше видимой области.
- **Root Cause:** При `setDone(order)` содержимое заменяется на короткий блок подтверждения, но позиция скролла сохранялась с конца длинной формы — верх страницы (где карточка) не показывался; автоскролла не было.
- **Fix Summary:** Добавлен `useEffect` с зависимостью `[done]`: **только** после успешного заказа (`done` truthy) выполняется `window.scrollTo({ top: 0, behavior: 'auto' })`. Guard `if (window.scrollY > 0)` — если уже вверху (обычно desktop), скролл не выполняется (нет лишнего прыжка, требование 8). Скролл к началу страницы → sticky-шапка естественно остаётся над карточкой, верх карточки не скрыт (требование 6), к футеру не уводит. Момент — после рендера (в effect), без жёстких координат (0 = верх страницы).
- **Fix Verification checklist:**
  - [ ] A. Успешно оформить заказ на mobile → сразу виден блок подтверждения, не футер.
  - [ ] B. Успешно оформить заказ на desktop → нет лишнего неудобного скролла.
  - [ ] E. Неуспешный заказ → автоскролл не выполняется (экран подтверждения не показывается).
  - [ ] Верх карточки подтверждения не скрыт под sticky-шапкой.
- **Regression History:** NOT VERIFIED (в рабочем дереве; `vite build` — успешно). Живая проверка на мобильном за владельцем. Полная регрессия не выполняется (политика Fix Verification).
- **Notes:** Файл: `src/pages/CheckoutPage.jsx` (useEffect на `[done]`). Отдельный баг от LAV-BUG-014 (не объединять). Прежнего B-ID не было.

## LAV-BUG-016 — Белый экран после простоя и нового деплоя
- **Module:** App shell / route loading
- **Platform:** both
- **Environment:** Production after a new deployment
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (report)
- **Found Date:** 2026-08-02
- **Developer:** Codex
- **QA:** Pending (owner) — Fix Verification
- **Release:** Pre-1.0
- **Description:** После долгого простоя открытая вкладка могла показать белый экран; обычный refresh восстанавливал сайт.
- **Steps to Reproduce:**
  1. Оставить вкладку со старой версией приложения открытой.
  2. Выпустить новую версию, в которой старые Vite-чанки больше недоступны.
  3. Открыть lazy-маршрут или вернуться к вкладке.
- **Expected Result:** Подтверждённая ошибка загрузки устаревшего чанка один раз обновляет страницу; другие ошибки не приводят к белому экрану и показывают локализованный fallback.
- **Actual Result:** Ошибка dynamic import размонтировала React-дерево, поскольку вокруг маршрутов не было ErrorBoundary.
- **Root Cause:** `App.jsx` загружал восемь маршрутов через обычный `lazy(() => import())`. После deploy запрос старого файла мог вернуть 404; `Suspense` не обрабатывает error, а ErrorBoundary отсутствовал.
- **Fix Summary:** Добавлены `lazyWithRetry` и глобальная обработка stale-chunk ошибок (`src/lib/recovery.js`): sessionStorage guard разрешает ровно один reload в 30 секунд и логирует подавленные попытки. `ErrorBoundary` вокруг маршрутов восстанавливает stale-chunk через тот же guard, а для любых других React-ошибок логирует событие и выводит доступный fallback с кнопкой обновления. Все восемь lazy-маршрутов переведены на helper; тексты fallback добавлены для AZ/RU/EN.
- **Fix Verification checklist:**
  - [ ] Mobile: сымитировать ошибку stale Vite-чанка → страница обновляется ровно один раз и открывает актуальную версию.
  - [ ] Desktop: повторная ошибка в течение 30 секунд не создаёт reload loop.
  - [ ] Mobile и desktop: обычная React-ошибка показывает локализованную кнопку «Обновить», а не белый экран.
  - [ ] Проверить AZ / RU / EN.
- **Regression History:** NOT VERIFIED (локальная production-сборка успешна; live-проверка требует сценарий со старым чанком).
- **Notes:** ServiceWorker в проекте отсутствует. Ручной reload не зависит от system log и остаётся доступен, если пользователь не авторизован.

## LAV-BUG-017 — После успешного заказа не было автоматического возврата на главную
- **Module:** Checkout / order confirmation
- **Platform:** both
- **Environment:** Production
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (report)
- **Found Date:** 2026-08-02
- **Developer:** Codex
- **QA:** Pending (owner) — Fix Verification
- **Release:** Pre-1.0
- **Description:** Экран подтверждения успешного заказа оставался открытым бессрочно.
- **Steps to Reproduce:**
  1. Успешно оформить заказ.
  2. Не нажимать кнопку продолжения покупок.
- **Expected Result:** На экране показан обратный отсчёт; через 10 секунд происходит переход на главную, а CTA «Продолжить покупки» остаётся мгновенным.
- **Actual Result:** Блок `done` оставался на странице без таймера.
- **Root Cause:** После `setDone(order)` в `CheckoutPage` отсутствовала отложенная навигация.
- **Fix Summary:** Effect, запускаемый только при `done`, создаёт десятисекундный таймер для `navigate('/', { replace: true })` и отдельный секундный счётчик. На карточке показано локализованное сообщение с оставшимися секундами; cleanup отменяет оба таймера при ручном переходе, размонтировании и изменении состояния. Повторный заказ не создаётся.
- **Fix Verification checklist:**
  - [ ] Mobile: успешный заказ → карточка подтверждения показывает 10…0, затем через ~10 секунд главная страница.
  - [ ] Desktop: успешный заказ → тот же обратный отсчёт и переход без повторной отправки заказа.
  - [ ] На карточке нажать «Продолжить покупки» до таймера → немедленный переход в каталог без последующей навигации.
  - [ ] Неуспешный заказ не запускает таймер.
  - [ ] Проверить AZ / RU / EN.
- **Regression History:** NOT VERIFIED (локальная production-сборка успешна; live-заказ не выполнялся).
- **Notes:** CTA и существующий scroll-to-top из LAV-BUG-014/015 не менялись.

## LAV-BUG-018 — Слишком высокий hero: полезный контент появляется поздно (mobile)
- **Module:** Home / Hero (Intro) + структура главной
- **Platform:** mobile (desktop — улучшение, без вреда)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншот, mobile)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** На мобильном hero-блок (акция + крупный заголовок + описание в 3 строки + две кнопки + крупный декоративный логотип бренда + большая showcase-карусель) занимал ~целый экран и больше. Товары и полезные разделы появлялись слишком поздно; на первом экране не было ни промо-зон, ни быстрых категорий, ни товаров.
- **Steps to Reproduce:**
  1. Открыть сайт на ширине ~375–390px.
  2. Оценить, сколько нужно прокрутить до первого товара/категории.
- **Expected Result:** На первом экране помещаются header, поиск, компактная акция/баннер и начало следующего полезного блока; товары и промо появляются раньше.
- **Actual Result:** Первый экран занимал только hero (акция + большой заголовок + длинное описание + две кнопки + большой логотип + крупная карусель).
- **Root Cause:** На мобиле `Intro` стек по вертикали: крупный декоративный логотип `min(260px,72vw)` (дублирует бренд шапки), большой заголовок `clamp(2.45rem,12vw,3.55rem)`, описание в 3 строки, primary-кнопка + вторичная ссылка, showcase-stage + мини-карточка + точки. `.intro-grid` дополнительно тянул `min-height: min(720px, calc(100dvh-74px))`. Полезного контента до конца hero не было.
- **Fix Summary:** (1) Hero компактнее ~в 1,5–2 раза: убран дублирующий крупный мобильный логотип, описание сокращено до 2 строк, оставлена одна основная кнопка + компактная вторичная текстовая ссылка, уменьшены отступы/высота карусели на мобиле. (2) Добавлена переиспользуемая система промо-блоков (`PromoBanner`, `PromoCardGrid`, `HorizontalProductSection`) + конфиг данных `src/data/promos.js` с переводами AZ/RU/EN. (3) Главная пересобрана: hero → компактный промо-баннер → быстрые круглые категории → «Популярные» (гориз. scroll на mobile / сетка на desktop) → две мини-рекламы → «Новинки» (гориз. scroll / сетка) → широкий сезонный баннер → существующие секции. Промо-баннеры на CSS-градиентах бренда (без изображений) — ноль сетевых запросов и ноль layout shift; изображения товаров ниже первого экрана грузятся лениво (существующий `ProductImage`).
- **Fix Verification checklist:**
  - [ ] 320px / 360–390px: на первом экране видны header, поиск, компактный промо-баннер и начало следующего блока; hero не занимает весь экран.
  - [ ] Товары («Популярные») появляются заметно раньше, чем до правки.
  - [ ] Круглые категории и товарные ряды свайпаются по горизонтали на мобиле; нет горизонтального скролла всей страницы.
  - [ ] Desktop: hero не чрезмерно высокий; товарные ряды показываются сеткой, промо складываются в аккуратную композицию (не растянутая мобильная версия).
  - [ ] Нет обрезанного текста, слишком мелких кнопок, наложения на sticky header, скачков секций и больших пустых зон.
  - [ ] AZ / RU / EN во всех новых промо-текстах и заголовках.
  - [ ] Проверить mobile и desktop.
- **Regression History:** NOT VERIFIED (правка в рабочем дереве; `vite build` — см. HANDOFF). Живая проверка на устройствах за владельцем. Полная регрессия не выполняется (политика Fix Verification).
- **Notes:** Затронуты `src/components/Intro.jsx`, `src/pages/HomePage.jsx`, `src/components/PromoBanner.jsx` (new), `src/components/PromoCardGrid.jsx` (new), `src/components/HorizontalProductSection.jsx` (new), `src/data/promos.js` (new), `src/i18n/translations.js`, `src/styles/index.css`. Бизнес-логика корзины/избранного/checkout/авторизации и структура БД не менялись (требование 9). Заодно консолидировано мёртвое дублирующее правило `.section` в `index.css`. Прежнего B-ID не было. **Продолжение:** дальнейшая market-style переработка мобильной главной — см. LAV-BUG-019.

## LAV-BUG-019 — Мобильная главная = рекламный лендинг: hero занимает весь первый экран, товары поздно
- **Module:** Home (Intro / HomePage / структура главной)
- **Platform:** mobile (desktop — сохранить без регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншот mobile + Trendyol UX-референс)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** Даже после LAV-BUG-018 мобильная главная всё ещё открывалась как большой рекламный лендинг: первый экран целиком занимал `Intro` (акция «MÖVSÜM SONU SATIŞI · −40%», крупный serif-заголовок «Zərifliyin yeni ünvanı», описание, кнопка «KATALOQA KEÇ», ссылка «ENDİRİMLƏRƏ BAX», листающиеся фото моделей, mini-card). Товары/разделы не видны без длинной прокрутки. Нужен компактный marketplace-подход (UX Trendyol) в стиле LaVenta.
- **Steps to Reproduce:**
  1. Открыть сайт на ~360–390px.
  2. Оценить, сколько прокрутки до первого товара/раздела.
- **Expected Result:** Первый экран компактный: header + поиск → горизонтальные вкладки разделов → круглые быстрые категории → начало «Populyar məhsullar». Товары видны почти сразу.
- **Actual Result:** Первый экран — только большой hero; товары появлялись поздно.
- **Root Cause:** На мобиле рендерился крупный `Intro` (hero) с большим serif-заголовком, длинным описанием, двумя CTA, листающейся галереей и mini-card; товарные секции шли только после него.
- **Fix Summary:** `Intro` теперь рендерится **только на desktop** (`useMediaQuery('(min-width:901px)')`) — на мобиле hero отсутствует полностью (шкала: нет пустых контейнеров/min-height, hero-изображения на мобиле не загружаются). Новая mobile-first структура главной: header+поиск → `HomeCategoryTabs` (гориз. вкладки разделов, mobile-only, активный пункт с бордовым подчёркиванием) → `Categories` (круглые быстрые категории, первый виден полностью, следующий выглядывает) → «Populyar məhsullar» (`HorizontalProductSection`, гориз. scroll ~2.3 карточки) → `CompactPromoRail` (низкие промо-карточки) → «Yeni gələnlər» → «Endirimlər» (скрыт, если нет товаров со скидкой) → низкий широкий `PromoBanner` → бренд-секции. Desktop: сверху компактный `Intro`, вкладки скрыты, товарные ряды — сеткой 4-в-ряд. Добавлены компактные skeleton-карточки на время загрузки (нет пустого белого экрана и пустых заголовков). Удалён дублирующий `PromoCardGrid` (заменён рэйлом). Serif оставлен только для брендовых заголовков; заголовки товарных секций уменьшены и читаемы.
- **Fix Verification checklist:**
  - [ ] 320 / 360–390px: на первом экране — header, поиск, вкладки разделов, круглые категории и начало «Populyar»; большого hero нет.
  - [ ] Горизонтальные ленты (вкладки, категории, товарные ряды, промо-рэйл) свайпаются; горизонтального скролла всей страницы нет.
  - [ ] «Populyar məhsullar»: видно ~2.5–3 карточки, следующая выглядывает; название ≤2 строк, цена заметна, старая цена/скидка/бейдж «Yeni» — только при наличии; кнопка избранного работает.
  - [ ] Пустая секция «Endirimlər» полностью скрыта; при загрузке — компактные skeleton, не пустой белый экран/заголовок.
  - [ ] Активный пункт вкладок визуально выделен (бордовый акцент); AZ/RU/EN не ломают карточки/вкладки.
  - [ ] Desktop: hero не вернулся в огромном формате, компактный; ряды сеткой; вкладки скрыты; регрессий нет.
  - [ ] Touch targets удобны; sticky-хедер и нижняя навигация не перекрывают контент.
- **Regression History:** NOT VERIFIED live на мобиле (browser-инструмент не эмулирует узкий viewport — `innerWidth` оставался 1536). Проверено: `vite build` — успешно; **desktop live QA** (vite preview) — Intro/вкладки(скрыты)/категории/Populyar(сетка)/промо-рэйл/широкий баннер корректны, `document.scrollWidth ≤ innerWidth` (нет гориз. скролла). Живая мобильная проверка — за владельцем.
- **Notes:** Новые файлы: `src/components/HomeCategoryTabs.jsx`, `src/components/CompactPromoRail.jsx`, `src/data/homeNav.js`, `src/hooks/useMediaQuery.js`. Изменены: `src/pages/HomePage.jsx`, `src/components/HorizontalProductSection.jsx`, `src/components/Categories.jsx`, `src/data/promos.js`, `src/i18n/translations.js`, `src/styles/index.css`. Удалён: `src/components/PromoCardGrid.jsx`. Палитра/логотип/типографика LaVenta и бизнес-логика корзины/избранного/checkout/авторизации/структура БД не менялись. Прежнего B-ID не было. **Продолжение:** финальная marketplace-полировка (круглая лента с меню, 5-й таб Settings) — см. LAV-BUG-020.

## LAV-BUG-020 — Финальная marketplace-полировка мобильной главной (лента категорий + меню, Settings-таб)
- **Module:** Home (Categories rail) / Bottom navigation (TabBar) / Settings (new)
- **Platform:** mobile (desktop — проверить без регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (4 скриншота: текущая LaVenta, Trendyol-референс, целевой макет LaVenta)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Release:** Pre-1.0
- **Description:** По целевому макету (#13) мобильная главная должна ещё ближе повторять UX Trendyol в стиле LaVenta: круглые категории идут сразу под вкладками **без** крупного serif-заголовка «Üslubunuza görə seçin», слева от ленты — кнопка-гамбургер, открывающая список всех категорий; круглые ярлыки Hamısı/Donlar/Bluzalar/Ətəklər/Endirimlər/Yenilər/Parfüm с бейджами (%/YENİ); карточки товара с рейтингом; компактный промо-ряд из 3 карточек с подзаголовками; нижняя навигация из **5** пунктов с новым разделом Settings (шестерёнка).
- **Steps to Reproduce:**
  1. Открыть главную на мобиле; сравнить с макетом #13.
- **Expected Result:** Круглая лента категорий с меню-гамбургером сразу под вкладками (без большого заголовка); бейджи на Endirimlər/Yenilər; рейтинг на карточках; промо-ряд из 3 карт; bottom nav из 5 равных пунктов + Settings.
- **Actual Result:** Над круглыми категориями был крупный serif-заголовок (лишняя высота); не было меню-гамбургера/drawer; bottom nav из 4 пунктов без Settings; карточки без рейтинга.
- **Root Cause:** Предыдущая версия (LAV-BUG-019) не включала меню категорий, Settings-таб и рейтинг в рядах; крупный заголовок категорий занимал место на мобиле.
- **Fix Summary:** (1) `Categories.jsx` переписан в market-ленту: на мобиле заголовок скрыт, слева кнопка-гамбургер открывает **drawer** (bottom sheet) со списком всех категорий (UI; ссылки ведут на реальные фильтры каталога), круглые ярлыки из конфига `quickCategories` (`src/data/homeNav.js`) с иконками и угловыми бейджами (Endirimlər → «%», Yenilər → «YENİ»); на desktop сохранён заголовок + сетка. (2) Нижняя навигация (`TabBar.jsx`) — **5 равных пунктов**: Ana səhifə, Kataloq, Sevimlilər, Səbət, **Ayarlar** (outline-шестерёнка `IconSettings`). (3) Новая страница `SettingsPage.jsx` (`/settings`, lazy) — полный UI: переключатель языка (**рабочий**, i18n), тумблеры уведомлений и пункты «Haqqında/Kömək/Şərtlər/Məxfilik» как UI-заглушки (TODO/stub), ярлыки аккаунта. (4) В товарных рядах включён рейтинг (`showRating`). (5) Промо-ряд — 3 карточки с подзаголовками (`railPromos`, `CompactPromoRail`+subtitle). Новые иконки: `IconSettings/IconLayers/IconPercent/IconSparkle/IconPerfume`.
- **Fix Verification checklist:**
  - [ ] Mobile: под вкладками — круглая лента с гамбургером слева, без большого заголовка; лента свайпается, первый элемент виден, следующий выглядывает.
  - [ ] Тап по гамбургеру открывает drawer со всеми категориями; закрытие по фону/Escape/крестику; ссылки ведут в каталог/фильтры.
  - [ ] Бейджи: Endirimlər → «%», Yenilər → «YENİ».
  - [ ] Карточки товара показывают рейтинг; название ≤2 строк; скидка/бейдж только при наличии; избранное работает; горизонтального скролла всей страницы нет.
  - [ ] Промо-ряд: 3 компактные карточки с подзаголовками.
  - [ ] Bottom nav: 5 равных пунктов, «Ayarlar» с шестерёнкой; активный выделен; `/settings` открывается, язык переключается, остальные пункты — визуально готовые заглушки.
  - [ ] Desktop: заголовок категорий на месте, сетка не сломана, гамбургер/drawer скрыты, bottom nav скрыт (desktop); регрессий нет.
  - [ ] AZ/RU/EN во всех новых текстах.
- **Regression History:** NOT VERIFIED live на мобиле (инструмент не эмулирует узкий viewport). Проверено: `vite build` — успешно (chunk `SettingsPage`); **desktop live QA** (vite preview) — home DOM: 7 вкладок, 7 круглых категорий, гамбургер, бейджи %/YENİ, промо-ряд 3 карты + подзаголовки, 10 рейтингов, drawer с 7 пунктами, bottom nav 5 (Ana səhifə/Kataloq/Sevimlilər/Səbət/Ayarlar), `scrollWidth ≤ innerWidth`; `/settings` рендерится корректно. Живая мобильная проверка — за владельцем.
- **Notes:** Новые файлы: `src/pages/SettingsPage.jsx`. Изменены: `src/components/Categories.jsx`, `src/components/TabBar.jsx`, `src/components/Icons.jsx`, `src/components/HorizontalProductSection.jsx`, `src/components/CompactPromoRail.jsx`, `src/data/homeNav.js`, `src/data/promos.js`, `src/App.jsx`, `src/i18n/translations.js`, `src/styles/index.css`. UI-заглушки (для будущего backend): drawer категорий, страница Settings (кроме языка), Parfüm-категория. Бизнес-логика/структура БД не менялись. Прежнего B-ID не было. **Продолжение:** финальная зачистка первого экрана — см. LAV-BUG-021.

## LAV-BUG-021 — Чистка первого экрана: лишний круг «Hamısı», дублирующие вкладки, дёрганье поиска
- **Module:** Home (Categories rail / HomePage) + Header
- **Platform:** mobile (desktop — без регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (4 скриншота)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** На мобильной главной: (1) рядом с кнопкой-меню стоял отдельный круг «Hamısı» с подписью — визуально дублировал меню; (2) над круглыми категориями оставалась горизонтальная строка текстовых вкладок (Qadın/Donlar/…) — избыточная навигация; (3) при скролле поисковая строка визуально «прыгала» из-за анимации сжатия логотипа в шапке; (4) после удаления двух блоков нельзя оставлять пустоты/скачков — карточки должны подняться выше.
- **Expected Result:** Круглая лента без «Hamısı» (остаётся только круглая кнопка-меню без подписи); текстовых вкладок нет; поиск неподвижен при скролле (без смены ширины/позиции/анимации); первый экран компактный: header → поиск → кнопка-меню → круглые категории → популярные товары.
- **Actual Result:** Был круг «Hamısı», строка вкладок, и логотип сжимался при скролле, из-за чего область поиска дёргалась.
- **Root Cause:** (1) элемент `all` (Hamısı) в `quickCategories`; (2) компонент `HomeCategoryTabs` в `HomePage`; (3) правило `.header.scrolled .brand-logo-image { transform: scale(0.88) }` + transition — сжатие логотипа при скролле.
- **Fix Summary:** (1) Удалён элемент `all` из `quickCategories` (`src/data/homeNav.js`) — круг «Hamısı» пропал; список всех категорий доступен по кнопке-меню (drawer). (2) Удалён `HomeCategoryTabs` (компонент, использование в `HomePage`, CSS `.home-tabs*`, экспорт `homeTabs`). (3) Убрано сжатие логотипа при скролле и его transition — шапка и поиск полностью статичны при прокрутке. (4) Сетка `.cats-row` переведена с жёстких `repeat(7,1fr)` на `grid-auto-flow: column; grid-auto-columns: 1fr` — 6 элементов ровно, без пустого столбца; после удаления блоков пустот/скачков нет, карточки поднимаются выше (мобильный `padding-top` категорий = 16px).
- **Fix Verification checklist:**
  - [ ] Mobile: рядом с меню-кнопкой нет круга/подписи «Hamısı»; «Hamısı» отсутствует на странице.
  - [ ] Нет строки текстовых вкладок; остаётся только круглая лента категорий.
  - [ ] При скролле поиск не смещается, не меняет ширину/позицию, без анимаций.
  - [ ] После удаления блоков нет пустот/лишних отступов; популярные товары выше; горизонтального скролла страницы нет.
  - [ ] Desktop: 6 категорий ровно (без пустого столбца), заголовок категорий на месте, меню-кнопка/вкладки скрыты; регрессий нет.
- **Regression History:** NOT VERIFIED live на мобиле (инструмент не эмулирует узкий viewport). Проверено: `vite build` — успешно; desktop live QA (vite preview) — DOM: `.home-tabs`=0, категории [Donlar,Bluzalar,Ətəklər,Endirimlər,Yenilər,Parfüm] (без «Hamısı»), меню-кнопка есть, «Hamısı» не встречается, `scrollWidth ≤ innerWidth`; desktop-рендер: 6 категорий ровно, бейджи %/YENİ. Живая мобильная проверка — за владельцем.
- **Notes:** Удалён `src/components/HomeCategoryTabs.jsx`. Изменены: `src/pages/HomePage.jsx`, `src/data/homeNav.js`, `src/styles/index.css`. Бизнес-логика/структура БД не менялись. Прежнего B-ID не было. **Продолжение:** финальная полировка первого экрана — см. LAV-BUG-022.

## LAV-BUG-022 — Полировка первого экрана: гамбургер, KOLLEKSİYA, выравнивание, placeholder, иконка Settings
- **Module:** Home (Categories / section head) + Header (search) + Bottom nav icon
- **Platform:** mobile (desktop — без регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (5 скриншотов)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** (1) Первая круглая кнопка в ленте категорий — гамбургер (меню), не нужна. (2) Над «Populyar məhsullar» — лишний eyebrow «KOLLEKSİYA». (3) «Populyar məhsullar» и «HAMISINA BAX →» на разной высоте. (4) Placeholder поиска «Məhsul və ya kod axtar…» двигался (анимация). (5) Иконка Settings в нижней навигации выглядела как «солнце», а не шестерёнка.
- **Expected Result:** Лента категорий без гамбургера (круги выравниваются, без пустот); без «KOLLEKSİYA»; заголовок секции и «HAMISINA BAX» строго на одной линии; placeholder полностью статичен; Settings — современная outline-шестерёнка в размер/толщину остальных иконок.
- **Actual Result:** Был гамбургер, eyebrow «KOLLEKSİYA», рассинхрон заголовка/ссылки, анимированный placeholder-marquee, иконка-«солнце».
- **Root Cause:** (1) кнопка `.cats-menu-btn` + drawer в `Categories.jsx`. (2) eyebrow `collection` в секциях. (3) `.section-head-row { align-items: flex-end }` + eyebrow делал h2 выше → ссылка не по центру. (4) на мобиле нативный placeholder делался прозрачным, а видимый — анимированный оверлей `.search-placeholder-marquee` (`translateX` 7s). (5) `IconSettings` был нарисован как круг с 8 лучами (похож на солнце).
- **Fix Summary:** (1) Из `Categories.jsx` удалены кнопка-гамбургер и drawer (+ их CSS `.cats-menu-btn`/`.cat-drawer*`); лента = только круглые категории (6 шт), swipe работает. (2) Убран eyebrow из всех товарных секций (`HomePage` больше не передаёт `eyebrow`) — «KOLLEKSİYA»/«Yeni» над рядами исчезли. (3) `.hsection-head { align-items: center }` + отсутствие eyebrow → заголовок и «HAMISINA BAX» ровно на одной линии (проверено: центры совпадают, delta=0). (4) Из `Header.jsx` удалён `.search-placeholder-marquee` (+ state `searchFocused`); в CSS убраны прозрачный нативный placeholder и marquee-анимация — теперь статичный нативный placeholder (без сдвигов/анимаций/смены ширины). (5) `IconSettings` заменён на outline-шестерёнку (Lucide gear), 22×22, strokeWidth 1.6 — как у остальных иконок нижней навигации.
- **Fix Verification checklist:**
  - [ ] Mobile: в ленте категорий нет гамбургера; круги выровнены, без пустот; swipe работает; горизонтального скролла страницы нет.
  - [ ] Над «Populyar məhsullar» нет «KOLLEKSİYA».
  - [ ] «Populyar məhsullar» и «HAMISINA BAX →» на одной горизонтальной линии.
  - [ ] Placeholder поиска не двигается: без скачков/смещения/смены ширины/padding/анимаций.
  - [ ] Иконка Settings — outline-шестерёнка, совпадает по размеру/толщине с остальными иконками нижней навигации; логика Settings не изменена.
  - [ ] Desktop: 6 категорий ровно, заголовок категорий на месте, регрессий нет.
- **Regression History:** NOT VERIFIED live на мобиле (инструмент не эмулирует узкий viewport). Проверено: `vite build` — успешно; desktop live QA (vite preview) — DOM: `.cats-menu-btn`=нет, `.cat-drawer-root`=нет, eyebrow в Populyar=нет, «KOLLEKSİYA» не встречается, категории=6, центр заголовка = центр ссылки (delta=0), `scrollWidth ≤ innerWidth`; иконка Settings рендерится как шестерёнка (zoom). Живая мобильная проверка — за владельцем.
- **Notes:** Изменены: `src/components/Categories.jsx`, `src/components/Header.jsx`, `src/components/Icons.jsx`, `src/pages/HomePage.jsx`, `src/styles/index.css`. Логика Settings/каталога/бизнес-логика не менялись. Прежнего B-ID не было.

## LAV-BUG-023 — Mobile header: кнопка «Kataloq» съедает ширину поиска; нет быстрых действий; мелкая Account-иконка
- **Module:** Header (mobile)
- **Platform:** mobile (desktop — без регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншоты + Trendyol-референс)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** (1) Рядом с поиском стояла большая бордовая кнопка «Kataloq», занимавшая полезную ширину строки поиска. (2) В мобильном header не было удобных быстрых действий (Favorites/Cart были только в нижней навигации). (3) Account-иконка была слишком маленькой.
- **Expected Result:** Первая строка header: `[логотип] [Account][Favorites][Cart][Language]` (ровно 4 элемента справа, в этом порядке); вторая строка: широкое поле поиска на всю ширину + кнопка поиска. Иконки Account/Favorites/Cart — единый outline-стиль, одинаковый размер, удобная область нажатия; Account заметнее. На 320px всё помещается без горизонтального скролла.
- **Root Cause:** На мобиле показывалась `.cat-wrap` (кнопка «Kataloq»), а `.header-actions > .header-icon` (Favorites/Cart) были скрыты (`display:none`); Account (`.user-menu > .header-icon`) был мелким (svg 20px), порядок элементов — Language, Account.
- **Fix Summary:** На мобиле (`≤900px`, только CSS): `.cat-wrap` скрыт (каталог доступен через нижнюю навигацию, круглые категории и back-кнопку); поиск `flex: 1 1 100%` — вся ширина 2-й строки; Favorites/Cart снова показаны (`display:inline-flex`); порядок через `order`: Account(1)→Favorites(2)→Cart(3)→Language(4); Account/Favorites/Cart приведены к единым круглым outline-кнопкам 44px (svg 22px, `border` + `--white`), Account-аватар увеличен до 30px; `count-badge` смещён в правый-верхний угол круга (не перекрывает иконку); `lang-select-btn` компактный (min-width 54, height 44). Брейкпоинт `≤360px` дополнительно уменьшает логотип/иконки/язык — все элементы помещаются на 320px без горизонтального скролла. Desktop не тронут (`.cat-wrap`, favorites/cart, dropdown каталога сохранены). Существующая логика Account/Favorites/Cart/Language не менялась.
- **Fix Verification checklist:**
  - [ ] 320/360/375/390: 1-я строка — логотип + 4 иконки (Account, Favorites, Cart, Language) без горизонтального скролла; логотип не обрезан.
  - [ ] 2-я строка — поиск на всю ширину + кнопка поиска; placeholder статичен (см. LAV-BUG-022).
  - [ ] Иконки Account/Favorites/Cart одного размера/стиля; счётчики Favorites/Cart не перекрывают иконку и сохраняют значения.
  - [ ] Переходы Account/Favorites/Cart/Language работают как раньше; язык AZ/RU/EN не ломает layout.
  - [ ] Desktop: кнопка «Kataloq» и её dropdown на месте, регрессий нет.
- **Regression History:** NOT VERIFIED live на мобиле (инструмент не эмулирует узкий viewport). Проверено: `vite build` — успешно; desktop live QA — `.cat-wrap` display:block, favorites/cart display:flex, back-btn none, нет гориз. скролла. Живая мобильная проверка — за владельцем.
- **Notes:** Только CSS (`src/styles/index.css`); JSX header не менялся. Прежнего B-ID не было.

## LAV-BUG-024 — Страница всех товаров: дублирующий заголовок «Hamısı», нет кнопки возврата
- **Module:** Catalog (CatalogPage head)
- **Platform:** mobile (desktop — заголовок сохранён)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншот)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** На странице каталога сверху отдельно отображался большой заголовок «Hamısı», дублирующий активный фильтр (чип «Hamısı» в списке). Также отсутствовала понятная кнопка возврата назад.
- **Expected Result:** На мобиле большой заголовок категории удалён (чип-фильтр «Hamısı» остаётся); слева — минималистичная outline-кнопка возврата `←` (`navigate(-1)` с fallback на главную при прямом входе); фильтры/товары поднимаются выше, без пустого контейнера.
- **Root Cause:** `.catalog-head > .page-title` всегда показывал имя активной категории (дублировал чип); кнопки возврата не было.
- **Fix Summary:** В `CatalogPage.jsx` добавлена `back-btn` (`←`, `IconArrowLeft`) с `goBack`: `location.key && location.key !== 'default' ? navigate(-1) : navigate('/')` (fallback на главную при отсутствии истории; без циклов/двойной навигации). `.page-title` оставлен в разметке (desktop не меняется), но на мобиле скрыт через CSS (`@media(max-width:900px){ .catalog-head .page-title{display:none} .back-btn{display:inline-flex} }`); `.catalog-head` margin уменьшен на мобиле. Логика фильтров/чипов не тронута. i18n: добавлен ключ `back` (AZ «Geri» / RU «Назад» / EN «Back»).
- **Fix Verification checklist:**
  - [ ] Mobile: нет большого заголовка «Hamısı»; чип «Hamısı» и фильтры работают; товары/фильтры подняты выше, пустого контейнера нет.
  - [ ] Кнопка `←`: из внутреннего перехода → назад; при прямом открытии `/catalog` → на главную; без циклов.
  - [ ] Desktop: заголовок категории остаётся, back-кнопка скрыта; регрессий нет.
  - [ ] AZ/RU/EN: подпись/aria «back» локализованы.
- **Regression History:** NOT VERIFIED live на мобиле. Проверено: `vite build` — успешно; desktop live QA — page-title display:block, back-btn display:none. Живая мобильная проверка — за владельцем.
- **Notes:** `src/pages/CatalogPage.jsx`, `src/components/Icons.jsx` (IconArrowLeft), `src/i18n/translations.js`, `src/styles/index.css`. Прежнего B-ID не было.

## LAV-BUG-025 — После долгого отсутствия мобильный браузер восстанавливает устаревший внутренний экран вместо главной
- **Module:** App shell / навигация (inactivity timeout)
- **Platform:** both (в первую очередь mobile Safari/Chrome)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** После закрытия браузера/блокировки телефона мобильный браузер восстанавливал сайт на старом внутреннем экране (подтверждение заказа, корзина, каталог, товар). Нужно: при возврате после ≥30 минут отсутствия открывать главную; при отсутствии <30 минут — оставлять на текущей странице; активную сессию не прерывать.
- **Expected Result:** Отсутствие <30 мин → та же страница; ≥30 мин → при возврате главная; активное использование >30 мин без ухода в background → без редиректа. Корзина, избранное, авторизация, язык, Supabase-сессия сохраняются; во время активного оформления/отправки формы редиректа нет (проверка только при реальном возврате из background).
- **Root Cause:** Не было механизма учёта последней активности и проверки при возврате во вкладку — браузер просто восстанавливал последний URL.
- **Fix Summary:** Новый хук `src/hooks/useInactivityRedirect.js`, подключён в `App`. Хранит `lv_last_activity` в localStorage (throttle — не чаще 1 записи/30с); обновляет метку на смене маршрута и по событиям `pointerdown/keydown/touchstart/click/scroll`. Проверка выполняется при: первичной загрузке (значение метки захватывается на этапе render — до перезаписи эффектом смены маршрута), `visibilitychange` (только когда `visibilityState==='visible'`), `pageshow` (в т.ч. bfcache). Если `now - last ≥ 30 мин` и текущий путь ≠ `/` → `navigate('/', {replace:true})` (без reload); перед навигацией метка обновляется → нет циклов; `redirectingRef` + сравнение пути исключают повторную навигацию и редирект на самой главной. Никакие данные (корзина/избранное/авторизация/язык/сессия) не очищаются — меняется только маршрут.
- **Fix Verification checklist:**
  - [ ] A. Отсутствие 10 мин → та же страница. (проверено: pageshow, остался /catalog)
  - [ ] B. Отсутствие 29 мин → та же страница.
  - [ ] C. Отсутствие ≥30 мин → главная. (проверено: pageshow и полная перезагрузка `/catalog`→`/`)
  - [ ] D. Активное использование >30 мин (метка свежая) → без редиректа. (проверено: recent → остался)
  - [ ] E. Заказ завершён, Safari закрыт, возврат через 31 мин → главная, заказ не переотправляется.
  - [ ] F. Возврат в корзину через 31 мин → главная, товары в корзине сохранены.
  - [ ] G/H. Авторизация и выбранный язык сохраняются.
  - [ ] Первый визит без метки → редиректа нет. (проверено: остался на /catalog?cat=donlar)
  - [ ] Нет цикла редиректов; на `/` редирект не срабатывает; короткое переключение вкладок (visible, метка свежая) не редиректит.
- **Regression History:** Логика проверена в vite preview: A/C/D + boot-редирект + «первый визит без метки» — как ожидалось. `visibilitychange` при видимой вкладке не удалось проверить в автоматизации (авто-вкладка `visibilityState=hidden`), но код требует `visible` (корректно) и подтверждён через `pageshow`. Живая проверка на реальных Safari/Chrome (блокировка телефона) — за владельцем.
- **Notes:** `src/hooks/useInactivityRedirect.js` (new), `src/App.jsx`. TIMEOUT=30 мин, throttle записи=30с. Прежнего B-ID не было.

## LAV-BUG-026 — GitHub Pages деплой падал по таймауту (зависшее окружение из-за cancel-in-progress)
- **Module:** CI/CD (`.github/workflows/deploy.yml`)
- **Platform:** both (deploy)
- **Environment:** GitHub Actions / Production deploy
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (скриншот Actions: #131 cancelled, #132 failure)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Проверено (run #134 — success)
- **Description:** После пуша фичи `ec30e77` деплой не доходил до прода: run #131 (фича) — cancelled, #132/#133 — failure (по ~10 мин). Прод оставался на старой сборке #130 (`1f7734a`).
- **Root Cause:** В workflow `concurrency: cancel-in-progress: true`. Практика «feature-commit + сразу docs-SHA-commit» приводила к тому, что второй пуш отменял run фичи **в середине шага `actions/deploy-pages@v4`**. Прерванный деплой оставлял окружение `github-pages` в «зависшем» состоянии, из-за чего следующие деплои ждали его и падали по 10-минутному таймауту (build/upload при этом успешны — падал только job `deploy`, шаг `actions/deploy-pages@v4`, 11:26→11:36).
- **Fix Summary:** `cancel-in-progress: false` в `.github/workflows/deploy.yml` (рекомендация GitHub для Pages — не прерывать деплой на середине). После фикса run #134 (`5aaa009`) завершился success — прод обновлён (включает `ec30e77`). Дополнительно: практику отдельного «docs: record SHA» коммита сразу после фичи прекращаем (именно она провоцировала гонку отмены) — SHA фиксируем в HANDOFF в том же коммите или без второго пуша.
- **Fix Verification checklist:**
  - [x] `deploy.yml` содержит `cancel-in-progress: false`.
  - [x] Новый run (#134, `5aaa009`) завершается `success` (подтверждено через GitHub API).
  - [ ] Впредь один пуш на задачу — деплой не отменяется в середине.
- **Regression History:** 2026-08-06 — run #134 success (API). #132/#133 — failure (до фикса).
- **Notes:** Логи шагов через `gh`/токен недоступны в среде; диагностика — публичный GitHub API (`/actions/runs`, `/jobs`). Прежнего B-ID не было.

## LAV-BUG-027 — Каталог: после нажатия «назад» остаётся активной выбранная категория (напр. «Donlar»)
- **Module:** Catalog (CatalogPage — выбор категории / история навигации)
- **Platform:** both (в первую очередь mobile — верхняя стрелка «←»)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** REOPENED (2026-08-07) → RE-VERIFIED FIXED (см. Regression History 2026-08-07)
- **Found By:** Owner (скриншоты mobile + текстовое ТЗ)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification (нужны реальные категории Supabase)
- **Description:** Пользователь на каталоге выбирает раздел (напр. `Donlar`), затем жмёт стрелку «←» в левом верхнем углу. Ожидается возврат на предыдущую страницу в общем состоянии, но выбранная категория остаётся активной/восстанавливается — UI, URL и список расходятся с ожиданием.
- **Expected Result:** После «←» состояние выбранной категории корректно сбрасывается (возврат на реальную предыдущую страницу в общем состоянии); при прямой ссылке `/catalog?cat=…` активный фильтр соответствует URL; при refresh UI и список совпадают; повторное открытие каталога не восстанавливает случайный старый фильтр.
- **Root Cause:** Активная категория хранится **только** в URL (`?cat=`) — это корректно, дубля в local state / sessionStorage / context нет. Но `setCat` в `CatalogPage.jsx` вызывал `setParams(next)` без опций, а `useSearchParams().setSearchParams` в react-router по умолчанию делает **PUSH** — каждый выбор категории добавлял запись в history. Поэтому «←» (`navigate(-1)`) не покидал каталог, а шагал назад по накопленным отфильтрованным записям, восстанавливая предыдущую выбранную категорию. То есть «залипание» = восстановление старого фильтра из browser history.
- **Fix Summary:** В `CatalogPage.jsx` `setCat` теперь вызывает `setParams(next, { replace: true })` — выбор категории **заменяет** текущую запись истории вместо добавления новой. Каталог занимает ровно одну history-запись: «←» всегда возвращает на реальную предыдущую страницу в общем состоянии; URL/UI/список не расходятся. Прямые ссылки, refresh и вывод по URL не затронуты (состояние по-прежнему читается из URL; логика фильтрации `visible`/`cat` не менялась). `goBack` (navigate(-1)/fallback `/`) сохранён без изменений.
- **Fix Verification checklist:**
  - [ ] A. Выбрать `Donlar` → «←» → открывается общее состояние (предыдущая страница), `Donlar` не активен.
  - [ ] B. Выбрать `Bluzalar` → «←» → старый фильтр не сохраняется.
  - [ ] C. Прямая ссылка на категорию (`/catalog?cat=<id>`) → активный фильтр соответствует URL.
  - [ ] D. Refresh страницы → UI и список товаров совпадают.
  - [ ] E. Повторно открыть каталог → случайный старый фильтр не восстанавливается.
- **Regression History:**
  - 2026-08-06 — NOT VERIFIED live с реальными категориями (в локальном `vite preview` категории Supabase не подгрузились — 0 чипов); `vite build` — успешно.
  - 2026-08-07 — **REOPENED** владельцем по видео (баг снова виден). Расследование: фикс `replace` уехал в прод только 2026-08-07 (run #139, коммит `c75f136`); видео снято на пред-фиксной проде (`9d68afb`), где правки ещё не было. На текущем коде баг **не воспроизводится**: живой прогон в браузере (dev, реальные категории Supabase: Hamısı/Donlar/Bluzalar/Ətəklər/Şalvarlar/Üst geyim/Trikotaj/Aksesuarlar) — сценарии `кружок Donlar → «←» → Home`, `→ Catalog-таб = Hamısı`, `кружок Yenilər = Hamısı`, переключение чипами с `replace` (history не растёт) — во всех случаях URL/активный чип/список совпадают, старый фильтр не восстанавливается. Дополнительно **hardening**: убран браузерный `history.scrollRestoration='auto'` → `manual` (LAV-BUG-031), чтобы восстановленный скролл не «оживлял» визуально чужую секцию. Вывод: RE-VERIFIED FIXED; недостаточность прошлого фикса не подтвердилась — он просто не был в проде на момент записи видео. `vite build` — успешно.
- **Notes:** `src/pages/CatalogPage.jsx` (`setCat` → `replace`). Связано с [[LAV-BUG-031]] (scroll hardening). Прежнего B-ID не было.

## LAV-BUG-030 — Главная: кнопки «Hamısına bax» несогласованы; «Yeni gələnlər» не открывает свой список
- **Module:** HomePage (товарные секции) + CatalogPage (collection/sort из URL)
- **Platform:** both (в первую очередь mobile)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (видео)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве/проде
- **Description:** У секций главной есть кнопка `Hamısına bax`. `Populyar məhsullar` открывала список, а `Yeni gələnlər` вела себя иначе (визуально «прыжок вверх» по главной вместо открытия списка новых товаров). Разные кнопки имели несогласованную цель.
- **Steps to Reproduce:** Главная → `Yeni gələnlər` → `Hamısına bax`.
- **Expected Result:** Открывается отдельное состояние каталога — список «Yeni gələnlər» (новые товары), единый предсказуемый route-механизм для всех `Hamısına bax`.
- **Actual Result:** `Populyar` и `Yeni gələnlər` вели на **идентичный** `/catalog` (подтверждено в DOM: обе `.section-link` = `/catalog`) — отдельного collection-состояния не было; «прыжок вверх» — проявление LAV-BUG-031 (навигация на тот же URL + сброс скролла).
- **Root Cause:** В `HomePage.jsx` обе секции имели `viewAllTo="/catalog"` — одинаковый URL, каталог не различал коллекции. `CatalogPage` не читал сорт/коллекцию из URL.
- **Fix Summary:** Единый route-паттерн через query-параметр: `Populyar → /catalog?sort=rating`, `Yeni gələnlər → /catalog?sort=new`, `Endirimlər → /catalog?sale=1` (уже было). `CatalogPage` читает `sort` из URL ( initial + `useEffect` на смену `sortParam` без remount), добавлен режим сортировки `new` (по `id` desc = «новые первыми») и опция `sort_new` («Ən yenilər») в оба `<select>`. Круглая категория `Yenilər` синхронно → `/catalog?sort=new`. Категория при этом = `all` (Hamısı), список — все товары в нужном порядке. Ручной выбор сортировки не сбивается (URL `sort` статичен на навигацию).
- **Fix Verification checklist:**
  - [ ] A. `Populyar → Hamısına bax` → `/catalog?sort=rating`, сортировка «Reytinqə görə».
  - [ ] B. `Yeni gələnlər → Hamısına bax` → `/catalog?sort=new`, «Ən yenilər», новые товары первыми, главная не прыгает.
  - [ ] C. `Endirimlər → Hamısına bax` → `/catalog?sale=1`, только со скидкой.
  - [ ] D. Все `Hamısına bax` — реальная route-навигация (не scroll/anchor).
- **Regression History:** 2026-08-07 — live (dev, реальные данные): `Yeni gələnlər view-all` → `/catalog?sort=new`, select=`new`/«Ən yenilər», товары по `id` desc, Hamısı активна; `sort=rating` → select=`rating`; ручная смена сортировки на `price_asc` не откатывается. `vite build` — успешно.
- **Notes:** `src/pages/HomePage.jsx`, `src/pages/CatalogPage.jsx`, `src/data/homeNav.js`, `src/i18n/translations.js`. Прежнего B-ID не было.

## LAV-BUG-031 — Неверная позиция скролла после «назад» (конфликт scroll-restoration)
- **Module:** App (маршрутизация / восстановление скролла)
- **Platform:** both (в первую очередь mobile)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S2
- **Status:** FIXED (live scroll — NOT VERIFIED в инструменте)
- **Found By:** Owner (видео)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — на реальном устройстве
- **Description:** Уход с позиции главной (напр. `Populyar məhsullar`) → каталог → «назад»: главная открывается значительно ниже (около `Yeni gələnlər`) — скролл восстанавливается неправильно.
- **Steps to Reproduce:** Главная в районе Populyar → открыть категорию/секцию → Back.
- **Expected Result:** Возврат примерно в ту же позицию главной; PUSH (новая страница/фильтр) — сверху; POP (назад/вперёд) — сохранённая позиция.
- **Actual Result:** Свой `ScrollToTop` жёстко скроллил в 0 на каждой смене `pathname/search`, а браузерный `history.scrollRestoration='auto'` асинхронно восстанавливал старый offset; на фоне ленивой загрузки товаров и сдвига высоты попадал не в ту секцию.
- **Root Cause:** Двойное неконтролируемое управление скроллом (браузер `auto` + собственный always-to-top), без сохранения позиции по типу навигации.
- **Fix Summary:** В `App.jsx` `ScrollToTop` заменён на `ScrollManager`: `history.scrollRestoration='manual'`; позиция каждого `location.key` сохраняется (throttle через scroll-listener + сохранение в cleanup перед сменой маршрута); на `POP` восстанавливается сохранённая позиция с несколькими `requestAnimationFrame`-повторами (устойчиво к асинхронному росту высоты), на `PUSH/REPLACE` — скролл в 0.
- **Fix Verification checklist:**
  - [ ] A. Главная (проскроллена) → категория → Back → та же позиция главной.
  - [ ] B. Каталог (проскроллен) → товар → Back → позиция каталога.
  - [ ] C. Новая страница/смена фильтра (PUSH) → сверху.
  - [ ] D. Нет «прыжков» вверх/вниз/к другой секции; нет двойного скролла.
- **Regression History:** 2026-08-07 — `vite build` — успешно; логика — стандартный manual scroll-restoration (POP restore / PUSH top). **Live scroll NOT VERIFIED в браузерном инструменте**: в этом webview программный `window.scrollTo` полностью игнорируется (проверено: `scrollTo(0,300)` не меняет `scrollY`), поэтому поведение скролла нельзя воспроизвести автоматизацией. Живая проверка на реальном устройстве (320/360/375/390) — за владельцем.
- **Notes:** `src/App.jsx` (`ScrollManager` + `scrollRestoration='manual'`). Устраняет и визуальный аспект [[LAV-BUG-027]]. Прежнего B-ID не было.

## LAV-BUG-032 — Нестабильный tap по круглым категориям на главной
- **Module:** Categories (круглая лента, mobile)
- **Platform:** mobile
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S2
- **Status:** FIXED (live mobile — NOT VERIFIED в инструменте)
- **Found By:** Owner (видео)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — на реальном устройстве
- **Description:** Тап по круглым категориям (Donlar/Bluzalar/…) иногда не срабатывает с первого раза — приходится жать повторно.
- **Steps to Reproduce:** Mobile → тап по кругу категории; быстрый свайп ленты.
- **Expected Result:** Один tap → одно действие; вся карточка (круг+иконка+подпись) — одна touch-area ≥44px; горизонтальный swipe не конфликтует с tap; свайп не открывает категорию случайно.
- **Actual Result:** На горизонтальном scroll-контейнере `.cats-row` без `touch-action` браузер путал tap с началом pan-свайпа и глотал клик; отсутствие `touch-action: manipulation` давало задержку/двойное срабатывание. (Сама карточка — уже один `<a>`, кликается целиком; «только иконка» — не код-причина.)
- **Root Cause:** Не заданы `touch-action`-подсказки для scroll-ленты и ссылок → неоднозначность tap/pan.
- **Fix Summary:** CSS: `.cats-row { touch-action: pan-x }` (лента только горизонтально пан-ит; вертикаль/tap проходят свободно), `.cat-circle { touch-action: manipulation; -webkit-tap-highlight-color: transparent; width:100%; min-height:44px }` (гарантированный размер touch-area, без 300ms/двойного клика).
- **Fix Verification checklist:**
  - [ ] A. Одиночный tap по кругу открывает категорию с первого раза.
  - [ ] B. Tap по кругу/иконке/подписи — одинаковое действие.
  - [ ] C. Быстрый горизонтальный свайп ленты не открывает категорию.
  - [ ] D. Нет задержки/двойного срабатывания.
- **Regression History:** 2026-08-07 — `vite build` — успешно; DOM: карточка `.cat-circle` — единый `<a>` (клик по любой части = навигация, подтверждено). **Live touch NOT VERIFIED в инструменте** (расширение не эмулирует узкий viewport и реальные touch-жесты). Живая проверка на телефоне — за владельцем.
- **Notes:** `src/styles/index.css` (`.cat-circle`, mobile `.cats-row`). Прежнего B-ID не было.

## LAV-BUG-033 — Каталог: кнопка «←» прижата к верхней границе (mobile)
- **Module:** CatalogPage (mobile layout)
- **Platform:** mobile (desktop не меняется)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED (live mobile — NOT VERIFIED в инструменте)
- **Found By:** Owner (видео)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — на реальном устройстве
- **Description:** Круглая кнопка «←» на `/catalog` визуально упирается в потолок/divider шапки; нужен аккуратный верхний gap.
- **Steps to Reproduce:** Mobile → открыть `/catalog`.
- **Expected Result:** Header ↓ небольшой gap ↓ ← ↓ небольшой gap ↓ Filters; кнопка не касается border, аккуратный отступ слева; без большого пустого блока.
- **Actual Result:** Ритм не задан явно для mobile; на фоне высокой двухрядной мобильной шапки (лого + полноширинный поиск) зазор ощущался тесным. (Замер desktop: gap header→back = 34px.)
- **Root Cause:** Вертикальный ритм мобильного каталога не был выражен явными правилами; `.catalog-mobile-bar` (чипы) — `sticky top:0`, как и `.header`.
- **Fix Summary:** CSS (≤900px): `.catalog-page { padding-top: 24px }` (аккуратный gap под шапкой) + `.catalog-head { margin: 4px 0 14px }` — кнопка «←» в своём ряду, небольшой gap до фильтров, без большого пустого блока. Desktop не тронут.
- **Fix Verification checklist:**
  - [ ] A. `/catalog` на 320/360/375/390 — «←» с нормальным верхним отступом, не касается border.
  - [ ] B. Аккуратный отступ слева; sticky-шапка не перекрывает кнопку.
  - [ ] C. Нет большого пустого блока между шапкой и фильтрами.
- **Regression History:** 2026-08-07 — `vite build` — успешно; замер (desktop, force-visible) — правило применяется. **Live mobile NOT VERIFIED в инструменте** (нет узкого viewport). Живая проверка на телефоне — за владельцем.
- **Notes:** `src/styles/index.css` (≤900px блок). Прежнего B-ID не было.

## LAV-BUG-034 — Главная: круглая категория (Donlar) остаётся визуально «активной» после возврата Back
- **Module:** Categories (круглая лента на главной, mobile/touch)
- **Platform:** mobile (touch)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S2
- **Status:** FIXED (live touch — NOT VERIFIED в инструменте)
- **Found By:** Owner (видео, повторно)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — на реальном устройстве
- **Description:** Главная → «Hamısına bax» → каталог → Back → главная: круглая категория (напр. `Donlar`) остаётся визуально подсвеченной («активной»), хотя пользователь ничего не выбирал.
- **Steps to Reproduce:** Mobile: главная → тап по круглой категории/секции (палец касается круга) → каталог → Back → главная.
- **Expected Result:** После возврата ни один круг не подсвечен без явного выбора; URL/route/список/вид кругов синхронны (у кругов нет состояния выбора вообще).
- **Actual Result:** Круг остаётся с hover-подсветкой (лавандовый фон, подъём, тень).
- **Root Cause:** **Это НЕ состояние `activeCategory`** — у домашних кругов его нет (проверено: в `Categories.jsx`/`homeNav.js` нет `activeCategory`/`classList`/`.active`; круги — простые `<Link>`). Настоящая первопричина — CSS `.cat-circle:hover` (сильная подсветка) **залипает на touch**: тап/касание при свайпе включает `:hover`, который на сенсорных экранах держится до тапа по другому элементу. После client-side Back элемент сохраняет застрявший `:hover` → выглядит «активным». (Это отдельная первопричина от LAV-BUG-027, где речь про чип каталога и историю — там состояние корректно.)
- **Fix Summary:** Hover-визуал круга вынесен в `@media (hover: hover) and (pointer: fine)` — на touch-устройствах `:hover` не возникает вовсе, ничего не залипает. Добавлен кратковременный `:active` отклик (`scale(0.94)`, снимается при отпускании). `:focus-visible` (клавиатура) сохранён. Никакого JS-состояния/подсветки по маршруту не добавлялось — синхронизация полная по построению (нет активного состояния без выбора).
- **Fix Verification checklist:**
  - [ ] A. Главная → «Hamısına bax»/круг → каталог → Back → ни один круг не подсвечен.
  - [ ] B. Тап по `Donlar`/`Bluzalar`/`Ətəklər` → Back → круг не «активен».
  - [ ] C. Свайп ленты (палец скользит по кругам) → ни один не остаётся подсвеченным.
  - [ ] D. Desktop (мышь): hover-подсветка по-прежнему работает при наведении.
- **Regression History:** 2026-08-07 — `vite build` — успешно; проверено в коде: единственный источник «активного» вида — `:hover` (нет JS-состояния). **Live touch NOT VERIFIED в инструменте** (webview рендерит как desktop `hover:hover`, не эмулирует `hover:none`/touch). Живая проверка на телефоне — за владельцем.
- **Notes:** `src/styles/index.css` (`.cat-circle` hover → `@media (hover:hover)` + `:active`). Связано с [[LAV-BUG-027]] (другая первопричина), [[LAV-BUG-032]]. Прежнего B-ID не было.

## LAV-BUG-028 — Mobile header: логотип Elva LaVenta слишком мелкий
- **Module:** Header (mobile) — брендовый логотип
- **Platform:** mobile (desktop — без изменений)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S4
- **Status:** FIXED
- **Found By:** Owner (скриншоты mobile)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification (реальные устройства)
- **Description:** Логотип `Elva LaVenta` в левом верхнем углу mobile-header выглядел как мелкая декоративная иконка, а не как полноценный брендовый элемент.
- **Expected Result:** Логотип заметно крупнее, но не занимает половину header; не обрезан, пропорции сохранены, без деформации; высота header не выросла чрезмерно; три иконки справа помещаются; аккуратно на 320px; используется существующий SVG; чётко на HiDPI.
- **Root Cause:** В мобильных правилах логотип был зажат до `110×44` (в блоке `≤360px` — до `92px`). При viewBox SVG `480×108` (соотношение ~4.44:1) реальная высота глифа при ширине 110px ≈ 25px — визуально мелко.
- **Fix Summary:** SVG `elva-laventa-logo.svg` — вектор, увеличение без потери чёткости на любых DPI. На мобиле (`≤900px`, блок LAV-BUG-023) бокс логотипа увеличен со `110×44` до `166×44` (реальная высота глифа ≈ 37px). Освободившееся место дал перенос языкового переключателя из header (см. LAV-BUG-029). В блоке `≤360px` логотип — `140px` (вместо `92px`), а иконки Account/Favorites/Cart чуть уменьшены (40px), чтобы на 320px всё помещалось без горизонтального скролла. `object-fit: contain` сохраняет пропорции и не обрезает. Desktop-логотип (`210px`) не тронут.
- **Fix Verification checklist:**
  - [ ] 320/360/375/390: логотип заметно крупнее, не обрезан, пропорции сохранены.
  - [ ] Три иконки справа (Account/Favorites/Cart) помещаются, нет горизонтального скролла.
  - [ ] Высота header не выросла чрезмерно; sticky-header стабилен при скролле.
  - [ ] Чёткость на HiDPI (Retina) — логотип не размыт.
- **Regression History:** NOT VERIFIED live на реальных устройствах (инструмент не эмулирует узкий viewport). Проверено: `vite build` — успешно; desktop live QA — логотип 210px, гориз. скролла нет. Живая мобильная проверка — за владельцем.
- **Notes:** Только CSS (`src/styles/index.css`, блоки LAV-BUG-023 и `@media(max-width:360px)`). Прежнего B-ID не было.

## LAV-BUG-029 — Языковой переключатель перегружает верхний header и выглядит неэстетично
- **Module:** Header (mobile) + Settings (место для языка)
- **Platform:** mobile (desktop — inline-переключатель сохранён)
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (скриншоты mobile)
- **Found Date:** 2026-08-06
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification
- **Description:** На мобиле кнопка выбора языка `AZ` стояла в верхнем ряду рядом с Account/Favorites/Cart — композиция выглядела перегруженной и неэстетичной.
- **Expected Result:** Языковой контрол убран из ряда основных иконок; выбор языка перенесён в существующее подходящее место (Settings/Account); рабочая логика AZ/RU/EN полностью сохранена; выбранный язык сохраняется после refresh; header чище; Account/Favorites/Cart равномерно выровнены; пустого места на месте старой кнопки нет.
- **Root Cause:** В `Header.jsx` мобильный языковой дропдаун (`.lang-select`) рендерился внутри `.header-actions` (`order:4`), создавая 4-й элемент в верхнем ряду.
- **Fix Summary:** Мобильный `.lang-select` (дропдаун AZ▾) удалён из `Header.jsx` вместе с неиспользуемым state (`langOpen`, `langRef`, Esc-обработчик). Выбор языка **уже** существует и полностью работает на странице `/settings` (секция «Язык», AZ/RU/EN через тот же `useI18n().setLang`), доступной на мобиле через нижнюю навигацию (`TabBar`, иконка-шестерёнка) — новую логику не писали, i18n не трогали. Язык сохраняется в `localStorage` (`elva_lang`) после refresh — как и раньше. В CSS мобильный `.lang-select` скрыт (`display:none`); верхний ряд теперь `[логотип] … [Account][Favorites][Cart]` (три равных круглых outline-иконки, `margin-left:auto` — пустого места не остаётся). Desktop inline-переключатель `.lang-switch` (три кнопки) сохранён без изменений.
- **Fix Verification checklist:**
  - [ ] Mobile header: в верхнем ряду только логотип + Account/Favorites/Cart, языкового контрола нет; пустого места нет.
  - [ ] Язык доступен: нижняя навигация → Settings (шестерёнка) → секция «Язык»; AZ/RU/EN переключаются.
  - [ ] Выбранный язык сохраняется после refresh (localStorage `elva_lang`).
  - [ ] i18n не сломан: тексты по всему сайту меняются при смене языка.
  - [ ] Desktop: inline-переключатель AZ/RU/EN на месте, регрессий нет.
- **Regression History:** NOT VERIFIED live на мобиле. Проверено: `vite build` — успешно; desktop live QA — `.lang-switch` виден и работает, `.lang-select` в DOM отсутствует, гориз. скролла нет. Живая мобильная проверка (Settings-язык + сохранение) — за владельцем.
- **Notes:** `src/components/Header.jsx` (удалён mobile lang-select + state), `src/styles/index.css` (mobile `.lang-select { display:none }`). Место для языка — существующая `src/pages/SettingsPage.jsx` (не менялась). Прежнего B-ID не было.

## LAV-BUG-035 — Поиск: нет живого поиска, нерелевантные в выдаче, нет блока «похожие»
- **Module:** Search (Header input + CatalogPage + `src/lib/search.js`)
- **Platform:** both (в первую очередь mobile)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (мобильный скриншот + ТЗ)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве
- **Description:** (1) Поиск запускался только по кнопке-лупе/Enter — при вводе «Max» без сабмита каталог оставался полным (выглядело как «нерелевантные товары в выдаче»). (2) Не было явного разделения «точные совпадения» vs «похожие»: при отсутствии совпадений показывался пустой экран, а не блок рекомендаций. (3) Приоритет (featured) в сортировке доминировал над релевантностью.
- **Steps to Reproduce:** Ввести «Max» и не нажимать лупу; ввести запрос без совпадений; ввести код товара.
- **Expected Result:** Поиск во время ввода (debounce); если есть совпадения — только они (без случайных рекомендаций); если нет — отдельный блок «похожие» с явной подписью; релевантность > priority; сброс по X; защита от гонки; фокус/скролл не прыгают; мин. длина 2.
- **Actual Result:** Поиск только по сабмиту; фолбэк-похожих не было (пустой экран); featured мог поднять менее релевантный товар выше более релевантного.
- **Root Cause:** (1) `Header.changeSearch` не инициировал поиск при вводе — навигация только в `submitSearch` (onSubmit лупы/Enter). (2) `CatalogPage` при отсутствии совпадений показывал `empty-state`, без ветки «похожие». (3) Сортировка результатов была `featured desc → score desc` (priority доминировал).
- **Fix Summary:**
  - **Live search (Header.jsx):** debounce ~300ms на `query` → обновляет URL `?q=` (единый источник правды). Поиск полностью клиентский (товары уже в памяти `CatalogContext` — Supabase-запросов на символ нет). Race-safety: trailing-таймер (каждое нажатие отменяет предыдущий → применяется только последнее значение) + sync URL→input под guard'ом фокуса (не перетирает ввод). Лупа/Enter — необязательный ручной submit. Мин. длина `SEARCH_MIN=2`.
  - **matches vs similar (CatalogPage.jsx + search.js):** при `q≥2` считаем `searchScores`; если есть совпадения (score>0) — показываем ТОЛЬКО их; иначе `similarProducts` (мягкий fuzzy + категория/бренд/тег, при пустоте — топ по рейтингу) с явным i18n-заголовком `no_exact_matches` (AZ/RU/EN).
  - **Релевантность > priority:** сортировка результатов `score desc → featured desc → rating desc` — featured лишь тай-брейкер внутри одинаковой релевантности; нерелевантный featured в точные результаты не попадает. Тировка score: имя точн.(1000) > имя-префикс(800) > имя-частично(600) > код(500) > категория/тег/бренд(токены).
  - **X (сброс):** очищает input + `?q=` → возврат к обычному каталогу; старые результаты/похожие не остаются.
  - **UX без прыжков:** `ScrollManager` теперь скроллит вверх только на PUSH; на REPLACE (живой ввод/фильтр) позиция сохраняется. Header persist → input не теряет фокус, клавиатура не закрывается.
- **Fix Verification checklist:**
  - [ ] A. Ввод «Max» без сабмита → только Maxi-товары (не весь каталог).
  - [ ] B. Точное название → этот товар выше.
  - [ ] C. Код товара → найден.
  - [ ] D. Запрос без совпадений → блок «похожие» с подписью «Точных совпадений не найдено…».
  - [ ] E. Быстрый ввод M→Ma→Max → результат для последнего.
  - [ ] F. Ничего не нажимать → поиск сам.
  - [ ] G. X → обычный каталог.
  - [ ] H. Enter/лупа работают, но необязательны.
  - [ ] I. AZ/RU/EN подпись; desktop без регрессий.
- **Regression History:** 2026-08-07 — `vite build` — успешно; **unit-тест движка (node):** min-len, тировка (имя>код>категория), featured тай-брейкер (менее релевантный featured НЕ выше более релевантного), similar fallback — PASSED. **Live end-to-end (dev, реальные данные Supabase):** «Max»→10 релевантных (не 14; Maxi в топе), «2002»→1 (код), «cicekli»→2, «qwxzk»→12 similar+заголовок, «M»(1 симв)→не ищет, X→14 (полный каталог), быстрый ввод→последнее значение, фокус сохранён, scroll 398→398 при доп. вводе (REPLACE не скроллит). Мобильный live (узкий viewport/тач) — за владельцем.
- **Notes:** `src/lib/search.js` (тировка + `similarProducts` + `SEARCH_MIN`), `src/components/Header.jsx` (debounce/X/sync), `src/pages/CatalogPage.jsx` (matches/similar), `src/i18n/translations.js` (`no_exact_matches`), `src/App.jsx` (ScrollManager: REPLACE без скролла), `src/styles/index.css` (`.search-clear`, `.search-similar-note`). Связано с [[LAV-BUG-031]] (ScrollManager), F-007 (базовый умный поиск).

---

## LAV-BUG-036 — При tap на товар главная плавно скроллится вверх перед открытием Product Page
- **Module:** Navigation / ScrollManager (`src/App.jsx`) + глобальный `scroll-behavior`
- **Platform:** both (заметнее на mobile)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (видео поведения главной)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве
- **Description:** При нажатии на карточку товара страница сначала визуально прокручивается вверх (плавная анимация), и только затем открывается Product Page — переход выглядит как «скролл/прыжок перед открытием».
- **Steps to Reproduce:** Прокрутить главную вниз (напр. до «Yeni gələnlər») → tap на карточку товара.
- **Expected Result:** tap → Product Page открывается сразу, без промежуточного видимого скролла/анимации.
- **Actual Result:** Перед открытием товара главная плавно (smooth) уезжает вверх.
- **Root Cause:** Двойная причина. (1) `html { scroll-behavior: smooth }` (глобально в `index.css`). (2) В `ScrollManager` при PUSH использовался `window.scrollTo({ top:0, behavior: 'instant' in window ? 'instant' : 'auto' })`. Проверка `'instant' in window` всегда `false` (нет свойства `window.instant`) → фактически подставлялось `behavior:'auto'`, а `'auto'` подчиняется CSS `scroll-behavior: smooth`. Итог: каждый переход на новую страницу (в т.ч. открытие товара) запускал видимую плавную прокрутку главной вверх.
- **Fix Summary:** В `ScrollManager` scroll-to-top на PUSH переведён на явный `behavior:'instant'` (`window.scrollTo({ top:0, left:0, behavior:'instant' })`) — по спецификации явный `behavior` в опциях перекрывает CSS `scroll-behavior`, поэтому переход мгновенный независимо от `html{scroll-behavior:smooth}`. Глобальный smooth оставлен (для внутренних якорей) — программные переходы теперь его не наследуют.
- **Fix Verification checklist:**
  - [ ] A. Прокрутить главную вниз → tap на товар → Product Page открывается без видимого скролла главной.
  - [ ] B. Открытие товара из «Populyar», «Yeni gələnlər», «Endirimlər» — одинаково без прыжка.
  - [ ] C. Открытие товара из каталога/избранного — без прыжка.
  - [ ] D. Desktop — без регрессий.
- **Regression History:** 2026-08-07 — `vite build` — успешно; в собранном бандле `dist/assets/index-*.js` присутствует `behavior:"instant"` (×2), баговый `'instant' in` отсутствует; исходный `scroll-behavior:smooth` подтверждён. Живой tap-тест на мобильном устройстве — за владельцем (инструмент рендерит desktop-viewport).
- **Notes:** `src/App.jsx` (ScrollManager PUSH + POP-restore → `behavior:'instant'`). Связано с [[LAV-BUG-031]] (scrollRestoration=manual), [[LAV-BUG-035]] (REPLACE без скролла).

---

## LAV-BUG-037 — Mobile: слишком крупные карточки и избыточные вертикальные отступы на главной
- **Module:** HomePage / HorizontalProductSection / ProductCard (`src/styles/index.css`)
- **Platform:** mobile
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (мобильные скриншоты + ТЗ)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве
- **Description:** На мобильной главной карточки товаров слишком крупные (в горизонтальный ряд помещается ~1.9 карточки, не видно, что ряд свайпается), а между секциями (особенно круглые категории → «Populyar məhsullar») слишком большой вертикальный gap — страница ощущается тяжёлой и длинной.
- **Steps to Reproduce:** Открыть главную на телефоне (320–414px) → посмотреть ряд «Populyar məhsullar» и промежуток под категориями.
- **Expected Result:** ~2.4–2.7 карточки в ряду (следующая частично видна справа), компактные секции без пустого экрана, boutique-spacing сохранён; страница не получает горизонтальный скролл.
- **Actual Result:** `.hscroll` карточка `clamp(142px,44vw,168px)` (~165px на 375px → ~1.9 карточки); `.hsection` на mobile `padding-block:34px` + `.hsection-head{margin-bottom:18px}` → большой gap под категориями.
- **Root Cause:** Переразмеренные `grid-auto-columns` в `.hscroll` и завышенные вертикальные `padding-block`/`margin-bottom` секций на мобильной ширине.
- **Fix Summary:**
  - **Карточки компактнее (~23%):** `.hscroll { grid-auto-columns: clamp(112px, 34vw, 150px); gap: 10px }` — даёт 2.44–2.60 карточки на 320/360/375/390/414px, следующая карточка частично видна справа → явный сигнал свайпа. Desktop-ветка (`min-width:901` → `grid-template-columns: repeat(4,1fr)`) не затронута.
  - **Плотность info:** на `≤900px` `.hscroll .product-info` padding 10/12, name 0.9rem, brand 0.64rem, price 0.94rem, add-btn 36px. Имя по-прежнему клампится в 2 строки (`min-height:2.4em`) → одинаковая высота карточек.
  - **Вертикальный ритм:** на `≤640px` `.hsection { padding-block: 20px }` (было 34), `.hsection-head { margin-bottom: 12px }` (было 18), `.promo-strip { margin-top: 16px }`. Gap категории→Popular сократился (cats-section уже `padding-bottom:0`). Boutique-spacing сохранён.
  - Общий reusable-компонент `HorizontalProductSection` не переписывался — секции Popular/Yeni/Endirimlər используют его как раньше; пустые секции скрываются (`null` при `!products.length && !loading`).
- **Fix Verification checklist:**
  - [ ] A. 320/360/375/390px → видно ~2.4–2.7 карточки, следующая частично видна.
  - [ ] B. Горизонтальный свайп ряда плавный; страница НЕ скроллится горизонтально.
  - [ ] C. Gap под круглыми категориями заметно меньше, «Populyar» начинается выше.
  - [ ] D. Имя товара ≤2 строк, карточки одинаковой высоты; цена/бейдж/сердце/бренд читаемы.
  - [ ] E. Круглые категории свайпаются, высота секции не выросла.
  - [ ] F. Bottom Navigation не перекрывает товары.
  - [ ] G. Desktop — без регрессий (сетка 4 колонки прежняя).
- **Regression History:** 2026-08-07 — `vite build` — успешно; расчёт видимых карточек по формуле `clamp(112px,34vw,150px)`/gap 10 для 320–414px → 2.44–2.60 (в целевом диапазоне); на desktop-viewport (инструмент) `document.scrollWidth ≤ innerWidth` (нет горизонтального overflow страницы), desktop hero/сетка без регрессий. Живой мобильный viewport/тач — за владельцем (инструмент рендерит desktop).
- **Notes:** `src/styles/index.css` (`.hscroll` размеры + `≤900`/`≤640` компакт-блоки). Связано с [[LAV-BUG-031]], [[LAV-BUG-033]] (мобильный вертикальный ритм каталога).

---

## LAV-BUG-038 — Mobile HomePage: приведение к утверждённому дизайн-макету (header spacing, категории, бейдж, promo, tabbar)
- **Module:** HomePage (Header/Categories/ProductCard/CompactPromoRail/TabBar + `src/styles/index.css`)
- **Platform:** mobile (desktop — только проверка отсутствия регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (утверждённый мобильный дизайн-макет)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве
- **Description:** Мобильная главная должна максимально совпадать с новым эталонным макетом при сохранении фирменного стиля LaVenta. Точки расхождения: (1) Search выглядел прижатым к верхней панели; (2) лишние вертикальные gap (search→категории, категории→Popular); (3) круглые категории без «дорогого» двойного контура; (4) на карточках и на кружке «Yenilər» был текст «YENİ»; (5) promo-блок был узкой прокручиваемой лентой, а не 2 крупными карточками с иконками; (6) активная вкладка Bottom Nav без выразительного состояния.
- **Steps to Reproduce:** Открыть главную на телефоне (320–412px) и сравнить с макетом: header/search, категории, карточки, promo, нижняя навигация.
- **Expected Result:** Соответствие макету + фирменный стиль (бордово-розовая палитра, светлый фон, мягкие тени, аккуратные скругления, дорогой минимализм); нет горизонтального скролла на 320–412px.
- **Actual Result:** См. Description (расхождения с макетом).
- **Root Cause:** Мобильные значения spacing/badge/promo/tabbar в CSS + текстовые бейджи «YENİ» в разметке не соответствовали новому эталону.
- **Fix Summary:**
  - **Header/Search spacing:** `.header-inner` (≤900px) `padding-block: 8px 12px`, `gap: 12px` (было `6px`/`9px`) — search отделён от верхней панели аккуратным boutique-отступом (не прижат, но и не большой провал).
  - **Убраны лишние gap:** `.cats-section padding-top` 22/16 → **12px** (≤640/≤900) — категории ближе к search; gap категории→Popular уже уменьшен ранее (LAV-BUG-037).
  - **Категории — двойной контур:** `.cat-circle-icon` `box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 4px var(--lavender-mist), 0 6px 16px rgba(...)` — белый круг + тонкая светлая граница + мягкая тень + аккуратный двойной контур. Иконки остаются `--plum`, размеры/подписи прежние.
  - **Бейдж вместо «YENİ»:** в `ProductCard.jsx` текстовый `.product-tag` заменён на `.product-badge` — маленький белый круглый badge с бордово-розовой фирменной искрой (`IconSparkle`), без текста; `aria-label`/`title` = локализованный ярлык (для скринридера). На кружке «Yenilər» текст «YENİ» тоже заменён на искру (`.cat-circle-badge-spark`). Слов NEW/YENİ/HOT/SALE в бейджах больше нет (для скидок остаётся числовой «%»).
  - **Promo-блок (2-up):** `CompactPromoRail`/`.promo-card` — добавлены иконка-розетка (`truck`/`tag`/`sparkle`), обёртка текста (столбик), слабый декоративный круг (`.promo-card-deco`), стрелка по центру справа. На ≤640px `.promo-rail` → `grid` 2 колонки, карточки крупнее (`min-height:104px`, `radius-lg`), 3-я карточка скрыта (`nth-child(n+3)`), как в макете (Pulsuz çatdırılma + Endirimlər). Desktop — прежняя flex-лента из 3 карточек (без регрессий).
  - **Bottom Nav active:** активная вкладка получила мягкую «mist»-таблетку за иконкой (`.tabbar-icon::before`, анимированное появление) + label `font-weight:700` + цвет `--plum`.
  - **Анимации (лёгкие):** tap-обратная связь на `.product-card`/`.product-media img`/`.promo-card` (`:active` scale), плавные переходы; тяжёлых анимаций нет.
- **Fix Verification checklist:**
  - [ ] A. Header: логотип/Account/Favorites/Cart + отдельная строка Search с аккуратным верхним отступом (не прижат).
  - [ ] B. Нет пустых провалов: search→категории и категории→Popular компактны.
  - [ ] C. Категории — белые круги с двойным контуром и мягкой тенью, бордовые иконки, подписи целы.
  - [ ] D. На карточках и на «Yenilər» — искра-бейдж, нигде нет текста «YENİ»/NEW/HOT/SALE.
  - [ ] E. Popular — заголовок + «HAMISINA BAX →», компактные карточки, следующая частично видна.
  - [ ] F. Promo — 2 карточки (светлая «Pulsuz çatdırılma» + яркая «Endirimlər») с иконками, стрелкой и слабым декором.
  - [ ] G. Bottom Nav — активная вкладка выразительна (mist-таблетка + жирный label).
  - [ ] H. 320/360/375/390/412px — нет горизонтального скролла, пустых областей, наложений.
  - [ ] I. Desktop — без регрессий.
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live (Chrome preview): категории с двойным контуром, sparkle-бейджи на карточках (SVG, без текста), promo-карточки с иконками/декором/стрелкой (заголовок+подзаголовок в столбик), `document.scrollWidth ≤ innerWidth` (нет горизонтального overflow), desktop hero/сетка/лента promo без регрессий. Проверено наличие DOM-узлов: `.product-badge`(svg), `.promo-card-icon`×3, `.promo-card-deco`×3, `.cat-circle-badge-spark`(svg); текст бейджей = только «%». Живой мобильный viewport/тач — за владельцем (инструмент рендерит desktop-viewport 1536px, мобильную ширину не эмулирует).
- **Notes:** `src/components/ProductCard.jsx` (sparkle badge), `src/components/Categories.jsx` (sparkle вместо YENİ), `src/components/Icons.jsx` (`IconTruck`/`IconTag`), `src/components/CompactPromoRail.jsx` (иконка/деко/текст-обёртка), `src/data/promos.js` (поле `icon`), `src/styles/index.css` (header spacing, cats double-contour, product-badge, promo 2-up + иконки/деко, tabbar active, tap-анимации). Связано с [[LAV-BUG-037]] (компактные карточки/ритм), [[LAV-BUG-036]] (scroll/jump), [[LAV-BUG-034]] (sticky hover кругов).

---

## LAV-BUG-039 — Product Page mobile: переработка под утверждённый дизайн-макет (галерея, sticky CTA, локализованные badge, удаление турецкого)
- **Module:** ProductPage / Header / TabBar / Icons / i18n (`src/pages/ProductPage.jsx`, `src/components/*`, `src/styles/index.css`)
- **Platform:** mobile (desktop — только проверка отсутствия регрессий)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (утверждённый мобильный дизайн-макет Product Page)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **QA:** Pending (владелец) — Fix Verification на устройстве
- **Description:** Мобильная страница товара должна быть приближена к утверждённому макету (уровень e-commerce Trendyol) при сохранении фирменного стиля LaVenta и всей текущей логики (корзина, избранное, галерея, навигация). Требования: компактный header с Back + поиск + Account/Favorites/Cart; крупная премиум-фотография; carousel (стрелки + swipe); dot-индикатор; thumbnails; Favorite + Share поверх изображения; **ровно два** локализованных badge доставки (без третьего); полное **отсутствие турецкого текста**; sticky bottom purchase bar; sparkle-бейдж новинки вместо текста; блоки без реальных данных — скрывать.
- **Steps to Reproduce:** Открыть `/product/:id` на телефоне (320–412px) и сравнить с макетом.
- **Expected Result:** Соответствие макету + фирменный стиль; вся логика сохранена; нет турецких строк; нет горизонтального скролла; sticky CTA не конфликтует с нижней навигацией.
- **Actual Result (до правки):** десктопная 2-колоночная раскладка на мобиле; текстовый бейдж `product-tag`; нет dot-индикатора/Share/sticky CTA/локализованных badge доставки; hardcoded AZ aria-строки; нижняя навигация могла конфликтовать с зоной покупки.
- **Root Cause:** Product Page не имел мобильного дизайна под новый эталон; часть строк (aria) была захардкожена вне i18n; отсутствовали компоненты галереи (dots), Share и sticky purchase bar.
- **Fix Summary:**
  - **Header (mobile):** на `/product/` логотип заменяется кнопкой **Back** (`navigate(-1)`), поиск и Account/Favorites/Cart сохранены (`Header.jsx` + `.header-product`/`.header-back`). Desktop не изменён (back-кнопка mobile-only).
  - **Галерея:** большое изображение (aspect-ratio 3/4, скругления), стрелки ← →, **swipe** (сохранён, `touch-action: pan-y` — вертикальный скролл страницы свободен), **dot-индикатор** (реальное число фото, активный — фирменный розовый), **thumbnails** (tap переключает, активная выделена, `loading="lazy"`).
  - **Favorite + Share (overlay, mobile):** круглые белые outline-кнопки поверх фото; Favorite — существующая логика; **Share — новый безопасный handler**: `navigator.share` → fallback `clipboard.writeText` + уведомление «ссылка скопирована»; `AbortError`/отмена — тихо.
  - **Два badge доставки:** только `badge_free_delivery` (тёмный) + `badge_ships_fast` (зелёный), локализованные AZ/RU/EN. Третьего badge нет. Турецкие строки макета (KARGO BEDAVA / YARIN KARGODA / SIĞORTAYA UYĞUN) **не перенесены**.
  - **Sparkle-бейдж новинки:** текстовый `product-tag` заменён на `.product-badge` (белый круг + `IconSparkle`), без текста.
  - **Sticky purchase bar (mobile):** fixed внизу — слева цена + «Pulsuz çatdırılma», справа большая кнопка «Səbətə əlavə et» (i18n); desktop использует прежние inline `.detail-actions` (на мобиле скрыты). `TabBar` на `/product` скрыт → нет наложения.
  - **Убран турецкий / i18n:** hardcoded aria («Əvvəlki/Növbəti şəkil», «Məhsul şəkilləri», «Şəkil N») → i18n (`image_prev/next`, `product_images`, `image_word`). Grep по `kargo|bedava|yarın|sepete|sigortaya|ücretsiz|yorum` — 0 совпадений во всём `src`.
  - **Блоки без данных — скрыты (не выдумываем):** activity/просмотры, числовой low-stock («Son N ədəd»), favorite-count («N favoriləyib») — данных нет → не рендерятся. Attributes (Parça/Kəsim/Yaxa/Mövsüm) — рендерятся только при реальных значениях (`product.material/fit/neckline/season` отсутствуют → блок скрыт). Реальные данные: rating/reviews, price/oldPrice, images, brand/name, sizes, colors/variants, `inStock` (boolean → «Stokda yoxdur» при false).
  - **Performance:** main image `eager`+`fetchpriority=high`; thumbnails `loading=lazy`; aspect-ratio → нет layout shift; без повторных запросов.
- **Fix Verification checklist:**
  - [ ] A. Header: Back слева, поиск, Account/Favorites/Cart; логика работает.
  - [ ] B. Крупное фото, скругления, правильный aspect-ratio, без искажения.
  - [ ] C. Стрелки ← → и swipe переключают фото плавно, без скролла всей страницы.
  - [ ] D. Favorite и Share (белые круглые кнопки) поверх фото; Share = Web Share/копия ссылки.
  - [ ] E. Ровно ДВА локализованных badge доставки; турецкого текста нет нигде.
  - [ ] F. Dot-индикатор = числу фото, активный розовый; thumbnails переключают.
  - [ ] G. Заголовок + бренд + rating/reviews (реальные).
  - [ ] H. Sticky «Səbətə əlavə et» внизу: цена + доставка + кнопка; не перекрыт нижней навигацией.
  - [ ] I. Sparkle-бейдж новинки без текста.
  - [ ] J. Блоки без данных (просмотры/остаток-число/фавориты-число/атрибуты) скрыты.
  - [ ] K. 320/360/375/390/412px — нет горизонтального скролла, нет наложений.
  - [ ] L. Desktop Product Page — без регрессий.
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live (Chrome preview, `/product/20`): sparkle-бейдж, dots(3), thumbnails(3), бренд/код/title/rating/цена/цвета/размеры/actions/доставка/related — целы; delivery-badge/`pd-media-actions`/`product-buybar`/`header-back` = `display:none` на desktop (mobile-only), `detail-actions` = flex; нет горизонтального overflow. Grep турецкого = 0. Мобильный live/тач (carousel/swipe/sticky/share/thumbnails) — NOT VERIFIED (инструмент рендерит desktop-viewport 1536px, мобильную ширину не эмулирует — за владельцем).
- **Notes:** `src/pages/ProductPage.jsx` (галерея+overlay+share+attrs+buybar), `src/components/Header.jsx` (back на product), `src/components/TabBar.jsx` (скрыт на product), `src/components/Icons.jsx` (`IconShare`), `src/i18n/translations.js` (share/back/badges/aria/attr labels), `src/styles/index.css` (pd-media-badges/pd-fab/gallery-dots/pd-attrs/product-buybar + mobile media). Связано с [[LAV-BUG-038]] (sparkle-бейдж), [[LAV-BUG-036]] (scroll/jump при открытии товара).

---

## LAV-BUG-040 — Mobile: header товара — Profile/Favorites/Cart переносятся на вторую строку
- **Module:** Header (`src/components/Header.jsx` + `src/styles/index.css`)
- **Platform:** mobile
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** На странице товара `[Back][Logo]` в первой строке, а `[Profile][Favorites][Cart]` переносились на вторую строку. Должно быть: `[Back][Logo] ........ [Profile][Favorites][Cart]` в ОДНОЙ строке, Search — отдельной строкой ниже.
- **Root Cause:** `.header-inner` — `flex-wrap: wrap`. На product-route добавилась кнопка Back (~44px), а логотип на мобиле фиксирован широким (`.header .brand-logo { flex: 0 0 166px }`). Сумма `back + logo(166) + 3 иконки + gap` превышала ширину контента (288px на 320px) → `header-actions` переносились на вторую строку.
- **Fix Summary:** На `.header-product` (mobile): логотип показывается рядом с Back, но **сжимаемый** (`flex: 0 1 auto; min-width:0; max-width:116px`, изображение `max-width:100%; object-fit:contain`), а Back и `header-actions` — **не сжимаются** (`flex:0 0 auto`). Логотип «поглощает» нехватку места → все три в одной строке на 320–430px; Search — отдельной строкой (`flex:1 1 100%`). Селектор `.header.header-product` (0,3,0) перебивает старое `.header .brand-logo{flex:0 0 166px}`. Desktop не затронут (правила в `@media(max-width:900px)`).
- **Regression Checklist:**
  - [ ] 320/360/375/390/412/430px — Back+Logo+Profile/Fav/Cart в одной строке, Search ниже.
  - [ ] Логотип не обрезан некрасиво, тап-таргеты сохранены.
  - [ ] Desktop header — без изменений.
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live — header без регрессий. Мобильная ширина — за владельцем (инструмент рендерит desktop 1536px).
- **Notes:** `src/styles/index.css` (`.header.header-product` mobile), `src/components/Header.jsx` (рендерит `.header-back` на `/product/` из [[LAV-BUG-039]]). Связано с [[LAV-BUG-039]].

---

## LAV-BUG-041 — Product gallery: бесконечная прокрутка (1→2→3→1) вместо ограниченной
- **Module:** ProductPage gallery (`src/pages/ProductPage.jsx`)
- **Platform:** both
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** Фото листались по кругу (`1→2→3→1→2→3`). Нужно `1→2→3` без wrap; на последней Next не работает (Prev работает), на первой Prev не работает (Next работает); стрелки и swipe одинаково.
- **Root Cause:** `switchGalleryImage` использовал modulo-обёртку `(currentIndex + direction + gallery.length) % gallery.length` → циклический переход. Swipe вызывал ту же функцию → тоже зацикливался.
- **Fix Summary:** Ограниченный индекс: `nextIndex = currentIndex + direction; if (nextIndex < 0 || nextIndex >= gallery.length) return`. Границы `atFirst`/`atLast` из `currentIndex`; стрелки `disabled`. Swipe использует ту же ограниченную функцию.
- **Regression Checklist:**
  - [ ] На первой фото Prev не листает (скрыт), Next работает.
  - [ ] На последней фото Next не листает (скрыт), Prev работает.
  - [ ] Swipe не перескакивает last↔first.
  - [ ] Dots/thumbnails синхронны.
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live (`/product/20`, 3 фото): 1-я → prev disabled/next active; последняя → next disabled/prev active; повторный Next на последней НЕ меняет индекс (остаётся 2); dots(3) синхронны. PASSED.
- **Notes:** `src/pages/ProductPage.jsx` (`switchGalleryImage` + `atFirst`/`atLast`). Связано с [[LAV-BUG-042]].

---

## LAV-BUG-042 — Gallery arrows: устаревший стиль, нет disabled-состояний
- **Module:** ProductPage gallery arrows (`src/components/Icons.jsx`, `src/styles/index.css`)
- **Platform:** both
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S4
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** Обновить стрелки поверх фото: аккуратный chevron, белый полупрозрачный круг, тонкий border, лёгкая тень, хороший tap-target; при одном фото — не показывать; на границе — disabled/hidden.
- **Root Cause:** Использовалась полноразмерная стрелка (`IconArrow`) в непрозрачном круге, без состояний границ.
- **Fix Summary:** Новый `IconChevron` (тонкий chevron). `.gallery-nav` — `44px`, `rgba(255,255,255,0.72)` + `backdrop-filter: blur(6px)`, `border 1px solid rgba(255,255,255,0.7)`, мягкая тень, `--plum` icon; `:disabled { opacity:0; pointer-events:none }`. При одном фото блок не рендерится (`gallery.length > 1`).
- **Regression Checklist:**
  - [ ] Одно фото → стрелок нет.
  - [ ] Первая → левая скрыта; последняя → правая скрыта.
  - [ ] Стрелки по краям (chevron), не перекрывают центр.
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live — chevron-стиль, disabled скрывает стрелку на границе. PASSED.
- **Notes:** `src/components/Icons.jsx` (`IconChevron`), `src/styles/index.css` (`.gallery-nav`). Связано с [[LAV-BUG-041]].

---

## LAV-BUG-043 — Search: Product Code находился по частичному совпадению
- **Module:** Search engine (`src/lib/search.js`)
- **Platform:** both
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** Название — частичный поиск (`Qı` находит `Qırmızı Don`); Product Code — только ПОЛНОЕ совпадение (код `LV2381`: `LV`/`LV23` — не находит, `LV2381` — находит).
- **Root Cause:** В `scoreFields` код давал балл за частичное совпадение: `else if (fields.code.includes(rawQueryNorm)) score += 250`.
- **Fix Summary:** Удалена ветка partial для кода — осталось только точное `if (fields.code === rawQueryNorm) score += 500`. Поиск по названию (частичный/префикс/подстрока/опечатка) не изменён.
- **Regression Checklist:**
  - [ ] `Qı` → `Qırmızı Don` найден (name partial).
  - [ ] `LV`, `LV23`, `LV238` → по коду НЕ найден.
  - [ ] `LV2381` (и `lv2381`) → найден.
  - [ ] `2002` → найден, `200` → нет.
- **Regression History:** 2026-08-07 — `vite build` — успешно; **unit-тест движка (node)**: name-partial `Qı`/`qirm` → PASS; code `LV`/`LV23`/`LV238`/`200` → НЕ находит (нейтральный бренд); `LV2381`/`lv2381`/`2002` → находит. Все PASSED. (Примечание: запрос-подстрока бренда, напр. `LV` ⊂ `Elva`, найдёт товар по БРЕНДУ — отдельный существующий partial-поиск бренда, не по коду.)
- **Notes:** `src/lib/search.js` (`scoreFields` — code exact-only). Связано с [[LAV-BUG-035]].

---

## LAV-BUG-044 — Add to cart: при невыбранном размере валидация появлялась внизу страницы (плохой UX)
- **Module:** ProductPage add-to-cart (`src/pages/ProductPage.jsx`, `src/styles/index.css`)
- **Platform:** mobile (в первую очередь)
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** При нажатии «Səbətə əlavə et» без выбора размера визуально «ничего не происходило» — сообщение появлялось внизу (у селектора размеров), вне видимости у sticky-кнопки. Нужно: сообщение рядом со sticky Add-to-cart + подсветка селектора размеров; без alert/confirm/авто-скролла; после выбора размера сообщение исчезает.
- **Root Cause:** Варн (`{warn && <span className="size-warn">}`) рендерился только в поле размеров (вверху контента), а действие инициируется со sticky-бара внизу — пользователь его не видел.
- **Fix Summary:** В sticky `.product-buybar` добавлена строка над кнопкой (`.pd-buybar-warn`, `role="alert"`) при `warn`. Селектор размеров подсвечивается (`.size-options.warn` — красная рамка + короткий shake, отключается при `prefers-reduced-motion`). `warn` сбрасывается при выборе размера → сообщение исчезает. Порядок в `handleAdd` не изменён: сначала проверка входа (гость → auth-модалка), затем размер (для вошедшего) → `setWarn(true)`. Без alert/confirm/scroll.
- **Regression Checklist:**
  - [ ] Вошедший, размер обязателен и не выбран → tap sticky «Add» → сообщение над кнопкой + подсветка размеров, без скролла.
  - [ ] После выбора размера сообщение исчезает.
  - [ ] Размер не обязателен — сообщения нет, товар добавляется.
  - [ ] Гость → tap «Add» → auth-модалка (без изменений).
- **Regression History:** 2026-08-07 — `vite build` — успешно; логика проверена по коду (для гостя live подтверждена auth-модалка). Живой сценарий вошедшего/мобильный — за владельцем.
- **Notes:** `src/pages/ProductPage.jsx` (buybar warn + size-options warn class), `src/styles/index.css` (`.pd-buybar-warn`, `.size-options.warn`). Связано с [[LAV-BUG-039]].

---

## LAV-BUG-045 — Header товара (mobile): перекомпоновка по утверждённому макету — крупный логотип, Back на строке поиска
- **Module:** Header (`src/components/Header.jsx` + `src/styles/index.css`)
- **Platform:** mobile
- **Environment:** Production → Working tree (правка)
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (утверждённый макет)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** Пересмотр компоновки после [[LAV-BUG-040]]: раньше Back стоял в 1-й строке рядом с логотипом, из-за чего логотип пришлось делать маленьким. Требуемая компоновка (2 строки): **1-я строка** — КРУПНЫЙ логотип слева + Profile/Favorites/Cart справа; **2-я строка** — `[←] Back` слева, сразу за ним строка поиска. Поиск укорачивается ТОЛЬКО слева (на ширину Back), правый край и кнопка 🔍 остаются на месте. Не менять: положение Profile/Fav/Cart, кнопку поиска, высоту/дизайн поиска, desktop.
- **Root Cause:** Прошлая компоновка (LAV-BUG-040) держала Back в 1-й строке → логотип сжат до ~116px.
- **Fix Summary:**
  - **Header.jsx:** Back-кнопка убрана из 1-й строки; поиск обёрнут в `.header-search-row`, и Back рендерится ВНУТРИ этой обёртки перед формой поиска (только на product-route). Обёртка на desktop/не-product — `display: contents` (прозрачна) → layout не меняется.
  - **CSS:** `.header-search-row { display: contents }` (база). На `@media(max-width:900px) .header.header-product`: обёртка → `display:flex; order:4; flex:1 1 100%` (собственная 2-я строка); внутри `.search { flex:1 1 auto; min-width:0 }` (укорачивается слева, правый край/🔍 на месте), `.header-back { flex:0 0 auto; display:inline-flex }`. Убраны прежние override-ы сжатия логотипа → логотип использует полный мобильный размер (166px / 140px на ≤360) — крупный, как в макете (+~40% к прежним 116px). 1-я строка = логотип + actions (Back там больше нет).
- **Regression Checklist:**
  - [ ] 320/360/375/390/412/430px — 1-я строка: крупный логотип + Profile/Fav/Cart; 2-я строка: [←] + поиск.
  - [ ] Правый край поиска и кнопка 🔍 не сдвинулись; поиск короче только слева.
  - [ ] Profile/Favorites/Cart на прежних местах; высота/дизайн поиска не изменены.
  - [ ] Back работает (navigate -1).
  - [ ] Desktop header — без изменений (обёртка display:contents, Back скрыт).
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live (`/product/20`): `.header-search-row` display=`contents`, `.header-back` display=`none`, логотип 210px, поиск inline, нет горизонтального overflow — desktop без регрессий. Мобильная ширина — за владельцем (инструмент рендерит desktop 1536px).
- **Notes:** `src/components/Header.jsx` (обёртка `.header-search-row` + Back внутри), `src/styles/index.css` (`.header-search-row` contents/flex, product-mobile правила). Пересматривает компоновку [[LAV-BUG-040]] (та запись — историческая).

---

## LAV-BUG-046 — Product Page (mobile): единый badge «Pulsuz çatdırılma» (2 строки + иконка), убран «Sabah göndərilir»; логотип крупнее
- **Module:** ProductPage badge + Header logo (`src/pages/ProductPage.jsx`, `src/components/Icons.jsx`, `src/styles/index.css`)
- **Platform:** mobile
- **Environment:** Production → Working tree (правка)
- **Priority:** P3
- **Severity:** S4
- **Status:** FIXED
- **Found By:** Owner (референс)
- **Found Date:** 2026-08-07
- **Developer:** Claude Code
- **Description:** На мобильной странице товара поверх фото было две плашки (`Pulsuz çatdırılma` тёмная + `Sabah göndərilir` зелёная). Нужно: удалить зелёную; оставить ОДИН badge доставки — компактный, тёмный, слегка скруглённый, с белой иконкой коробки слева и текстом в ДВЕ строки (`Pulsuz` / `çatdırılma`). Плюс (Task 1, полировка): логотип в header товара заметно крупнее.
- **Root Cause:** N/A (доработка UI под утверждённый референс).
- **Fix Summary:**
  - **Badge:** удалён `pd-badge-ship` (зелёный «Sabah göndərilir») из разметки и CSS. `Pulsuz çatdırılma` переделан в `.pd-badge-free`: тёмный `rgba(42,22,32,0.9)`, `border-radius:12px`, мягкая тень; слева `.pd-badge-icon` (белая коробка — новый `IconBox`, SVG, без библиотек) на полупрозрачном квадрате; текст `.pd-badge-text` — `display:flex; flex-direction:column`, слова из i18n `badge_free_delivery` разбиты по пробелу → 2 строки (работает для AZ/RU/EN, каждое = 2 слова). Остаётся mobile-only (`pd-badge-delivery` → `display:none` на desktop). Позиция — прежний верхний левый угол; галерея/стрелки/избранное/Share/карточка не тронуты.
  - **Logo (Task 1):** на `@media(max-width:900px) .header.header-product` логотип `width: min(184px, 44vw); height:46px` — крупнее, но помещается с Profile/Fav/Cart на всех ширинах 320–430px (Back уже во 2-й строке из [[LAV-BUG-045]]).
- **Regression Checklist:**
  - [ ] Мобильный товар: один badge «Pulsuz / çatdırılma» (2 строки) с иконкой коробки; зелёного «Sabah göndərilir» нет.
  - [ ] Badge не перекрывает лицо модели, не слишком большой; верхний левый угол.
  - [ ] Логотип заметно крупнее; header в 2 строки без горизонтального скролла (320–430px).
  - [ ] Галерея/стрелки/избранное/Share/карточка — без изменений.
  - [ ] Desktop — без изменений (badge `display:none`, logo-правила только в mobile media).
- **Regression History:** 2026-08-07 — `vite build` — успешно; desktop live (`/product/20`): `.pd-badge-free` текст = `["Pulsuz","çatdırılma"]`, иконка есть, `.pd-badge-ship` отсутствует в DOM, badge `display:none` на desktop, нет горизонтального overflow, логотип desktop 210px (не тронут). Мобильная ширина — за владельцем (инструмент рендерит desktop 1536px).
- **Notes:** `src/components/Icons.jsx` (`IconBox`), `src/pages/ProductPage.jsx` (`.pd-badge-free`, убран ship), `src/styles/index.css` (`.pd-badge-free`/`.pd-badge-icon`/`.pd-badge-text`, product-mobile logo `min(184px,44vw)`). Связано с [[LAV-BUG-045]] (header 2 строки), [[LAV-BUG-039]] (badges/overlay). i18n-ключ `badge_ships_fast` больше не используется (оставлен, безвреден).

---

## LAV-BUG-047 — Mobile: тап по карточке товара не открывает её с первого раза (нужно нажимать несколько раз)
- **Module:** ProductCard / горизонтальные ленты HomePage (`src/styles/index.css`)
- **Platform:** mobile (touch)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (повтор поведения, аналогичного [[LAV-BUG-032]])
- **Found Date:** 2026-08-08
- **Developer:** Claude Code
- **Description:** На мобильном по карточке товара приходилось тапать несколько раз, прежде чем открывалась страница товара — как раньше было с круглыми категориями (LAV-BUG-032).
- **Steps to Reproduce:** Мобильный, главная → лента «Populyar məhsullar» / «Yeni gələnlər» → одиночный тап по карточке.
- **Expected Result:** Один тап по любой части карточки → сразу открывается Product Page.
- **Actual Result:** Первый тап «съедался», нужен повторный; тап по бренду/рейтингу/цене вообще не срабатывал.
- **Root Cause:** ДВЕ причины. (1) **То же, что LAV-BUG-032:** горизонтальная лента `.hscroll` (в которой лежат карточки Popular/Yeni/Endirimlər) НЕ имела `touch-action` — браузер путал tap с началом горизонтального pan-свайпа и глотал клик; отсутствие `touch-action: manipulation` давало 300ms задержку двойного тапа. У круглых категорий это уже было исправлено (`.cats-row { touch-action: pan-x }`), а у ленты товаров — нет. (2) **«Мёртвые зоны»:** кликабельны были только фото и название (`<Link>`), а бренд/рейтинг/цена/отступы — нет; тап по ним ничего не делал → ощущение «не открылось».
- **Fix Summary:**
  - `.hscroll { touch-action: pan-x }` — лента пан-ит только горизонтально; вертикальный скролл страницы и tap проходят свободно, клик не глотается (зеркало фикса LAV-BUG-032).
  - `.product-card { touch-action: manipulation; -webkit-tap-highlight-color: transparent }` — мгновенный tap без 300ms/двойного срабатывания, без серой tap-подсветки.
  - **Вся карточка кликабельна (stretched-link):** `.product-card { position: relative }`, `a.product-name::after { position:absolute; inset:0; z-index:1 }` перекрывает всю карточку → тап по любому месту (бренд/рейтинг/цена/отступ) открывает товар. Кнопки «избранное»/«в корзину» подняты выше (`.product-fav`, `.add-btn` → `z-index:2`; их `onClick` уже с `stopPropagation`/`preventDefault`) — работают как раньше, без навигации.
- **Regression Checklist:**
  - [ ] Мобильный: одиночный тап по карточке (в т.ч. по цене/бренду/рейтингу) → сразу Product Page.
  - [ ] Горизонтальный свайп ленты не открывает товар случайно; вертикальный скролл страницы свободен.
  - [ ] Кнопка «избранное» на карточке → toggle/auth-модалка, НЕ навигация.
  - [ ] Кнопка «в корзину» на карточке → добавление/auth-модалка, НЕ навигация.
  - [ ] Desktop — карточки открываются, fav/add работают (без регрессий).
- **Regression History:** 2026-08-08 — `vite build` — успешно; desktop live (Chrome preview): computed `touch-action` — `.hscroll`=`pan-x`, `.product-card`=`manipulation`; клик по ЦЕНЕ карточки (прежняя «мёртвая зона») → навигация на `/product/20`; клик по сердечку избранного → открылась модалка «Hesaba giriş» БЕЗ навигации. PASSED. Живой мобильный touch — за владельцем (инструмент рендерит desktop-viewport 1536px).
- **Notes:** `src/styles/index.css` (`.hscroll` touch-action, `.product-card` touch-action + stretched-link, `a.product-name::after`, z-index кнопок). Тот же класс первопричины, что [[LAV-BUG-032]] (категории). Связано с [[LAV-BUG-037]] (лента карточек), [[LAV-BUG-036]] (переход в товар).

## LAV-BUG-048 — Product Page (mobile): страница не скроллится, если вертикальный свайп начат с фото/галереи («залипание»)
- **Module:** ProductPage — галерея (`src/pages/ProductPage.jsx`, `src/styles/index.css`)
- **Platform:** mobile (touch)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-12
- **Developer:** Claude Code
- **Description:** На мобильном вертикальный свайп прокручивал страницу, только если жест начинался с пустой области. Если тот же свайп начинался прямо с фото товара / области галереи — страница не скроллилась, экран «залипал», приходилось искать пустое место.
- **Steps to Reproduce:** Мобильный, Product Page → начать вертикальный свайп вниз/вверх прямо с середины/низа фотографии товара.
- **Expected Result:** Страница прокручивается независимо от того, где начат вертикальный жест (фото, thumbnails, контент, пустая область). Горизонтальный свайп по фото продолжает листать галерею.
- **Actual Result:** Свайп, начатый с фото/галереи, не прокручивал страницу.
- **Root Cause:** Разделение «вертикаль=скролл / горизонталь=свайп галереи» держалось ИСКЛЮЧИТЕЛЬНО на CSS `touch-action: pan-y` у `.gallery-main`, а JS-обработчики свайпа жест не арбитрировали (никогда не вызывали `preventDefault`). На Chrome/Android `pan-y` вертикальный скролл разрешает (подтверждено на live), но на ряде мобильных браузеров (iOS Safari, встроенные webview Instagram/Telegram — массовые в AZ) значение `pan-y` трактуется слишком строго и блокирует вертикальный скролл над элементом. Пустые области с `touch-action:auto` при этом скроллятся — ровно наблюдаемый симптом. Оверлеев поверх фото нет; активного `preventDefault`/глобальных non-passive touch-слушателей нет; carousel-библиотек нет.
- **Fix Summary:**
  - `.gallery-main { touch-action: manipulation }` (было `pan-y`, в ДВУХ объявлениях) — `manipulation` все мобильные браузеры читают одинаково: вертикальный скролл ВСЕГДА разрешён. Убрана зависимость от «капризного» `pan-y`.
  - Горизонтальный свайп теперь арбитрируется JS: `useEffect` вешает native-слушатели на `.gallery-main` (ref), `touchmove` — **non-passive** (`{ passive:false }`). Направление жеста фиксируется один раз (порог 10px). Вертикальный жест → `preventDefault` НЕ вызывается никогда → нативный скролл страницы свободен. Только **подтверждённый горизонтальный** жест (и при >1 фото) вызывает `preventDefault` (гасит iOS edge-back-swipe/rubber-band) и на `touchend` листает галерею (порог 40px, без wrap на границах).
  - Удалены прежние React-обработчики `onTouchStart/Move/End` (React 18 вешает touchmove как passive → `preventDefault` там невозможен) и `touch` ref; актуальные `gallery.length`/`switchGalleryImage` пробрасываются в native-слушатель через refs.
- **Regression Checklist:**
  - [ ] Мобильный: вертикальный свайп, начатый с СЕРЕДИНЫ фото → страница скроллится.
  - [ ] Мобильный: вертикальный свайп с НИЖНЕЙ части фото → страница скроллится.
  - [ ] Мобильный: вертикальный свайп рядом с badge (не по самой кнопке) → страница скроллится.
  - [ ] Горизонтальный свайп по фото → галерея листает изображение (в пределах границ, без зацикливания).
  - [ ] Диагональный жест с явной вертикалью → побеждает скролл; с явной горизонталью → листает галерею.
  - [ ] Favorite / Share / стрелки галереи / thumbnails / dots — работают по tap.
  - [ ] Sticky Add-to-cart и валидация размера — без регрессий.
  - [ ] Desktop — галерея и hover-tilt без регрессий (touch-события не участвуют).
- **Regression History:** 2026-08-12 — `vite build` — успешно (ProductPage 11.52 kB). Live preview собранного билда (Chrome, `/product/20`, 3 фото), синтетические TouchEvents: computed `touch-action`=`manipulation`; вертикальный жест → `defaultPrevented=false`, индекс фото не меняется; горизонтальный жест влево → `defaultPrevented=true`, фото 0→1; навигация в границах 0→1→2, на границе БЕЗ wrap (остаётся 2), prev 2→1; стрелки (клик 1→2→1) и `.pd-fab` (избранное) кликабельны. Всё PASSED. Живой touch на реальном iPhone/webview — за владельцем (инструмент не эмулирует нативный touch-скролл).
- **Notes:** `src/pages/ProductPage.jsx` (native touch-слушатели в `useEffect`, refs, `ref={galleryRef}`), `src/styles/index.css` (`.gallery-main` × 2 → `touch-action: manipulation`). Родственно [[LAV-BUG-032]]/[[LAV-BUG-047]] (тот же класс проблемы `touch-action` vs скролл/тап), [[LAV-BUG-041]] (та же функция `switchGalleryImage`, границы галереи сохранены).

## LAV-BUG-049 — HomePage (mobile): страница не скроллится вертикально, если свайп начат с карточки/фото/категории в горизонтальных лентах
- **Module:** HomePage — горизонтальные ленты `.hscroll` (Popular/Yeni/Endirimlər) и `.cats-row` (категории) (`src/styles/index.css`)
- **Platform:** mobile (touch)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-12
- **Developer:** Claude Code
- **Description:** На мобильной главной вертикальный свайп прокручивал страницу только с пустых мест. Свайп, начатый с карточки товара, её фото, названия/цены/бейджа или с элемента категории, вертикально НЕ прокручивал — экран «залипал», приходилось искать пустое место.
- **Steps to Reproduce:** Мобильный, главная → поставить палец на фото/тело карточки в ленте «Populyar məhsullar» (или на кружок категории) → свайп вверх/вниз.
- **Expected Result:** Вертикальный жест прокручивает страницу из любой точки лент; горизонтальный жест по ленте по-прежнему листает её; tap открывает товар/категорию.
- **Actual Result:** Вертикальный свайп над лентами блокировался (native page scroll не стартовал).
- **Root Cause:** У горизонтальных лент `.hscroll` и `.cats-row` стояло `touch-action: pan-x` (добавлено в [[LAV-BUG-032]]/[[LAV-BUG-047]] для мгновенного tap). Комментарии в коде ошибочно утверждали, что `pan-x` «пропускает вертикальный скролл» — это неверно: **`pan-x` разрешает браузеру ТОЛЬКО горизонтальный пан и блокирует вертикальный page-scroll**, начатый на элементе. Поскольку `.product-card` (`touch-action: manipulation`) — потомок `.hscroll`, по спецификации эффективный touch-action = **пересечение элемента и предков** = `manipulation ∩ pan-x = pan-x` → вертикаль мертва над ВСЕЙ лентой, включая фото карточек. Именно прошлый «фикс» tap-а и создал этот баг. (Ср.: `.related-grid` на product page `touch-action` не задаёт → `auto` → там вертикаль работала — подтверждение модели.)
- **Fix Summary:**
  - `.hscroll` и `.cats-row`: `touch-action: pan-x` → `touch-action: pan-x pan-y`. Теперь горизонтальный жест панит ленту (pan-x, `overflow-x:auto`), вертикальный — скроллит страницу (pan-y, ближайший y-scrollable предок), а pinch/double-tap-zoom по-прежнему выключены → tap мгновенный и не глотается (выгода LAV-BUG-032/047 сохранена). Пересечение с картой: `manipulation ∩ (pan-x pan-y) = pan-x pan-y` → обе оси разрешены.
  - Никаких JS-изменений, `pointer-events`, `preventDefault` или самодельного скролла — только корректная browser-native модель touch-action.
- **Regression Checklist:**
  - [ ] Мобильный: вертикальный свайп с фото карточки в ленте → страница скроллится (TC1).
  - [ ] Мобильный: вертикальный свайп с текста/цены карточки → страница скроллится (TC2).
  - [ ] Мобильный: вертикальный свайп с кружка категории → страница скроллится.
  - [ ] Горизонтальный свайп по ленте (Popular/Yeni/Endirimlər) и по категориям → лента листается (TC7).
  - [ ] Вертикальный свайп поверх ленты не блокируется (TC8).
  - [ ] Tap по карточке → открывает товар; по категории → фильтр/переход (TC5).
  - [ ] Свайп-скролл с карточки НЕ открывает товар случайно (нативное подавление click после скролла) (TC6).
  - [ ] Favorite/cart на карточке → своё действие, без навигации (TC4).
  - [ ] Desktop — ленты и карточки без регрессий (touch-action на mouse не влияет).
- **Regression History:** 2026-08-12 — `vite build` — успешно. Live preview собранного билда (Chrome): чтение реальных CSSRule — `.hscroll`=`pan-x pan-y`, `.cats-row @(max-width:900px)`=`pan-x pan-y`, `.product-card`=`manipulation`, `.gallery-main`=`manipulation`; ссылка карточки цела (`/product/20`); горизонтальный `overflow-x:auto` не тронут. PASSED (уровень CSS-правил). Живой нативный touch-скролл на реальном iPhone/Android — за владельцем (инструмент не эмулирует нативный touch-скролл, только синтетические события + computed-стили).
- **Notes:** `src/styles/index.css` (`.cats-row` и `.hscroll` → `touch-action: pan-x pan-y`). Прямое следствие [[LAV-BUG-032]]/[[LAV-BUG-047]] (там `pan-x` и был введён). Тот же класс, что [[LAV-BUG-048]] (product-page галерея: `pan-y`→`manipulation`). Product-page галерея уже исправлена в LAV-BUG-048; `.related-grid` в исправлении не нуждался (`auto`).

## LAV-BUG-050 — Out-of-stock товар можно купить: наличие не проверялось ни на фронте (add-to-cart/checkout), ни на сервере (place_order)
- **Module:** E-commerce purchase chain — `src/context/ShopContext.jsx`, `src/pages/ProductPage.jsx`, `src/components/ProductCard.jsx`, `src/pages/CartPage.jsx`, `src/pages/CheckoutPage.jsx`, `src/context/CatalogContext.jsx`, `supabase/order-stock-guard.sql`
- **Platform:** mobile + desktop (бизнес-логика, не зависит от viewport)
- **Environment:** Production → Working tree (правка)
- **Priority:** P0
- **Severity:** S1
- **Status:** FIXED (фронт) / PENDING OWNER (миграция БД `supabase/order-stock-guard.sql`)
- **Found By:** Owner
- **Found Date:** 2026-08-14
- **Developer:** Claude Code
- **Description:** Товар доступен → в админке снимают «Есть в наличии» (`in_stock=false`) → на витрине товар всё ещё можно добавить в корзину и оформить заказ. Симптом (кнопка Add to Cart) оказался вершиной цепочки: наличие не проверялось нигде в purchase-chain.
- **Steps to Reproduce:** Открыть товар → админ снимает «Есть в наличии» → на storefront (refresh или старая вкладка) нажать «В корзину»/«Купить» → оформить заказ.
- **Expected Result:** Товар с `in_stock=false` НЕЛЬЗЯ добавить в корзину и НЕЛЬЗЯ оформить — независимо от страницы, вкладки, кэша и старого React-стейта.
- **Actual Result:** Добавлялся и заказывался по полной цене.
- **Root Cause:** (1) **Сервер** — авторитетный `place_order` (RPC) проверял только `is_active`, серверную цену и размер, но **не проверял `in_stock`**. Это корневая причина: даже при исправлении фронта старая вкладка/кэш/ручная манипуляция localStorage прошли бы оформление. (2) **Фронт** — `addToCart`, `ProductPage.handleAdd/handleBuy`, `ProductCard.quickAdd` не смотрели на `product.inStock`; Cart/Checkout не помечали недоступные позиции и не блокировали переход.
- **Fix Summary:**
  - **Сервер (авторитет):** `supabase/order-stock-guard.sql` — `place_order` дополнен `if v_product.in_stock is not true then raise 'PRODUCT_UNAVAILABLE'`. Всё остальное (любой вошедший, серверная цена, проверка размера, Telegram, очистка корзины) без изменений. Требует запуска владельцем в Supabase SQL Editor.
  - **Единая точка фронта:** `ShopContext.addToCart` резолвит товар через `getProduct` и отклоняет `!product || inStock===false` — все кнопки «добавить» проходят через неё. `setQty` запрещает УВЕЛИЧЕНИЕ кол-ва недоступного товара (уменьшение/удаление — можно).
  - **UI:** ProductPage (кнопки Add/Buy/buybar `disabled` + текст «Нет в наличии»), ProductCard (add-btn `disabled` + notice), CartPage (позиция помечается «Нет в наличии», переход к оформлению блокируется), CheckoutPage (submit `disabled` + блок отправки до сервера с понятным сообщением).
  - **Устаревшие вкладки:** `CatalogContext` — тихая ревалидация каталога по `visibilitychange` (без флага loading), сток/цена обновляются при возврате на вкладку. Цена и так всегда бралась из каталога live (Cart/Checkout не доверяют старой цене) + серверная цена в `place_order`.
- **Regression Checklist:**
  - [ ] E2E-02: `in_stock=false` → ProductPage → Add to Cart заблокирован.
  - [ ] E2E-03: товар открыт доступным → админ off → та же (старая) вкладка → Add to Cart заблокирован (после ревалидации по возврату/сервером).
  - [ ] E2E-04: в корзине → админ off → Cart помечает позицию, Checkout заблокирован.
  - [ ] E2E-05: в избранном → админ off → карточка избранного: add-btn disabled.
  - [ ] E2E-07: товар удалён/`is_active=false` → исчезает из каталога/избранного, `place_order` → PRODUCT_UNAVAILABLE.
  - [ ] E2E-09: старый кэш/стейт → reopen → сервер отклоняет недоступный товар (даже при ручной правке localStorage).
  - [ ] E2E-06: цена изменена в админке → Cart/Checkout показывают текущую, заказ пишет серверную.
  - [ ] Нормальная покупка доступного товара с размером → SUCCESS (без регрессий).
- **Regression History:** 2026-08-14 — `vite build` — успешно (в проекте нет test/lint-скриптов, только build). Серверная миграция и живой прогон E2E на устройстве — за владельцем (после запуска `supabase/order-stock-guard.sql`).
- **Notes:** См. `docs/ECOMMERCE_E2E_QA.md` (постоянная QA-документация purchase-chain). Модель наличия — boolean `in_stock` (без числовых остатков и per-size stock); размер = наличие размера в `products.sizes`. Родственно [[LAV-BUG-047]] (тот же принцип «единая точка проверки» в ShopContext).

## LAV-BUG-051 — Catalog (mobile): выбор сортировки не менял порядок в режиме поиска; `popular` был no-op; message «похожие товары» слишком мелкий
- **Module:** CatalogPage — `result` useMemo (сортировка) + `.search-similar-note` (`src/pages/CatalogPage.jsx`, `src/styles/index.css`)
- **Platform:** mobile (логика сортировки общая; правка UI сообщения — только mobile)
- **Environment:** Production → Working tree (правка)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner
- **Found Date:** 2026-08-14
- **Developer:** Claude Code
- **Description:** (1) На mobile-каталоге выбор сортировки визуально менялся, но порядок карточек не менялся. (2) Сообщение «Dəqiq nəticə tapılmadı. Oxşar məhsullar» на mobile было слишком мелким и легко пропускалось.
- **Steps to Reproduce:** (1) Каталог с активным поиском (частый путь на mobile через хедер) → открыть фильтры → сменить сортировку → порядок не меняется. Также «Populyar» не давала определённого порядка. (2) Ввести partial code без exact match → мелкий message.
- **Expected Result:** Все опции сортировки реально меняют порядок — в каталоге, в результатах поиска и в fallback «похожие товары». Message заметен на mobile.
- **Actual Result:** Сортировка применялась ТОЛЬКО в ветке обычного каталога; в поиске/похожих игнорировалась. `popular` = `default: break` (no-op). Message мелкий.
- **Root Cause:** В `result` useMemo ветка поиска (`query.length >= SEARCH_MIN`) возвращала список, упорядоченный только по релевантности, и не применяла выбранный `sort`. Обычная ветель каталога сортировала корректно, но `case 'popular'` отсутствовал (падал в `default: break`). На mobile контрол сортировки доступен только внутри filter-sheet, поэтому его чаще всего меняют при активном поиске — там, где sort игнорировался → «сортировка не работает».
- **Fix Summary:**
  - Вынесена единая `sortList(list, popularCmp)` (не мутирует state — сортирует копию `[...list]`), применяется во ВСЕХ режимах: каталог, результаты поиска, похожие. `price_asc/price_desc` — цена как NUMBER (`a.price-b.price`), `rating` — `(b.rating||0)-(a.rating||0)`, `discount` — `discountPercent`, `new` — `b.id-a.id` (id последователен = прокси даты; `created_at` во фронт-модель не мапится).
  - `popular` реализован контекстно: каталог → featured-first, затем rating, затем id; поиск → релевантность (`scores`) + featured/rating (сохранён прежний порядок поиска); похожие → порядок `similarProducts` (popularCmp=null).
  - Дефолт сортировки `price_asc` → `popular` (и в reset). Это сохраняет релевантность-по-умолчанию в поиске и делает «Populyar» реальным дефолтом каталога (featured+rating).
  - `.search-similar-note` — mobile-override (`@media (max-width:900px)`): padding 10/14 → 14/18, font-size 0.9→1.02rem, weight 600→700, line-height 1.4, radius 12→14. Фон/цвет сохранены. Desktop-правило не тронуто.
- **Regression Checklist:**
  - [ ] Mobile каталог: price_asc/price_desc/rating/discount/new/popular — порядок реально меняется.
  - [ ] Поиск по названию → сортировка применяется к результатам.
  - [ ] Partial code без exact → похожие показаны, сортировка работает и для них.
  - [ ] Category filter + sort, price filter + sort — работают вместе.
  - [ ] Message на 320–430px читается, не обрезается, без horizontal scroll; карточки не ломаются.
  - [ ] Desktop: сортировка и вид сообщения без регрессий (mobile-override не затрагивает).
  - [ ] Не сломаны: exact code search, partial name search, categories, filters, cart, favorites, i18n AZ/RU/EN.
- **Regression History:** 2026-08-14 — `vite build` — успешно (test/lint-скриптов в проекте нет). Живой прогон на устройстве — за владельцем.
- **Notes:** `src/pages/CatalogPage.jsx` (единая sortList во всех ветках + дефолт `popular`), `src/styles/index.css` (mobile-override `.search-similar-note`). i18n `no_exact_matches` уже был AZ/RU/EN — сохранён.

## LAV-BUG-052 — Mobile: после долгого фона/idle авторизованного покупателя внезапно выбрасывает на главную (тапы по товару «не открывают», checkout уходит на home)
- **Module:** App shell — `AccountHomeRedirect` (`src/App.jsx`)
- **Platform:** mobile (проявляется после background→foreground / tab suspension; логика общая для обеих платформ)
- **Environment:** Production (реальное устройство, авторизованный Google-покупатель)
- **Priority:** P1
- **Severity:** S2
- **Status:** FIXED
- **Found By:** Owner (report)
- **Found Date:** 2026-08-15
- **Developer:** Claude Code
- **Description:** На реальном mobile сайт сначала работает нормально, но через некоторое время / после долгого фона / после background→foreground: тап по карточке товара «не открывает» товар, повторные тапы «ничего не делают», навигация ощущается зависшей, а из checkout/навигации пользователя внезапно кидает на главную. Refresh временно возвращает нормальную работу.
- **Steps to Reproduce (авторизованный покупатель):**
  1. Войти (Google), открыть товар / корзину / checkout.
  2. Свернуть вкладку/браузер или заблокировать телефон надолго (истечение access-token).
  3. Вернуться на вкладку и сразу тапать по карточкам / продолжать checkout.
  4. Наблюдать: вместо открытия товара — возврат на главную; повторные тапы «съедаются» редиректом.
- **Expected Result:** После возврата из фона обновление сессии Supabase (token refresh) не должно менять текущий маршрут. На главную возвращаем ТОЛЬКО при реальной смене аккаунта A→B.
- **Actual Result:** `AccountHomeRedirect` делал `navigate('/', {replace:true})` при любом переходе `previous !== next && next` — включая `null → тот же аккаунт`.
- **Root Cause:** `AuthContext.onAuthStateChange` — единственная точка, задающая `user = session?.user ?? null`. На mobile при возврате из фона Supabase (`autoRefreshToken`) выполняет recovery/refresh; при кратковременном сбое recovery он может отдать `SIGNED_OUT` (user→null), а следом `SIGNED_IN` (user→тот же id). `AccountHomeRedirect` трактовал переход `null → аккаунт` как «смена аккаунта» и форсировал редирект на `/` с `replace:true`. Если это совпадало с тапом по карточке — навигация тапа перетиралась редиректом → «товар не открывается / тапы не работают / из checkout выбросило на home». Refresh чинил, т.к. свежая загрузка инициализировала `previousAccountId` без null-скачка.
- **Fix Summary:** Условие редиректа сужено до РЕАЛЬНОЙ смены аккаунта: редирект только когда `previous` И `next` оба непустые и различаются (`previous && nextAccountId && previous !== nextAccountId`). Переходы `null → аккаунт` (обычный первый вход и token-refresh скачок «выход→вход») больше не вызывают редирект. Сохранено: реальная смена аккаунта A→B по-прежнему уводит на главную; `previousAccountId` продолжает трекаться на каждом изменении. Изменён только `src/App.jsx` (одно условие + комментарий). Новых зависимостей нет, бизнес-логика auth/cart/checkout не менялась.
- **Fix Verification checklist:**
  - [x] `vite build` — успешно.
  - [x] Playwright (guest, эмуляция): 10+ циклов `home→product→back` на собранном бандле — товар открывается 10/10, 0 редиректов на `/`.
  - [x] Playwright (guest, эмуляция): 5+ циклов `visibilitychange hidden→visible` + `pageshow` на странице товара — маршрут не меняется, редиректов нет, зависших overlay нет.
  - [ ] **Real device (за владельцем):** авторизованный покупатель, реальное Android/iOS tab suspension → возврат из фона → тап по товару открывает товар; checkout не уходит на home. Playwright НЕ воспроизводит настоящий OS-suspend и авторизованную Supabase-сессию.
- **Regression History:** 2026-08-15 — `vite build` успешно; guest-регрессия через playwright-mobile (эмуляция) — зелёная. Авторизованный resume-путь — NOT VERIFIED на реальном устройстве (за владельцем).
- **Notes:** Root cause найден аудитом кода (Phases 3–5): auth/redirect-путь требует авторизованной сессии, которую Playwright без Google-логина воспроизвести не может, поэтому фикс подтверждён логикой + build + guest-регрессией, а финальное подтверждение — на реальном телефоне. Смежное наблюдение (НЕ входит в scope этой правки): при том же null-скачке `ShopContext` кратковременно опустошает корзину — теоретически может дать `checkout → /cart`; после устранения источника (home-редирект) основной симптом закрыт, но при повторении на устройстве стоит проверить и это.

## LAV-BUG-053 — Product Page: одноцветный товар показывал несколько «выбираемых» цветов (декоративная палитра ткани отображалась как color-варианты)
- **Module:** ProductPage — блок «RƏNG» (`src/pages/ProductPage.jsx`)
- **Platform:** both (UI scope Phase 1 — mobile)
- **Environment:** Production
- **Priority:** P2
- **Severity:** S3
- **Status:** FIXED
- **Found By:** Owner (screenshot)
- **Found Date:** 2026-08-15
- **Developer:** Claude Code
- **Description:** Товар с одним реальным цветом (напр. 2001 «Çiçəkli Maxi Don») на Product Page показывал 4 цветовых кружка, будто он доступен в других цветах.
- **Steps to Reproduce:** Открыть товар без реальных цвет-вариантов (один код, `color_name` пуст) → под «RƏNG» отображалось несколько кружков.
- **Expected Result:** Число color-опций = числу реальных цветов товара. 1 цвет → 1 опция; N вариантов → N; фиктивные цвета не создаются.
- **Actual Result:** Ветка `product.colors?.length` рендерила ВСЮ декоративную палитру `colors` (hex-набор цвета ткани для gradient-плейсхолдера в `ProductImage`) как отдельные «выбираемые» цвета.
- **Root Cause:** `product.colors` — это декоративная палитра (используется в `ProductImage` как gradient fallback), а НЕ отдельные покупаемые цвета. Реальные цвет-варианты моделируются как отдельные строки с общим `code` и `color_name` (`product.variants`, группируются в `CatalogContext.groupVariants`). Для одноцветного товара `variants.length<=1`, и UI ошибочно падал в ветку `colors`, рисуя всю палитру.
- **Fix Summary:** В ProductPage color-селектор теперь строго по реальным данным: `variants.length>1` → реальные варианты (без изменений); иначе → ровно ОДИН swatch реального цвета товара (`product.colorHex || product.colors?.[0]`); если цвета нет — блок не показывается. Декоративная палитра `colors` больше не рендерится как несколько color-опций (поле сохранено — оно используется `ProductImage`). Свотчи и раньше были display-only (не влияют на корзину/размер), поэтому selection/Add-to-Cart не затронуты.
- **Fix Verification checklist:**
  - [x] Playwright (эмуляция, собранный бандл): товар 2001 (один цвет) → 1 swatch (`#f7b7d2`), variantDots 0.
  - [x] Playwright: товар 2006 (реальные варианты «Narıncı»/«Bej») → 2 variant-dots.
  - [x] `vite build` — успешно; console без ошибок.
  - [ ] Desktop-вид цветов — не менялся логически; owner может подтвердить визуально.
- **Regression History:** 2026-08-15 — `vite build` успешно; проверка через playwright-mobile — зелёная.
- **Notes:** Часть Phase 1 (F-009). Связано с F-003/D-002 (реальные цвет-варианты). Работает вместе с Realtime (D-006): при удалении/добавлении цвета админом storefront обновляется без ручного refresh.
