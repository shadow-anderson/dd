import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export { default as Dashboard } from './Dashboard';
export { default as Appointments } from './Appointments';
export { default as Patients } from './Patients';
export { default as Documents } from './Documents';
export { default as Invoices } from './Invoices';
export { default as Availability } from './Availability';
export { default as AiAssistant } from './AiAssistant';
