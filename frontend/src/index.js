import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Mount to #react-root (for embedding) or #root (standalone)
const rootElement = document.getElementById('react-root') || document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
