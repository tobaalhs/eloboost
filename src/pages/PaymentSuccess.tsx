// src/pages/PaymentSuccess.tsx

import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './PaymentResult.css'; // Asegúrate de tener este archivo de estilos

const PaymentSuccess: React.FC = () => {
  // useSearchParams es la forma moderna de leer parámetros de la URL como '?flowOrder=...'
  const [searchParams] = useSearchParams();

  // Leemos el 'flowOrder' que nos envió la redirección
  const flowOrder = searchParams.get('flowOrder');

  useEffect(() => {
    // Aquí podrías guardar el 'flowOrder' o enviarlo a un sistema de analytics
    console.log(`Pago exitoso confirmado en el frontend. Flow Order: ${flowOrder}`);

    // Es una buena práctica limpiar el pedido del localStorage después de un pago exitoso
    localStorage.removeItem('pendingBoostOrder');
  }, [flowOrder]);

  return (
    <div className="payment-result-container success">
      <div className="result-card">
        <div className="result-icon success">✓</div>
        <h1>¡Pago Realizado con Éxito!</h1>
        <p>Tu pago ha sido procesado correctamente y tu pedido ha sido registrado.</p>

        {flowOrder && (
          <p className="payment-info">
            ID de Orden: {flowOrder}
          </p>
        )}

        <div className="action-buttons">
          <Link to="/" className="button primary">
            Volver al Inicio
          </Link>
          <Link to="/profile" className="button secondary">
            Ver Mi Perfil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;