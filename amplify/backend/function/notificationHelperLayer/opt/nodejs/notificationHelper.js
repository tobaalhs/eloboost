// amplify/backend/function/shared/notificationHelper.js
// Helper para enviar notificaciones desde cualquier Lambda

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Envía una notificación a un usuario
 * @param {string} userId - ID del usuario (Cognito sub)
 * @param {string} type - Tipo de notificación (boost_completed, new_message, booster_assigned, new_boost_available)
 * @param {string} message - Mensaje de la notificación
 * @param {string} orderId - ID de la orden relacionada (opcional)
 * @returns {Promise<void>}
 */
async function sendNotification(userId, type, message, orderId = null) {
  try {
    const notificationId = randomUUID();
    const timestamp = new Date().toISOString();

    const notification = {
      notificationId,
      userId,
      type,
      message,
      isRead: false,
      createdAt: timestamp
    };

    if (orderId) {
      notification.orderId = orderId;
    }

    const params = {
      TableName: process.env.STORAGE_NOTIFICATIONSTABLE_NAME || 'notifications-dev',
      Item: notification
    };

    await docClient.send(new PutCommand(params));
    console.log(`✅ Notificación enviada a ${userId}: ${message}`);

    return notification;
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    // No lanzamos error para no bloquear el flujo principal
    return null;
  }
}

/**
 * Tipos de notificaciones disponibles
 */
const NotificationTypes = {
  BOOST_COMPLETED: 'boost_completed',
  NEW_MESSAGE: 'new_message',
  BOOSTER_ASSIGNED: 'booster_assigned',
  NEW_BOOST_AVAILABLE: 'new_boost_available',
  BOOST_STARTED: 'boost_started',
  PAYMENT_CONFIRMED: 'payment_confirmed'
};

module.exports = {
  sendNotification,
  NotificationTypes
};
