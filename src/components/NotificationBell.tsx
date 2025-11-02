// src/components/NotificationBell.tsx

import { useState, useEffect, useRef } from 'react';
import { get, put } from 'aws-amplify/api';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

interface Notification {
  notificationId: string;
  type: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obtener notificaciones
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const restOperation = get({
        apiName: 'notificationsAPI',
        path: '/notifications'
      });

      const response = await restOperation.response;
      const data = await response.body.json() as any;

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Polling cada 30 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const restOperation = put({
        apiName: 'notificationsAPI',
        path: `/notifications/${notificationId}/read`,
        options: {
          body: { notificationId }
        }
      });

      await restOperation.response;

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const restOperation = put({
        apiName: 'notificationsAPI',
        path: '/notifications/mark-all-read',
        options: {
          body: {}
        }
      });

      await restOperation.response;

      // Actualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Manejar click en notificación
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.notificationId);
    }

    // Navegar a la orden si tiene orderId
    if (notification.orderId) {
      setIsOpen(false);
      navigate(`/order/${notification.orderId}`);
    }
  };

  // Obtener ícono según tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'boost_completed':
        return '✅';
      case 'new_message':
        return '💬';
      case 'booster_assigned':
        return '👤';
      case 'new_boost':
        return '🎮';
      case 'order_status':
        return '📦';
      default:
        return '🔔';
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={48} opacity={0.3} />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.notificationId}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
