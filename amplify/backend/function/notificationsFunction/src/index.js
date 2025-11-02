/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_NOTIFICATIONSTABLE_ARN
	STORAGE_NOTIFICATIONSTABLE_NAME
	STORAGE_NOTIFICATIONSTABLE_STREAMARN
Amplify Params - DO NOT EDIT */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = process.env.STORAGE_NOTIFICATIONSTABLE_NAME;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-groups',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

// Generar UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Obtener el userSub del evento
const getUserFromEvent = (event) => {
  const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;
  if (!cognitoAuthProvider) return null;

  const parts = cognitoAuthProvider.split(':');
  const userSub = parts[parts.length - 1];

  return userSub;
};

// 1. Crear notificación (uso interno - será llamado desde otras Lambdas)
const createNotification = async (body) => {
  try {
    const { userId, type, message, orderId } = body;

    if (!userId || !type || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId, type y message son requeridos' })
      };
    }

    const notificationId = `notif-${Date.now()}-${generateUUID().split('-')[0]}`;
    const now = new Date().toISOString();

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Item: {
        notificationId,
        userId,
        type,
        message,
        orderId: orderId || null,
        isRead: false,
        createdAt: now
      }
    };

    await docClient.send(new PutCommand(params));

    console.log('✅ Notification created:', notificationId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Notificación creada exitosamente',
        notificationId
      })
    };
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al crear notificación', message: error.message })
    };
  }
};

// 2. Obtener notificaciones del usuario
const getNotifications = async (userId, onlyUnread = false) => {
  try {
    console.log('📥 Getting notifications for user:', userId);

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      IndexName: 'byUserId',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // Ordenar por fecha descendente (más recientes primero)
      Limit: 50 // Limitar a las últimas 50 notificaciones
    };

    // Si solo queremos las no leídas
    if (onlyUnread) {
      params.FilterExpression = 'isRead = :isRead';
      params.ExpressionAttributeValues[':isRead'] = false;
    }

    const result = await docClient.send(new QueryCommand(params));

    console.log('✅ Notifications fetched:', result.Items?.length || 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        notifications: result.Items || [],
        unreadCount: (result.Items || []).filter(n => !n.isRead).length
      })
    };
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al obtener notificaciones', message: error.message })
    };
  }
};

// 3. Marcar notificación como leída
const markAsRead = async (notificationId, userId) => {
  try {
    console.log('📖 Marking notification as read:', notificationId);

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Key: { notificationId },
      UpdateExpression: 'SET isRead = :true',
      ExpressionAttributeValues: {
        ':true': true
      }
    };

    await docClient.send(new UpdateCommand(params));

    console.log('✅ Notification marked as read');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Notificación marcada como leída' })
    };
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al marcar notificación', message: error.message })
    };
  }
};

// 4. Marcar todas como leídas
const markAllAsRead = async (userId) => {
  try {
    console.log('📖 Marking all notifications as read for user:', userId);

    // Primero obtener todas las notificaciones no leídas
    const queryParams = {
      TableName: NOTIFICATIONS_TABLE,
      IndexName: 'byUserId',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'isRead = :false',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':false': false
      }
    };

    const result = await docClient.send(new QueryCommand(queryParams));
    const unreadNotifications = result.Items || [];

    // Actualizar cada una
    const updatePromises = unreadNotifications.map(notification => {
      return docClient.send(new UpdateCommand({
        TableName: NOTIFICATIONS_TABLE,
        Key: { notificationId: notification.notificationId },
        UpdateExpression: 'SET isRead = :true',
        ExpressionAttributeValues: {
          ':true': true
        }
      }));
    });

    await Promise.all(updatePromises);

    console.log('✅ All notifications marked as read:', unreadNotifications.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Todas las notificaciones marcadas como leídas',
        count: unreadNotifications.length
      })
    };
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al marcar notificaciones', message: error.message })
    };
  }
};

// 5. Eliminar notificación
const deleteNotification = async (notificationId) => {
  try {
    console.log('🗑️ Deleting notification:', notificationId);

    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Key: { notificationId }
    };

    await docClient.send(new DeleteCommand(params));

    console.log('✅ Notification deleted');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Notificación eliminada' })
    };
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al eliminar notificación', message: error.message })
    };
  }
};

exports.handler = async (event) => {
  console.log('🔔 Notifications Function v1 - Event:', JSON.stringify(event, null, 2));

  // Manejar OPTIONS para CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = getUserFromEvent(event);

    console.log('📍 Request:', { method, path, userId });

    // POST /notifications - Crear notificación (interno o desde otras Lambdas)
    if (method === 'POST' && path.includes('/notifications') && !path.includes('/mark-all-read')) {
      return await createNotification(body);
    }

    // GET /notifications - Obtener notificaciones del usuario
    if (method === 'GET' && path.includes('/notifications')) {
      if (!userId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Usuario no autenticado' })
        };
      }
      const onlyUnread = event.queryStringParameters?.unread === 'true';
      return await getNotifications(userId, onlyUnread);
    }

    // PUT /notifications/{notificationId}/read - Marcar como leída
    if (method === 'PUT' && path.includes('/read')) {
      const notificationId = event.pathParameters?.notificationId || body.notificationId;
      return await markAsRead(notificationId, userId);
    }

    // PUT /notifications/mark-all-read - Marcar todas como leídas
    if (method === 'PUT' && path.includes('/mark-all-read')) {
      if (!userId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Usuario no autenticado' })
        };
      }
      return await markAllAsRead(userId);
    }

    // DELETE /notifications/{notificationId} - Eliminar notificación
    if (method === 'DELETE' && path.includes('/notifications/')) {
      const notificationId = event.pathParameters?.notificationId || body.notificationId;
      return await deleteNotification(notificationId);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint no encontrado' })
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor', message: error.message })
    };
  }
};
