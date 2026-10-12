import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// React app entry point; application routes and page state live in App.tsx.
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
