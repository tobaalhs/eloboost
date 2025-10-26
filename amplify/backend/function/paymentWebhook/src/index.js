/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_ORDERS_ARN
	STORAGE_ORDERS_NAME
	STORAGE_ORDERS_STREAMARN
Amplify Params - DO NOT EDIT */// amplify/backend/function/paymentWebhook/src/index.js (VERSIÓN FINAL Y CORRECTA)

const crypto = require('crypto');
const axios = require('axios');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// USA LAS MISMAS CREDENCIALES DE SANDBOX QUE EN TUS OTRAS FUNCIONES
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
    // 1. EXTRAEMOS EL TOKEN DEL CUERPO
    // Flow envía el token en un formato 'application/x-www-form-urlencoded'
    const body = new URLSearchParams(event.body);
    const token = body.get('token');

    if (!token) {
      console.error("Notificación de Flow no contenía un token.");
      return { statusCode: 400, body: 'Bad Request: Missing token' };
    }

    console.log(`Token recibido del webhook: ${token}`);

    // 2. USAMOS EL TOKEN PARA OBTENER EL ESTADO REAL DEL PAGO
    const params = { apiKey: API_KEY, token: token };
    params.s = sign(params);

    const response = await axios.get(`${FLOW_API_URL}/payment/getStatus`, { params });
    const paymentData = response.data;
    console.log("Datos del pago obtenidos de /getStatus:", paymentData);

    const { commerceOrder, status } = paymentData;
    const orderId = commerceOrder; // 'commerceOrder' es nuestro 'orderId'

    // 3. ACTUALIZAMOS LA BASE DE DATOS SI EL PAGO FUE EXITOSO
    if (status === 2) { // 2 = PAGADA
      const tableName = process.env.STORAGE_ORDERS_NAME;

      const updateParams = {
        TableName: tableName,
        Key: { orderId: orderId },
        UpdateExpression: "set #status = :s",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":s": "paid" },
      };

      console.log(`Actualizando orden ${orderId} a estado 'paid'`);
      await docClient.send(new UpdateCommand(updateParams));
      console.log("Orden actualizada con éxito.");

    } else {
      console.log(`Estado del pago no es 'pagado' (status: ${status}). No se actualiza la base de datos.`);
    }

    // 4. RESPONDEMOS A FLOW CON ÉXITO
    return { statusCode: 200, body: 'OK' };

  } catch (error) {
    console.error("Error al procesar el webhook:", error.response ? error.response.data : error.message);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};