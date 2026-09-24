import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { notificationService } from './services/notificationService'

// Initialize PWA Service Worker for Push Notifications and offline support
if (typeof window !== 'undefined') {
  notificationService.registerServiceWorker();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
