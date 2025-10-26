// /amplify/backend/function/cancelOrderFunction/src/index.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log(`EVENTO cancelOrder (path limpio): ${JSON.stringify(event)}`);
  
  try {
    if (!event.body) {
      throw new Error("No se proporcionó el ID de la orden en el cuerpo de la petición.");
    }
    const { orderId } = JSON.parse(event.body);

    const userId = event.requestContext.identity.cognitoIdentityId;
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