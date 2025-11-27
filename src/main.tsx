import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initSentry } from './sentry'
initSentry(import.meta.env.VITE_SENTRY_DSN)


const rootElement = document.getElementById('root')
if (rootElement) {
  const root = createRoot(rootElement as HTMLElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  console.error('Root element with id "root" not found. Did you run the app without index.html?')
}
