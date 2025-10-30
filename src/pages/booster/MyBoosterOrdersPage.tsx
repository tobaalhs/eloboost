// src/pages/booster/MyBoosterOrdersPage.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, put } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, Play, AlertCircle } from 'lucide-react';
import './MyBoosterOrdersPage.css';

interface Assignment {
  assignmentId: string;
  orderId: string;
  status: string;
  orderSubject: string;
  fromRank: string;
  toRank: string;
  server: string;
  nickname: string;
  boosterEarnings: number;
  isPriority: boolean;
  claimedAt: string;
  startedAt?: string;
  completedAt?: string;
}

const MyBoosterOrdersPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isBooster, setIsBooster] = useState(false);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkBoosterAccess();
  }, []);

  const checkBoosterAccess = async () => {
    try {
      const session = await fetchAuthSession();
      const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];

      setUserGroups(groups);
      
      const groupsLower = groups.map(g => g.toLowerCase());
      
      if (!groupsLower.includes('booster') && !groupsLower.includes('admin')) {
        console.log('❌ Access denied - Not booster');
        navigate('/');
        return;
      }
      
      setIsBooster(true);
      fetchMyOrders(groups);
    } catch (err) {
      console.error('Error checking booster access:', err);
      navigate('/');
    }
  };

  const fetchMyOrders = async (groups: string[]) => {
  try {
    setLoading(true);

    // --- CORRECCIÓN: Usamos 'name' para la búsqueda ---
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload;
    const username = (payload && payload['name']) ? payload['name'] as string : '';
    // --- FIN DE LA CORRECCIÓN ---

    const restOperation = get({
      apiName: 'boosterAPI',
      path: `/booster/my-orders?username=${encodeURIComponent(username)}&groups=${encodeURIComponent(JSON.stringify(groups))}`
    });

    const response = await restOperation.response;
    const data = await response.body.json() as any;

    console.log('✅ My orders fetched:', data);
    setAssignments(data.orders || []);
  } catch (err: any) {
    console.error('❌ Error fetching my orders:', err);
    alert('Error al cargar mis órdenes');
  } finally {
    setLoading(false);
  }
};

  // En src/pages/booster/MyBoosterOrdersPage.tsx

