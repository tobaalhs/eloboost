// amplify/backend/function/myOrdersFunction/src/index.js (CORREGIDO)

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
// --- LÍNEA CORREGIDA ---
const docClient = DynamoDBDocumentClient.from(client); // Corregido el typo

exports.handler = async (event) => {
  console.log(`EVENTO myOrders: ${JSON.stringify(event)}`);

  try {
    const userId = event.requestContext.identity.cognitoIdentityId;
    const tableName = process.env.STORAGE_ORDERS_NAME;
    const indexName = 'byUserId'; 

    const params = {
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    };

    console.log("Consultando DynamoDB con los parámetros:", params);
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