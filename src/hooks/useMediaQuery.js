import { useEffect, useState } from 'react'

// Sadə media-query hook. SSR yoxdur (Vite SPA), ona görə ilk dəyər birbaşa
// matchMedia-dan alınır; ekran ölçüsü dəyişəndə (resize/rotate) yenilənir.
export default function useMediaQuery(query) {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false

  const [matches, setMatches] = useState(get)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
