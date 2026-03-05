import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color: red; padding: 20px; background: white;">
      <h1>Fatal Error</h1>
      <p>${message}</p>
      <pre>${error?.stack}</pre>
    </div>`;
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <App />
);
