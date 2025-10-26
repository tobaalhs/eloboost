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
  console.log(`EVENTO createPaymentLink v2: ${JSON.stringify(event)}`);
  try {
    const boostData = JSON.parse(event.body);
    const { amount, subject, email } = boostData;
    const orderId = `eloboost-${Date.now()}`;
    const userId = event.requestContext.identity.cognitoIdentityId;
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
    
    // Se elimina el email para no guardarlo en la base de datos, lo cual es una buena práctica.
    delete newOrder.Item.email; 
    
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