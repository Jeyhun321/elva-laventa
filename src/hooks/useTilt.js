import { useEffect, useRef } from 'react'

// Kursorla yüngül 3D əyilmə (parallax-tilt). Ağır kitabxana yoxdur — sadəcə transform.
// Toxunuş cihazlarında və "hərəkəti azalt" rejimində tamamilə söndürülür.
// lift — kursor üstündə qalxma (px). Əyilmə ilə eyni transform-da olmalıdır,
// yoxsa inline stil CSS :hover translateY-ni əvəz edir.
export default function useTilt({ max = 4, scale = 1, perspective = 1200, lift = 0 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof window === 'undefined') return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    if (reduceMotion.matches || coarsePointer.matches) return

    let frame = 0

    const apply = (rotateX, rotateY) => {
      node.style.transform =
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` +
        (lift ? ` translateY(${lift}px)` : '') +
        (scale !== 1 ? ` scale(${scale})` : '')
    }

    const onMove = (event) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const rect = node.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        // -0.5..0.5 aralığı — mərkəzdən uzaqlıq
        const px = (event.clientX - rect.left) / rect.width - 0.5
        const py = (event.clientY - rect.top) / rect.height - 0.5
        apply(-py * max * 2, px * max * 2)
      })
    }

    const onLeave = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      node.style.transform = ''
    }

    node.addEventListener('mousemove', onMove)
    node.addEventListener('mouseleave', onLeave)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      node.removeEventListener('mousemove', onMove)
      node.removeEventListener('mouseleave', onLeave)
      node.style.transform = ''
    }
  }, [max, scale, perspective, lift])

  return ref
}
