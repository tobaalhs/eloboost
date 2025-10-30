// src/pages/booster/AvailableOrdersPage.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { Package, Star, Clock, AlertCircle } from 'lucide-react';
import './AvailableOrdersPage.css';

interface Order {
  orderId: string;
  subject: string;
  fromRank: string;
  toRank: string;
  server: string;
  nickname: string;
  priceUSD: string;
  priceCLP: string;
  isPriority: boolean;
  createdAt: string;
  queueType: string;
  duoBoost: string;
}

const AvailableOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkBoosterAccess();
  }, []);

  const checkBoosterAccess = async () => {
    try {
      const session = await fetchAuthSession();
      const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];
      
      console.log('🔍 User groups:', groups);
      
      const groupsUpper = groups.map(g => g.toUpperCase());
      
      if (!groupsUpper.includes('BOOSTER') && !groupsUpper.includes('ADMIN')) {
        console.log('❌ Access denied - Not booster or admin');
        navigate('/');
        return;
      }
      
      console.log('✅ Access granted - User is booster or admin');
      fetchOrders();
    } catch (err) {
      console.error('Error checking booster access:', err);
      navigate('/');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const session = await fetchAuthSession();
      const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];
      
      console.log('📤 Sending groups as query param:', groups);
      
      const restOperation = get({
        apiName: 'boosterAPI',
        path: `/booster/orders?groups=${encodeURIComponent(JSON.stringify(groups))}`
      });

      const response = await restOperation.response;
      const data = await response.body.json() as any;
      
      console.log('✅ Orders fetched:', data);
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      alert('Error al cargar órdenes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const claimOrder = async (orderId: string) => {
    if (!window.confirm('¿Estás seguro de tomar esta orden?')) {
      return;
    }

    try {
      setClaiming(orderId);

      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      const groups = (payload?.['cognito:groups'] as string[]) || [];
      
      // ✅ Usar sub (userSub) que es consistente con IAM auth
      const userSub = payload?.sub as string;
      const boosterUsername = userSub;
      
      // ✅ Obtener el display name del token
      const displayName = (payload?.['name'] as string) || boosterUsername;
      
      console.log('🎯 Claiming order with username (userSub):', boosterUsername);
      console.log('👤 Display name:', displayName);

      const bodyPayload: { 
        orderId: string; 
        boosterUsername?: string;
        boosterDisplayName?: string; // ✅ AÑADIDO
      } = {
        orderId,
      };

      if (boosterUsername) {
        bodyPayload.boosterUsername = boosterUsername;
      }
      
      // ✅ CRÍTICO: Enviar también el display name al backend
      if (displayName) {
        bodyPayload.boosterDisplayName = displayName;
      }

      console.log('📤 Sending payload:', bodyPayload);

      const restOperation = post({
        apiName: 'boosterAPI',
        path: `/booster/orders/${orderId}/claim?groups=${encodeURIComponent(JSON.stringify(groups))}`,
        options: {
          body: bodyPayload
        }
      });

      const response = await restOperation.response;
      const data = await response.body.json() as any;
      
      console.log('✅ Order claimed:', data);
      alert(`¡Orden tomada exitosamente! Ganarás ${data.boosterEarnings} USD`);
      
      fetchOrders();
      navigate('/booster/my-orders');
    } catch (err: any) {
      console.error('❌ Error claiming order:', err);
      alert('Error al tomar orden. Es posible que ya haya sido tomada por otro booster.');
    } finally {
      setClaiming(null);
    }
  };

  const calculateEarnings = (priceUSD: string) => {
    return (parseFloat(priceUSD) * 0.65).toFixed(2);
  };

  if (loading) {
    return (
      <div className="available-orders-page">
        <div className="loading-spinner">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div className="available-orders-page">
      <div className="page-header">
        <h1>Órdenes Disponibles</h1>
        <p>Selecciona una orden para comenzar a trabajar</p>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <AlertCircle size={48} />
          <h2>No hay órdenes disponibles</h2>
          <p>Vuelve más tarde para ver nuevas órdenes</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map(order => (
            <div 
              key={order.orderId} 
              className={`order-card ${order.isPriority ? 'priority-order' : ''}`}
            >
              {order.isPriority && (
                <div className="priority-badge">
                  <Star size={16} />
                  PRIORIDAD
                </div>
              )}

              <div className="order-header">
                <h3>{order.subject}</h3>
                <div className="order-server">{order.server}</div>
              </div>

              <div className="order-details">
                <div className="detail-row">
                  <span className="detail-label">Jugador:</span>
                  <span className="detail-value">{order.nickname}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Desde:</span>
                  <span className="detail-value rank-badge">{order.fromRank}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Hasta:</span>
                  <span className="detail-value rank-badge">{order.toRank}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{order.queueType === 'soloq' ? 'Solo/Duo' : 'Flex'}</span>
                </div>

                {order.duoBoost === 'true' && (
                  <div className="detail-row">
                    <span className="duo-badge">🎮 Duo Boost</span>
                  </div>
                )}
              </div>

              <div className="order-earnings">
                <div className="earnings-label">Tu ganancia:</div>
                <div className="earnings-value">${calculateEarnings(order.priceUSD)} USD</div>
                <div className="earnings-original">Precio total: ${order.priceUSD} USD</div>
              </div>

              <div className="order-footer">
                <div className="order-time">
                  <Clock size={16} />
                  {new Date(order.createdAt).toLocaleString('es-ES')}
                </div>

                <button 
                  className="claim-btn"
                  onClick={() => claimOrder(order.orderId)}
                  disabled={claiming === order.orderId}
                >
                  {claiming === order.orderId ? (
                    'Tomando...'
                  ) : (
                    <>
                      <Package size={18} />
                      Tomar Orden
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;