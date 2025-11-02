// src/components/NotificationBellRealtime.tsx
// Notificaciones en TIEMPO REAL usando GraphQL Subscriptions

import { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Bell, Check, X, Package, MessageCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

// Importar queries, mutations y subscriptions generados
import { notificationsByUser } from '../graphql/queries.ts';
import { updateNotification, deleteNotification } from '../graphql/mutations.ts';
import { onCreateNotification } from '../graphql/subscriptions.ts';
import { ModelSortDirection } from '../API.ts';

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
}

const NotificationBellRealtime: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const client = generateClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioEnabledRef = useRef(false); // ✅ Controlar si el audio ya fue habilitado

  // Obtener userId y grupos al montar
  useEffect(() => {
    const getUserId = async () => {
      try {
        const session = await fetchAuthSession();
        // Usar 'sub' del token porque es el userId que usa Cognito
        const userId = session.tokens?.idToken?.payload?.sub as string;
        const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];

        console.log('🔑 User ID obtenido:', userId);
        console.log('📋 Session completa:', {
          sub: session.tokens?.idToken?.payload?.sub,
          identityId: session.identityId,
          groups
        });

        setCurrentUserId(userId);
        setUserGroups(groups);
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (currentUserId) {
      fetchNotifications();
    }
  }, [currentUserId]);

  // 🔥 POLLING CADA 10 SEGUNDOS (Respaldo confiable) 🔥
  useEffect(() => {
    if (!currentUserId) {
      console.log('⏳ Esperando userId para polling...');
      return;
    }

    console.log('🔄 Iniciando polling de notificaciones cada 10 segundos');

    // Limpiar intervalo anterior si existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Polling cada 10 segundos
    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 Verificando nuevas notificaciones...');
      fetchNotifications(true); // silent = true
    }, 10000); // 10 segundos

    return () => {
      console.log('🛑 Deteniendo polling de notificaciones');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentUserId, notifications]); // Incluir notifications para detectar cambios

  // 🔥 SUBSCRIPTION EN TIEMPO REAL (Intento principal) 🔥
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    console.log('🔔 Intentando suscribirse a notificaciones en tiempo real para:', currentUserId);

    let subscription: any = null;

    try {
      subscription = client.graphql({
        query: onCreateNotification,
        variables: {
          filter: {
            userId: { eq: currentUserId }
          }
        },
        authMode: 'userPool' as any
      }).subscribe({
        next: ({ data }) => {
          const newNotification = data.onCreateNotification as Notification;
          if (newNotification) {
            console.log('🔥 Nueva notificación en tiempo real recibida:', newNotification);

            setNotifications(prev => {
              if (prev.some(n => n.id === newNotification.id)) {
                return prev;
              }
              // ✅ Limitar a 10 notificaciones
              const updated = [newNotification, ...prev];
              return updated.slice(0, 10);
            });

            if (!newNotification.isRead) {
              setUnreadCount(prev => prev + 1);
            }

            // 🔊 Reproducir sonido de notificación
            console.log('🔊 Nueva notificación vía subscription, reproduciendo sonido...');
            playNotificationSound();

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nueva notificación', {
                body: newNotification.message,
                icon: '/logo192.png',
                tag: newNotification.id
              });
            }
          }
        },
        error: (error) => {
          console.warn('⚠️ Subscription error (usando polling como respaldo):', error.message);
        }
      });

      console.log('✅ Subscription iniciada (con polling de respaldo)');
    } catch (error) {
      console.warn('⚠️ No se pudo crear subscription (usando polling como respaldo):', error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentUserId]);

  // Solicitar permiso para notificaciones del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Función para reproducir el sonido de notificación - SIEMPRE intenta reproducir
  const playNotificationSound = () => {
    console.log('🔊 Intentando reproducir sonido de notificación...');

    try {
      // Crear una nueva instancia del audio cada vez
      const sound = new Audio('/notification.mp3');
      sound.volume = 1.0;

      const playPromise = sound.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Sonido reproducido exitosamente');
            audioEnabledRef.current = true; // Marcar como habilitado después del primer éxito
          })
          .catch((err) => {
            console.error('❌ Error al reproducir sonido:', err);
            if (!audioEnabledRef.current) {
              console.log('💡 Primer intento de reproducción - puede fallar por política de autoplay');
            }
          });
      }
    } catch (error) {
      console.error('❌ Excepción al intentar reproducir sonido:', error);
    }
  };

  // Habilitar audio al abrir el dropdown (interacción del usuario)
  const handleBellClick = () => {
    setIsOpen(!isOpen);

    // Al abrir la campanita, habilitar el audio automáticamente
    if (!isOpen && !audioEnabledRef.current) {
      console.log('🔔 Campanita abierta - habilitando audio automáticamente');
      playNotificationSound(); // Esto desbloquea el audio en el navegador
    }
  };

  const fetchNotifications = async (silent = false) => {
    if (!currentUserId) return;

    try {
      if (!silent) setLoading(true);

      const response = await client.graphql({
        query: notificationsByUser,
        variables: {
          userId: currentUserId,
          sortDirection: ModelSortDirection.DESC,
          limit: 10 // ✅ Limitar a 10 notificaciones
        }
      });

      const items = response.data.notificationsByUser.items as Notification[];

      // ✅ Detectar nuevas notificaciones para mostrar alerta del navegador
      if (silent && notifications.length > 0) {
        const newNotifications = items.filter(
          newItem => !notifications.some(oldItem => oldItem.id === newItem.id)
        );

        // Mostrar notificación nativa del navegador para cada nueva
        if (newNotifications.length > 0) {
          console.log('🔔 Detectadas', newNotifications.length, 'nuevas notificaciones vía polling');

          // 🔊 REPRODUCIR SONIDO DE NOTIFICACIÓN
          console.log('🔊 Intentando reproducir sonido desde polling...');
          playNotificationSound();

          newNotifications.forEach(notification => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nueva notificación', {
                body: notification.message,
                icon: '/logo192.png',
                tag: notification.id
              });
            }
          });
        }
      }

      setNotifications(items);
      setUnreadCount(items.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await client.graphql({
        query: updateNotification,
        variables: {
          input: {
            id: notificationId,
            isRead: true
          }
        }
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);

      await Promise.all(
        unreadNotifications.map(n =>
          client.graphql({
            query: updateNotification,
            variables: {
              input: {
                id: n.id,
                isRead: true
              }
            }
          })
        )
      );

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Determinar la ruta según el tipo de notificación y el rol del usuario
    const isBooster = userGroups.includes('BOOSTER');
    const isAdmin = userGroups.includes('ADMIN');

    console.log('🔔 Clic en notificación:', {
      type: notification.type,
      orderId: notification.orderId,
      isBooster,
      isAdmin
    });

    // 🎯 Lógica específica por tipo de notificación
    if (notification.type === 'new_boost_available') {
      // Para boosters/admin: ir a órdenes disponibles
      if (isBooster || isAdmin) {
        console.log('➡️ Booster: Nueva orden disponible → /booster/available-orders');
        navigate('/booster/available-orders');
      }
    } else if (notification.type === 'credentials_ready' || notification.type === 'new_message') {
      // Para boosters/admin: credenciales y mensajes → ir a mis órdenes activas
      if (isBooster || isAdmin) {
        console.log('➡️ Booster: Credenciales/Chat → /booster/my-orders');
        navigate('/booster/my-orders');
      } else {
        // Para clientes: ir al detalle de la orden específica
        console.log('➡️ Cliente: Redirigiendo a /order/' + notification.orderId);
        if (notification.orderId) {
          navigate(`/order/${notification.orderId}`);
        }
      }
    } else if (notification.type === 'booster_assigned' || notification.type === 'boost_started' || notification.type === 'boost_completed') {
      // Para clientes: estas notificaciones siempre van al detalle de la orden
      if (!isBooster && !isAdmin && notification.orderId) {
        console.log('➡️ Cliente: Redirigiendo a /order/' + notification.orderId);
        navigate(`/order/${notification.orderId}`);
      }
    } else if (notification.orderId) {
      // Fallback: usar orderId genérico
      if (isBooster || isAdmin) {
        console.log('➡️ Fallback Booster/Admin: Redirigiendo a /booster/my-orders');
        navigate('/booster/my-orders');
      } else {
        console.log('➡️ Fallback Cliente: Redirigiendo a /order/' + notification.orderId);
        navigate(`/order/${notification.orderId}`);
      }
    }

    setIsOpen(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const createdAt = new Date(timestamp);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'boost_completed':
        return <Check size={20} color="#4CAF50" />;
      case 'booster_assigned':
        return <Package size={20} color="#2196F3" />;
      case 'boost_started':
        return <Zap size={20} color="#FF9800" />;
      case 'new_boost_available':
        return <Bell size={20} color="#9C27B0" />;
      case 'new_message':
        return <MessageCircle size={20} color="#E91E63" />; // ✅ Ícono de chat con color rosa/magenta
      case 'credentials_ready':
        return <Package size={20} color="#00BCD4" />;
      default:
        return <Bell size={20} color="#666" />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={handleBellClick}
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
              <button onClick={markAllAsRead} className="mark-all-read-btn">
                Marcar todas
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading && (
              <div className="notification-loading">Cargando...</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="notification-empty">
                <Bell size={48} />
                <p>No tienes notificaciones</p>
              </div>
            )}

            {!loading && notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <p className="notification-message">{notification.message}</p>
                  <span className="notification-time">
                    {formatTimeAgo(notification.createdAt)}
                  </span>
                </div>
                {!notification.isRead && <div className="notification-unread-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellRealtime;
