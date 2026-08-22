// Row-actions popover positioning — pure viewport math (src/lib/popover.js).
// Runs with plain node: `node tests/popover.test.mjs`.
//
// Проверяет: меню открывается вниз, когда снизу есть место; вверх, когда снизу
// мало (нижние строки таблицы); не выходит за правый край; не уходит в минус
// слева на узком экране; финальный клэмп держит меню в пределах viewport.
import assert from 'node:assert'
import { popoverPosition } from '../src/lib/popover.js'

let n = 0, p = 0
const t = (name, fn) => { n++; try { fn(); p++; console.log('PASS —', name) } catch (e) { console.log('FAIL —', name, '::', e.message) } }

const MENU_W = 200, MENU_H = 160, GAP = 4, MARGIN = 8
const vp = (w, h) => ({ width: w, height: h })
// Прямоугольник кнопки ⋯ (34×34) с правым краем на x, верхом на y.
const btn = (right, top, size = 34) => ({ right, left: right - size, top, bottom: top + size })

// 1. Верхняя строка таблицы — снизу много места → открывается ВНИЗ.
t('top row → opens downward, top = btn.bottom + gap', () => {
  const r = btn(900, 120)
  const { placeUp, top } = popoverPosition({ btn: r, viewport: vp(1280, 800), menuW: MENU_W, menuH: MENU_H })
  assert.equal(placeUp, false)
  assert.equal(top, r.bottom + GAP)
})

// 2. Нижняя строка у нижней границы viewport → открывается ВВЕРХ.
t('bottom row → opens upward (placeUp), stays above the button', () => {
  const r = btn(900, 760) // bottom = 794, до низа (800) всего 6px
  const { placeUp, top } = popoverPosition({ btn: r, viewport: vp(1280, 800), menuW: MENU_W, menuH: MENU_H })
  assert.equal(placeUp, true)
  assert.ok(top < r.top, `top ${top} должен быть выше кнопки ${r.top}`)
})

// 3. Правый край: меню правым краем у правого края кнопки, но не за экран.
t('right edge → menu never overflows the right viewport edge', () => {
  const r = btn(1276, 200) // почти у правого края экрана 1280
  const { left } = popoverPosition({ btn: r, viewport: vp(1280, 800), menuW: MENU_W, menuH: MENU_H })
  assert.ok(left + MENU_W <= 1280 - MARGIN + 0.001, `left+width=${left + MENU_W} > ${1280 - MARGIN}`)
})

// 4. Узкий экран: меню не уходит за левый край (left >= margin).
t('narrow viewport → left is clamped to >= margin (no negative/off-screen)', () => {
  const r = btn(120, 200)
  const { left } = popoverPosition({ btn: r, viewport: vp(360, 640), menuW: MENU_W, menuH: MENU_H })
  assert.ok(left >= MARGIN, `left ${left} < margin ${MARGIN}`)
})

// 5. Правое выравнивание при достатке места: left = btn.right - menuW.
t('enough room → right-aligned to the button (left = right - menuW)', () => {
  const r = btn(600, 200)
  const { left } = popoverPosition({ btn: r, viewport: vp(1280, 800), menuW: MENU_W, menuH: MENU_H })
  assert.equal(left, 600 - MENU_W)
})

// 6. Финальный клэмп по вертикали — меню в пределах экрана (низ не срезан).
t('vertical clamp → menu bottom within viewport', () => {
  const r = btn(900, 300)
  const { top } = popoverPosition({ btn: r, viewport: vp(1280, 800), menuW: MENU_W, menuH: MENU_H })
  assert.ok(top + MENU_H <= 800 - MARGIN + 0.001 || top === MARGIN, `top+height=${top + MENU_H}`)
})

// 7. Mobile: нижняя строка на телефоне → вверх и в пределах ширины 360.
t('mobile bottom row → opens up and fits width 360', () => {
  const r = btn(340, 600)
  const { placeUp, left, top } = popoverPosition({ btn: r, viewport: vp(360, 640), menuW: MENU_W, menuH: MENU_H })
  assert.equal(placeUp, true)
  assert.ok(left >= MARGIN && left + MENU_W <= 360 - MARGIN + 0.001)
  assert.ok(top >= MARGIN)
})

console.log(`\n${p}/${n} passed`)
if (p !== n) process.exit(1)
