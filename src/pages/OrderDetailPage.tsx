// src/pages/OrderDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// Corregimos la importación para incluir 'post'
import { get, post } from 'aws-amplify/api'; 
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import './OrderDetailPage.css';

// La interfaz no cambia
interface OrderDetails {
  orderId: string;
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
}

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
        // Obtenemos la data como 'unknown' para forzar una verificación segura
        const data: unknown = await body.json();

        // --- CORRECCIÓN CLAVE ---
        // 1. Verificamos que 'data' sea un objeto y no sea nulo
        if (typeof data !== 'object' || data === null) {
          throw new Error('La respuesta de la API no es un objeto válido.');
        }

        // 2. Ahora que sabemos que es un objeto, verificamos si tiene la propiedad 'error'
        if ('error' in data && typeof (data as {error: unknown}).error === 'string') {
          throw new Error((data as {error: string}).error);
        }

        // Si pasa las verificaciones, podemos asegurar que es del tipo OrderDetails
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

  // Esta es la función 'handleCancelOrder' que faltaba
  const handleCancelOrder = async () => {
    const result = await Swal.fire({
      title: t('orderdetail.cancelConfirmTitle'),
      text: t('orderdetail.cancelConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: t('orderdetail.cancelConfirmButton'),
      cancelButtonText: t('common.cancel')
    });

    if (result.isConfirmed) {
      if (!orderId) {
        Swal.fire(t('common.error'), 'No se pudo encontrar el ID de la orden.', 'error');
        return;
      }

      try {
        await post({
          apiName: 'eloboostApi',
          path: '/cancel-order',
          options: {
            body: {
              orderId: orderId 
            }
          }
        }).response;
        
        await Swal.fire(t('orderdetail.cancelledTitle'), t('orderdetail.cancelledText'), 'success');
        navigate('/my-orders');
      } catch (err) {
        console.error("Error al cancelar:", err);
        Swal.fire(t('common.error'), t('orderdetail.cancelError'), 'error');
      }
    }
  };

  // --- El renderizado condicional se mantiene igual, ya es robusto ---
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
            <div className="progress-placeholder"><p>{t('orderdetail.progressSoon')}</p></div>
          </div>
          <div className="detail-card options">
            <h2>{t('orderdetail.options')}</h2>
            <div className="detail-item"><span>{t('orderdetail.duoBoost')}:</span> <span>{order.duoBoost ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.offlineMode')}:</span> <span>{order.offlineMode ? 'Sí' : 'No'}</span></div>
            <div className="detail-item"><span>{t('orderdetail.priority')}:</span> <span>{order.priorityBoost ? 'Sí' : 'No'}</span></div>
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