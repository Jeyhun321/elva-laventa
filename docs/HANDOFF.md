# LaVenta — Handoff

## Current Status

Мобильный header почищен и обновлён по ТЗ: (1) исправлено «залипание» выбранной категории после «назад» на каталоге — выбор категории теперь `replace` вместо `push` в history (LAV-BUG-027); (2) увеличен брендовый логотип в mobile-header (LAV-BUG-028); (3) языковой переключатель убран из верхнего ряда иконок и оставлен в существующем рабочем месте — странице Settings, доступной из нижней навигации (LAV-BUG-029). Desktop не тронут (проверено live — без регрессий). Изменения закоммичены и запушены в `main`. **Деплой GitHub Pages для `c75f136` УСПЕШНО ЗАВЕРШЁН** (run #139, 2026-08-07, `workflow_dispatch`; предыдущие попытки #136–#138 висли в очереди/обрывались по таймауту из-за сбоя Actions 06.08). Сайт живой — `https://jeyhun321.github.io/elva-laventa/` отвечает HTTP 200.

**Важно про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой первого из-за гонки `cancel-in-progress` — практику прекратили; см. LAV-BUG-026).

## Current Branch

`main`

## Last Completed Task

### Mobile header polish: catalog back-reset + logo + language relocation (LAV-BUG-027/028/029)

- **LAV-BUG-027 (catalog «Donlar» stays active):** первопричина — активная категория хранится только в URL (`?cat=`, корректно), но `setCat` делал `setParams(next)` без опций → react-router по умолчанию PUSH-ит новую history-запись на каждый выбор категории; верхняя «←» (`navigate(-1)`) шагала назад по этим отфильтрованным записям и восстанавливала старый фильтр. Фикс: `setParams(next, { replace: true })` — каталог = одна history-запись, «←» возвращает на реальную предыдущую страницу в общем состоянии; URL/UI/список синхронны. Логика фильтрации (`visible`, `cat`) и `goBack` не менялись.
- **LAV-BUG-028 (logo too small):** SVG-логотип (viewBox `480×108`, вектор) на мобиле увеличен с бокса `110×44` до `166×44` (реальная высота глифа ≈25px→≈37px); в блоке `≤360px` — `140px` (было `92px`), иконки Account/Favorites/Cart чуть уменьшены (40px) для 320px без гориз. скролла. `object-fit: contain` — без обрезки/деформации. Desktop-логотип 210px не тронут.
- **LAV-BUG-029 (language clutters header):** мобильный дропдаун языка (`.lang-select`) удалён из `Header.jsx` вместе с неиспользуемым state; выбор языка уже полностью работает на `/settings` (тот же `useI18n().setLang`, AZ/RU/EN, сохранение в `localStorage.elva_lang`), доступен из нижней навигации (шестерёнка `TabBar`). Верхний ряд теперь `[логотип] … [Account][Favorites][Cart]` (3 равные круглые иконки, `margin-left:auto` — пустого места нет). Desktop inline `.lang-switch` сохранён.

## Last Verified Checks

- `npm run build` — успешно (`✓ built in 2.75s`, 129 модулей).
- **Desktop live QA (vite preview, 1536px):** гориз. скролла нет (`scrollWidth 1521 ≤ 1536`); `.lang-switch` присутствует и виден (desktop-язык работает); `.lang-select` в DOM отсутствует (мобильный контрол удалён полностью); `.cat-wrap` (Kataloq) на desktop виден; логотип 210px; каталог отдаёт 20 товаров. Регрессий нет.
- **Catalog category live QA:** NOT VERIFIED — в локальном `vite preview` категории Supabase не подгрузились (0 чипов/ссылок), кликнуть по категории не удалось. Правка `replace` — стандартная одно-строчная семантика react-router; логика фильтра не тронута. Живая проверка сброса категории «←» — на проде, за владельцем.
- **Mobile live рендер (узкий viewport):** NOT VERIFIED — browser-extension не эмулирует мобильную ширину; мобильные CSS-правила проверены по коду/расчёту ширин (166+3×44 помещается на 360px; 140+3×40 — на 320px). Живая проверка на телефоне (320/360/375/390, Safari/Chrome) — за владельцем.

## Current Architecture Notes

- Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), деплой GitHub Pages (`.github/workflows/deploy.yml`, `push:[main]` + `workflow_dispatch`, `cancel-in-progress: false`).
- Header: desktop — логотип + Kataloq(dropdown) + поиск + actions (inline `.lang-switch` AZ/RU/EN); mobile — строка1 `[логотип][Account][Favorites][Cart]`, строка2 `[поиск на всю ширину][кнопка]`. **Языка в мобильном header больше нет** — он на `/settings`.
- Категория каталога — источник истины только URL (`?cat=`); выбор категории `replace`-ит запись истории. Back-кнопка каталога: `back-btn` + `goBack` (navigate(-1)/fallback `/`).
- Язык: `useI18n` (`elva_lang` в localStorage); UI-места: desktop header `.lang-switch`, `/settings` секция «Язык». Нижняя навигация `TabBar` — 5 пунктов (Home/Catalog/Favorites/Cart/Settings), mobile.
- Inactivity: `src/hooks/useInactivityRedirect.js` (30 мин), подключён в `App`.

