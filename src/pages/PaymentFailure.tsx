// src/pages/PaymentFailure.tsx

import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PaymentResult.css'; // Reutilizamos los mismos estilos

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const flowOrder = searchParams.get('flowOrder');
  const errorReason = searchParams.get('error'); // Para futuros diagnósticos

  return (
    <div className="payment-result-container">
      {/* Podríamos crear un ícono de 'X' animado similar al checkmark */}
      <div className="payment-success-card">
        <div className="failure-icon-wrapper" style={{ marginBottom: '30px' }}>
          <svg className="failure-xmark" viewBox="0 0 52 52">
            <circle className="failure-xmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="failure-xmark-line1" d="M16 16 36 36" fill="none" />
            <path className="failure-xmark-line2" d="M36 16 16 36" fill="none" />
          </svg>
        </div>

        <h1 className="failure-title">Hubo un Problema</h1>
        <p className="failure-message">
          Lo sentimos, no pudimos procesar tu pago. Por favor, verifica tus datos e inténtalo de nuevo.
        </p>

        {flowOrder && (
          <div className="order-info-box" style={{ borderColor: 'rgba(231, 76, 60, 0.3)' }}>
            <span className="order-label">ID de Orden Rechazada:</span>
            <span className="order-id" style={{ color: '#e74c3c' }}>{flowOrder}</span>
          </div>
        )}

        <div className="action-buttons">
          <button className="primary-button" style={{ background: '#e74c3c', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)' }} onClick={() => navigate("/boost-checkout")}>
            Volver a Intentar
          </button>
          <Link to="/" className="secondary-button">
            Volver al Inicio
          </Link>
        </div>

        <div className="support-link">
          <p>
            Si el problema persiste, <a href="/support">contacta a soporte</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;