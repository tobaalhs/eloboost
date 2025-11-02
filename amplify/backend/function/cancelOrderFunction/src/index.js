// /amplify/backend/function/cancelOrderFunction/src/index.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log(`EVENTO cancelOrder v3: ${JSON.stringify(event)}`);

  try {
    if (!event.body) {
      throw new Error("No se proporcionó el ID de la orden en el cuerpo de la petición.");
    }
    const { orderId } = JSON.parse(event.body);

    // Extraer userId (sub) del cognitoAuthenticationProvider
    // Formato: "cognito-idp.us-east-1.amazonaws.com/us-east-1_Cm7jth6AT,cognito-idp.us-east-1.amazonaws.com/us-east-1_Cm7jth6AT:CognitoSignIn:f408b468-70a1-7081-8a24-2878a183b3ec"
    const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;
    let userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId && cognitoAuthProvider) {
      const parts = cognitoAuthProvider.split(':');
      userId = parts[parts.length - 1]; // El último elemento es el sub
    }

    if (!userId) {
      userId = event.requestContext.identity.cognitoIdentityId; // Fallback
    }

    console.log('🗑️ Canceling order for userId (sub):', userId);
    console.log('   - From authorizer:', event.requestContext.authorizer?.claims?.sub);
    console.log('   - From cognitoAuthProvider:', cognitoAuthProvider);

    const tableName = process.env.STORAGE_ORDERS_NAME;

    const getParams = { TableName: tableName, Key: { orderId: orderId } };
    const { Item } = await docClient.send(new GetCommand(getParams));

    if (!Item || Item.userId !== userId) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Acceso denegado.' }),
      };
    }

    const deleteParams = { TableName: tableName, Key: { orderId: orderId } };
    await docClient.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: 'Orden cancelada exitosamente.' }),
    };
  } catch (error) {
    console.error("Error al cancelar la orden:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: 'No se pudo cancelar la orden.' }),
    };
  }
};