## Known Issues

Нет новых подтверждённых багов. LAV-BUG-018…029 — FIXED (Fix Verification на реальных устройствах/проде — за владельцем).

## Risks

- Живой мобильный рендер (логотип/раскладка) и сброс категории «←» с реальными данными Supabase — NOT VERIFIED live (проверено build + desktop preview + расчёт). Риск низкий: правки локальные (одна строка router + CSS размеры + удаление мобильного контрола).
- Осталась мёртвая (неиспользуемая) CSS-разметка `.lang-select*` — инертна (элемент не рендерится). Можно вычистить позже; функционально не влияет.
- UI-заглушки без backend: Settings (кроме языка), будущие категории.

## Next Recommended Step

Владельцу — Fix Verification LAV-BUG-027/028/029:
- **027:** на проде выбрать категорию (`Donlar`/`Bluzalar`) → «←» → общее состояние без старого фильтра; прямая ссылка `/catalog?cat=<id>` и refresh — UI=список.
- **028/029:** телефон 320/360/375/390 (Safari/Chrome): логотип крупнее и не обрезан, 3 иконки помещаются без гориз. скролла; язык через нижнюю навигацию → Settings, AZ/RU/EN переключаются и сохраняются после refresh.
- Desktop — по чек-листам в `docs/BUGS.md`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260806-200946

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин с каталогом, избранным, корзиной, checkout через WhatsApp, admin-панелью, тремя языками AZ/RU/EN.
3. **Текущее состояние:** мобильный header почищен (сброс категории на «назад», крупнее логотип, язык вынесен из верхнего ряда в Settings); изменения закоммичены и запушены в `main`, деплой запущен push-триггером. После коммита дерево чистое.
4. **Что реализовано:** компактная mobile-first главная; mobile header — логотип + 3 быстрых действия (Account/Favorites/Cart) + полноширинный поиск; каталог с back-кнопкой, без дублирующего заголовка, с корректным сбросом категории через `replace`; выбор языка на странице `/settings` (AZ/RU/EN, сохранение в localStorage) + desktop inline-переключатель; авто-возврат на главную после ≥30 мин отсутствия (без потери корзины/сессии); нижняя навигация 5 пунктов.
5. **Последняя задача:** LAV-BUG-027 (каталог: `setCat` → `setParams(next,{replace:true})` — «←» больше не восстанавливает старый фильтр), LAV-BUG-028 (mobile-логотип увеличен 110→166px, ≤360px 92→140px), LAV-BUG-029 (мобильный `.lang-select` удалён из Header; язык остаётся в Settings/desktop).
6. **Изменённые файлы:** `src/pages/CatalogPage.jsx` (setCat replace), `src/components/Header.jsx` (удалён mobile lang-select + langOpen/langRef/Esc-эффект), `src/styles/index.css` (логотип ≤900/≤360, mobile `.lang-select{display:none}`), `docs/BUGS.md`, `docs/HANDOFF.md`.
7. **Проверки:** `npm run build` — успешно. Desktop live QA (preview) — без регрессий (нет гориз. скролла, lang-switch работает, lang-select удалён, Kataloq на месте). Mobile live рендер и сброс категории с реальными категориями Supabase — NOT VERIFIED (инструмент не эмулирует узкий viewport; в preview категории не подгрузились).
8. **Ограничения:** не менять бизнес-логику поиска/фильтров/карточек/корзины/избранного/авторизации/checkout/БД/нижней навигации/Settings; сохранять палитру/логотип/типографику; не хардкодить тексты — i18n/конфиги AZ/RU/EN; при inactivity НЕ очищать корзину/избранное/сессию/язык; язык переносить, а не переписывать; один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `START.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`.
10. **Что осталось:** Fix Verification LAV-BUG-027/028/029 (владелец, реальные устройства + прод); опционально — вычистить мёртвую CSS `.lang-select*`; подключение backend к UI-заглушкам (Settings).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`, затем взять задачу владельца.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости остальные `docs/`, commit + push в `main`.

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-027/028/029 — catalog back-reset + mobile logo + language relocation (завершено, закоммичено, запушено)
Expected modified files:
  - src/pages/CatalogPage.jsx
  - src/components/Header.jsx
  - src/styles/index.css
  - docs/BUGS.md
  - docs/HANDOFF.md
Git status summary: committed & pushed to main; прод-деплой run #139 = c75f136 (success, 2026-08-07); сайт HTTP 200
Documentation updated: YES
Last verified build: npm run build — успешно, 2026-08-06
Last verified tests: нет test-скриптов; desktop live QA — PASSED (без регрессий); mobile live рендер + catalog category-reset — NOT VERIFIED (viewport/данные)
Recovery confidence: MEDIUM
```
