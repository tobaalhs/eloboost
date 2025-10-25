// src/components/Layout.tsx
import { Outlet } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from './Navbar.tsx';
import './Navbar.css'; // Importamos el CSS de la Navbar aquí

const Layout = () => {
  const { user, signOut } = useAuthenticator((context) => [context.user]);

  return (
    <div>
      <Navbar user={user} signOut={signOut} />
      <main>
        {/* Outlet renderizará el componente de la ruta actual */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;