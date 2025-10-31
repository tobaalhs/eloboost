/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_BOOSTERASSIGNMENTS_ARN
	STORAGE_BOOSTERASSIGNMENTS_NAME
	STORAGE_BOOSTERASSIGNMENTS_STREAMARN
	STORAGE_ORDERS_ARN
	STORAGE_ORDERS_NAME
	STORAGE_ORDERS_STREAMARN
Amplify Params - DO NOT EDIT */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE = process.env.STORAGE_ORDERS_NAME;
const ASSIGNMENTS_TABLE = process.env.STORAGE_BOOSTERASSIGNMENTS_NAME;
const BOOSTER_COMMISSION_RATE = parseFloat(process.env.BOOSTER_COMMISSION_RATE || '0.65');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-groups',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Content-Type': 'application/json'
};

// ✅ Generar UUID sin require
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Función para desencriptar credenciales
const decryptCredentials = (encryptedText, key) => {
  if (!encryptedText || !key) return null;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    return null;
  }
};

// Obtener el username del usuario autenticado
const getUserFromEvent = (event) => {
  const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;
  if (!cognitoAuthProvider) return null;
  
  // Formato: cognito-idp.region.amazonaws.com/poolId,cognito-idp.region.amazonaws.com/poolId:CognitoSignIn:sub
  const parts = cognitoAuthProvider.split(':');
  const userSub = parts[parts.length - 1];
  
  // ✅ SOLUCIÓN: Con IAM auth, usamos el userSub como username único
  // Este es consistente para usuarios de Google OAuth
  const username = userSub;
  
  // Intentar obtener info adicional si está disponible
  const claims = event.requestContext?.authorizer?.claims || {};
  const email = claims['email'] || '';
  const displayName = claims['name'] || username;
  
  console.log('👤 User Info:', { 
    userSub, 
    username, 
    displayName, 
    email,
    authProvider: cognitoAuthProvider
  });
  
  return { userSub, username, email, displayName };
};

const isUserBoosterOrAdmin = async (event) => {
  try {
    // Método 1: Desde query parameters (sin problemas de CORS)
    let groups = event.queryStringParameters?.groups;
    
    if (groups) {
      try {
        groups = JSON.parse(decodeURIComponent(groups));
        console.log('🔍 Groups from query param:', groups);
      } catch (e) {
        console.error('Error parsing groups:', e);
      }
    }
    
    // Método 2: Desde authorizer claims
    if (!groups) {
      groups = event.requestContext?.authorizer?.claims?.['cognito:groups'];
    }
    
    if (!groups) {
      console.log('❌ No groups found');
      return false;
    }
    
    const groupsArray = Array.isArray(groups) ? groups : [groups];
    const groupsUpper = groupsArray.map(g => g.toUpperCase());
    const hasAccess = groupsUpper.includes('BOOSTER') || groupsUpper.includes('ADMIN');
    
    console.log('✅ Has Access:', hasAccess, 'Groups:', groupsArray);
    return hasAccess;
  } catch (error) {
    console.error('Error checking booster/admin status:', error);
    return false;
  }
};

// 1. Listar órdenes disponibles para boosters
const listAvailableOrders = async () => {
  try {
    const params = {
      TableName: ORDERS_TABLE,
      FilterExpression: '#status = :paid AND attribute_not_exists(boosterUsername)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':paid': 'paid'
      }
    };

    const result = await docClient.send(new ScanCommand(params));
    let orders = result.Items || [];
    
    // ✅ LÓGICA DE PRIORIDAD
    // Si existe al menos una orden prioritaria, mostrar SOLO las prioritarias
    // CORRECCIÓN: El campo en DynamoDB es "priorityBoost", no "isPriority"
    const hasPriorityOrders = orders.some(order => order.priorityBoost === true);
    
    if (hasPriorityOrders) {
      console.log('🌟 Priority orders found - Filtering to show only priority orders');
      orders = orders.filter(order => order.priorityBoost === true);
    } else {
      console.log('📦 No priority orders - Showing all available orders');
    }
    
    // Ordenar por fecha (las más recientes primero)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('📦 Orders to display:', orders.length, `(${hasPriorityOrders ? 'priority only' : 'all'})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        orders,
        hasPriorityOrders // ✅ Info adicional para el frontend
      })
    };
  } catch (error) {
    console.error('Error listing available orders:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error al listar órdenes', error: error.message })
    };
  }
};

