# LaVenta — Handoff

## Current Status

Мобильный пакет фиксов каталога/навигации (BAG1–BAG6 из ТЗ владельца → LAV-BUG-027 REOPENED + LAV-BUG-030/031/032/033). Изменения в рабочем дереве, `vite build` — успешно; часть проверок сделана вживую в браузере (dev), часть недоступна в инструменте (см. ниже). Desktop не переделывался (проверялся на отсутствие регрессий; тесты шли на desktop-viewport). Готово к commit → push → deploy.

**Важно про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой первого из-за гонки `cancel-in-progress` — см. LAV-BUG-026). Предыдущий прод-деплой `c75f136` успешно уехал 2026-08-07 (run #139).

## Current Branch

`main`

## Last Completed Task

### Каталог/навигация: категория, tap кругов, scroll-restore, унификация «Hamısına bax», отступ «←»

- **LAV-BUG-027 (REOPENED → RE-VERIFIED FIXED):** «Donlar остаётся активной после Back». Первопричина категории — только URL (`?cat=`), «Hamısı» есть первым чипом. Живой прогон (dev, реальные категории Supabase) показал: на **текущем** коде баг не воспроизводится — фикс `setCat`→`replace` держится. Видео снято на пред-фиксной проде (`9d68afb`); фикс уехал в прод только 2026-08-07 (run #139, `c75f136`). Доп. hardening — `scrollRestoration='manual'` (см. 031).
- **LAV-BUG-030 (Hamısına bax несогласованы; Yeni gələnlər неверно):** `Populyar` и `Yeni gələnlər` вели на идентичный `/catalog`. Введён единый route-паттерн: `Populyar→?sort=rating`, `Yeni gələnlər→?sort=new`, `Endirimlər→?sale=1`. `CatalogPage` читает `sort` из URL, добавлен режим `new` (id desc) + опция `sort_new`. Круг `Yenilər`→`?sort=new`.
- **LAV-BUG-031 (scroll после Back):** `ScrollToTop` заменён на `ScrollManager` (manual restoration: POP→сохранённая позиция с rAF-повторами, PUSH/REPLACE→верх). Убран браузерный `auto`.
- **LAV-BUG-032 (нестабильный tap кругов):** `touch-action: pan-x` на ленте `.cats-row`, `touch-action: manipulation` + `min-height:44px` + `width:100%` на `.cat-circle`.
- **LAV-BUG-033 (кнопка «←» прижата к верху):** mobile `.catalog-page{padding-top:24px}` + `.catalog-head{margin:4px 0 14px}`.

## Last Verified Checks

- `npm run build` — **успешно** (`✓ built in ~3s`, 129 модулей).
- **Live (dev, desktop-viewport, реальные категории Supabase):**
  - LAV-BUG-030: `Yeni gələnlər view-all` → `/catalog?sort=new`, select=`new`/«Ən yenilər», товары по `id` desc, `Hamısı` активна; `Populyar` → `/catalog?sort=rating`; ручная смена сортировки на `price_asc` не откатывается моим `useEffect`.
  - LAV-BUG-027: `кружок Donlar → «←» → Home`, `Catalog-таб = Hamısı`, `кружок Yenilər → /catalog?sort=new` — URL/активный чип/список совпадают, старый фильтр не восстанавливается.
- **NOT VERIFIED в инструменте (за владельцем, на реальном устройстве 320/360/375/390):**
  - LAV-BUG-031 (scroll): в этом webview **программный `window.scrollTo` игнорируется** (`scrollTo(0,300)` не меняет `scrollY`) — поведение скролла нельзя воспроизвести автоматизацией; проверено сборкой + код-ревью.
  - LAV-BUG-032 (touch) и LAV-BUG-033 (layout): расширение не эмулирует узкий mobile-viewport/тач-жесты.

## Current Architecture Notes

- Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), деплой GitHub Pages (`.github/workflows/deploy.yml`, `push:[main]` + `workflow_dispatch`, `cancel-in-progress: false`).
- Категория каталога — источник истины только URL (`?cat=`); выбор чипом `replace`-ит запись истории. Секции главной («Hamısına bax») и коллекции — единый route-паттерн: `?sort=rating|new`, `?sale=1`. `CatalogPage` читает `sort` из URL (initial + `useEffect` на смену `sortParam`); режимы сортировки: popular/price_asc/price_desc/rating/discount/**new**(id desc).
- Скролл: `App.jsx` → `ScrollManager` (`history.scrollRestoration='manual'`; POP восстанавливает сохранённую позицию по `location.key`, PUSH/REPLACE → верх). Заменил прежний `ScrollToTop`.
- Круглые категории `Categories.jsx` — каждый `<a class="cat-circle">` целиком кликаем; mobile-лента `.cats-row` = `touch-action: pan-x`, карточки `touch-action: manipulation`.
- Inactivity: `src/hooks/useInactivityRedirect.js` (30 мин), подключён в `App`.

## Known Issues

Нет новых подтверждённых багов. LAV-BUG-018…033 — FIXED/RE-VERIFIED (живая Fix Verification на реальных устройствах/проде для 031/032/033 — за владельцем).

## Risks

- LAV-BUG-031/032/033 не проверены вживую в инструменте (ограничения webview: нет программного скролла, нет узкого viewport/тач). Риск умеренный: правки локальные и стандартные (manual scroll-restoration, `touch-action`, отступы).
- `ScrollManager` меняет глобальное поведение скролла на всех маршрутах — при регрессе проверить прежде всего Checkout/Product/Cart (там были свои `scrollTo`).

## Next Recommended Step

Владельцу — Fix Verification на реальном телефоне (320/360/375/390, Safari/Chrome):
- **031:** Главная (проскроллена) → категория → Back → та же позиция; каталог → товар → Back → позиция каталога; PUSH → сверху.
- **032:** одиночный tap по кругу срабатывает с первого раза; быстрый свайп ленты не открывает категорию; tap по кругу/иконке/подписи — одинаково.
- **033:** «←» на `/catalog` — аккуратный верхний отступ, не касается border, без пустого блока.
- **027/030:** Donlar→«←»→Home→Catalog=Hamısı; каждая «Hamısına bax» открывает свой список.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260807-133041

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout через WhatsApp, admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** мобильный пакет фиксов каталога/навигации в рабочем дереве, `vite build` успешен; часть проверок вживую (dev) пройдена, scroll/touch/layout — за владельцем на устройстве. После коммита дерево будет чистым.
4. **Что реализовано:** категория каталога строго из URL (`?cat=`, выбор чипом = `replace`); единый route-паттерн для секций главной «Hamısına bax» (`?sort=rating` Populyar, `?sort=new` Yeni gələnlər, `?sale=1` Endirimlər); `CatalogPage` читает `sort` из URL + режим `new` (id desc) + опция «Ən yenilər»; `ScrollManager` с `scrollRestoration='manual'` (POP восстанавливает позицию, PUSH → верх); круглые категории — единая touch-area (`touch-action` pan-x/manipulation, min 44px); аккуратный верхний отступ кнопки «←» на mobile; авто-возврат на главную после ≥30 мин; нижняя навигация 5 пунктов; язык на `/settings` + desktop inline.
5. **Последняя задача:** LAV-BUG-027 REOPENED→RE-VERIFIED (категория не залипает — фикс держится, видео было на пред-фиксной проде), LAV-BUG-030 (унификация «Hamısına bax» + Yeni gələnlər→`?sort=new`), LAV-BUG-031 (ScrollManager manual restoration), LAV-BUG-032 (touch-action кругов), LAV-BUG-033 (отступ «←»).
6. **Изменённые файлы:** `src/App.jsx` (ScrollManager + scrollRestoration manual), `src/pages/HomePage.jsx` (viewAllTo sort=rating/new), `src/pages/CatalogPage.jsx` (sort из URL + режим new + опция + sync effect), `src/data/homeNav.js` (Yenilər → ?sort=new), `src/i18n/translations.js` (`sort_new`), `src/styles/index.css` (`.cat-circle`/`.cats-row` touch-action, mobile `.catalog-page`/`.catalog-head` отступы), `docs/BUGS.md`, `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно. Live (dev): LAV-BUG-030 и LAV-BUG-027 подтверждены. LAV-BUG-031/032/033 — NOT VERIFIED в инструменте (webview: нет программного скролла, нет узкого viewport/тач); проверка на устройстве — за владельцем.
8. **Ограничения:** не менять бизнес-логику поиска/фильтров/карточек/корзины/избранного/авторизации/checkout/БД/нижней навигации/Settings; не трогать header/увеличенный логотип/Account/Favorites/Cart/Language location/Search/inactivity 30 мин/остальные секции главной/desktop UI; не откатывать рабочую функциональность; сохранять палитру/логотип/типографику; i18n AZ/RU/EN (не хардкодить); один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `START.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`.
10. **Что осталось:** Fix Verification LAV-BUG-027/030/031/032/033 (владелец, реальные устройства + прод); опционально — вычистить мёртвую CSS `.lang-select*`; backend к UI-заглушкам (Settings).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`, затем взять задачу владельца.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости остальные `docs/`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-027(REOPENED→re-verified)/030/031/032/033 — каталог/навигация mobile (завершено в рабочем дереве; commit/push/deploy — следующий шаг)
Expected modified files:
  - src/App.jsx
  - src/pages/HomePage.jsx
  - src/pages/CatalogPage.jsx
  - src/data/homeNav.js
  - src/i18n/translations.js
  - src/styles/index.css
  - docs/BUGS.md
  - docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи; прод-деплой run #139 = c75f136 (success, 2026-08-07)
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-07
Last verified tests: нет test-скриптов; live (dev) — LAV-BUG-030/027 PASSED; LAV-BUG-031/032/033 — NOT VERIFIED в инструменте (webview: нет программного скролла/узкого viewport)
Recovery confidence: MEDIUM
```
