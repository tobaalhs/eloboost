const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  console.log("EVENTO updateUserRole:", JSON.stringify(event));
  
  try {
    const requestingUsername = event.requestContext.authorizer.claims['cognito:username'];
    const userPoolId = process.env.AUTH_ELOBOOST_USERPOOLID;
    
    // Verificar que quien hace la petición es ADMIN
    const requestingGroups = await cognitoClient.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: requestingUsername
      })
    );
    
    const isAdmin = requestingGroups.Groups.some(g => g.GroupName === 'ADMIN');
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Solo administradores pueden cambiar roles' })
      };
    }
    
    const { targetUsername, newRole } = JSON.parse(event.body);
    
    if (!['CUSTOMER', 'BOOSTER', 'ADMIN'].includes(newRole)) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Rol inválido' })
      };
    }
    
    // Obtener grupos actuales del usuario objetivo
    const targetGroups = await cognitoClient.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: targetUsername
      })
    );
    
    // Remover de todos los grupos
    for (const group of targetGroups.Groups) {
      await cognitoClient.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: targetUsername,
          GroupName: group.GroupName
        })
      );
    }
    
    // Agregar al nuevo grupo
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: targetUsername,
        GroupName: newRole
      })
    );
    
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        message: 'Rol actualizado',
        username: targetUsername,
        newRole
      })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
