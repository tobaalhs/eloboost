// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Importamos todos nuestros componentes y páginas
import Home from './pages/Home.tsx';
import RankedBoostPage from './pages/lol/RankedBoostPage.tsx';
import Layout from './components/Layout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import BoostCheckout from './pages/BoostCheckout.tsx';
import PaymentSuccess from './pages/PaymentSuccess.tsx';
import PaymentFailure from './pages/PaymentFailure.tsx'; 
import MyOrdersPage from './pages/MyOrdersPage.tsx'; 
import OrderDetailPage from './pages/OrderDetailPage.tsx'; 

// Ya no necesitamos PaymentResult.tsx
// import PaymentResult from './pages/PaymentResult.tsx';

function App() {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>

            <Route index element={<Home />} />
            <Route path="/lol/ranked" element={<RankedBoostPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route 
              path="/boost-checkout"
              element={
                <Authenticator>
                  <BoostCheckout />
                </Authenticator>
              }
            />

            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            
            <Route 
              path="/my-orders"
              element={
                <Authenticator>
                  <MyOrdersPage />
                </Authenticator>
              }
            />
            
            <Route 
              path="/order/:orderId" // La ruta dinámica
              element={
                <Authenticator>
                  <OrderDetailPage />
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