import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/pwaInstall'
import { retireAppWorker } from './utils/retireAppWorker'
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')
ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>)
void retireAppWorker()
