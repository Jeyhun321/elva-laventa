import { useLocation } from 'react-router-dom'
import { useShop } from '../context/ShopContext.jsx'
import AuthRequiredDialog from './AuthRequiredDialog.jsx'

// Bütün tətbiq üçün TƏK "daxil olun" pəncərəsi.
// Siqnalı ShopContext verir (addToCart / toggleFavorite içindən),
// ona görə hansı düymənin basılmasının fərqi yoxdur — pəncərə eynidir.
export default function ShopAuthGate() {
  const { authPrompt, closeAuthPrompt } = useShop()
  const { pathname, search } = useLocation()

  return (
    <AuthRequiredDialog
      open={Boolean(authPrompt)}
      onClose={closeAuthPrompt}
      returnTo={`${pathname}${search}`}
      messageKey={authPrompt === 'favorite' ? 'favorites_auth_required' : 'google_auth_required'}
    />
  )
}
