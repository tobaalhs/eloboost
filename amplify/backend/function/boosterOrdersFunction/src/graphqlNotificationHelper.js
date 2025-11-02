// amplify/backend/function/boosterOrdersFunction/src/graphqlNotificationHelper.js
// Helper para enviar notificaciones en tiempo real usando GraphQL

const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');

/**
 * Envía una notificación usando GraphQL (AppSync)
 * Esto dispara subscriptions en tiempo real
 */
async function sendGraphQLNotification(userId, type, message, orderId = null) {
  try {
    // WORKAROUND: Amplify no está pasando correctamente los valores, detectar y usar hardcodeados
    const appsyncUrl = process.env.API_ELOBOOST_GRAPHQLAPIENDPOINTOUTPUT === 'apieloboostGraphQLAPIEndpointOutput'
      ? 'https://dm4ay3fjn5cpjgbk6iwtp4znhm.appsync-api.us-east-1.amazonaws.com/graphql'
      : process.env.API_ELOBOOST_GRAPHQLAPIENDPOINTOUTPUT;

    const apiKey = process.env.API_ELOBOOST_GRAPHQLAPIKEYOUTPUT === 'apieloboostGraphQLAPIKeyOutput'
      ? 'da2-m34ykg7gurcapallmez4z3ebje'
      : process.env.API_ELOBOOST_GRAPHQLAPIKEYOUTPUT;

    console.log('🔍 AppSync URL detectada:', appsyncUrl);
    console.log('🔍 API Key presente:', apiKey ? 'Sí' : 'No');

    if (!appsyncUrl || !apiKey) {
      console.error('❌ Missing AppSync configuration');
      return null;
    }

    const mutation = `
      mutation CreateNotification($input: CreateNotificationInput!) {
        createNotification(input: $input) {
          id
          userId
          type
          message
          orderId
          isRead
          createdAt
        }
      }
    `;

    const variables = {
      input: {
        userId,
        type,
        message,
        orderId,
        isRead: false,
        createdAt: new Date().toISOString()
      }
    };

    const requestBody = JSON.stringify({
      query: mutation,
      variables
    });

    const url = new URL(appsyncUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ Notificación GraphQL enviada a ${userId}:`, message);
            resolve(JSON.parse(data));
          } else {
            console.error(`❌ Error ${res.statusCode}:`, data);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Error en request:', error);
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });

  } catch (error) {
    console.error('❌ Error enviando notificación GraphQL:', error);
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
  sendGraphQLNotification,
  NotificationTypes
};
