// src/pages/MyOrdersPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- CAMBIO IMPORTANTE
import { get } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useTranslation } from 'react-i18next';
import './MyOrdersPage.css';

// La interfaz 'Order' se queda igual
interface Order {
  orderId: string; subject: string; amount: number; status: 'pending' | 'paid' | 'completed';
  createdAt: string; fromRank: string; toRank: string; server: string; queueType: string;
}

const MyOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Obtener el userId (sub) del token JWT
        const session = await fetchAuthSession();
        const userId = session.tokens?.idToken?.payload?.sub as string;

        console.log('📋 Fetching orders for userId (sub):', userId);

        const response = await get({
          apiName: 'eloboostApi',
          path: '/my-orders',
          options: {
            queryParams: {
              userId: userId
            }
          }
        }).response;

        const data = await response.body.json() as Order[];
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(data);
      } catch (err) {
        setError(t('myorders.errorLoading'));
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [t]);

  if (isLoading) {
    return <div className="orders-container"><div className="loader"></div></div>;
  }

  if (error) {
    return <div className="orders-container"><p className="error-text">{error}</p></div>;
  }

  return (
    <div className="orders-container">
      <h1 className="orders-title">{t('myorders.title')}</h1>
      
      {orders.length === 0 ? (
        <p className="no-orders-text">{t('myorders.noOrders')}</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.orderId} className="order-card">
              <div className="order-header">
                <h3>{t('myorders.boostTitle', { from: order.fromRank, to: order.toRank })}</h3>
                <span className={`status-badge status-${order.status}`}>{t(`myorders.status.${order.status}`)}</span>
              </div>
              <div className="order-details">
                <p><strong>{t('myorders.server')}:</strong> {order.server}</p>
                <p><strong>{t('myorders.queue')}:</strong> {order.queueType === 'soloq' ? 'SoloQ' : 'FlexQ'}</p>
                <p><strong>{t('myorders.amount')}:</strong> ${order.amount.toLocaleString('es-CL')} CLP</p>
                <p><strong>{t('myorders.date')}:</strong> {new Date(order.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
              <div className="order-footer">
                {/* --- CAMBIO IMPORTANTE: Usamos <Link> en lugar de <a> --- */}
                <Link to={`/order/${order.orderId}`} className="details-button">
                  {t('myorders.viewDetails')} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;