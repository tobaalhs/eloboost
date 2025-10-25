// src/pages/BoostCheckout.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTranslation } from 'react-i18next';
import './BoostCheckout.css'; // Importamos los estilos
import { fetchUserAttributes } from 'aws-amplify/auth';

// Definimos una interfaz para los datos del boost para que TypeScript sepa qué esperar
interface BoostData {
  fromRank: string;
  toRank: string;
  nickname: string;
  server: string;
  queueType: string;
  currentLP: string;
  lpPerWin: string;
  selectedLane: string;
  flash: string;
  selectedChampions: string[];
  offlineMode: boolean;
  duoBoost: boolean;
  priorityBoost: boolean;
  priceCLP: string;
  priceUSD: string;
  displayCurrency: 'USD' | 'CLP';
}

const BoostCheckout: React.FC = () => {
  const { user } = useAuthenticator(context => [context.user]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [boostData, setBoostData] = useState<BoostData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay un usuario logueado, no debería estar aquí. Lo devolvemos.
    if (!user) {
      navigate('/login?redirect=/boost-checkout');
      return;
    }

    const savedData = localStorage.getItem('pendingBoostOrder');
    if (!savedData) {
      navigate('/lol/ranked'); // Si no hay datos, volver al formulario
      return;
    }

    try {
      setBoostData(JSON.parse(savedData));
    } catch (error) {
      console.error('Error al leer los datos del boost:', error);
      navigate('/lol/ranked');
    }
  }, [user, navigate]);

  const handleProceedToPayment = async () => { // <--- 1. Marcar como async
  if (!boostData) return;

  setIsProcessing(true);
  setError(null);

  console.log("Iniciando proceso de pago...");
  console.log("Datos del pedido:", boostData);

  try {
    // 2. Obtenemos los atributos del usuario de forma segura
    const userAttributes = await fetchUserAttributes();
    const userEmail = userAttributes.email;

    console.log("Usuario:", userEmail); // <--- 3. Usamos el email obtenido

    // **PRÓXIMAMENTE:**
    // 1. Llamar a AWS Lambda con 'boostData' y 'userEmail'.
    // ...

    await new Promise(resolve => setTimeout(resolve, 2000));
    setError("La conexión con el sistema de pagos aún no está implementada.");

  } catch (err) {
    console.error("Error obteniendo atributos o procesando pago:", err);
    setError("Ocurrió un error al intentar generar el link de pago.");
  } finally {
    setIsProcessing(false);
  }
};

  // Si los datos aún no se han cargado, mostramos un mensaje
  if (!boostData) {
    return <div className="loading">Cargando resumen del pedido...</div>;
  }

  return (
    <div className="boost-checkout-container">
      <div className="checkout-content">
        <h1>{t('checkout.title')}</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="order-summary-checkout">
          <h2>{t('checkout.orderSummary')}</h2>
          <div className="summary-details">
            <div className="summary-row"><span>{t('checkout.from')}:</span><span>{boostData.fromRank}</span></div>
            <div className="summary-row"><span>{t('checkout.to')}:</span><span>{boostData.toRank}</span></div>
            <div className="summary-row"><span>{t('checkout.server')}:</span><span>{boostData.server}</span></div>
            <div className="summary-row"><span>{t('checkout.nickname')}:</span><span>{boostData.nickname}</span></div>
            {/* ... puedes añadir más detalles del resumen aquí ... */}
          </div>
          <div className="price-summary">
            <div className="price-row">
              <span>{t('checkout.total')}:</span>
              <span className="price">
                {boostData.displayCurrency === 'CLP' ? `${boostData.priceCLP} CLP` : `${boostData.priceUSD} USD`}
              </span>
            </div>
          </div>
        </div>

        <div className="payment-section">
          <h2>{t('checkout.paymentMethods')}</h2>
          <p>Serás redirigido a la plataforma de Flow para completar tu pago de forma segura.</p>

          <button 
            className={`checkout-btn ${isProcessing ? 'disabled' : ''}`}
            disabled={isProcessing}
            onClick={handleProceedToPayment}
          >
            {isProcessing ? 'Procesando...' : 'Ir a Pagar'}
          </button>
        </div>

        <button 
          className="back-button"
          onClick={() => navigate('/lol/ranked')}
          disabled={isProcessing}
        >
          {t('checkout.backToBoost')}
        </button>
      </div>
    </div>
  );
};

export default BoostCheckout;