import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource/great-vibes'
import '@fontsource/allura'
import '@fontsource/caveat'
import '@fontsource/dancing-script'
import '@fontsource/sacramento'
import '@fontsource/parisienne'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/base.css'
import './styles/loader.css'
import './styles/glow.css'
import { mountSplash } from './brand/splash'
import App from './App'
import { SessionProvider } from './lib/session'
import { ToastProvider } from './lib/toast'

if (!location.pathname.startsWith('/print/')) mountSplash()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
