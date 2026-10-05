/**
 * main.tsx
 * The entry point for the React application.
 * Mounts the App component into the HTML DOM.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Imports the global CSS, including Tailwind CSS styles

import { GoogleOAuthProvider } from '@react-oauth/google';

// Purge legacy local storage to ensure security
try {
  localStorage.clear();
} catch (e) {}

// Find the root element in the HTML
const rootElement = document.getElementById('root');

if (rootElement) {
  // Render the App component wrapped in StrictMode to highlight potential problems
  createRoot(rootElement).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'}>
        <App />
      </GoogleOAuthProvider>
    </StrictMode>,
  );
}
