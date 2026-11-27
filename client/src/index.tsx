
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { Provider } from 'react-redux';
import { store } from './store';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Instant font readiness without 3-second block
document.documentElement.classList.add('material-symbols-ready');
if ('fonts' in document) {
  Promise.all([
    document.fonts.load("24px 'Material Symbols Rounded'"),
    document.fonts.load("24px 'Material Symbols Outlined'")
  ]).catch(() => {});
}

// In dev mode, unregister any leftover Service Workers so localhost never serves stale cached chunks
if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
