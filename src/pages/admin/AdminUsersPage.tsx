// src/pages/admin/AdminUsersPage.tsx

import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, UserPlus, Ban, CheckCircle, X, RefreshCw, Trash2 } from 'lucide-react';  // ✅ Añadir Trash2

import './AdminUsersPage.css';

interface User {
  username: string;
  email: string;
  name: string;
  phone: string;
  groups: string[];
  enabled: boolean;
  createdAt: string;
  status: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'BOOSTER' | 'CUSTOMER'>('ALL');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const checkAdminAccess = async () => {
    try {
      const session = await fetchAuthSession();
      const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
      
      const groupsLower = groups.map(g => g.toLowerCase());
      
      if (!groupsLower.includes('admin')) {
        console.log('❌ Access denied - Not admin');
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
    } catch (err) {
      console.error('Error checking admin access:', err);
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const restOperation = get({
        apiName: 'adminAPI',
        path: '/admin/users'
      });

      const response = await restOperation.response;
      const data = await response.body.json() as any;
      
      console.log('✅ Users fetched:', data);
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      alert('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'ALL') {
      filtered = filtered.filter(user => {
        const role = getUserRole(user.groups);
        return role === filterRole;
      });
    }

    setFilteredUsers(filtered);
  };

  const addUserToGroup = async (username: string, groupName: string) => {
    try {
      const restOperation = post({
        apiName: 'adminAPI',
        path: '/admin/users/add-to-group',
        options: {
          body: { username, groupName }
        }
      });

      await restOperation.response;
      await fetchUsers();
      alert(`Usuario agregado al grupo ${groupName}`);
    } catch (err: any) {
      console.error('❌ Error adding user to group:', err);
      alert('Error al agregar usuario al grupo: ' + (err.message || 'Error desconocido'));
    }
  };

  const removeUserFromGroup = async (username: string, groupName: string) => {
    try {
      const restOperation = post({
        apiName: 'adminAPI',
        path: '/admin/users/remove-from-group',
        options: {
          body: { username, groupName }
        }
      });

      await restOperation.response;
      await fetchUsers();
      alert(`Usuario removido del grupo ${groupName}`);
    } catch (err: any) {
      console.error('❌ Error removing user from group:', err);
      alert('Error al remover usuario del grupo: ' + (err.message || 'Error desconocido'));
    }
  };

  const toggleUserStatus = async (username: string, enable: boolean) => {
    try {
      const path = enable ? '/admin/users/enable' : '/admin/users/disable';
      
      const restOperation = post({
        apiName: 'adminAPI',
        path,
        options: {
          body: { username }
        }
      });

      await restOperation.response;
      await fetchUsers();
      alert(`Usuario ${enable ? 'habilitado' : 'deshabilitado'}`);
    } catch (err: any) {
      console.error('❌ Error toggling user status:', err);
      alert('Error al cambiar estado del usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  // ✅ Nueva función para eliminar usuarios permanentemente
  const deleteUser = async (username: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente al usuario ${username}? Esta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      const restOperation = post({
        apiName: 'adminAPI',
        path: '/admin/users/delete',
        options: {
          body: { username }
        }
      });

      await restOperation.response;
      await fetchUsers();
      alert('Usuario eliminado exitosamente');
    } catch (err: any) {
      console.error('❌ Error deleting user:', err);
      alert('Error al eliminar usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  const getUserRole = (groups: string[]) => {
    const groupsUpper = groups.map(g => g.toUpperCase());
    
    if (groupsUpper.includes('ADMIN')) {
      return 'ADMIN';
    } else if (groupsUpper.includes('BOOSTER')) {
      return 'BOOSTER';
    }
    return 'CUSTOMER';
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'role-badge-admin';
      case 'BOOSTER':
        return 'role-badge-booster';
      case 'CUSTOMER':
        return 'role-badge-customer';
      default:
        return 'role-badge-default';
    }
  };

  if (loading) {
    return (
      <div className="admin-users-page">
        <div className="loading-spinner">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <div className="admin-header">
        <h1>Gestión de Usuarios</h1>
        <button onClick={fetchUsers} className="refresh-button">
          <RefreshCw size={20} />
          Actualizar
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="role-filters">
          {['ALL', 'ADMIN', 'BOOSTER', 'CUSTOMER'].map(role => (
            <button
              key={role}
              className={`filter-button ${filterRole === role ? 'active' : ''}`}
              onClick={() => setFilterRole(role as any)}
            >
              {role === 'ALL' ? 'Todos' : role}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Usuarios</h3>
          <p className="stat-number">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Filtrados</h3>
          <p className="stat-number">{filteredUsers.length}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-number">
            {users.filter(u => getUserRole(u.groups) === 'ADMIN').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Boosters</h3>
          <p className="stat-number">
            {users.filter(u => getUserRole(u.groups) === 'BOOSTER').length}
          </p>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const role = getUserRole(user.groups);
              
              return (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.name || '-'}</td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(role)}`}>
                      {role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.enabled ? 'active' : 'inactive'}`}>
                      {user.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {role !== 'ADMIN' && (
                        <button
                          onClick={() => addUserToGroup(user.username, 'ADMIN')}
                          className="action-btn admin-btn"
                          title="Hacer Admin"
                        >
                          <Shield size={16} />
                        </button>
                      )}

                      {role !== 'BOOSTER' && role !== 'ADMIN' && (
                        <button
                          onClick={() => addUserToGroup(user.username, 'BOOSTER')}
                          className="action-btn booster-btn"
                          title="Hacer Booster"
                        >
                          <UserPlus size={16} />
                        </button>
                      )}

                      {user.groups.length > 0 && user.groups
                        .filter(group => ['ADMIN', 'BOOSTER', 'CUSTOMER'].includes(group.toUpperCase()))
                        .map(group => (
                          <button
                            key={group}
                            onClick={() => removeUserFromGroup(user.username, group)}
                            className="action-btn remove-group-btn"
                            title={`Remover de ${group}`}
                          >
                            <X size={14} /> {group}
                          </button>
                        ))
                      }

                      <button
                        onClick={() => toggleUserStatus(user.username, !user.enabled)}
                        className={`action-btn ${user.enabled ? 'disable-btn' : 'enable-btn'}`}
                        title={user.enabled ? 'Deshabilitar' : 'Habilitar'}
                      >
                        {user.enabled ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>

                      {/* ✅ Botón de eliminar permanentemente */}
                      <button
                        onClick={() => deleteUser(user.username)}
                        className="action-btn delete-btn"
                        title="Eliminar usuario permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersPage;
