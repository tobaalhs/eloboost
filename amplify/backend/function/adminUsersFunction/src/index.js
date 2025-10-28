// amplify/backend/function/adminUsersFunction/src/index.js

const { 
  CognitoIdentityProviderClient, 
  ListUsersCommand, 
  AdminListGroupsForUserCommand, 
  AdminAddUserToGroupCommand, 
  AdminRemoveUserFromGroupCommand, 
  AdminEnableUserCommand, 
  AdminDisableUserCommand,
  AdminDeleteUserCommand  // ✅ Nuevo
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const USER_POOL_ID = process.env.AUTH_ELOBOOSTDE5C54EF_USERPOOLID;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};

const isUserAdmin = async (event) => {
  try {
    console.log('🔍 Checking admin status...');
    
    const cognitoAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider;
    console.log('📋 cognitoAuthenticationProvider:', cognitoAuthProvider);
    
    if (!cognitoAuthProvider) {
      console.log('⚠️ No cognito auth provider found');
      return false;
    }
    
    const parts = cognitoAuthProvider.split(':');
    const userSub = parts[parts.length - 1];
    
    console.log('👤 User SUB:', userSub);
    
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `sub = "${userSub}"`,
      Limit: 1
    });
    
    const listResponse = await client.send(listCommand);
    
    if (!listResponse.Users || listResponse.Users.length === 0) {
      console.log('⚠️ User not found');
      return false;
    }
    
    const username = listResponse.Users[0].Username;
    console.log('👤 Username:', username);
    
    const groupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });
    
    const groupsResponse = await client.send(groupsCommand);
    const groups = groupsResponse.Groups.map(g => g.GroupName);
    
    console.log('👥 User groups:', groups);
    
    const groupsLower = groups.map(g => String(g).toLowerCase());
    const isAdmin = groupsLower.includes('admin') || groupsLower.includes('admins');
    
    console.log(`✅ Is Admin: ${isAdmin}`);
    return isAdmin;
    
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

const listUsers = async () => {
  const users = [];
  let paginationToken = null;
  
  do {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60,
      ...(paginationToken && { PaginationToken: paginationToken })
    });
    
    const response = await client.send(command);
    
    for (const user of response.Users) {
      const groupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      });
      
      const groupsResponse = await client.send(groupsCommand);
      const groups = groupsResponse.Groups.map(g => g.GroupName);
      
      const attributes = {};
      user.Attributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
      
      users.push({
        username: user.Username,
        email: attributes.email || '',
        name: attributes.name || '',
        phone: attributes.phone_number || '',
        groups: groups,
        enabled: user.Enabled,
        status: user.UserStatus,
        createdAt: user.UserCreateDate
      });
    }
    
    paginationToken = response.PaginationToken;
  } while (paginationToken);
  
  return users;
};

// ✅ Nueva función para eliminar usuarios
const deleteUser = async (username) => {
  try {
    console.log(`🗑️ Deleting user: ${username}`);
    
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });
    
    await client.send(command);
    
    console.log(`✅ User ${username} deleted successfully`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Usuario eliminado exitosamente' })
    };
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error al eliminar usuario', 
        error: error.message 
      })
    };
  }
};

exports.handler = async (event) => {
  console.log('📥 Event received');
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  const isAdmin = await isUserAdmin(event);
  
  if (!isAdmin) {
    console.log('🚫 Access denied - Not admin');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ message: 'Access denied - Admin only' })
    };
  }
  
  console.log('✅ Admin verified - Processing request');
  
  try {
    const path = event.path || event.resource;
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    
    if (method === 'GET' && path.includes('/users')) {
      console.log('📋 Listing users...');
      const users = await listUsers();
      console.log(`✅ Found ${users.length} users`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ users })
      };
    }
    
    if (method === 'POST' && path.includes('/add-to-group')) {
      const { username, groupName } = body;
      
      if (!username || !groupName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username and groupName required' })
        };
      }
      
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'User added to group' })
      };
    }
    
    if (method === 'POST' && path.includes('/remove-from-group')) {
      const { username, groupName } = body;
      
      if (!username || !groupName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username and groupName required' })
        };
      }
      
      const command = new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'User removed from group' })
      };
    }
    
    if (method === 'POST' && path.includes('/enable')) {
      const { username } = body;
      
      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username required' })
        };
      }
      
      const command = new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'User enabled' })
      };
    }
    
    if (method === 'POST' && path.includes('/disable')) {
      const { username } = body;
      
      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username required' })
        };
      }
      
      const command = new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'User disabled' })
      };
    }
    
    // ✅ Nuevo endpoint para eliminar usuarios
    if (method === 'POST' && path.includes('/delete')) {
      const { username } = body;
      
      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Username required' })
        };
      }
      
      return await deleteUser(username);
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' })
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};
