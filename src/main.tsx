import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const PREVIEW_RESET_KEY = 'kiduka-preview-sw-reset'

const isLovablePreviewHost = () => {
  const host = window.location.hostname
  return (
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'lovable.app' ||
    host.endsWith('.lovable.app') ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--')
  )
}

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

  if (import.meta.env.PROD && !isLovablePreviewHost() && !window.location.search.includes('sw=off') && window.self === window.top && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('SW registered: ', registration)
      } catch (registrationError) {
        console.log('SW registration failed: ', registrationError)
      }
    })
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => undefined)
  }
}

bootstrap()

