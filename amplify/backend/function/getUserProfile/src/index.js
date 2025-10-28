const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  console.log("EVENTO getUserProfile:", JSON.stringify(event));
  
  try {
    const username = event.requestContext.authorizer.claims['cognito:username'];
    const userPoolId = process.env.AUTH_ELOBOOST_USERPOOLID;
    
    // Obtener grupos del usuario
    const groupsResponse = await cognitoClient.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: username
      })
    );
    
    const userGroups = groupsResponse.Groups.map(g => g.GroupName);
    
    // Determinar rol principal
    let role = 'CUSTOMER';
    if (userGroups.includes('ADMIN')) role = 'ADMIN';
    else if (userGroups.includes('BOOSTER')) role = 'BOOSTER';
    
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        username,
        role,
        groups: userGroups
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
