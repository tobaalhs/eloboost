// src/index.tsx (VERSIÓN FINAL Y CORRECTA)

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import reportWebVitals from './reportWebVitals';
import './styles/fonts.css';
import './i18n.ts';

// --- BLOQUE DE CONFIGURACIÓN DE AMPLIFY ---
import { Amplify } from 'aws-amplify';
// Usamos 'aws-exports', que es el archivo de configuración que tu proyecto utiliza.
import awsExports from './aws-exports'; 

// Esta línea es la más importante. Le da a Amplify todas las claves de tus servicios.
console.log("🟡 Antes de configurar Amplify");
Amplify.configure(awsExports);
console.log("🟢 Amplify configurado correctamente");

// --- FIN DEL BLOQUE ---

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();