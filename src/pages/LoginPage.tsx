// src/pages/LoginPage.tsx

import { Authenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Función para verificar el perfil
    const checkAndRedirect = async () => {
      try {
        const attributes = await fetchUserAttributes();
        
        if (!attributes.phone_number || attributes.phone_number === '') {
          console.log('🔴 Redirecting to complete-profile');
          navigate('/complete-profile', { replace: true });
        } else {
          console.log('✅ Redirecting to home');
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      }
    };

    // Escuchar evento de autenticación de Amplify
    const hubListener = Hub.listen('auth', async ({ payload }) => {
      const { event } = payload;
      
      console.log('🔔 Auth event:', event);
      
      if (event === 'signedIn') {
        // Usuario acaba de iniciar sesión
        console.log('✨ User signed in - checking profile...');
        await checkAndRedirect();
      }
    });

    // Limpiar el listener cuando se desmonte
    return () => hubListener();
  }, [navigate]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#0a061d'
    }}>
      <Authenticator socialProviders={['google']} />
    </div>
  );
};

export default LoginPage;
