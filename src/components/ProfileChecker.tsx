// src/components/ProfileChecker.tsx

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';

export const ProfileChecker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      console.log('🔍 ProfileChecker: Checking user profile in background...');
      
      const attributes = await fetchUserAttributes();
      
      console.log('📱 Phone number:', attributes.phone_number);
      
      const hasPhone = attributes.phone_number && attributes.phone_number !== '';
      
      // Si no tiene teléfono y NO está en complete-profile, redirigir
      if (!hasPhone && location.pathname !== '/complete-profile') {
        console.log('➡️ Redirecting to /complete-profile');
        navigate('/complete-profile', { replace: true });
      }
    } catch (err) {
      console.error('❌ Error checking profile:', err);
    }
  };

  // NO mostrar pantalla de carga, dejar que el contenido se renderice
  return <>{children}</>;
};
