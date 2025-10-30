// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import Home from './pages/Home.tsx';
import RankedBoostPage from './pages/lol/RankedBoostPage.tsx';
import Layout from './components/Layout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import BoostCheckout from './pages/BoostCheckout.tsx';
import PaymentSuccess from './pages/PaymentSuccess.tsx';
import PaymentFailure from './pages/PaymentFailure.tsx'; 
import MyOrdersPage from './pages/MyOrdersPage.tsx'; 
import OrderDetailPage from './pages/OrderDetailPage.tsx'; 
import ProfilePage from './pages/ProfilePage.tsx';
import CompleteProfilePage from './pages/CompleteProfilePage.tsx';
import { ProfileChecker } from './components/ProfileChecker.tsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.tsx';
import BoosterDashboard from './pages/booster/BoosterDashboard.tsx';
import AvailableOrdersPage from './pages/booster/AvailableOrdersPage.tsx';
import MyBoosterOrdersPage from './pages/booster/MyBoosterOrdersPage.tsx';
import BoosterEarningsPage from './pages/booster/BoosterEarningsPage.tsx';

function ConditionalProfileChecker({ children }: { children: React.ReactNode }) {
  const { user } = useAuthenticator((context) => [context.user]);
  
  if (user) {
    return <ProfileChecker>{children}</ProfileChecker>;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          {/* IMPORTANTE: Ruta de complete-profile FUERA del Layout (sin navbar) */}
          <Route 
            path="/complete-profile"
            element={
              <Authenticator>
                <CompleteProfilePage />
              </Authenticator>
            }
          />

          {/* Todas las demás rutas CON Layout (con navbar) */}
          <Route path="/" element={<Layout />}>
            <Route 
              index 
              element={
                <ConditionalProfileChecker>
                  <Home />
                </ConditionalProfileChecker>
              } 
            />
            
            <Route 
              path="/lol/ranked" 
              element={
                <ConditionalProfileChecker>
                  <RankedBoostPage />
                </ConditionalProfileChecker>
              } 
            />
            
            <Route path="/login" element={<LoginPage />} />

            <Route 
              path="/boost-checkout"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <BoostCheckout />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            
            <Route 
              path="/my-orders"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <MyOrdersPage />
                  </ProfileChecker>
                </Authenticator>
              }
            />
            
            <Route 
              path="/order/:orderId"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <OrderDetailPage />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route 
              path="/profile"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <ProfilePage />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route 
              path="/admin/users"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <AdminUsersPage />
                  </ProfileChecker>
                </Authenticator>
              }
            />
            
            <Route 
              path="/booster/dashboard"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <BoosterDashboard />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route 
              path="/booster/available-orders"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <AvailableOrdersPage />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route 
              path="/booster/my-orders"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <MyBoosterOrdersPage />
                  </ProfileChecker>
                </Authenticator>
              }
            />

            <Route 
              path="/booster/earnings"
              element={
                <Authenticator>
                  <ProfileChecker>
                    <BoosterEarningsPage />
                  </ProfileChecker>
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
