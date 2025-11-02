// src/pages/OrderDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import './OrderDetailPage.css';
import ChatBox from '../components/ChatBox.tsx';
import CustomerCredentialsForm from '../components/CustomerCredentialsForm.tsx';

// Importaciones de imágenes
import ironImg from '../assets/ranks/iron.svg';
import bronzeImg from '../assets/ranks/bronze.svg';
import silverImg from '../assets/ranks/silver.svg';
import goldImg from '../assets/ranks/gold.svg';
import platinumImg from '../assets/ranks/platinum.svg';
import emeraldImg from '../assets/ranks/emerald.svg';
import diamondImg from '../assets/ranks/diamond.svg';
import masterImg from '../assets/ranks/master.svg';
import grandmasterImg from '../assets/ranks/grandmaster.svg';
import challengerImg from '../assets/ranks/challenger.svg';

const rankImageMap: { [key: string]: string } = {
  iron: ironImg,
  bronze: bronzeImg,
  silver: silverImg,
  gold: goldImg,
  platinum: platinumImg,
  emerald: emeraldImg,
  diamond: diamondImg,
  master: masterImg,
  grandmaster: grandmasterImg,
  challenger: challengerImg
};

interface OrderDetails {
  orderId: string;
  nickname: string;
  amount: number;
  createdAt: string;
  status: 'pending' | 'paid' | 'completed';
  fromRank: string;
  toRank: string;
  server: string;
  queueType: string;
  duoBoost: boolean;
  offlineMode: boolean;
  priorityBoost: boolean;
  selectedChampions?: string;
  boosterUsername?: string;
  boosterDisplayName?: string;
  boosterStatus?: 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; // ✅ Estado del booster
  boosterCompletedAt?: string; // ✅ Fecha de completación
  gameUsername?: string; // ✅ Usuario de juego (encriptado en backend)
  gamePassword?: string; // ✅ Contraseña de juego (encriptado en backend)
  credentialsUpdatedAt?: string; // ✅ Fecha de actualización de credenciales
}

const getRankImageUrl = (rank: string): string => {
  if (!rank) return '';
  const tierName = rank.split(' ')[0].toLowerCase();
  const keyMap: { [key: string]: string } = {
    'hierro': 'iron', 'bronce': 'bronze', 'plata': 'silver', 'oro': 'gold',
    'platino': 'platinum', 'esmeralda': 'emerald', 'diamante': 'diamond',
    'maestro': 'master', 'gran maestro': 'grandmaster', 'retador': 'challenger'
  };
  const imageKey = keyMap[tierName];
  return rankImageMap[imageKey] || '';
};

