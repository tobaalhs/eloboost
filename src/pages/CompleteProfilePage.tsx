// src/pages/CompleteProfilePage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { updateUserAttributes, fetchUserAttributes } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import './CompleteProfilePage.css';

const CompleteProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentAttributes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCurrentAttributes = async () => {
    try {
      const attributes = await fetchUserAttributes();
      
      if (attributes.name) {
        setName(attributes.name);
      }
      if (attributes.phone_number) {
        setPhone(attributes.phone_number);
        navigate('/');
      }
    } catch (err) {
      console.error('Error fetching attributes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('completeProfile.nameRequired'));
      return;
    }
    
    if (!phone.trim() || !phone.startsWith('+')) {
      setError(t('completeProfile.phoneInvalid'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserAttributes({
        userAttributes: {
          name: name.trim(),
          phone_number: phone.trim()
        }
      });

      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || t('completeProfile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'es':
        return 'Español';
      case 'pt':
        return 'Português';
      case 'en':
      default:
        return 'English';
    }
  };

  return (
    <div className="complete-profile-page">
      <div className="complete-profile-container">
        {/* Selector de idioma en la esquina */}
        <div className="language-selector" ref={languageDropdownRef}>
          <button
            className="language-button"
            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          >
            <Globe size={18} />
            <span>{getLanguageName(i18n.language)}</span>
            <ChevronDown size={16} className={`arrow ${isLanguageDropdownOpen ? 'open' : ''}`} />
          </button>
          
          {isLanguageDropdownOpen && (
            <div className="language-dropdown">
              <button
                className="language-option"
                onClick={() => {
                  i18n.changeLanguage('en');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                {i18n.language === 'en' && <Check size={16} />}
                <span>English</span>
              </button>
              <button
                className="language-option"
                onClick={() => {
                  i18n.changeLanguage('es');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                {i18n.language === 'es' && <Check size={16} />}
                <span>Español</span>
              </button>
              <button
                className="language-option"
                onClick={() => {
                  i18n.changeLanguage('pt');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                {i18n.language === 'pt' && <Check size={16} />}
                <span>Português</span>
              </button>
            </div>
          )}
        </div>

        <h1 className="complete-profile-title">{t('completeProfile.title')}</h1>
        <p className="complete-profile-subtitle">
          {t('completeProfile.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="complete-profile-form">
          <div className="form-group">
            <label htmlFor="name">{t('completeProfile.fullName')} *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('completeProfile.namePlaceholder')}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('completeProfile.phone')} *</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('completeProfile.phonePlaceholder')}
              required
            />
            <small style={{ color: '#666', fontSize: '0.85rem' }}>
              {t('completeProfile.phoneHint')}
            </small>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? t('common.sending') : t('completeProfile.continue')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
