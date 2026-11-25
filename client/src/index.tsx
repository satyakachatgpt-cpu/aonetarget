
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

if ('fonts' in document) {
  Promise.all([
    document.fonts.load("24px 'Material Symbols Rounded'"),
    document.fonts.load("24px 'Material Symbols Outlined'")
  ]).then(() => {
    document.documentElement.classList.add('material-symbols-ready');
  }).catch(() => {
    setTimeout(() => {
      document.documentElement.classList.add('material-symbols-ready');
    }, 3000);
  });
} else {
  setTimeout(() => {
    document.documentElement.classList.add('material-symbols-ready');
  }, 3000);
}

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
