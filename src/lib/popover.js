// ============================================================
//  popoverPosition — чистый расчёт fixed-координат выпадающего меню (поповера)
//  с учётом viewport. Вынесено из UI, чтобы логику можно было юнит-тестировать
//  (флип вверх/вниз, клэмп по краям экрана) без DOM.
//
//  Меню правым краем выравнивается по правому краю кнопки-триггера. Если снизу
//  мало места — открывается вверх. По горизонтали и вертикали не выходит за
//  края экрана (с отступом margin). Возвращает { left, top, placeUp }.
// ============================================================
export function popoverPosition({ btn, viewport, menuW = 200, menuH = 160, gap = 4, margin = 8 }) {
  const vw = Math.max(0, viewport?.width || 0)
  const vh = Math.max(0, viewport?.height || 0)

  // Горизонталь: правый край меню у правого края кнопки, но в пределах экрана.
  let left = btn.right - menuW
  const maxLeft = vw - menuW - margin
  left = Math.max(margin, maxLeft >= margin ? Math.min(left, maxLeft) : left)

  // Вертикаль: по умолчанию снизу; если снизу не помещается, а сверху места
  // больше — открываем вверх.
  const spaceBelow = vh - btn.bottom
  const spaceAbove = btn.top
  const placeUp = spaceBelow < menuH + gap && spaceAbove > spaceBelow

  let top = placeUp ? btn.top - menuH - gap : btn.bottom + gap
  // Финальный клэмп — меню не уезжает за нижнюю/верхнюю границу даже в узком
  // viewport (в этом случае сработает внутренний скролл меню по max-height).
  const maxTop = vh - menuH - margin
  top = Math.max(margin, maxTop >= margin ? Math.min(top, maxTop) : top)

  return { left, top, placeUp }
}
