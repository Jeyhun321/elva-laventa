# LaVenta — Handoff

## Current Status

Переработана верхняя часть главной страницы: hero сделан компактнее и добавлена переиспользуемая система промо-блоков (Trendyol-подход к UX, но фирменный boutique-стиль LaVenta сохранён). Изменения закоммичены (`fd5548d`) и запушены в `main`; деплой на GitHub Pages запущен автоматически (push-триггер).

## Current Branch

`main`

## Last Completed Task

### Компактный hero + система промо-блоков на главной (LAV-BUG-018)

**Причина высоты hero:** на мобиле `Intro` стек по вертикали крупный декоративный логотип бренда (`min(260px,72vw)`, дублирует шапку), большой заголовок, описание в 3 строки, две кнопки, showcase-карусель + мини-карточку + точки; `.intro-grid` тянул `min-height: min(720px, calc(100dvh-74px))`. Полезный контент появлялся слишком поздно.

**Что сделано:**
- **Компактный hero** (`src/components/Intro.jsx` + CSS): убран дублирующий крупный мобильный логотип; описание сокращено (`hero_desc`) и на мобиле обрезается до 2 строк (`-webkit-line-clamp`); оставлена одна основная кнопка + компактная вторичная текстовая ссылка; на мобиле уменьшены отступы `.intro-grid` и высота `.showcase-stage` (300→248px, ≤480px 228px).
- **Переиспользуемые промо-компоненты** (new): `PromoBanner.jsx` (variant `compact`/`wide`, поддержка `eager` и опционального image), `PromoCardGrid.jsx` (две мини-карты), `HorizontalProductSection.jsx` (гориз. scroll на mobile / сетка 4-в-ряд на desktop, переиспользует `ProductCard`). Быстрые круглые категории — существующий `Categories.jsx`.
- **Конфиг данных** `src/data/promos.js`: массивы промо с полями id/title/subtitle/badge/cta/link/tone/active/sortOrder и переводами AZ/RU/EN прямо в объектах (`t()` принимает `{az,ru,en}`). Промо-баннеры на CSS-градиентах бренда (без изображений) — ноль сетевых запросов и ноль layout shift.
- **HomePage** пересобрана: hero → компактный промо-баннер (eager) → круглые категории → «Populyar» (гориз/сетка) → две мини-рекламы → «Yeni gələnlər» → широкий сезонный баннер → BrandStatement → BenefitsSection → Promo.
- **i18n:** сокращён `hero_desc` (AZ/RU/EN), добавлен `new_in_eyebrow`; остальные промо-тексты живут в `promos.js` с AZ/RU/EN.
- **Консолидация CSS:** удалено мёртвое дублирующее правило `.section { padding: 104px 0 112px }` (всегда перекрывалось `.section { padding: clamp(72px,9vw,120px) 0 }`).

## Last Verified Checks

- `npm run build` — успешно (`✓ built in 2.43s`), CSS `dist/assets/index-*.css` ≈ 83.94 kB (gzip 16.82 kB), 125 modules.
- **Живая desktop QA** (vite preview, Chrome, ширина ~1568px): проверены и корректны — компактный hero (2 колонки, не чрезмерно высокий), ivory промо-баннер, круглые категории, «Populyar» сеткой 4-в-ряд, промо-пара (plum+rose), «Yeni gələnlər» (реальные фото товаров грузятся), широкий сезонный баннер, далее существующие секции. Фирменная бордово-розовая палитра сохранена, горизонтального скролла всей страницы нет.
- **Mobile:** live-рендер узкого viewport не удалось снять (browser-extension screenshot всегда отдаёт desktop-ширину). Мобильное поведение проверено по CSS media-queries (`≤900px`, `≤640px`, `≤480px`) и сборке; **живая проверка на реальном телефоне — за владельцем (NOT VERIFIED live)**.

## Current Architecture Notes

