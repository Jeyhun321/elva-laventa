import { useEffect } from 'react'

// Sürüşdürəndə blokların yumşaq görünməsi (fade + yuxarı sürüşmə).
//
// TƏHLÜKƏSİZLİK PRİNSİPİ: gizlətməni CSS yox, JS edir (.armed sinfi).
// Əgər JS işləməsə və ya IntersectionObserver heç vaxt cavab verməsə,
// məzmun sadəcə görünən qalır — mağazada məhsullar ASLA gizli qalmamalıdır.
export default function useReveal(deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const nodes = Array.from(document.querySelectorAll('.reveal:not(.in)'))
    if (!nodes.length) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) return // heç nə gizlətmirik

    // İndi gizlədirik — deməli JS işləyir və animasiyanı geri qaytara bilir.
    nodes.forEach((node) => node.classList.add('armed'))

    let anyCallback = false

    const reveal = (node, step) => {
      node.style.transitionDelay = step ? `${Math.min(step, 8) * 70}ms` : ''
      node.classList.add('in')
    }

    const observer = new IntersectionObserver(
      (entries) => {
        anyCallback = true
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          reveal(entry.target, Number(entry.target.dataset.revealStep || 0))
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )

    nodes.forEach((node) => observer.observe(node))

    // Ehtiyat qoruyucu: müşahidəçi ümumiyyətlə cavab verməyibsə,
    // 2.5 saniyədən sonra hər şeyi göstəririk ki, səhifə boş qalmasın.
    const safety = setTimeout(() => {
      if (anyCallback) return
      observer.disconnect()
      nodes.forEach((node) => node.classList.remove('armed'))
    }, 2500)

    return () => {
      clearTimeout(safety)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
