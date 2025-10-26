const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log(`EVENTO getOrderDetail v3: ${JSON.stringify(event)}`);
  
  try {
    const orderId = event.pathParameters.orderId;
    const userId = event.requestContext.identity.cognitoIdentityId;
    const tableName = process.env.STORAGE_ORDERS_NAME;

    // --- LOG PARA DEBUG #1 ---
    // Muestra el ID del usuario que está haciendo la petición desde la App.
    console.log("ID del usuario que pide la orden (desde Cognito):", userId);

    const params = {
      TableName: tableName,
      Key: { orderId: orderId },
    };

    const { Item } = await docClient.send(new GetCommand(params));
    
    // --- LOG PARA DEBUG #2 ---
    // Muestra el ID del usuario que está guardado en la orden en la base de datos.
    if (Item) {
        console.log("ID del dueño de la orden (desde DynamoDB):", Item.userId);
    } else {
        console.log("La orden no fue encontrada en la base de datos para el orderId:", orderId);
    }

    // --- Verificación de Seguridad ---
    // Esta condición es la que está fallando. Los logs de arriba te dirán por qué.
    if (!Item || Item.userId !== userId) {
      console.log("¡La verificación de seguridad falló! Los IDs no coinciden. Devolviendo 403.");
      return {
        statusCode: 403, // Este es el error que ves en el navegador.
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
        body: JSON.stringify({ error: 'Acceso denegado.' }),
      };
    }
    
    console.log("Verificación de seguridad exitosa. Devolviendo la orden.");
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify(Item),
    };

  } catch (error) {
    console.error("Error CRÍTICO al obtener el detalle de la orden:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({ error: 'No se pudo obtener la orden.' }),
    };
  }
};