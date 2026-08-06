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
- **Notes:** Новые файлы: `src/pages/SettingsPage.jsx`. Изменены: `src/components/Categories.jsx`, `src/components/TabBar.jsx`, `src/components/Icons.jsx`, `src/components/HorizontalProductSection.jsx`, `src/components/CompactPromoRail.jsx`, `src/data/homeNav.js`, `src/data/promos.js`, `src/App.jsx`, `src/i18n/translations.js`, `src/styles/index.css`. UI-заглушки (для будущего backend): drawer категорий, страница Settings (кроме языка), Parfüm-категория. Бизнес-логика/структура БД не менялись. Прежнего B-ID не было.
