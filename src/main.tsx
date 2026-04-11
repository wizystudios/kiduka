import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const PREVIEW_RESET_KEY = 'kiduka-preview-sw-reset'

const clearPreviewCaches = async () => {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) {
    return false
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  const hadRegistrations = registrations.length > 0

  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    await Promise.all(
      cacheKeys
        .filter((key) => key.startsWith('kiduka-') || key === 'failed-requests')
        .map((key) => caches.delete(key))
    )
  }

  return hadRegistrations
}

const bootstrap = async () => {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const resetPreviewCache = await clearPreviewCaches()

  if (resetPreviewCache && !sessionStorage.getItem(PREVIEW_RESET_KEY)) {
    sessionStorage.setItem(PREVIEW_RESET_KEY, 'done')
    window.location.reload()
    return
  }

  sessionStorage.removeItem(PREVIEW_RESET_KEY)

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('SW registered: ', registration)
      } catch (registrationError) {
        console.log('SW registration failed: ', registrationError)
      }
    })
  }
}

bootstrap()

