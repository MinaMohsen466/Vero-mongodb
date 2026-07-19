import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Override native window confirm/alert to handle Electron focus-loss issues on Windows
const originalConfirm = window.confirm;
window.confirm = function (...args) {
    const result = originalConfirm.apply(this, args);
    if (window.api && typeof window.api.refocus === 'function') {
        window.api.refocus();
    }
    return result;
};

const originalAlert = window.alert;
window.alert = function (...args) {
    originalAlert.apply(this, args);
    if (window.api && typeof window.api.refocus === 'function') {
        window.api.refocus();
    }
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
