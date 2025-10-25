import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './PaymentResult.css'; 

const PaymentFailure: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentId = queryParams.get('payment_id');
  const status = queryParams.get('status');
  
  useEffect(() => {
    // Puedes registrar el pago fallido en tu analytics
    console.log(`Pago fallido: ${paymentId}, estado: ${status}`);
  }, [paymentId, status]);

  return (
    <div className="payment-result-container failure">
      <div className="result-card">
        <div className="result-icon failure">✗</div>
        <h1>Pago Fallido</h1>
        <p>Lo sentimos, tu pago no pudo ser procesado.</p>
        <p className="payment-info">
          ID de Pago: {paymentId || 'No disponible'}
        </p>
        <p className="payment-info">
          Estado: {status || 'Rechazado'}
        </p>
        <div className="action-buttons">
          <Link to="/boost-checkout" className="button primary">
            Intentar nuevamente
          </Link>
          <Link to="/" className="button secondary">
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;