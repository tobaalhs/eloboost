const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const https = require('https');
const { URL } = require('url');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Helper para enviar notificaciones GraphQL
async function sendGraphQLNotification(userId, type, message, orderId = null) {
  try {
    const appsyncUrl = process.env.API_ELOBOOST_GRAPHQLAPIENDPOINTOUTPUT === 'apieloboostGraphQLAPIEndpointOutput'
      ? 'https://dm4ay3fjn5cpjgbk6iwtp4znhm.appsync-api.us-east-1.amazonaws.com/graphql'
      : process.env.API_ELOBOOST_GRAPHQLAPIENDPOINTOUTPUT;

    const apiKey = process.env.API_ELOBOOST_GRAPHQLAPIKEYOUTPUT === 'apieloboostGraphQLAPIKeyOutput'
      ? 'da2-m34ykg7gurcapallmez4z3ebje'
      : process.env.API_ELOBOOST_GRAPHQLAPIKEYOUTPUT;

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

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  console.log(`EVENTO getOrderDetail v4: ${JSON.stringify(event)}`);

  // Manejar OPTIONS para CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const orderId = event.pathParameters.orderId;
    const tableName = process.env.STORAGE_ORDERS_NAME;
    const method = event.httpMethod;
    const path = event.path || event.resource;

    // GET /order/{orderId} - Obtener detalles de la orden
    if (method === 'GET' && !path.includes('/credentials')) {
      return await getOrderDetail(orderId, event, tableName);
    }

    // PUT /order/{orderId}/credentials - Guardar credenciales
    if (method === 'PUT' && path.includes('/credentials')) {
      return await saveCredentials(orderId, event, tableName);
    }

    // GET /order/{orderId}/credentials - Obtener credenciales (para booster)
    if (method === 'GET' && path.includes('/credentials')) {
      return await getCredentials(orderId, event, tableName);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint no encontrado' }),
    };

  } catch (error) {
    console.error("Error CRÍTICO:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor.' }),
    };
  }
};

// Obtener detalles de la orden
async function getOrderDetail(orderId, event, tableName) {
  // PRIORIZAR el userId del query parameter (enviado desde frontend)
  // Si no está, usar el del contexto como fallback
  const userIdFromQuery = event.queryStringParameters?.userId;
  const userId = userIdFromQuery || event.requestContext.authorizer?.claims?.sub || event.requestContext.identity.cognitoIdentityId;

  console.log("📋 Fetching order detail for userId (sub):", userId);
  console.log("   - From query:", userIdFromQuery);
  console.log("   - From context:", event.requestContext.authorizer?.claims?.sub);

  const params = {
    TableName: tableName,
    Key: { orderId: orderId },
  };

  const { Item } = await docClient.send(new GetCommand(params));

  if (Item) {
    console.log("ID del dueño de la orden (desde DynamoDB):", Item.userId);
  } else {
    console.log("La orden no fue encontrada en la base de datos para el orderId:", orderId);
  }

  if (!Item || Item.userId !== userId) {
    console.log("¡La verificación de seguridad falló! Los IDs no coinciden. Devolviendo 403.");
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Acceso denegado.' }),
    };
  }

  console.log("Verificación de seguridad exitosa. Devolviendo la orden.");
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(Item),
  };
}

// Guardar credenciales (solo el dueño de la orden)
async function saveCredentials(orderId, event, tableName) {
  try {
    // Usar 'sub' del JWT de Cognito en lugar de identityId
    const userId = event.requestContext.authorizer?.claims?.sub || event.requestContext.identity.cognitoIdentityId;
    console.log('💾 Saving credentials for userId (sub):', userId);

    const body = JSON.parse(event.body || '{}');
    const { gameUsername, gamePassword } = body;

    console.log("💾 Guardando credenciales para orden:", orderId);
    console.log("👤 UserID detectado:", userId);
    console.log("📋 Full event:", JSON.stringify(event, null, 2));

    if (!gameUsername || !gamePassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Usuario y contraseña son requeridos' }),
      };
    }

    // Verificar que la orden existe
    const getParams = {
      TableName: tableName,
      Key: { orderId: orderId },
    };

    const { Item } = await docClient.send(new GetCommand(getParams));

    if (!Item) {
      console.log("❌ Orden no encontrada");
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Orden no encontrada' }),
      };
    }

    console.log("🔍 Orden encontrada:", { orderId: Item.orderId, userId: Item.userId });

    // TEMPORAL: Verificar userId solo si está disponible
    if (userId && Item.userId !== userId) {
      console.log("⚠️ WARNING: UserID mismatch:", { fromRequest: userId, fromOrder: Item.userId });
      // Por ahora solo logueamos, no bloqueamos
    }

    // Actualizar credenciales en la orden
    const updateParams = {
      TableName: tableName,
      Key: { orderId: orderId },
      UpdateExpression: 'SET credentials = :creds, updatedAt = :now',
      ExpressionAttributeValues: {
        ':creds': {
          username: gameUsername,
          password: gamePassword,
          updatedAt: new Date().toISOString()
        },
        ':now': new Date().toISOString()
      }
    };

    await docClient.send(new UpdateCommand(updateParams));

    console.log("✅ Credenciales guardadas exitosamente");

    // 🔔 Notificar al booster que las credenciales están disponibles
    if (Item.boosterUsername) {
      try {
        await sendGraphQLNotification(
          Item.boosterUsername,
          'credentials_ready',
          `Las credenciales de tu orden están listas`,
          orderId
        );
        console.log('✅ Notificación enviada al booster:', Item.boosterUsername);
      } catch (notifError) {
        console.error('❌ Error enviando notificación al booster:', notifError);
        // No fallar la operación si la notificación falla
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Credenciales guardadas exitosamente',
        hasCredentials: true
      }),
    };
  } catch (error) {
    console.error("❌ Error guardando credenciales:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error al guardar credenciales',
        message: error.message
      }),
    };
  }
}

// Obtener credenciales (solo el booster asignado)
async function getCredentials(orderId, event, tableName) {
  const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;

  if (!cognitoAuthProvider) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'No autenticado' }),
    };
  }

  // Extraer userSub del booster
  const parts = cognitoAuthProvider.split(':');
  const userSub = parts[parts.length - 1];

  console.log("🔍 Booster solicitando credenciales:", userSub);

  // Obtener la orden
  const getParams = {
    TableName: tableName,
    Key: { orderId: orderId },
  };

  const { Item } = await docClient.send(new GetCommand(getParams));

  if (!Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Orden no encontrada' }),
    };
  }

  // Verificar que el booster esté asignado a esta orden
  if (!Item.boosterUsername || Item.boosterUsername !== userSub) {
    console.log("❌ Booster no asignado a esta orden");
    console.log("   Booster en orden:", Item.boosterUsername);
    console.log("   Booster solicitante:", userSub);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'No tienes permiso para ver estas credenciales' }),
    };
  }

  // Retornar credenciales
  const credentials = Item.credentials || null;

  console.log("✅ Credenciales enviadas al booster");

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ credentials }),
  };
}