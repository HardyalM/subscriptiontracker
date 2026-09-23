import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { queryClient } from './lib/queryClient.js'
import { SessionProvider } from './lib/session.jsx'
import { AppearanceProvider } from './lib/appearance.jsx'
import { installModalityTracking } from './lib/modality.js'
import AuthGate from './components/auth/AuthGate.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Toaster from './components/ui/Toaster.jsx'
import './index.css'

installModalityTracking()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppearanceProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <AuthGate>
              <App />
            </AuthGate>
          </SessionProvider>
          <Toaster />
        </QueryClientProvider>
      </AppearanceProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