// 2. Tomar una orden (claim)
const claimOrder = async (orderId, boosterInfo, body) => {
  try {
    const getOrderParams = { TableName: ORDERS_TABLE, Key: { orderId } };
    const orderResult = await docClient.send(new GetCommand(getOrderParams));
    const order = orderResult.Item;

    if (!order) { 
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ message: 'Orden no encontrada' }) 
      }; 
    }
    
    if (order.boosterUsername) { 
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ message: 'Esta orden ya fue tomada por otro booster' }) 
      }; 
    }

    const boosterEarnings = (parseFloat(order.priceUSD) * BOOSTER_COMMISSION_RATE).toFixed(2);
    const boosterEarningsCLP = (parseFloat(order.priceCLP) * BOOSTER_COMMISSION_RATE).toFixed(2);

    // ✅ SOLUCIÓN: Priorizar el displayName del body (frontend), luego del token
    const boosterUsernameToSave = body.boosterUsername || boosterInfo.username;
    const boosterDisplayNameToSave = body.boosterDisplayName || boosterInfo.displayName || boosterUsernameToSave;
    
    console.log('💾 Saving assignment with:');
    console.log('   - username (ID):', boosterUsernameToSave);
    console.log('   - displayName (nombre):', boosterDisplayNameToSave);
    console.log('   - from body:', { username: body.boosterUsername, displayName: body.boosterDisplayName });

    const now = new Date().toISOString();
    const assignmentId = `assignment-${Date.now()}-${generateUUID().split('-')[0]}`;

    const assignmentParams = {
      TableName: ASSIGNMENTS_TABLE,
      Item: {
        assignmentId, 
        orderId,
        boosterUsername: boosterUsernameToSave,
        boosterEmail: boosterInfo.email || '',
        boosterDisplayName: boosterDisplayNameToSave,
        status: 'CLAIMED', 
        createdAt: now, 
        claimedAt: now, 
        updatedAt: now,
        boosterEarnings: parseFloat(boosterEarnings),
        boosterEarningsCLP: parseFloat(boosterEarningsCLP),
        isPaid: false, 
        isPriority: order.isPriority || false,
        orderSubject: order.subject, 
        fromRank: order.fromRank, 
        toRank: order.toRank,
        server: order.server, 
        nickname: order.nickname, 
        ttl: order.ttl
      }
    };
    
    await docClient.send(new PutCommand(assignmentParams));

    const updateOrderParams = {
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: 'SET boosterUsername = :username, boosterDisplayName = :displayName, boosterAssignedAt = :now, boosterStatus = :status, updatedAt = :now',
      ExpressionAttributeValues: {
        ':username': boosterUsernameToSave,
        ':displayName': boosterDisplayNameToSave,
        ':now': now,
        ':status': 'CLAIMED'
      }
    };
    
    await docClient.send(new UpdateCommand(updateOrderParams));

    console.log('✅ Order claimed:', orderId, 'by', boosterUsernameToSave);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Orden tomada exitosamente', 
        assignmentId, 
        boosterEarnings: parseFloat(boosterEarnings) 
      })
    };
  } catch (error) {
    console.error('Error claiming order:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ message: 'Error al tomar orden', error: error.message }) 
    };
  }
};

