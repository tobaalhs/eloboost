import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import reportWebVitals from './reportWebVitals';
import './styles/fonts.css';
import './i18n.ts';

import { Amplify } from 'aws-amplify';
// El import ahora apunta a un archivo que no existe todavía, pero Amplify lo crea.
// Si VS Code lo subraya en rojo, no te preocupes, es normal hasta que Amplify lo genere.
import awsExports from './aws-exports'; 
Amplify.configure(awsExports);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();