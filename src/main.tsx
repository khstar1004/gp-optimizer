import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './App';
import '../css/style.css';
import '../css/strike.css';

const root = document.getElementById('root');
if (!root) throw new Error('GP Digital Twin root element is missing');

// The shell is strict-mode safe; the Cesium runtime is guarded internally too.
createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
