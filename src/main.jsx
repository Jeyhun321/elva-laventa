import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { ShopProvider } from './context/ShopContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ImpersonationProvider } from './context/ImpersonationContext.jsx'
import { installGlobalRecovery } from './lib/recovery.js'
import { installLifecycleDiag } from './lib/lifecycleDiag.js'
import './styles/index.css'

installGlobalRecovery()
installLifecycleDiag() // bounded lifecycle timeline for long-idle diagnosis (LAV-BUG-056)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <I18nProvider>
        <AuthProvider>
          <CatalogProvider>
            <ImpersonationProvider>
              <ShopProvider>
                <App />
              </ShopProvider>
            </ImpersonationProvider>
          </CatalogProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