// 3. Listar mis órdenes (del booster)
const getMyOrders = async (boosterUsername) => {
  try {
    console.log('🔍 Querying assignments for username:', boosterUsername);

    const params = {
      TableName: ASSIGNMENTS_TABLE,
      IndexName: 'boosterUsername-index',
      KeyConditionExpression: 'boosterUsername = :username',
      ExpressionAttributeValues: {
        ':username': boosterUsername
      }
    };

    const result = await docClient.send(new QueryCommand(params));
    const assignments = result.Items || [];

    console.log('📦 My orders for', boosterUsername, ':', assignments.length);

    // Obtener detalles completos de cada orden incluyendo credenciales
    const ordersWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        try {
          const orderParams = {
            TableName: ORDERS_TABLE,
            Key: { orderId: assignment.orderId }
          };

          const orderResult = await docClient.send(new GetCommand(orderParams));
          const order = orderResult.Item;

          if (!order) {
            console.log('⚠️ Order not found:', assignment.orderId);
            return assignment;
          }

          // Desencriptar credenciales si existen
          let credentials = null;
          if (order.gameUsername && order.gamePassword && order.encryptionKey) {
            const decryptedUsername = decryptCredentials(order.gameUsername, order.encryptionKey);
            const decryptedPassword = decryptCredentials(order.gamePassword, order.encryptionKey);

            if (decryptedUsername && decryptedPassword) {
              credentials = {
                username: decryptedUsername,
                password: decryptedPassword
              };
              console.log('🔓 Credentials decrypted for order:', assignment.orderId);
            }
          }

          return {
            ...assignment,
            credentials,
            orderDetails: {
              subject: order.subject,
              fromRank: order.fromRank,
              toRank: order.toRank,
              server: order.server,
              nickname: order.nickname,
              status: order.status,
              boosterStatus: order.boosterStatus,
              createdAt: order.createdAt
            }
          };
        } catch (error) {
          console.error('Error fetching order details for', assignment.orderId, error);
          return assignment;
        }
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orders: ordersWithDetails })
    };
  } catch (error) {
    console.error('Error getting my orders:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error al obtener órdenes', error: error.message })
    };
  }
};

// 4. Actualizar estado de orden
const updateOrderStatus = async (orderId, status, boosterUsername) => {
  try {
    console.log('🔄 Updating order status:', { orderId, status, boosterUsername });
    
    const now = new Date().toISOString();
    const updateFields = {
      status,
      updatedAt: now
    };

    if (status === 'IN_PROGRESS') {
      updateFields.startedAt = now;
    } else if (status === 'COMPLETED') {
      updateFields.completedAt = now;
    }

    // Buscar assignment por orderId
    const assignmentParams = {
      TableName: ASSIGNMENTS_TABLE,
      FilterExpression: 'orderId = :orderId',
      ExpressionAttributeValues: {
        ':orderId': orderId
      }
    };

    const assignmentResult = await docClient.send(new ScanCommand(assignmentParams));
    const assignment = (assignmentResult.Items || [])[0];

    if (!assignment) {
      console.log('❌ Assignment not found for orderId:', orderId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Assignment no encontrado' })
      };
    }

    console.log('📋 Assignment found:', {
      assignmentUsername: assignment.boosterUsername,
      requestUsername: boosterUsername,
      match: assignment.boosterUsername === boosterUsername
    });

    // ✅ CRÍTICO: Comparar los usernames correctamente
    if (assignment.boosterUsername !== boosterUsername) {
      console.log('❌ Username mismatch!');
      console.log('   Assignment username:', assignment.boosterUsername);
      console.log('   Request username:', boosterUsername);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          message: 'No tienes permiso para actualizar esta orden',
          debug: {
            assignmentUsername: assignment.boosterUsername,
            requestUsername: boosterUsername
          }
        })
      };
    }

    let updateExpression = 'SET #status = :status, updatedAt = :now';
    const expressionValues = {
      ':status': status,
      ':now': now
    };
    const expressionNames = {
      '#status': 'status'
    };

    if (updateFields.startedAt) {
      updateExpression += ', startedAt = :startedAt';
      expressionValues[':startedAt'] = updateFields.startedAt;
    }

    if (updateFields.completedAt) {
      updateExpression += ', completedAt = :completedAt';
      expressionValues[':completedAt'] = updateFields.completedAt;
    }

    const updateAssignmentParams = {
      TableName: ASSIGNMENTS_TABLE,
      Key: { assignmentId: assignment.assignmentId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues
    };

    await docClient.send(new UpdateCommand(updateAssignmentParams));

    // Actualizar orden
    const updateOrderParams = {
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: 'SET boosterStatus = :status, updatedAt = :now',
      ExpressionAttributeValues: {
        ':status': status,
        ':now': now
      }
    };

    if (updateFields.startedAt) {
      updateOrderParams.UpdateExpression += ', boosterStartedAt = :startedAt';
      updateOrderParams.ExpressionAttributeValues[':startedAt'] = updateFields.startedAt;
    }

    if (updateFields.completedAt) {
      updateOrderParams.UpdateExpression += ', boosterCompletedAt = :completedAt';
      updateOrderParams.ExpressionAttributeValues[':completedAt'] = updateFields.completedAt;
    }

    await docClient.send(new UpdateCommand(updateOrderParams));

    console.log('✅ Order status updated:', orderId, status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Estado actualizado exitosamente' })
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error al actualizar estado', error: error.message })
    };
  }
};

