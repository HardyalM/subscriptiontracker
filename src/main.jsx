import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { SessionProvider } from './lib/session.jsx'
import AuthGate from './components/auth/AuthGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SessionProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </SessionProvider>
  </React.StrictMode>,
)
