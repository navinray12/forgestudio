import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
<<<<<<< HEAD
import './index.css'
import App from './App.tsx'
=======
import './index.css';
import './plugins'; // F-119 Load plugins statically (or dynamically in real remote setups)
import App from './App.tsx';
>>>>>>> 8d95dec (Initial project code)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
