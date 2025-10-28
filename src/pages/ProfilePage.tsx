// src/pages/ProfilePage.tsx

import React, { useEffect, useState } from 'react';
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ProfilePage.css';

interface UserProfile {
  username: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  groups: string[];
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const attributes = await fetchUserAttributes();
      
      // Extraer grupos del token JWT
      const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
      
      // 🔍 DEBUG: Ver qué grupos tiene el usuario
      console.log('🔍 User groups from token:', groups);
      console.log('🔍 Session tokens:', session.tokens);
      
      // Determinar rol basado en grupos (case-insensitive para evitar errores)
      let role = 'CUSTOMER'; // Por defecto
      
      // Buscar en grupos de forma más flexible
      const groupsLower = groups.map(g => g.toLowerCase());
      
      if (groupsLower.includes('admins') || groupsLower.includes('admin')) {
        role = 'ADMIN';
        console.log('✅ User is ADMIN');
      } else if (groupsLower.includes('boosters') || groupsLower.includes('booster')) {
        role = 'BOOSTER';
        console.log('✅ User is BOOSTER');
      } else {
        console.log('ℹ️ User is CUSTOMER (default)');
      }
      
      const userProfile: UserProfile = {
        username: user.username,
        email: attributes.email || '',
        name: attributes.name || t('common.notAvailable'),
        phone: attributes.phone_number || t('common.notAvailable'),
        role: role,
        groups: groups
      };
      
      setProfile(userProfile);
      setError('');
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(t('profile.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-admin';
      case 'BOOSTER':
        return 'badge-booster';
      case 'CUSTOMER':
        return 'badge-customer';
      default:
        return 'badge-default';
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchProfile} className="retry-button">
            {t('profile.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">{t('profile.title')}</h1>
        
        {profile && (
          <div className="profile-card">
            <div className="profile-section">
              <label className="profile-label">{t('profile.name')}:</label>
              <p className="profile-value">{profile.name}</p>
            </div>

            <div className="profile-section">
              <label className="profile-label">{t('profile.phone')}:</label>
              <p className="profile-value">{profile.phone}</p>
            </div>

            <div className="profile-section">
              <label className="profile-label">{t('profile.email')}:</label>
              <p className="profile-value">{profile.email}</p>
            </div>

            <div className="profile-section">
              <label className="profile-label">{t('profile.role')}:</label>
              <span className={`role-badge ${getRoleBadgeClass(profile.role)}`}>
                {profile.role}
              </span>
            </div>

            <div className="profile-section">
              <label className="profile-label">{t('profile.groups')}:</label>
              <div className="groups-list">
                {profile.groups.length > 0 ? (
                  profile.groups.map((group, index) => (
                    <span key={index} className="group-tag">
                      {group}
                    </span>
                  ))
                ) : (
                  <p className="no-groups">{t('profile.noGroups')}</p>
                )}
              </div>
            </div>

            {profile.role === 'ADMIN' && (
              <div className="admin-actions">
                <button 
                  onClick={() => navigate('/admin/users')} 
                  className="admin-button"
                >
                  {t('profile.manageUsers')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
