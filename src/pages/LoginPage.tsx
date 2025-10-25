// src/pages/LoginPage.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

const LoginPage = () => {
  const { route } = useAuthenticator(context => [context.route]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectPath = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (route === 'authenticated') {
      navigate(redirectPath, { replace: true });
    }
  }, [route, navigate, redirectPath]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 20px' }}>
      <Authenticator />
    </div>
  );
};

export default LoginPage;