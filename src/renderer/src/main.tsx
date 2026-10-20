import '@fontsource-variable/figtree'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/kit.css'
import './styles/app.css'
import './styles/dialogs.css'
import './styles/editor.css'
import './styles/extras.css'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/700.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
