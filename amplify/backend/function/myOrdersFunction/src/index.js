const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log(`EVENTO myOrders v3: ${JSON.stringify(event)}`);
  try {
    // PRIORIZAR el userId del query parameter (enviado desde frontend)
    // Si no está, usar el del contexto como fallback
    const userIdFromQuery = event.queryStringParameters?.userId;
    const userId = userIdFromQuery || event.requestContext.authorizer?.claims?.sub || event.requestContext.identity.cognitoIdentityId;

    console.log('📋 Fetching orders for userId (sub):', userId);
    console.log('   - From query:', userIdFromQuery);
    console.log('   - From context:', event.requestContext.authorizer?.claims?.sub);

    const tableName = process.env.STORAGE_ORDERS_NAME;
    const indexName = `byUserId-${process.env.ENV}`;

    const params = {
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    };

    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify(Items || []),
    };
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ error: 'No se pudieron obtener las órdenes.' }),
    };
  }
};