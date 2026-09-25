import React, { useCallback, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { queryClient } from './lib/queryClient.js'
import { SessionProvider } from './lib/session.jsx'
import { AppearanceProvider } from './lib/appearance.jsx'
import { isSupabaseConfigured } from './lib/supabaseClient.js'
import { installModalityTracking } from './lib/modality.js'
import AuthGate from './components/auth/AuthGate.jsx'
import AuthCallback from './components/auth/AuthCallback.jsx'
import { isAuthCallbackUrl } from './lib/authCallback.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Toaster from './components/ui/Toaster.jsx'
import './index.css'

installModalityTracking()

/**
 * An emailed auth link lands on the callback screen first, which resolves
 * the session and cleans the URL; everything else goes straight to the app.
 */
function Root() {
  const [inCallback, setInCallback] = useState(() => isSupabaseConfigured && isAuthCallbackUrl())
  const finish = useCallback(() => setInCallback(false), [])
  if (inCallback) return <AuthCallback onDone={finish} />
  return (
    <AuthGate>
      <App />
    </AuthGate>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppearanceProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <Root />
          </SessionProvider>
          <Toaster />
        </QueryClientProvider>
      </AppearanceProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
