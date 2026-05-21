import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Fonts — Stadium Scoreboard pairing. All cached by Workbox (woff2 in globPatterns). */
import '@fontsource/oxanium/500.css'
import '@fontsource/oxanium/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
