import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './PaymentResult.css';

const PaymentPending: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentId = queryParams.get('payment_id');
  const status = queryParams.get('status');
  
  useEffect(() => {
    // Puedes registrar el pago pendiente en tu analytics
    console.log(`Pago pendiente: ${paymentId}, estado: ${status}`);
  }, [paymentId, status]);

  return (
    <div className="payment-result-container pending">
      <div className="result-card">
        <div className="result-icon pending">⏱️</div>
        <h1>Pago en Proceso</h1>
        <p>Tu pago está siendo procesado. Te notificaremos cuando se complete.</p>
        <p className="payment-info">
          ID de Pago: {paymentId || 'No disponible'}
        </p>
        <p className="payment-info">
          Estado: {status || 'En proceso'}
        </p>
        <div className="action-buttons">
          <Link to="/" className="button primary">
            Volver al Inicio
          </Link>
          <Link to="/profile" className="button secondary">
            Ver mi perfil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending;