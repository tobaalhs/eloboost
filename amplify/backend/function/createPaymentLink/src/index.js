const crypto = require('crypto');
const axios = require('axios');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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
  console.log(`EVENTO createPaymentLink v3: ${JSON.stringify(event)}`);
  try {
    const boostData = JSON.parse(event.body);
    const { amount, subject, email, userId: userIdFromBody } = boostData;
    const orderId = `eloboost-${Date.now()}`;

    // PRIORIZAR el userId que viene del body (enviado desde el frontend)
    // Si no está disponible, usar el del contexto como fallback
    const userId = userIdFromBody || event.requestContext.authorizer?.claims?.sub || event.requestContext.identity.cognitoIdentityId;

    console.log('📝 Creating order with userId (sub):', userId);
    console.log('   - From body:', userIdFromBody);
    console.log('   - From context:', event.requestContext.authorizer?.claims?.sub);

    const tableName = process.env.STORAGE_ORDERS_NAME;

    if (boostData.selectedChampions && Array.isArray(boostData.selectedChampions)) {
      boostData.selectedChampions = JSON.stringify(boostData.selectedChampions);
    }

    const newOrder = {
      TableName: tableName,
      Item: {
        orderId: orderId,
        userId: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...boostData,
        // --- LÍNEA AÑADIDA PARA EL TTL ---
        // Se establece una "fecha de vencimiento" de 24 horas a partir de ahora.
        // El valor es un timestamp de Unix en SEGUNDOS.
        ttl: Math.floor(Date.now() / 1000) + 86400 // 86400 segundos = 24 horas
      }
    };

    // Se eliminan campos que no deben guardarse en la base de datos
    delete newOrder.Item.email;
    // No guardar el userId duplicado si venía en boostData
    if (newOrder.Item.userId !== userId) {
      delete newOrder.Item.userId;
      newOrder.Item.userId = userId;
    } 
    
    await docClient.send(new PutCommand(newOrder));

    const API_ENDPOINT_URL = event.headers.Host + '/' + event.requestContext.stage;
    
    const params = {
      apiKey: API_KEY,
      commerceOrder: orderId,
      subject: subject,
      currency: 'CLP',
      amount: amount,
      email: email,
      urlConfirmation: `https://${API_ENDPOINT_URL}/webhook/payment-confirmation`,
      urlReturn: `https://${API_ENDPOINT_URL}/verify-payment`,
    };
    
    params.s = sign(params);
    
    const response = await axios.post(`${FLOW_API_URL}/payment/create`, new URLSearchParams(params));
    const paymentData = response.data;
    const redirectUrl = `${paymentData.url}?token=${paymentData.token}`;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ paymentUrl: redirectUrl }),
    };

  } catch (error) {
    console.error('Error en createPaymentLink:', error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ error: 'No se pudo procesar la solicitud.' }),
    };
  }
};