
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

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
