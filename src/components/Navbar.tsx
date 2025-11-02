// src/components/Navbar.tsx

import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import {
  User, Globe, LogOut, UserCircle, Check, ChevronDown, Menu, X, Shield, Package
} from 'lucide-react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import NotificationBellRealtime from './NotificationBellRealtime.tsx';
import "./Navbar.css";

interface NavbarProps {
  user: any;
  signOut?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, signOut }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Estados
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isLolDropdownOpen, setIsLolDropdownOpen] = useState(false);
  const [isValorantDropdownOpen, setIsValorantDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados nuevos
  const [displayName, setDisplayName] = useState('Usuario');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBooster, setIsBooster] = useState(false);

  // Refs
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const lolDropdownRef = useRef<HTMLDivElement>(null);
  const valorantDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Cargar nombre
  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        try {
          const attributes = await fetchUserAttributes();
          const name = attributes.name || attributes.email || user.username || 'Usuario';
          setDisplayName(name);
        } catch {
          setDisplayName(user.username || 'Usuario');
        }
      }
    };
    loadUserName();
  }, [user]);

  // Cargar roles
  useEffect(() => {
    const loadUserRoles = async () => {
      if (user) {
        try {
          const session = await fetchAuthSession();
          const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
          const groupsLower = groups.map(g => g.toLowerCase());
          const admin = groupsLower.includes('admin');
          const booster = groupsLower.includes('booster');
          setIsAdmin(admin);
          setIsBooster(booster || admin); // 👈 admin también ve el panel booster
        } catch (err) {
          console.error('Error loading user roles:', err);
        }
      }
    };
    loadUserRoles();
  }, [user]);

  const handleLogout = () => {
    if (signOut) signOut();
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) 
        setIsUserDropdownOpen(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) 
        setIsLanguageDropdownOpen(false);
      if (lolDropdownRef.current && !lolDropdownRef.current.contains(event.target as Node)) 
        setIsLolDropdownOpen(false);
      if (valorantDropdownRef.current && !valorantDropdownRef.current.contains(event.target as Node)) 
        setIsValorantDropdownOpen(false);
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) 
        setIsAccountDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo" onClick={() => setIsMobileMenuOpen(false)}>
        <span className="logo-elo">ELO</span>
        <span className="logo-boost">BOOST</span>
        <span className="logo-dot">.</span>
        <span className="logo-store">STORE</span>
      </Link>

      <button 
        className="mobile-menu-button" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`nav-container ${isMobileMenuOpen ? 'show' : ''}`}>
        <div className="nav-links">
          {/* LOL */}
          <div className="nav-dropdown" ref={lolDropdownRef}>
            <button 
              className="dropdown-button" 
              onClick={() => setIsLolDropdownOpen(!isLolDropdownOpen)}
            >
              League of Legends
              <ChevronDown size={16} className={`dropdown-arrow ${isLolDropdownOpen ? 'open' : ''}`} />
            </button>
            <div className={`game-dropdown-content ${isLolDropdownOpen ? 'show' : ''}`}>
              <button onClick={() => handleNavLinkClick('/lol/ranked')} className="dropdown-item">
                Ranked Boost
              </button>
              <button className="dropdown-item">Placement Boost</button>
            </div>
          </div>

          {/* Valorant */}
          <div className="nav-dropdown" ref={valorantDropdownRef}>
            <button 
              className="dropdown-button" 
              onClick={() => setIsValorantDropdownOpen(!isValorantDropdownOpen)}
            >
              Valorant
              <ChevronDown size={16} className={`dropdown-arrow ${isValorantDropdownOpen ? 'open' : ''}`} />
            </button>
            <div className={`game-dropdown-content ${isValorantDropdownOpen ? 'show' : ''}`}>
              <button className="dropdown-item">Ranked Boost</button>
              <button className="dropdown-item">Placement Boost</button>
            </div>
          </div>
        </div>

        <div className="nav-right">
          {/* Idioma */}
          <div className="language-dropdown" ref={languageDropdownRef}>
            <button 
              className="language-dropdown-button" 
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            >
              <Globe size={18} className="language-icon" />
              {i18n.language === 'es' ? 'Español' : i18n.language === 'pt' ? 'Português' : 'English'}
              <ChevronDown size={16} className={`dropdown-arrow ${isLanguageDropdownOpen ? 'open' : ''}`} />
            </button>
            <div className={`language-dropdown-content ${isLanguageDropdownOpen ? 'show' : ''}`}>
              <button 
                className="dropdown-item" 
                onClick={() => { i18n.changeLanguage('en'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}
              >
                {i18n.language === 'en' && <Check size={16} />} English
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => { i18n.changeLanguage('es'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}
              >
                {i18n.language === 'es' && <Check size={16} />} Español
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => { i18n.changeLanguage('pt'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}
              >
                {i18n.language === 'pt' && <Check size={16} />} Português
              </button>
            </div>
          </div>

          {/* Notificaciones en Tiempo Real */}
          {user && <NotificationBellRealtime />}

          {/* Usuario */}
          {user ? (
            <div className="user-dropdown" ref={userDropdownRef}>
              <button 
                className="user-dropdown-button" 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <UserCircle size={18} className="user-icon" />
                <span className="user-name">{displayName}</span>
                <ChevronDown size={16} className={`dropdown-arrow ${isUserDropdownOpen ? 'open' : ''}`} />
              </button>
              <div className={`user-dropdown-content ${isUserDropdownOpen ? 'show' : ''}`}>
                <button onClick={() => handleNavLinkClick("/profile")} className="dropdown-item">
                  <User size={16} className="dropdown-icon" /> {t('navbar.profile') || 'Mi Perfil'}
                </button>
                <button onClick={() => handleNavLinkClick("/my-orders")} className="dropdown-item">
                  <UserCircle size={16} className="dropdown-icon" /> {t('navbar.myorders')}
                </button>

                {/* Botones de roles */}
                {isBooster && (
                  <button onClick={() => handleNavLinkClick("/booster/dashboard")} className="dropdown-item">
                    <Package size={16} className="dropdown-icon" /> Panel Booster
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleNavLinkClick("/admin/users")} className="dropdown-item">
                    <Shield size={16} className="dropdown-icon" /> Admin
                  </button>
                )}

                <button onClick={handleLogout} className="dropdown-item">
                  <LogOut size={16} className="dropdown-icon" /> {t('navbar.logout')}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => handleNavLinkClick('/login')} className="nav-button login-button">
              {t('navbar.login')} →
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