// 5. Ver ganancias
const getEarnings = async (boosterUsername) => {
  try {
    console.log('💰 Fetching earnings for:', boosterUsername);
    
    const params = {
      TableName: ASSIGNMENTS_TABLE,
      IndexName: 'boosterUsername-index',
      KeyConditionExpression: 'boosterUsername = :username',
      ExpressionAttributeValues: {
        ':username': boosterUsername
      }
    };

    const result = await docClient.send(new QueryCommand(params));
    const assignments = result.Items || [];

    const totalEarnings = assignments.reduce((sum, a) => sum + (a.boosterEarnings || 0), 0);
    const paidEarnings = assignments.filter(a => a.isPaid).reduce((sum, a) => sum + (a.boosterEarnings || 0), 0);
    const pendingEarnings = totalEarnings - paidEarnings;

    const completedOrders = assignments.filter(a => a.status === 'COMPLETED').length;
    const activeOrders = assignments.filter(a => ['CLAIMED', 'IN_PROGRESS'].includes(a.status)).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalEarnings: totalEarnings.toFixed(2),
        paidEarnings: paidEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        completedOrders,
        activeOrders,
        assignments
      })
    };
  } catch (error) {
    console.error('Error getting earnings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error al obtener ganancias', error: error.message })
    };
  }
};

exports.handler = async (event) => {
  console.log("🚀 Booster API Handler v3 - with cognito:username support");
  console.log('📥 Event received:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ✅ Verificar que sea BOOSTER o ADMIN
  const hasAccess = await isUserBoosterOrAdmin(event);
  if (!hasAccess) {
    console.log('❌ Access denied: User is not a booster or admin');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ message: 'Solo boosters o administradores pueden acceder a este endpoint' })
    };
  }

  const userInfo = getUserFromEvent(event);
  if (!userInfo) {
    console.log('❌ User not authenticated');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Usuario no autenticado' })
    };
  }

  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('🔍 Request:', { method, path, userInfo: { username: userInfo.username, displayName: userInfo.displayName } });

    // GET /booster/orders - Listar órdenes disponibles
    if (method === 'GET' && path.includes('/booster/orders') && !path.includes('/my-orders')) {
      return await listAvailableOrders();
    }

    // POST /booster/orders/{orderId}/claim - Tomar una orden
    if (method === 'POST' && path.includes('/claim')) {
      const orderId = event.pathParameters?.orderId || body.orderId;
      return await claimOrder(orderId, userInfo, body);
    }

    // GET /booster/my-orders - Mis órdenes
    if (method === 'GET' && path.includes('/my-orders')) {
      const boosterUsernameFromQuery = event.queryStringParameters?.username;
      if (!boosterUsernameFromQuery) {
        console.log('❌ Username not provided in query for my-orders');
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ message: 'Username es requerido en la consulta' }) 
        };
      }
      return await getMyOrders(boosterUsernameFromQuery);
    }

    // PUT /booster/update-status/{orderId} - Actualizar estado
    if (method === 'PUT' && path.includes('/update-status')) { 
      const orderId = event.pathParameters?.orderId || body.orderId;
      const status = body.status;
      
      console.log('📝 Update request:', { orderId, status, username: userInfo.username });
      
      return await updateOrderStatus(orderId, status, userInfo.username);
    }

    // GET /booster/earnings - Ver ganancias
    if (method === 'GET' && path.includes('/earnings')) {
      return await getEarnings(userInfo.username);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint no encontrado' })
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error interno del servidor', error: error.message })
    };
  }
};