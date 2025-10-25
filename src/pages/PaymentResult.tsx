// src/pages/PaymentResult.tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Suponiendo que ya tienes estos componentes creados
import PaymentSuccess from './PaymentSuccess.tsx'; 
import PaymentFailure from './PaymentFailure.tsx';

const PaymentResult = () => {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failure'>('loading');

  useEffect(() => {
    // Flow nos devuelve el resultado en un parámetro 'token' vía POST, 
    // pero la redirección final a urlReturn es GET (sin cuerpo).
    // En un sistema de producción, aquí haríamos una llamada a nuestro backend
    // para verificar el estado real del token del pago.

    // Por ahora, para esta prueba, vamos a simular que si llega aquí, es un éxito.
    // El verdadero estado lo confirmará el webhook.
    const timer = setTimeout(() => {
        setStatus('success');
    }, 1500); // Simulamos una pequeña carga

    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading') {
    return <div>Verificando pago...</div>;
  }

  if (status === 'success') {
    return <PaymentSuccess />;
  } 

  // En el futuro, si la verificación del token falla, mostraríamos esto.
  return <PaymentFailure />;
};

export default PaymentResult;