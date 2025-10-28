const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  console.log("EVENTO listAllUsers:", JSON.stringify(event));
  
  try {
    const requestingUsername = event.requestContext.authorizer.claims['cognito:username'];
    const userPoolId = process.env.AUTH_ELOBOOSTDE5C54EF_USERPOOLID;
    
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
        body: JSON.stringify({ error: 'Solo administradores pueden listar usuarios' })
      };
    }
    
    // Listar todos los usuarios
    const listUsersResponse = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60
      })
    );
    
    // Para cada usuario, obtener sus grupos
    const usersWithRoles = await Promise.all(
      listUsersResponse.Users.map(async (user) => {
        const username = user.Username;
        const email = user.Attributes.find(attr => attr.Name === 'email')?.Value || '';
        
        try {
          const userGroups = await cognitoClient.send(
            new AdminListGroupsForUserCommand({
              UserPoolId: userPoolId,
              Username: username
            })
          );
          
          const groups = userGroups.Groups.map(g => g.GroupName);
          let role = 'CUSTOMER';
          if (groups.includes('ADMIN')) role = 'ADMIN';
          else if (groups.includes('BOOSTER')) role = 'BOOSTER';
          
          return {
            username,
            email,
            role,
            groups,
            status: user.UserStatus,
            enabled: user.Enabled,
            createdDate: user.UserCreateDate
          };
        } catch (error) {
          console.error(`Error obteniendo grupos para ${username}:`, error);
          return {
            username,
            email,
            role: 'CUSTOMER',
            groups: [],
            status: user.UserStatus,
            enabled: user.Enabled,
            createdDate: user.UserCreateDate
          };
        }
      })
    );
    
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ users: usersWithRoles })
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
