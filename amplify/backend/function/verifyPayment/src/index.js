// amplify/backend/function/verifyPayment/src/index.js (VERSIÓN FINAL)

const crypto = require('crypto');
const axios = require('axios');

const API_KEY = '28F7B783-FFC3-4D02-81F9-28L5D78CC6A4';
const SECRET_KEY = 'a6eeed41e6551fc4890555b8d80f70fee55db044';
const FLOW_API_URL = 'https://sandbox.flow.cl/api';
const FRONTEND_URL = 'http://localhost:3000';

const sign = (params) => {
  const sortedKeys = Object.keys(params).sort();
  let toSign = '';
  sortedKeys.forEach(key => { toSign += `${key}${params[key]}`; });
  return crypto.createHmac('sha256', SECRET_KEY).update(toSign).digest('hex');
};

exports.handler = async (event) => {
  console.log(`EVENTO verifyPayment: ${JSON.stringify(event)}`);

  // 1. Extraemos el token que Flow nos envía en el cuerpo POST
  const body = new URLSearchParams(event.body);
  const token = body.get('token');

  if (!token) {
    console.error("No se recibió el token de Flow.");
    return {
      statusCode: 302, // Código de redirección
      headers: { Location: `${FRONTEND_URL}/payment/failure?error=no_token` },
    };
  }

  try {
    // 2. Verificamos el estado del token con la API de Flow
    const params = { apiKey: API_KEY, token: token };
    params.s = sign(params);

    const response = await axios.get(`${FLOW_API_URL}/payment/getStatus`, { params });
    const statusData = response.data;
    console.log("Respuesta de Flow /getStatus:", statusData);

    // 3. Redirigimos al usuario según el resultado
    if (statusData.status === 2) { // 2 = PAGADA
      console.log("Pago exitoso. Redirigiendo a /payment/success");
      return {
        statusCode: 302,
        headers: { Location: `${FRONTEND_URL}/payment/success?flowOrder=${statusData.flowOrder}` },
      };
    } else { // Cualquier otro estado (rechazado, anulado)
      console.log("Pago fallido. Redirigiendo a /payment/failure");
      return {
        statusCode: 302,
        headers: { Location: `${FRONTEND_URL}/payment/failure?flowOrder=${statusData.flowOrder}` },
      };
    }
  } catch (error) {
    console.error('Error al verificar el token:', error.response ? error.response.data : error.message);
    return {
      statusCode: 302,
      headers: { Location: `${FRONTEND_URL}/payment/failure?error=verification_failed` },
    };
  }
};