const updateOrderStatus = async (orderId: string, status: string) => {
  const statusText = {
    'IN_PROGRESS': 'iniciar',
    'COMPLETED': 'completar'
  }[status] || 'actualizar';

  if (!window.confirm(`¿Estás seguro de ${statusText} esta orden?`)) {
    return;
  }

  try {
    setUpdating(orderId);

    const restOperation = put({
      apiName: 'boosterAPI',
      path: `/booster/update-status/${orderId}?groups=${encodeURIComponent(JSON.stringify(userGroups))}`,
      options: {
        body: { orderId, status }
      }
    });

    const response = await restOperation.response;
    const data = await response.body.json() as any;

    console.log('✅ Order status updated:', data);
    alert(`Estado actualizado exitosamente`);

    fetchMyOrders(userGroups);
  } catch (err: any) {
    console.error('❌ Error updating order status:', err);
    alert('Error al actualizar estado de la orden');
  } finally {
    setUpdating(null);
  }
};

  const getStatusBadge = (status: string) => {
    const badges: any = {
      'CLAIMED': { text: 'Reclamada', class: 'status-claimed', icon: <Clock size={16} /> },
      'IN_PROGRESS': { text: 'En Progreso', class: 'status-progress', icon: <Play size={16} /> },
      'COMPLETED': { text: 'Completada', class: 'status-completed', icon: <CheckCircle size={16} /> },
      'CANCELLED': { text: 'Cancelada', class: 'status-cancelled', icon: <AlertCircle size={16} /> }
    };

    const badge = badges[status] || badges['CLAIMED'];

    return (
      <div className={`status-badge ${badge.class}`}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  const activeOrders = assignments.filter(a => ['CLAIMED', 'IN_PROGRESS'].includes(a.status));
  const completedOrders = assignments.filter(a => a.status === 'COMPLETED');

  if (loading) {
    return (
      <div className="my-booster-orders-page">
        <div className="loading-spinner">Cargando mis órdenes...</div>
      </div>
    );
  }

  return (
    <div className="my-booster-orders-page">
      <div className="page-header">
        <h1>Mis Órdenes</h1>
        <p>Gestiona tus órdenes activas y completadas</p>
      </div>

      {/* Órdenes Activas */}
      <section className="orders-section">
        <h2>Órdenes Activas ({activeOrders.length})</h2>
        
        {activeOrders.length === 0 ? (
          <div className="no-orders">
            <Package size={48} />
            <p>No tienes órdenes activas</p>
          </div>
        ) : (
          <div className="orders-grid">
            {activeOrders.map(assignment => (
              <div key={assignment.assignmentId} className="order-card active-order">
                <div className="order-card-header">
                  {getStatusBadge(assignment.status)}
                  {assignment.isPriority && (
                    <div className="priority-badge">PRIORIDAD</div>
                  )}
                </div>

                <h3>{assignment.orderSubject}</h3>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Jugador:</span>
                    <span className="detail-value">{assignment.nickname}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Servidor:</span>
                    <span className="detail-value">{assignment.server}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Desde:</span>
                    <span className="detail-value rank-badge">{assignment.fromRank}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Hasta:</span>
                    <span className="detail-value rank-badge">{assignment.toRank}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Tu ganancia:</span>
                    <span className="detail-value earnings-text">
                      ${assignment.boosterEarnings.toFixed(2)} USD
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Reclamada:</span>
                    <span className="detail-value">
                      {new Date(assignment.claimedAt).toLocaleString('es-ES')}
                    </span>
                  </div>

                  {assignment.startedAt && (
                    <div className="detail-row">
                      <span className="detail-label">Iniciada:</span>
                      <span className="detail-value">
                        {new Date(assignment.startedAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="order-actions">
                  {assignment.status === 'CLAIMED' && (
                    <button
                      className="action-btn start-btn"
                      onClick={() => updateOrderStatus(assignment.orderId, 'IN_PROGRESS')}
                      disabled={updating === assignment.orderId}
                    >
                      <Play size={18} />
                      {updating === assignment.orderId ? 'Iniciando...' : 'Iniciar Orden'}
                    </button>
                  )}

                  {assignment.status === 'IN_PROGRESS' && (
                    <button
                      className="action-btn complete-btn"
                      onClick={() => updateOrderStatus(assignment.orderId, 'COMPLETED')}
                      disabled={updating === assignment.orderId}
                    >
                      <CheckCircle size={18} />
                      {updating === assignment.orderId ? 'Completando...' : 'Completar Orden'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Órdenes Completadas */}
      <section className="orders-section">
        <h2>Órdenes Completadas ({completedOrders.length})</h2>
        
        {completedOrders.length === 0 ? (
          <div className="no-orders">
            <CheckCircle size={48} />
            <p>No tienes órdenes completadas aún</p>
          </div>
        ) : (
          <div className="orders-grid">
            {completedOrders.map(assignment => (
              <div key={assignment.assignmentId} className="order-card completed-order">
                <div className="order-card-header">
                  {getStatusBadge(assignment.status)}
                </div>

                <h3>{assignment.orderSubject}</h3>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Jugador:</span>
                    <span className="detail-value">{assignment.nickname}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Servidor:</span>
                    <span className="detail-value">{assignment.server}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Tu ganancia:</span>
                    <span className="detail-value earnings-text">
                      ${assignment.boosterEarnings.toFixed(2)} USD
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Completada:</span>
                    <span className="detail-value">
                      {assignment.completedAt && new Date(assignment.completedAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyBoosterOrdersPage;
