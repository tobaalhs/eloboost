// src/pages/booster/BoosterEarningsPage.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Clock, CheckCircle, Calendar } from 'lucide-react';
import './BoosterEarningsPage.css';

interface Assignment {
  assignmentId: string;
  orderId: string;
  orderSubject: string;
  boosterEarnings: number;
  isPaid: boolean;
  status: string;
  completedAt?: string;
  paidAt?: string;
}

interface EarningsData {
  totalEarnings: string;
  paidEarnings: string;
  pendingEarnings: string;
  completedOrders: number;
  activeOrders: number;
  assignments: Assignment[];
}

const BoosterEarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooster, setIsBooster] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkBoosterAccess();
  }, []);

  const checkBoosterAccess = async () => {
    try {
      const session = await fetchAuthSession();
      const groups = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];
      
      const groupsLower = groups.map(g => g.toLowerCase());
      
      if (!groupsLower.includes('booster') && !groupsLower.includes('admin')) {
        console.log('❌ Access denied - Not booster');
        navigate('/');
        return;
      }
      
      setIsBooster(true);
      fetchEarnings(groups);
    } catch (err) {
      console.error('Error checking booster access:', err);
      navigate('/');
    }
  };

  const fetchEarnings = async (groups: string[]) => {
    try {
      setLoading(true);
      
      const restOperation = get({
        apiName: 'boosterAPI',
        path: `/booster/earnings?groups=${encodeURIComponent(JSON.stringify(groups))}`
      });

      const response = await restOperation.response;
      const data = await response.body.json() as any;
      
      console.log('✅ Earnings fetched:', data);
      setEarnings(data);
    } catch (err: any) {
      console.error('❌ Error fetching earnings:', err);
      alert('Error al cargar ganancias');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="booster-earnings-page">
        <div className="loading-spinner">Cargando ganancias...</div>
      </div>
    );
  }

  const completedAssignments = earnings?.assignments.filter(a => a.status === 'COMPLETED') || [];
  const unpaidAssignments = completedAssignments.filter(a => !a.isPaid);
  const paidAssignments = completedAssignments.filter(a => a.isPaid);

  return (
    <div className="booster-earnings-page">
      <div className="page-header">
        <h1>Mis Ganancias</h1>
        <p>Historial completo de ganancias y pagos</p>
      </div>

      {/* Resumen de Ganancias */}
      <div className="earnings-summary">
        <div className="summary-card total-card">
          <div className="summary-icon">
            <DollarSign size={32} />
          </div>
          <div className="summary-content">
            <h3>Total Ganado</h3>
            <p className="summary-value">${earnings?.totalEarnings || '0.00'} USD</p>
          </div>
        </div>

        <div className="summary-card pending-card">
          <div className="summary-icon">
            <Clock size={32} />
          </div>
          <div className="summary-content">
            <h3>Pendiente de Pago</h3>
            <p className="summary-value">${earnings?.pendingEarnings || '0.00'} USD</p>
            <p className="summary-subtitle">{unpaidAssignments.length} órdenes sin pagar</p>
          </div>
        </div>

        <div className="summary-card paid-card">
          <div className="summary-icon">
            <CheckCircle size={32} />
          </div>
          <div className="summary-content">
            <h3>Ya Pagado</h3>
            <p className="summary-value">${earnings?.paidEarnings || '0.00'} USD</p>
            <p className="summary-subtitle">{paidAssignments.length} órdenes pagadas</p>
          </div>
        </div>

        <div className="summary-card orders-card">
          <div className="summary-icon">
            <TrendingUp size={32} />
          </div>
          <div className="summary-content">
            <h3>Órdenes Completadas</h3>
            <p className="summary-value">{earnings?.completedOrders || 0}</p>
            <p className="summary-subtitle">{earnings?.activeOrders || 0} activas</p>
          </div>
        </div>
      </div>

      {/* Tabla de Órdenes Pendientes de Pago */}
      {unpaidAssignments.length > 0 && (
        <section className="earnings-section">
          <h2>
            <Clock size={24} />
            Pendientes de Pago ({unpaidAssignments.length})
          </h2>
          
          <div className="earnings-table">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Completada</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {unpaidAssignments.map(assignment => (
                  <tr key={assignment.assignmentId}>
                    <td>
                      <div className="order-cell">
                        <strong>{assignment.orderSubject}</strong>
                        <span className="order-id">{assignment.orderId}</span>
                      </div>
                    </td>
                    <td>
                      {assignment.completedAt && (
                        <div className="date-cell">
                          <Calendar size={16} />
                          {new Date(assignment.completedAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="earnings-amount">
                        ${assignment.boosterEarnings.toFixed(2)} USD
                      </span>
                    </td>
                    <td>
                      <span className="status-badge unpaid">Pendiente</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tabla de Órdenes Pagadas */}
      {paidAssignments.length > 0 && (
        <section className="earnings-section">
          <h2>
            <CheckCircle size={24} />
            Historial de Pagos ({paidAssignments.length})
          </h2>
          
          <div className="earnings-table">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Completada</th>
                  <th>Pagada</th>
                  <th>Ganancia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paidAssignments.map(assignment => (
                  <tr key={assignment.assignmentId}>
                    <td>
                      <div className="order-cell">
                        <strong>{assignment.orderSubject}</strong>
                        <span className="order-id">{assignment.orderId}</span>
                      </div>
                    </td>
                    <td>
                      {assignment.completedAt && (
                        <div className="date-cell">
                          <Calendar size={16} />
                          {new Date(assignment.completedAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                    <td>
                      {assignment.paidAt && (
                        <div className="date-cell">
                          <Calendar size={16} />
                          {new Date(assignment.paidAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="earnings-amount">
                        ${assignment.boosterEarnings.toFixed(2)} USD
                      </span>
                    </td>
                    <td>
                      <span className="status-badge paid">Pagado</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {completedAssignments.length === 0 && (
        <div className="no-earnings">
          <DollarSign size={64} />
          <h3>No tienes ganancias registradas aún</h3>
          <p>Completa órdenes para empezar a ganar</p>
        </div>
      )}
    </div>
  );
};

export default BoosterEarningsPage;
