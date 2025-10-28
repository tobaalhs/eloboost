// src/components/Navbar.tsx

import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { User, Globe, LogOut, UserCircle, Check, ChevronDown, Menu, X } from 'lucide-react';
import { fetchUserAttributes } from 'aws-amplify/auth'; // NUEVO
import "./Navbar.css";

interface NavbarProps {
  user: any;
  signOut?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, signOut }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Estados para todos los menús desplegables
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isLolDropdownOpen, setIsLolDropdownOpen] = useState(false);
  const [isValorantDropdownOpen, setIsValorantDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // NUEVO: Estado para el nombre real del usuario
  const [displayName, setDisplayName] = useState('Usuario');

  // Referencias para cada menú
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const lolDropdownRef = useRef<HTMLDivElement>(null);
  const valorantDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // NUEVO: Cargar nombre real del usuario
  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        try {
          const attributes = await fetchUserAttributes();
          // Prioridad: name > email > username
          const name = attributes.name || attributes.email || user.username || 'Usuario';
          setDisplayName(name);
        } catch (err) {
          console.error('Error loading user name:', err);
          setDisplayName(user.username || 'Usuario');
        }
      }
    };
    
    loadUserName();
  }, [user]);

  const handleLogout = () => {
    if (signOut) signOut();
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

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
          {/* Dropdown League of Legends */}
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

          {/* Dropdown Valorant */}
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
          {/* Dropdown de Idioma */}
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
                onClick={() => { 
                  i18n.changeLanguage('en'); 
                  setIsLanguageDropdownOpen(false); 
                  setIsMobileMenuOpen(false); 
                }}
              >
                {i18n.language === 'en' && <Check size={16} />} English
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => { 
                  i18n.changeLanguage('es'); 
                  setIsLanguageDropdownOpen(false); 
                  setIsMobileMenuOpen(false); 
                }}
              >
                {i18n.language === 'es' && <Check size={16} />} Español
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => { 
                  i18n.changeLanguage('pt'); 
                  setIsLanguageDropdownOpen(false); 
                  setIsMobileMenuOpen(false); 
                }}
              >
                {i18n.language === 'pt' && <Check size={16} />} Português
              </button>
            </div>
          </div>

          {/* Menú de Usuario / Botón de Login */}
          {user ? (
            <div className="user-dropdown" ref={userDropdownRef}>
              <button 
                className="user-dropdown-button" 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <UserCircle size={18} className="user-icon" />
                {/* CAMBIADO: Ahora muestra el nombre real */}
                <span className="user-name">{displayName}</span>
                <ChevronDown size={16} className={`dropdown-arrow ${isUserDropdownOpen ? 'open' : ''}`} />
              </button>
              <div className={`user-dropdown-content ${isUserDropdownOpen ? 'show' : ''}`}>
                <button 
                  onClick={() => handleNavLinkClick("/profile")} 
                  className="dropdown-item"
                >
                  <User size={16} className="dropdown-icon" />
                  {t('navbar.profile') || 'Mi Perfil'}
                </button>
                
                <button 
                  onClick={() => handleNavLinkClick("/my-orders")} 
                  className="dropdown-item"
                >
                  <UserCircle size={16} className="dropdown-icon" />
                  {t('navbar.myorders')}
                </button>
                
                <button onClick={handleLogout} className="dropdown-item">
                  <LogOut size={16} className="dropdown-icon" />
                  {t('navbar.logout')}
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => handleNavLinkClick('/login')} 
              className="nav-button login-button"
            >
              {t('navbar.login')} →
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
