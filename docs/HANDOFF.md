# LaVenta — Handoff

## Current Status

**Компактная мобильная главная (Trendyol-плотность) + фикс scroll/jump перед Product Page.** Mobile-first задача: карточки меньше (~2.4–2.7 в ряду), меньше вертикальных отступов, устранён видимый плавный скролл главной перед открытием товара. Код в рабочем дереве, `vite build` — успешно. Готово к commit → push → deploy.

**Что нового (LAV-BUG-036, LAV-BUG-037):**
- **LAV-BUG-036 (scroll/jump):** корневая причина — `html{scroll-behavior:smooth}` + баг в `ScrollManager`: `'instant' in window` всегда `false` → `behavior:'auto'` наследовал CSS smooth → каждый PUSH-переход плавно уводил главную вверх. Фикс: явный `behavior:'instant'` в PUSH scroll-to-top и в POP-restore.
- **LAV-BUG-037 (компактность mobile):** `.hscroll` карточка `clamp(112px,34vw,150px)`, gap 10px → 2.44–2.60 карточки на 320–414px, следующая частично видна. Секции плотнее: `.hsection padding-block:20px`, `.hsection-head margin-bottom:12px`, `.promo-strip margin-top:16px` (≤640px). Info карточки уплотнён (≤900px). Desktop-сетка (repeat(4)) не тронута.

> ⚠️ **Действие владельца по F-007 остаётся (не связано с этой задачей):** выполнить `supabase/product-featured.sql` (колонка `is_featured`) — до этого приоритет не действует, но всё работает (read→false, graceful degrade).

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026, `cancel-in-progress`).

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-036 + LAV-BUG-037 — компактная mobile-главная + фикс scroll/jump

- **Scroll/jump перед товаром (LAV-BUG-036):** `src/App.jsx` `ScrollManager` — PUSH scroll-to-top переведён на `window.scrollTo({top:0,left:0,behavior:'instant'})` (явный `instant` перекрывает CSS `scroll-behavior:smooth`); POP-restore тоже `behavior:'instant'` (чтобы восстановление позиции не «плыло» smooth-анимацией). Глобальный `html{scroll-behavior:smooth}` оставлен для внутренних якорей.
- **Карточки компактнее (LAV-BUG-037):** `src/styles/index.css` — `.hscroll{grid-auto-columns:clamp(112px,34vw,150px);gap:10px}` (было `clamp(142px,44vw,168px)`/12). ~23% меньше на 375px. На `≤900px` уплотнён `.hscroll .product-info` (padding 10/12, name 0.9rem, brand 0.64rem, price 0.94rem, add-btn 36px). Имя клампится в 2 строки (`min-height:2.4em` из существующего `≤640` правила) → одинаковая высота.
- **Вертикальная плотность (LAV-BUG-037):** на `≤640px` `.hsection padding-block:20px` (было 34), `.hsection-head margin-bottom:12px` (было 18), `.promo-strip margin-top:16px`. Gap категории→Popular сократился (cats-section уже `padding-bottom:0`).
- **Reuse:** `HorizontalProductSection` — общий компонент для Popular/Yeni/Endirimlər (не переписывался); пустые секции скрываются (`null`). Круглые категории (`Categories.jsx`) уже горизонтальная лента со snap — не менялись.
- **Верификация:** см. Last Verified Checks.

## Last Verified Checks

- `npm run build` — **успешно** (dist собран).
- **Собранный бандл (`dist/assets/index-*.js`):** `behavior:"instant"` присутствует ×2; баговый `'instant' in` — отсутствует (фикс LAV-BUG-036 в проде-бандле).
- **Расчёт видимых карточек** (формула `clamp(112px,34vw,150px)`, container-padding 16, gap 10): 320→2.44, 360→2.55, 375→2.57, 390→2.58, 414→2.60 — в целевом диапазоне 2.4–2.7.
- **Desktop live (preview, Chrome):** `document.scrollWidth ≤ innerWidth` — горизонтального overflow страницы нет; desktop hero и сетка 4 колонки без регрессий (скриншот сделан).
- **NOT VERIFIED вживую:** мобильный узкий viewport/тач и живой tap-тест (инструмент рендерит desktop-viewport — за владельцем); featured-буст на проде (нужна миграция `is_featured` — за владельцем, из F-007).

## Current Architecture Notes