// ✅ Función para obtener el estado del boost
const getBoostStatus = (boosterStatus?: string) => {
  const statusMap: { [key: string]: { text: string; icon: string; class: string } } = {
    'CLAIMED': { text: 'Booster Asignado', icon: '👤', class: 'boost-claimed' },
    'IN_PROGRESS': { text: 'Boost en Progreso', icon: '🎮', class: 'boost-in-progress' },
    'COMPLETED': { text: '✅ Boost Completado', icon: '🎉', class: 'boost-completed' },
    'CANCELLED': { text: 'Boost Cancelado', icon: '❌', class: 'boost-cancelled' }
  };

  return statusMap[boosterStatus || ''] || { text: 'Esperando Booster', icon: '⏳', class: 'boost-waiting' };
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setStatus('error');
        setErrorMessage('ID de orden no válido.');
        return;
      }

      setStatus('loading');
      setOrder(null);

      try {
        // Obtener el userId (sub) del token JWT
        const session = await fetchAuthSession();
        const userId = session.tokens?.idToken?.payload?.sub as string;

        console.log('📋 Fetching order detail for userId (sub):', userId);

        const restOperation = get({
          apiName: 'eloboostApi',
          path: `/order/${orderId}`,
          options: {
            queryParams: {
              userId: userId
            }
          }
        });

        const { body } = await restOperation.response;
        const data: unknown = await body.json();

        if (typeof data !== 'object' || data === null) {
          throw new Error('La respuesta de la API no es un objeto válido.');
        }

        if ('error' in data && typeof (data as {error: unknown}).error === 'string') {
          throw new Error((data as {error: string}).error);
        }

        setOrder(data as OrderDetails);
        setStatus('success');

      } catch (err: any) {
        console.error('Error detallado al obtener la orden:', err);
        setErrorMessage(err.message || t('orderdetail.errorLoading'));
        setStatus('error');
      }
    };

    fetchOrderDetails();
  }, [orderId, t]);

  const handleCancelOrder = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar orden',
      cancelButtonText: 'No, mantener orden'
    });

    if (result.isConfirmed) {
      try {
        await post({
          apiName: 'eloboostApi',
          path: '/cancel-order',
          options: {
            body: { orderId }
          }
        }).response;

        await Swal.fire({
          title: 'Orden cancelada',
          text: 'Tu orden ha sido cancelada exitosamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });

        navigate('/my-orders');
      } catch (error: any) {
        console.error('Error al cancelar la orden:', error);
        Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudo cancelar la orden',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    }
  };

  if (status === 'loading') {
    return <div className="detail-container"><div className="loader"></div></div>;
  }

  if (status === 'error') {
    return (
      <div className="detail-container">
        <h2 className="error-title">{t('common.error')}</h2>
        <p className="error-text">{errorMessage}</p>
        <Link to="/my-orders" className="details-button">Volver a mis órdenes</Link>
      </div>
    );
  }

  const handleCredentialsSaved = () => {
    // Refrescar los datos de la orden después de guardar credenciales
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        // Obtener el userId (sub) del token JWT
        const session = await fetchAuthSession();
        const userId = session.tokens?.idToken?.payload?.sub as string;

        const restOperation = get({
          apiName: 'eloboostApi',
          path: `/order/${orderId}`,
          options: {
            queryParams: {
              userId: userId
            }
          }
        });

        const { body } = await restOperation.response;
        const data: unknown = await body.json();

        if (typeof data === 'object' && data !== null && !('error' in data)) {
          setOrder(data as OrderDetails);
        }
      } catch (err) {
        console.error('Error al refrescar orden:', err);
      }
    };

    fetchOrderDetails();
  };

  if (status === 'success' && order) {
    // ✅ Determinar si mostrar el chat (solo si NO está completado)
    const showChat = order.boosterStatus !== 'COMPLETED' && order.boosterUsername;
    const boostStatus = getBoostStatus(order.boosterStatus);
    const hasCredentials = !!(order.gameUsername && order.gamePassword);
    const showCredentialsForm = order.status === 'paid'; // Solo mostrar si está pagada

    return (
        <div className="detail-container">
        <h1 className="detail-title">{t('orderdetail.title')}</h1>
        <p className="detail-subtitle">{t('orderdetail.orderId', { id: order.orderId })}</p>

        <div className="detail-grid">
          <div className="detail-card main-details">
            <h2>{t('orderdetail.summary')}</h2>
            <div className="detail-item"><span>{t('orderdetail.boost')}:</span> <span>{order.fromRank} → {order.toRank}</span></div>
            <div className="detail-item"><span>{t('orderdetail.server')}:</span> <span>{order.server}</span></div>
            <div className="detail-item"><span>{t('orderdetail.queue')}:</span> <span>{order.queueType}</span></div>
            <div className="detail-item"><span>{t('orderdetail.amount')}:</span> <span>${order.amount.toLocaleString('es-CL')} CLP</span></div>
            <div className="detail-item"><span>{t('orderdetail.date')}:</span> <span>{new Date(order.createdAt).toLocaleString('es-CL')}</span></div>
            <div className="detail-item"><span>{t('orderdetail.status')}:</span> <span className={`status-badge status-${order.status}`}>{t(`myorders.status.${order.status}`)}</span></div>
          </div>
          
          <div className="detail-card progress-tracker">
            <h2>{t('orderdetail.progress')}</h2>
            
            {/* ✅ Estado del Boost */}
            <div className={`boost-status ${boostStatus.class}`}>
              <span className="boost-status-icon">{boostStatus.icon}</span>
              <span className="boost-status-text">{boostStatus.text}</span>
            </div>

            {/* ✅ Mensaje especial cuando está completado */}
            {order.boosterStatus === 'COMPLETED' && (
              <div className="boost-completed-message">
                <div className="completed-icon">🎉</div>
                <h3>¡Boost Completado!</h3>
                <p>Tu boost ha sido completado exitosamente.</p>
                {order.boosterCompletedAt && (
                  <p className="completed-date">
                    Completado el: {new Date(order.boosterCompletedAt).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            )}

            {/* Progreso visual (siempre visible) */}
            <div className="live-progress-container">
              <div className="rank-display">
                <h3>Rango Inicial</h3>
                <img src={getRankImageUrl(order.fromRank)} alt={order.fromRank} className="rank-emblem" />
                <p>{order.fromRank}</p>
              </div>
              <div className="progress-arrow">
                {order.boosterStatus === 'COMPLETED' ? '✅' : '→'}
              </div>
              <div className="rank-display">
                <h3>Rango Objetivo</h3>
                <img src={getRankImageUrl(order.toRank)} alt={order.toRank} className="rank-emblem" />
                <p>{order.toRank}</p>
              </div>
            </div>
            
            <a href={`https://www.leagueofgraphs.com/summoner/${order.server.toLowerCase()}/${encodeURIComponent(order.nickname)}`} target="_blank" rel="noopener noreferrer" className="progress-button">
              Ver progreso en vivo
            </a>
          </div>

          <div className="detail-card options">
            <h2>{t('orderdetail.options')}</h2>
            <div className="detail-item"><span>{t('orderdetail.duoBoost')}:</span> <span>{order.duoBoost ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.offlineMode')}:</span> <span>{order.offlineMode ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.priority')}:</span> <span>{order.priorityBoost ? 'Sí' : 'No'}</span></div>
          </div>

          {/* ✅ Formulario de credenciales - Solo para órdenes pagadas */}
          {showCredentialsForm && (
            <div className="detail-card credentials-card">
              <CustomerCredentialsForm
                orderId={order.orderId}
                hasCredentials={hasCredentials}
                onCredentialsSaved={handleCredentialsSaved}
              />
              {hasCredentials && (
                <div className="credentials-saved-indicator">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Credenciales guardadas</span>
                  {order.credentialsUpdatedAt && (
                    <small>Última actualización: {new Date(order.credentialsUpdatedAt).toLocaleString('es-CL')}</small>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ✅ Mostrar booster solo si está asignado */}
          {(order.boosterDisplayName || order.boosterUsername) && (
            <div className="detail-card booster-details">
              <h2>Tu Booster</h2>
              <div className="booster-profile">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="booster-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>{order.boosterDisplayName || order.boosterUsername}</span>
              </div>
            </div>
          )}

          {/* ✅ Chat - Solo visible si NO está completado */}
          {showChat && (
            <div className="detail-card chat-container">
              <h2>Chat con tu Booster</h2>
              {console.log('💬 Cliente Chat - boosterUsername (recipientUserId):', order.boosterUsername, 'orderId:', order.orderId)}
              <ChatBox
                orderId={order.orderId}
                recipientUserId={order.boosterUsername}
                recipientName={order.boosterDisplayName || order.boosterUsername}
              />
            </div>
          )}

          {/* ✅ Mensaje cuando el chat ya no está disponible */}
          {order.boosterStatus === 'COMPLETED' && (
            <div className="detail-card chat-unavailable">
              <h2>Chat</h2>
              <div className="chat-unavailable-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <line x1="9" y1="10" x2="15" y2="10"></line>
                </svg>
                <p>El chat ha sido cerrado</p>
                <p className="chat-closed-reason">Tu boost ha sido completado exitosamente</p>
              </div>
            </div>
          )}

          {order.status === 'pending' && (
            <div className="cancel-section">
                <button onClick={handleCancelOrder} className="cancel-button">
                    {t('orderdetail.cancelOrder')}
                </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default OrderDetailPage;