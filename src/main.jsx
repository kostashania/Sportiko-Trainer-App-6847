import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Log Supabase URL for debugging
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL || "Not defined");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);