- Elva LaVenta — React/Vite storefront, Supabase backend (Frankfurt), деплой на GitHub Pages (`.github/workflows/deploy.yml`, триггер `push: [main]` + `workflow_dispatch`).
- Главная: `src/pages/HomePage.jsx` собирает `Intro` + промо-компоненты + `Categories` + существующие секции. Промо-данные — `src/data/promos.js`. Товарные ряды: `HorizontalProductSection` (mobile scroll / desktop grid).
- `package.json` scripts: `dev`, `build`, `preview`, `logs`.

## Known Issues

Нет новых подтверждённых багов. LAV-BUG-018 — FIXED (Fix Verification на устройствах за владельцем).

## Risks

- Живой мобильный рендер новой главной NOT VERIFIED (проверено build + desktop live + media-queries). Риск низкий.
- На планшете (641–900px) у товарных рядов может показываться и заголовочная ссылка «Bütün məhsullar», и нижняя — незначительное дублирование, не критично.

## Next Recommended Step

Владельцу — Fix Verification LAV-BUG-018 на реальном телефоне (320/360–390px) и desktop по чек-листу в `docs/BUGS.md`. При желании — наполнить `promos.js` реальными изображениями (поле `image` уже поддержано с lazy/размерами).

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260806-091859

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин с каталогом, избранным, корзиной, checkout через WhatsApp, admin-панелью, тремя языками AZ/RU/EN.
3. **Текущее состояние:** переработана верхняя часть главной (компактный hero + промо-система); изменения закоммичены и запушены в `main`, деплой запущен push-триггером. Рабочее дерево после коммита чистое.
4. **Что реализовано:** полноценная витрина; компактный hero; переиспользуемые промо-блоки (`PromoBanner`, `PromoCardGrid`, `HorizontalProductSection`) + конфиг `src/data/promos.js` с AZ/RU/EN; пересобранная структура главной.
5. **Последняя задача:** LAV-BUG-018 — уменьшен hero (~в 1.5–2 раза по высоте на мобиле: убран дублирующий логотип, короче описание, одна основная кнопка, ниже карусель), добавлена система промо-зон, товарные ряды (mobile scroll / desktop grid), быстрые круглые категории (существующий `Categories`), широкий сезонный баннер; консолидировано мёртвое дублирующее `.section` правило.
6. **Изменённые файлы:** `src/components/Intro.jsx`, `src/pages/HomePage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`, `docs/BUGS.md`; новые: `src/components/PromoBanner.jsx`, `src/components/PromoCardGrid.jsx`, `src/components/HorizontalProductSection.jsx`, `src/data/promos.js`.
7. **Проверки:** `npm run build` — успешно (125 modules, CSS ≈83.94 kB). Живая desktop QA в vite preview — корректно. Mobile live — NOT VERIFIED (screenshot-инструмент отдавал desktop-ширину); проверено по media-queries.
8. **Ограничения:** не менять бизнес-логику корзины/избранного/checkout/авторизации и структуру БД товаров; сохранять фирменную бордово-розовую палитру/логотип/типографику; не хардкодить пользовательские тексты — через i18n или `promos.js` с AZ/RU/EN; любые UI/логика — проверять на mobile и desktop; не коммитить `.claude/settings.local.json` и секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `START.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`.
10. **Что осталось:** Fix Verification LAV-BUG-018 на реальном телефоне и desktop (владелец); опционально — реальные изображения в `promos.js`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`, затем взять задачу владельца.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости остальные `docs/`, commit + push в `main`.

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-018 — компактный hero + система промо-блоков на главной (завершено, закоммичено, запушено)
Expected modified files:
  - src/components/Intro.jsx
  - src/pages/HomePage.jsx
  - src/i18n/translations.js
  - src/styles/index.css
  - docs/BUGS.md
  - src/components/PromoBanner.jsx (new)
  - src/components/PromoCardGrid.jsx (new)
  - src/components/HorizontalProductSection.jsx (new)
  - src/data/promos.js (new)
Git status summary: committed & pushed to main; SHA fd5548d (90ba0d9..fd5548d)
Documentation updated: YES
Last verified build: npm run build — успешно (125 modules, CSS ≈83.94 kB), 2026-08-06
Last verified tests: нет test-скриптов в package.json (не запускались); desktop live QA — PASSED; mobile live — NOT VERIFIED
Recovery confidence: MEDIUM
```
