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
import { ResourcesConfig } from 'aws-amplify';
// Usamos 'aws-exports', que es el archivo de configuración que tu proyecto utiliza.
import awsExports from './aws-exports';

// Esta línea es la más importante. Le da a Amplify todas las claves de tus servicios.
console.log("🟡 Antes de configurar Amplify");

// Configuración personalizada para forzar Cognito User Pools en APIs REST
// IMPORTANTE: Mantener la configuración de GraphQL para subscriptions en tiempo real
const amplifyConfig: ResourcesConfig = {
  ...awsExports,
  API: {
    GraphQL: {
      endpoint: awsExports.aws_appsync_graphqlEndpoint,
      region: awsExports.aws_appsync_region,
      defaultAuthMode: awsExports.aws_appsync_authenticationType as any,
      apiKey: awsExports.aws_appsync_apiKey
    },
    REST: {
      eloboostApi: {
        endpoint: 'https://o5jbvq3t06.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      },
      AdminQueries: {
        endpoint: 'https://07vqw9o7va.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      },
      userManagementAPI: {
        endpoint: 'https://ri0ncms0dl.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      },
      adminAPI: {
        endpoint: 'https://4pvb513411.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      },
      boosterAPI: {
        endpoint: 'https://zc750m9lt3.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      },
      notificationsAPI: {
        endpoint: 'https://621l3ey1ka.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      }
    }
  }
};

Amplify.configure(amplifyConfig);

// ✅ Exponer configuración globalmente para debugging de subscriptions
(window as any).amplifyConfig = amplifyConfig;

console.log("🟢 Amplify configurado correctamente");
console.log("📡 GraphQL endpoint:", awsExports.aws_appsync_graphqlEndpoint);
console.log("🔑 AppSync auth type:", awsExports.aws_appsync_authenticationType);

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