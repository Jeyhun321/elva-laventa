# LaVenta — Handoff

## Current Status

**Мобильная главная приведена к утверждённому дизайн-макету (LAV-BUG-038).** Header/Search spacing, компактные вертикальные отступы, категории с двойным контуром, фирменный sparkle-бейдж вместо текста «YENİ», promo-блок в 2 крупные карточки с иконками и декором, выразительная активная вкладка Bottom Nav, лёгкие tap-анимации. Поверх LAV-BUG-036/037 (компактные карточки + фикс scroll/jump). Код в рабочем дереве, `vite build` — успешно, desktop live-проверка без регрессий. Готово к commit → push → deploy.

**Что нового (LAV-BUG-038):**
- **Header/Search:** `.header-inner` (≤900) `padding-block:8px 12px`, `gap:12px` — search отделён аккуратным boutique-отступом.
- **Меньше пустот:** `.cats-section padding-top` → 12px (search→категории).
- **Категории:** двойной контур `box-shadow: inset 3px #fff, inset 4px mist, soft drop`, бордовые иконки.
- **Бейдж:** `ProductCard` — `.product-badge` (белый круг + `IconSparkle`), текст «YENİ» удалён везде (в т.ч. кружок «Yenilər» → искра). Для скидок остаётся числовой «%».
- **Promo:** `CompactPromoRail` — иконка-розетка (truck/tag/sparkle) + декор-круг + стрелка; на ≤640px `.promo-rail` grid 2-кол, 3-я карточка скрыта (макет = 2 карточки). Desktop — прежняя лента из 3 (без регрессий).
- **Bottom Nav:** активная вкладка — mist-таблетка за иконкой + label 700.
- **Анимации:** лёгкий `:active` scale на карточках/промо.

> ⚠️ **Действие владельца по F-007 остаётся (не связано с этой задачей):** выполнить `supabase/product-featured.sql` (колонка `is_featured`).

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026, `cancel-in-progress`).

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-038 — приведение mobile HomePage к дизайн-макету

- **Компоненты:** `ProductCard.jsx` (sparkle-бейдж вместо текста), `Categories.jsx` (искра вместо «YENİ», разделены BADGE_TEXT/BADGE_SPARK), `Icons.jsx` (`IconTruck`/`IconTag`), `CompactPromoRail.jsx` (иконка + `.promo-card-deco` + `.promo-card-text`-обёртка), `promos.js` (поле `icon`).
- **CSS (`index.css`):** header spacing (≤900); `.cats-section padding-top:12px` (≤640/≤900); `.cat-circle-icon` двойной контур; `.product-badge` (+ `.cat-circle-badge-spark`); promo — базовые `.promo-card-icon/-text/-deco`, `justify-content:space-between`, `overflow:hidden`, cta по центру справа, и ≤640 grid 2-up + скрытие 3-й карточки; `.tabbar-icon::before` (active pill) + active label 700; `:active` tap-scale (`@media hover:none`).
- **Не тронуто:** desktop-ветки (`min-width:901`) карточек и promo-ленты — только проверка регрессий.
- **Верификация:** см. Last Verified Checks.

### LAV-BUG-036 + LAV-BUG-037 (предыдущая задача, в этом же рабочем дереве)

- **036:** фикс scroll/jump перед Product Page — `ScrollManager` PUSH+POP → `behavior:'instant'` (перекрывает `html{scroll-behavior:smooth}`).
- **037:** компактные mobile-карточки `.hscroll` `clamp(112px,34vw,150px)` gap 10 (2.44–2.60 в ряду) + меньше вертикальных отступов секций (≤640).

## Last Verified Checks

- `npm run build` — **успешно** (dist собран, после фикса `.promo-card-text` в столбик — пересобрано).
- **Desktop live (Chrome preview):** категории с двойным контуром/мягкой тенью; sparkle-бейджи на карточках (SVG, без текста); promo-карточки с иконками (truck/tag/sparkle), декор-кругом, стрелкой, заголовок+подзаголовок в столбик; hero/сетка/promo-лента — без регрессий; `document.scrollWidth ≤ innerWidth` (нет горизонтального overflow).
- **DOM-проверка:** `.product-badge`(svg) есть; `.promo-card-icon`×3; `.promo-card-deco`×3; `.cat-circle-badge-spark`(svg); текст бейджей = только «%» (нигде нет «YENİ»).
- **Собранный бандл (из пред. задачи):** `behavior:"instant"` ×2, багового `'instant' in` нет.
- **Расчёт видимых карточек (037):** 320→2.44 … 414→2.60 (цель 2.4–2.7).
- **NOT VERIFIED вживую:** мобильный узкий viewport/тач (инструмент рендерит desktop-viewport 1536px, мобильную ширину НЕ эмулирует — за владельцем): 2-up promo grid и скрытие 3-й карточки, header spacing на телефоне, active-pill Bottom Nav, tap-анимации; featured-буст (нужна миграция `is_featured` — за владельцем, из F-007).

## Current Architecture Notes

