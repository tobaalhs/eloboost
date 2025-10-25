// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Corregimos las rutas para que coincidan con la estructura de carpetas
import Home from './pages/Home.tsx';
import RankedBoostPage from './pages/lol/RankedBoostPage.tsx';
import Layout from './components/Layout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import BoostCheckout from './pages/BoostCheckout.tsx';

function App() {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>

            <Route index element={<Home />} />
            <Route path="/lol/ranked" element={<RankedBoostPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* --- NUEVA RUTA PROTEGIDA --- */}
            <Route 
              path="/boost-checkout"
              element={
                <Authenticator>
                  <BoostCheckout />
                </Authenticator>
              }
            />

          </Route>
        </Routes>
      </BrowserRouter>
    </Authenticator.Provider>
  );
}

export default App;