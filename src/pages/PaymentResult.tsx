// src/pages/PaymentResult.tsx

import { useEffect, useState } from 'react';
// Usamos useSearchParams para leer los parámetros de la URL de forma más fácil
import { useSearchParams } from 'react-router-dom'; 

import PaymentSuccess from './PaymentSuccess.tsx'; 
import PaymentFailure from './PaymentFailure.tsx';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failure'>('loading');

  useEffect(() => {
    // --- CAMBIO CLAVE: Verificación real en lugar de simulación ---
    // Leemos el parámetro 'orderId' que nos envía la función verifyPayment.
    const orderId = searchParams.get('orderId');
    const error = searchParams.get('error');

    if (orderId) {
      // Si existe un 'orderId', el pago fue un éxito.
      setStatus('success');
    } else if (error) {
      // Si hay un parámetro 'error', el pago falló.
      setStatus('failure');
    } else {
      // Si no hay ninguno, seguimos "cargando" o mostramos un error.
      // Por seguridad, lo marcamos como fallo si no hay token/orderId.
      setStatus('failure');
    }
  }, [searchParams]);

  if (status === 'loading') {
    // Puedes mantener un estado de carga si lo deseas, aunque la verificación es rápida
    return <div>Verificando estado del pago...</div>;
  }

  if (status === 'success') {
    // Si el estado es 'success', renderizamos el componente de éxito como antes.
    return <PaymentSuccess />;
  } 

  // Si el estado es 'failure', renderizamos el componente de fallo.
  return <PaymentFailure />;
};

export default PaymentResult;