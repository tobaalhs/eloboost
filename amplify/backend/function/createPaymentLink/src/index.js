/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_ORDERS_ARN
	STORAGE_ORDERS_NAME
	STORAGE_ORDERS_STREAMARN
Amplify Params - DO NOT EDIT */// amplify/backend/function/createPaymentLink/src/index.js (VERSIÓN FINAL)

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
  console.log(`EVENTO createPaymentLink: ${JSON.stringify(event)}`);
  
  try {
    const { amount, subject, email } = JSON.parse(event.body);
    const orderId = `eloboost-${Date.now()}`;
    const userId = event.requestContext.identity.cognitoIdentityId;
    
    const tableName = process.env.STORAGE_ORDERS_NAME;
    const newOrder = {
      TableName: tableName,
      Item: {
        orderId: orderId, userId: userId, status: 'pending', amount: amount,
        subject: subject, createdAt: new Date().toISOString(),
      }
    };
    
    console.log("Guardando pedido en DynamoDB:", newOrder);
    await docClient.send(new PutCommand(newOrder));
    
    const API_ENDPOINT_URL = event.headers.Host + '/' + event.requestContext.stage;
  
    const params = {
      apiKey: API_KEY, commerceOrder: orderId, subject: subject, currency: 'CLP',
      amount: amount, email: email,
      urlConfirmation: `https://${API_ENDPOINT_URL}/webhook/payment-confirmation`,
      // --- LÍNEA CLAVE ---
      // La URL de retorno AHORA apunta a nuestro otro endpoint de la API.
      urlReturn: `https://${API_ENDPOINT_URL}/verify-payment`,
    };

    params.s = sign(params);
    
    console.log('Enviando petición a Flow:', params);
    const response = await axios.post(`${FLOW_API_URL}/payment/create`, new URLSearchParams(params));
    const paymentData = response.data;
    const redirectUrl = `${paymentData.url}?token=${paymentData.token}`;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ paymentUrl: redirectUrl }),
    };

  } catch (error) {
    console.error('Error en createPaymentLink:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ error: 'No se pudo procesar la solicitud.' }),
    };
  }
};