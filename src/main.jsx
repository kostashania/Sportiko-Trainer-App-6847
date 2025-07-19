import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Log environment variables for debugging
console.log("🔧 Environment Variables:");
console.log("- Mode:", import.meta.env.MODE);
console.log("- Supabase URL:", import.meta.env.VITE_SUPABASE_URL || "Not defined");
console.log("- Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Defined" : "❌ Missing");
console.log("- Service Role:", import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? "✓ Available" : "❌ Not available");
console.log("- App Name:", import.meta.env.VITE_APP_NAME || "Sportiko Trainer");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);