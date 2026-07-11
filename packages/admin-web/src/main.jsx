import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@oil-search/ui/styles/tokens.css'
import '@oil-search/ui/styles/global.css'
// import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
