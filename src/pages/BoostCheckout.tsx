// src/pages/BoostCheckout.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTranslation } from 'react-i18next';
import './BoostCheckout.css'; // Importamos los estilos
import { post } from 'aws-amplify/api';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

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

interface ApiResponse {
  paymentUrl?: string; // La '?' significa que esta propiedad es opcional
  error?: string;      // Esta también es opcional
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

  // ... (dentro de tu componente BoostCheckout)

const handleProceedToPayment = async () => {
  if (!boostData) return;

  setIsProcessing(true);
  setError(null);

  console.log("Iniciando proceso de pago...");

  try {
    const userAttributes = await fetchUserAttributes();
    const userEmail = userAttributes.email;

    if (!userEmail) {
      throw new Error("No se pudo obtener el email del usuario.");
    }

    // Obtener el userId (sub) del token JWT
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub as string;

    if (!userId) {
      throw new Error("No se pudo obtener el ID del usuario.");
    }

    console.log("📝 User ID (sub) para la orden:", userId);

    const requestBody = {
      amount: parseInt(boostData.priceCLP.replace(/\D/g, '')),
      subject: `Eloboost de ${boostData.fromRank} a ${boostData.toRank}`,
      ...boostData,
      email: userEmail,
      userId: userId  // Enviar el userId explícitamente
    };

    console.log("Enviando al backend:", requestBody);

    const response = await post({
      apiName: 'eloboostApi',
      path: '/create-payment-link',
      options: {
        body: requestBody
      }
    }).response;

    // --- CORRECCIÓN APLICADA AQUÍ ---
    const data = await response.body.json() as ApiResponse;
    
    console.log('Respuesta del backend:', data);

    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      throw new Error(data.error || "La respuesta del backend no contenía una URL de pago.");
    }

  } catch (err: any) {
    console.error("Error al llamar a la API o procesar el pago:", err);
    setError(err.message || "Ocurrió un error al intentar generar el link de pago.");
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