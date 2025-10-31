// src/pages/booster/MyBoosterOrdersPage.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, put } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, Play, AlertCircle, Copy } from 'lucide-react';
import ChatBox from '../../components/ChatBox.tsx';
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
  credentials?: {
    username: string | null;
    password: string | null;
    updatedAt?: string;
  };
}

const MyBoosterOrdersPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    checkBoosterAccess();
  }, []);

  const checkBoosterAccess = async () => {
    try {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      const groups = (payload?.['cognito:groups'] as string[]) || [];

      setUserGroups(groups);
      
      const name = (payload?.['name'] as string) || 'Booster';
      setDisplayName(name);
      
      const groupsLower = groups.map(g => g.toLowerCase());
      
      if (!groupsLower.includes('booster') && !groupsLower.includes('admin')) {
        console.log('❌ Access denied - Not booster');
        navigate('/');
        return;
      }
      
      fetchMyOrders(groups);
    } catch (err) {
      console.error('Error checking booster access:', err);
      navigate('/');
    }
  };

  const fetchMyOrders = async (groups: string[]) => {
    try {
      setLoading(true);

      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      const username = (payload?.sub as string) || '';
      const displayName = (payload?.['name'] as string) || username;
      
      console.log('🔍 Fetching orders for username (userSub):', username);
      console.log('👤 Display name:', displayName);
      console.log('🔍 With groups:', groups);

      if (!username) {
        console.error('❌ No username found in token!');
        alert('Error: No se pudo obtener el username');
        return;
      }

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
      console.error('❌ Error response:', err.response);
      alert('Error al cargar mis órdenes');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${field} copiado al portapapeles`);
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('Error al copiar al portapapeles');
    });
  };

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

  // ✅ Filtrar: Solo mostrar la orden activa más reciente
  const activeOrders = assignments
    .filter(a => ['CLAIMED', 'IN_PROGRESS'].includes(a.status))
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
    .slice(0, 1); // ✅ Solo la primera (más reciente)

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
        <p>Hola {displayName}, gestiona tus órdenes activas y completadas</p>
      </div>

      {/* Órdenes Activas */}
      <section className="orders-section">
        <h2>Orden Activa</h2>
        
        {activeOrders.length === 0 ? (
          <div className="no-orders">
            <Package size={48} />
            <p>No tienes órdenes activas</p>
          </div>
        ) : (
          <div className="active-order-container">
            {activeOrders.map(assignment => (
              <div key={assignment.assignmentId} className="active-order-wrapper">
                {/* Card de la orden */}
                <div className="order-card active-order">
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

                  {/* ✅ Credenciales del cliente */}
                  {assignment.credentials && assignment.credentials.username && assignment.credentials.password ? (
                    <div className="credentials-section">
                      <div className="credentials-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h4>Credenciales de Acceso</h4>
                      </div>

                      <div className="credentials-content">
                        <div className="credential-item">
                          <span className="credential-label">Usuario:</span>
                          <span className="credential-value">{assignment.credentials.username}</span>
                          <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(assignment.credentials!.username!, 'Usuario')}
                            title="Copiar usuario"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        <div className="credential-item">
                          <span className="credential-label">Contraseña:</span>
                          <span className="credential-value">{assignment.credentials.password}</span>
                          <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(assignment.credentials!.password!, 'Contraseña')}
                            title="Copiar contraseña"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        {assignment.credentials.updatedAt && (
                          <div className="credential-timestamp">
                            Actualizado: {new Date(assignment.credentials.updatedAt).toLocaleString('es-ES')}
                          </div>
                        )}
                      </div>

                      <div className="credentials-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Si la cuenta tiene código de verificación 2FA, el cliente te lo proporcionará por chat</span>
                      </div>
                    </div>
                  ) : (
                    <div className="credentials-section credentials-pending">
                      <div className="credentials-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h4>Credenciales Pendientes</h4>
                      </div>
                      <p className="credentials-pending-message">
                        El cliente aún no ha proporcionado sus credenciales de acceso. Serán visibles aquí cuando las ingrese.
                      </p>
                    </div>
                  )}

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

                {/* ✅ Chat integrado a la derecha - Solo si NO está completada */}
                {assignment.status !== 'COMPLETED' && (
                  <div className="chat-section">
                    <h3>Chat con el Cliente</h3>
                    <ChatBox orderId={assignment.orderId} />
                  </div>
                )}
                
                {/* ✅ Mensaje cuando ya está completada */}
                {assignment.status === 'COMPLETED' && (
                  <div className="chat-section chat-completed">
                    <h3>Orden Completada</h3>
                    <div className="completed-message">
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <p>¡Excelente trabajo!</p>
                      <p className="completed-subtitle">Esta orden ha sido completada</p>
                    </div>
                  </div>
                )}
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