- **HomePage секции:** `HorizontalProductSection` (mobile rail / desktop grid), `Categories` (круговая лента), `CompactPromoRail` (mobile 2-up grid ≤640 / desktop flex-лента). `ProductCard` общая.
- **Бейджи:** `.product-badge` (sparkle) — универсальный знак «специальный/новый» товар; `.product-discount` (числовой «%») — для `oldPrice`; текстовых бейджей больше нет.
- **Promo данные:** `src/data/promos.js` — поле `icon` (`truck`/`tag`/`sparkle`) → `PROMO_ICONS` в `CompactPromoRail`. На мобиле показываются первые 2 (CSS `nth-child(n+3)` hide).
- **Scroll:** `ScrollManager` — `scrollRestoration='manual'`; PUSH→top(instant), POP→позиция(instant), REPLACE→сохранение позиции. Глобальный `html{scroll-behavior:smooth}` не наследуется программными переходами.
- Поиск (F-007/LAV-BUG-035); inactivity 30 мин; 5 табов; язык в Settings.

## Known Issues

Нет новых подтверждённых багов. Ограничение из F-007: приоритет не действует до применения `supabase/product-featured.sql` (by design, безопасно).

## Risks

- Мобильные пункты LAV-BUG-038 (2-up promo, header spacing, active-pill, tap-анимации) проверены на desktop-viewport + DOM + build; живой прогон на телефоне (320–412px) — за владельцем (инструмент не эмулирует мобильную ширину).
- `nth-child(n+3)` скрывает 3-ю promo-карточку на ≤640 — если владелец захочет показывать все 3 на мобиле, снять правило.
- `is_featured`-миграция (F-007) остаётся за владельцем.

## Next Recommended Step

1. **Владельцу:** Fix Verification на телефоне по чек-листу LAV-BUG-038 (header/search, категории, sparkle-бейдж, 2-up promo, active tab, отсутствие горизонтального скролла на 320–412px) + LAV-BUG-036/037.
2. (Из F-007) применить `supabase/product-featured.sql`, проставить приоритет.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260807-184701

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout через WhatsApp, admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** мобильная главная приведена к утверждённому дизайн-макету (LAV-BUG-038) поверх компактных карточек и фикса scroll/jump (LAV-BUG-036/037). Код в рабочем дереве, `vite build` успешен, desktop live — без регрессий. Живой мобильный тач — за владельцем.
4. **Что реализовано в проекте:** умный поиск (`src/lib/search.js`) + живой ввод + matches/similar; ScrollManager (PUSH/POP instant, REPLACE hold); reusable `HorizontalProductSection`; круговые категории с двойным контуром; sparkle-бейдж товара (`.product-badge`) вместо текста «YENİ»; promo 2-up (mobile) с иконками/декором; выразительная активная вкладка Bottom Nav; лёгкие tap-анимации; `is_featured` (graceful degrade); inactivity 30м; 5 табов; язык в Settings.
5. **Последняя задача:** LAV-BUG-038 — mobile HomePage под макет (header/search spacing, компактные gap, категории double-contour, sparkle-бейдж, promo 2-up с иконками, active tab, анимации).
6. **Изменённые файлы:** `src/components/ProductCard.jsx`, `src/components/Categories.jsx`, `src/components/Icons.jsx`, `src/components/CompactPromoRail.jsx`, `src/data/promos.js`, `src/styles/index.css`, `docs/BUGS.md`, `docs/HANDOFF.md`. (Пред. задача 036/037: `src/App.jsx`, `src/styles/index.css`.)
7. **Проверки:** `vite build` — успешно; desktop live (Chrome preview) — категории/бейджи/promo рендерятся, нет горизонтального overflow, регрессий нет; DOM-узлы подтверждены; текст бейджей = только «%». Мобильный live/тач — NOT VERIFIED (инструмент рендерит desktop 1536px, мобильную ширину не эмулирует — за владельцем).
8. **Ограничения:** desktop НЕ переделывать (только регрессии); не откатывать полезное (поиск, scroll-restoration, «Hamısına bax», категории, компактные карточки); не трогать header-логику/search/account/favorites/cart/language/settings/checkout/auth/inactivity/БД сверх нужного; i18n AZ/RU/EN; один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — Fix Verification на телефоне (LAV-BUG-038/036/037); из F-007 — применить `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — подтверждение мобильной Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-038 (mobile HomePage под дизайн-макет) поверх LAV-BUG-036/037 — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/components/ProductCard.jsx (sparkle badge)
  - src/components/Categories.jsx (sparkle вместо YENİ)
  - src/components/Icons.jsx (IconTruck/IconTag)
  - src/components/CompactPromoRail.jsx (иконка/деко/текст-обёртка)
  - src/data/promos.js (поле icon)
  - src/styles/index.css (header spacing, cats double-contour, product-badge, promo 2-up, tabbar active, tap-анимации)
  - docs/BUGS.md (LAV-BUG-038), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-07
Last verified tests: нет test-скриптов проекта; проверки — build + desktop live (Chrome preview, регрессий нет, нет гориз. overflow) + DOM-узлы. Мобильный live/тач — NOT VERIFIED (за владельцем)
Recovery confidence: MEDIUM
```
