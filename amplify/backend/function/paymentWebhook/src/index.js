/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  STORAGE_ORDERS_ARN
  STORAGE_ORDERS_NAME
  STORAGE_ORDERS_STREAMARN
Amplify Params - DO NOT EDIT */

const crypto = require('crypto');
const axios = require('axios');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoIdentityProviderClient, ListUsersInGroupCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { sendGraphQLNotification, NotificationTypes } = require('./graphqlNotificationHelper');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const API_KEY = '28F7B783-FFC3-4D02-81F9-28L5D78CC6A4'; 
const SECRET_KEY = 'a6eeed41e6551fc4890555b8d80f70fee55db044';
const FLOW_API_URL = 'https://sandbox.flow.cl/api';

const sign = (params) => {
  const sortedKeys = Object.keys(params).sort();
  let toSign = '';
  sortedKeys.forEach(key => { toSign += `${key}${params[key]}`; });
  return crypto.createHmac('sha256', SECRET_KEY).update(toSign).digest('hex');
};

exports.handler = async (event) => {
  console.log(`EVENTO WEBHOOK: ${JSON.stringify(event)}`);

  try {
    const body = new URLSearchParams(event.body);
    const token = body.get('token');

    if (!token) {
      console.error("Notificación de Flow no contenía un token.");
      return { statusCode: 400, body: 'Bad Request: Missing token' };
    }

    console.log(`Token recibido del webhook: ${token}`);

    const params = { apiKey: API_KEY, token: token };
    params.s = sign(params);

    const response = await axios.get(`${FLOW_API_URL}/payment/getStatus`, { params });
    const paymentData = response.data;
    console.log("Datos del pago obtenidos de /getStatus:", paymentData);

    const { commerceOrder, status } = paymentData;
    const orderId = commerceOrder;
    const tableName = process.env.STORAGE_ORDERS_NAME;

    if (status === 2) { // 2 = PAGADA
      // --- BLOQUE DE VERIFICACIÓN AÑADIDO ---
      // Antes de actualizar, verificamos que la orden exista y esté 'pending'.
      const getParams = { TableName: tableName, Key: { orderId: orderId } };
      const { Item } = await docClient.send(new GetCommand(getParams));

      if (!Item) {
        console.warn(`Webhook para una orden INEXISTENTE o CANCELADA (${orderId}). Pago huérfano. Ignorando.`);
        // Devolvemos 200 para que Flow no reintente.
        return { statusCode: 200, body: 'OK. Orden no encontrada.' };
      }

      if (Item.status !== 'pending') {
        console.warn(`Webhook para una orden que NO ESTÁ PENDIENTE (estado actual: ${Item.status}) para la orden ${orderId}. Ignorando.`);
        // Devolvemos 200 para que Flow no reintente.
        return { statusCode: 200, body: 'OK. La orden no estaba pendiente.' };
      }
      // --- FIN DEL BLOQUE DE VERIFICACIÓN ---
      
      // Si pasa la verificación, procedemos a actualizar.
      const updateParams = {
        TableName: tableName,
        Key: { orderId: orderId },
        UpdateExpression: "set #status = :s, #paidAt = :d",
        ExpressionAttributeNames: { "#status": "status", "#paidAt": "paidAt" },
        ExpressionAttributeValues: { 
            ":s": "paid",
            ":d": new Date().toISOString() // Guardamos la fecha del pago
        },
      };

      console.log(`Actualizando orden ${orderId} a estado 'paid'`);
      await docClient.send(new UpdateCommand(updateParams));
      console.log("Orden actualizada con éxito.");

      // 🔔 Notificar a los boosters que hay una nueva orden disponible
      try {
        // WORKAROUND: Amplify no está pasando correctamente el UserPoolId, usar valor hardcodeado
        const userPoolId = process.env.AUTH_ELOBOOSTDAAC5EE3_USERPOOLID === 'autheloboostde5c54efUserPoolId'
          ? 'us-east-1_Cm7jth6AT'
          : process.env.AUTH_ELOBOOSTDAAC5EE3_USERPOOLID;

        console.log('🔍 UserPoolId detectado:', userPoolId);

        if (userPoolId && userPoolId !== 'autheloboostde5c54efUserPoolId') {
          const listUsersCommand = new ListUsersInGroupCommand({
            UserPoolId: userPoolId,
            GroupName: 'booster'
          });

          const boostersResponse = await cognitoClient.send(listUsersCommand);
          const boosters = boostersResponse.Users || [];

          console.log(`🔔 Notificando a ${boosters.length} boosters sobre nueva orden`);

          // Enviar notificación EN TIEMPO REAL a cada booster
          const notificationPromises = boosters.map(booster => {
            const userSub = booster.Attributes?.find(attr => attr.Name === 'sub')?.Value;
            if (userSub) {
              return sendGraphQLNotification(
                userSub,
                NotificationTypes.NEW_BOOST_AVAILABLE,
                `Nuevo boost disponible: ${Item.subject || 'Boost'}`,
                orderId
              );
            }
          });

          await Promise.allSettled(notificationPromises);
        }
      } catch (notifError) {
        console.error('Error notificando a boosters:', notifError);
        // No lanzamos el error para no afectar el flujo principal
      }

    } else {
      console.log(`Estado del pago no es 'pagado' (status: ${status}). No se actualiza la base de datos.`);
    }

    return { statusCode: 200, body: 'OK' };

  } catch (error) {
    console.error("Error al procesar el webhook:", error.response ? error.response.data : error.message);
    // Devolvemos 200 para que Flow no insista en enviar un webhook que falla.
    // El error ya está registrado en CloudWatch para que lo puedas revisar.
    return { statusCode: 200, body: 'Error procesando el webhook.' };
  }
};