- **Scroll:** `ScrollManager` (`App.jsx`) — `history.scrollRestoration='manual'`; PUSH→top(instant), POP→сохранённая позиция(instant, до 8 кадров), REPLACE→позиция сохраняется (нет прыжка при вводе/фильтре). Глобальный `html{scroll-behavior:smooth}` НЕ наследуется программными переходами (везде явный `behavior:'instant'`).
- **HomePage-секции:** `HorizontalProductSection` — единый reusable rail (mobile: horizontal scroll-snap; desktop `min-width:901`: grid 4 колонки). Карточка `ProductCard` общая для rail и grid.
- **Mobile-плотность:** размеры карточек rail — в базовом `.hscroll` (mobile) + desktop-override под `@media(min-width:901px)`; вертикальные отступы главной — в `@media(max-width:640px)` блоках `.hsection`/`.hsection-head`/`.promo-strip`.
- Поиск (F-007/LAV-BUG-035): `src/lib/search.js` + Header debounce + CatalogPage matches/similar. `is_featured` — колонка `products` (миграция за владельцем), код устойчив к её отсутствию.
- Inactivity 30 мин; нижняя навигация 5 пунктов; язык на `/settings` + desktop inline.

## Known Issues

Нет новых подтверждённых багов. Ограничение из F-007: приоритет не действует до применения `supabase/product-featured.sql` (by design, безопасно).

## Risks

- Мобильная вёрстка LAV-BUG-037 проверена расчётно + build; живой прогон на реальном телефоне (320–414px, тач-свайп, перекрытие Bottom Nav) — за владельцем (инструмент рендерит desktop).
- Фикс scroll/jump проверен по бандлу и спецификации CSSOM; живой tap-тест на устройстве — за владельцем.
- `is_featured`-миграция (F-007) остаётся за владельцем — к этой задаче не относится.

## Next Recommended Step

1. **Владельцу:** Fix Verification на телефоне — LAV-BUG-037 (2.4–2.7 карточки, нет гориз. скролла, компактные секции) и LAV-BUG-036 (tap → товар без плавного скролла главной).
2. (Из F-007) применить `supabase/product-featured.sql`, проставить приоритет.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260807-174640

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout через WhatsApp, admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** сделана компактнее мобильная главная (карточки ~2.4–2.7 в ряду, меньше вертикальных отступов) и устранён видимый плавный скролл главной перед открытием Product Page. Код в рабочем дереве, `vite build` успешен. Мобильная вёрстка проверена расчётно + desktop live (регрессий нет); живой мобильный/тач — за владельцем.
4. **Что реализовано в проекте:** умный поиск (`src/lib/search.js`) + живой ввод (Header debounce) + matches/similar (CatalogPage) + `is_featured` (админ, graceful degrade); ScrollManager (scrollRestoration=manual, PUSH/POP/REPLACE); reusable `HorizontalProductSection` (mobile rail / desktop grid); круглые категории-лента; inactivity 30м; 5 табов; язык в Settings.
5. **Последняя задача:** LAV-BUG-036 (scroll/jump перед товаром — `behavior:'instant'` вместо наследуемого smooth) + LAV-BUG-037 (компактные mobile-карточки `clamp(112px,34vw,150px)` + меньше вертикальных отступов секций).
6. **Изменённые файлы:** `src/App.jsx` (ScrollManager PUSH+POP → `behavior:'instant'`), `src/styles/index.css` (`.hscroll` размеры/gap + `≤900`/`≤640` компакт-блоки), `docs/BUGS.md` (LAV-BUG-036/037), `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно; собранный бандл содержит `behavior:"instant"` (×2), баговый `'instant' in` отсутствует; расчёт видимых карточек 2.44–2.60 (320–414px); desktop live — нет горизонтального overflow, регрессий нет. Мобильный live/тач и tap-тест — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop НЕ переделывать (только проверка регрессий); не откатывать полезную функциональность (поиск, scroll-restoration, «Hamısına bax», категории); не трогать header/search/account/favorites/cart/language/settings/checkout/auth/inactivity/БД без нужды; i18n AZ/RU/EN; один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — Fix Verification на телефоне (LAV-BUG-036/037); из F-007 — применить `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — подтверждение мобильной Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-036 (scroll/jump перед Product Page) + LAV-BUG-037 (компактная mobile-главная) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/App.jsx (ScrollManager PUSH+POP → behavior:'instant')
  - src/styles/index.css (.hscroll размеры/gap + ≤900/≤640 компакт-блоки)
  - docs/BUGS.md (LAV-BUG-036, LAV-BUG-037)
  - docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-07
Last verified tests: нет test-скриптов проекта; проверки — build + анализ бандла (behavior:"instant" ×2) + расчёт карточек 2.44–2.60 + desktop live (нет гориз. overflow). Мобильный live/тач и tap-тест — NOT VERIFIED (за владельцем)
Recovery confidence: MEDIUM
```
