// src/pages/booster/BoosterDashboard.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import './BoosterDashboard.css';

interface EarningsData {
  totalEarnings: string;
  paidEarnings: string;
  pendingEarnings: string;
  completedOrders: number;
  activeOrders: number;
}

const BoosterDashboard: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
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

      // ✅ Obtener display name para mostrar
      const name = (payload?.['name'] as string) || 'Booster';
      setDisplayName(name);

      const groupsLower = groups.map(g => g.toLowerCase());

      if (!groupsLower.includes('booster') && !groupsLower.includes('admin')) {
        console.log('❌ Access denied - Not booster');
        navigate('/');
        return;
      }

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="booster-dashboard">
        <div className="loading-spinner">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="booster-dashboard">
      <div className="dashboard-header">
        <h1>Panel de Booster</h1>
        <p>Bienvenido, {displayName} 👋</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="stats-grid">
        <div className="stat-card earnings-card">
          <div className="stat-icon">
            <DollarSign size={32} />
          </div>
          <div className="stat-content">
            <h3>Ganancias Totales</h3>
            <p className="stat-value">${earnings?.totalEarnings || '0.00'} USD</p>
          </div>
        </div>

        <div className="stat-card pending-card">
          <div className="stat-icon">
            <Clock size={32} />
          </div>
          <div className="stat-content">
            <h3>Pendiente de Pago</h3>
            <p className="stat-value">${earnings?.pendingEarnings || '0.00'} USD</p>
          </div>
        </div>

        <div className="stat-card completed-card">
          <div className="stat-icon">
            <CheckCircle size={32} />
          </div>
          <div className="stat-content">
            <h3>Órdenes Completadas</h3>
            <p className="stat-value">{earnings?.completedOrders || 0}</p>
          </div>
        </div>

        <div className="stat-card active-card">
          <div className="stat-icon">
            <Package size={32} />
          </div>
          <div className="stat-content">
            <h3>Órdenes Activas</h3>
            <p className="stat-value">{earnings?.activeOrders || 0}</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div className="action-buttons">
          <button 
            className="action-btn primary-btn"
            onClick={() => navigate('/booster/available-orders')}
          >
            <Package size={20} />
            Ver Órdenes Disponibles
          </button>
          
          <button 
            className="action-btn secondary-btn"
            onClick={() => navigate('/booster/my-orders')}
          >
            <TrendingUp size={20} />
            Mis Órdenes
          </button>
          
          <button 
            className="action-btn tertiary-btn"
            onClick={() => navigate('/booster/earnings')}
          >
            <DollarSign size={20} />
            Ver Ganancias Detalladas
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoosterDashboard;