// src/pages/MyOrdersPage.tsx
import { useState, useEffect } from 'react';
import { get } from 'aws-amplify/api';
import './MyOrdersPage.css';

interface Order {
  orderId: string;
  subject: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed';
  createdAt: string;
}

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await get({
          apiName: 'eloboostApi',
          path: '/my-orders'
        }).response;
        
        const data = await response.body.json() as Order[];
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(data);
      } catch (err) {
        setError('No se pudieron cargar tus órdenes. Inténtalo de nuevo más tarde.');
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (isLoading) {
    return <div className="orders-container"><div className="loader"></div></div>;
  }

  if (error) {
    return <div className="orders-container"><p className="error-text">{error}</p></div>;
  }

  return (
    <div className="orders-container">
      <h1 className="orders-title">Mis Órdenes</h1>
      
      {orders.length === 0 ? (
        <p className="no-orders-text">Aún no has realizado ninguna orden.</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.orderId} className="order-card">
              <div className="order-header">
                <h3>{order.subject}</h3>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
              </div>
              <div className="order-details">
                <p><strong>ID de Orden:</strong> {order.orderId}</p>
                <p><strong>Monto:</strong> ${order.amount.toLocaleString('es-CL')} CLP</p>
                <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;