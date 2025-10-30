// src/pages/OrderDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get, post } from 'aws-amplify/api';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import './OrderDetailPage.css';
import ChatBox from '../components/ChatBox.tsx';

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
  boosterUsername?: string; // ID único del booster (sub)
  boosterDisplayName?: string; // ✅ Nombre legible del booster
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
        const restOperation = get({
          apiName: 'eloboostApi',
          path: `/order/${orderId}`
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
    // Sin cambios en esta función
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

  if (status === 'success' && order) {
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
            <div className="live-progress-container">
              <div className="rank-display">
                <h3>Rango Actual</h3>
                <img src={getRankImageUrl(order.fromRank)} alt={order.fromRank} className="rank-emblem" />
                <p>{order.fromRank}</p>
              </div>
              <div className="progress-arrow">→</div>
              <div className="rank-display">
                <h3>Rango Deseado</h3>
                <img src={getRankImageUrl(order.toRank)} alt={order.toRank} className="rank-emblem" />
                <p>{order.toRank}</p>
              </div>
            </div>
            <a href={`https://www.leagueofgraphs.com/summoner/${order.server.toLowerCase()}/${encodeURIComponent(order.nickname)}`} target="_blank" rel="noopener noreferrer" className="progress-button">
              Haz click aquí para ver el progreso en vivo
            </a>
          </div>

          <div className="detail-card options">
            <h2>{t('orderdetail.options')}</h2>
            <div className="detail-item"><span>{t('orderdetail.duoBoost')}:</span> <span>{order.duoBoost ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.offlineMode')}:</span> <span>{order.offlineMode ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.priority')}:</span> <span>{order.priorityBoost ? 'Sí' : 'No'}</span></div>
          </div>

          {/* ✅ Mostrar el nombre legible del booster */}
          {(order.boosterDisplayName || order.boosterUsername) && (
            <div className="detail-card booster-details">
              <h2>Tu Booster</h2>
              <div className="booster-profile">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="booster-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>{order.boosterDisplayName || order.boosterUsername}</span>
              </div>
            </div>
          )}

          <div className="detail-card chat-container">
            <h2>Chat con tu Booster</h2>
            {order.orderId && <ChatBox orderId={order.orderId} />}
          </div>

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