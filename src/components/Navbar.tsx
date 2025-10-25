// src/components/Navbar.tsx

import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { User, Globe, LogOut, UserCircle, Check, LayoutDashboard, ChevronDown, Menu, X } from 'lucide-react';
import "./Navbar.css";

interface NavbarProps {
  user: any;
  signOut?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, signOut }) => {
 const { t, i18n } = useTranslation(); // 'i18n' nos da el control para cambiar el idioma
 const navigate = useNavigate();

 // --- ESTADOS (AÑADIMOS EL DEL IDIOMA) ---
 const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
 const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false); // <--- AÑADIDO
 const [isLolDropdownOpen, setIsLolDropdownOpen] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 
 const userDropdownRef = useRef<HTMLDivElement>(null);
 const languageDropdownRef = useRef<HTMLDivElement>(null); // <--- AÑADIDO
 const lolDropdownRef = useRef<HTMLDivElement>(null);

 // --- HANDLERS (AÑADIMOS EL DEL IDIOMA) ---
 const handleLogout = () => {
   if (signOut) signOut();
   setIsMobileMenuOpen(false);
 };
 
 const handleLanguageClick = () => {
   setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
 };

 const handleUserClick = () => {
   setIsUserDropdownOpen(!isUserDropdownOpen);
 };

 const handleNavLinkClick = (path: string) => {
   navigate(path);
   setIsMobileMenuOpen(false);
 };

 useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
     if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
       setIsUserDropdownOpen(false);
     }
     if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
       setIsLanguageDropdownOpen(false);
     }
   };
   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 return (
   <nav className="navbar">
     <Link to="/" className="nav-logo">
      <span className="logo-elo">ELO</span>
      <span className="logo-boost">BOOST</span>
      <span className="logo-dot">.</span>
      <span className="logo-store">STORE</span>
    </Link>
     
     <button className="mobile-menu-button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
       {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
     </button>

     <div className={`nav-container ${isMobileMenuOpen ? 'show' : ''}`}>
       <div className="nav-links">
         <div className="nav-dropdown" ref={lolDropdownRef}>
           <button className="dropdown-button" onClick={() => handleNavLinkClick('/lol/ranked')}>
             {t('navbar.games')}
           </button>
         </div>
       </div>

       <div className="nav-right">
         {/* --- 4. DROPDOWN DE IDIOMA RE-INTEGRADO --- */}
         <div className="language-dropdown" ref={languageDropdownRef}>
           <button className="language-dropdown-button" onClick={handleLanguageClick}>
             <Globe size={16} className="language-icon" />
             <span>{i18n.language === 'es' ? 'Español' : i18n.language === 'pt' ? 'Português' : 'English'}</span>
             <ChevronDown size={16} className="dropdown-arrow" />
           </button>
           <div className={`language-dropdown-content ${isLanguageDropdownOpen ? 'show' : ''}`}>
             <button className="dropdown-item" onClick={() => { i18n.changeLanguage('en'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}>
               {i18n.language === 'en' && <Check size={16} />} English
             </button>
             <button className="dropdown-item" onClick={() => { i18n.changeLanguage('es'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}>
               {i18n.language === 'es' && <Check size={16} />} Español
             </button>
             <button className="dropdown-item" onClick={() => { i18n.changeLanguage('pt'); setIsLanguageDropdownOpen(false); setIsMobileMenuOpen(false); }}>
               {i18n.language === 'pt' && <Check size={16} />} Português
             </button>
           </div>
         </div>

         {user ? (
           <div className="user-dropdown" ref={userDropdownRef}>
             <button className="user-dropdown-button" onClick={handleUserClick}>
               <User size={16} className="user-icon" />
               <span className="user-name">{user.username || user.attributes?.email}</span>
               <ChevronDown size={16} className="dropdown-arrow" />
             </button>
             <div className={`user-dropdown-content ${isUserDropdownOpen ? 'show' : ''}`}>
                <button onClick={() => handleNavLinkClick("/profile")} className="dropdown-item">
                 <UserCircle size={16} /> {t('navbar.profile')}
               </button>
               <button onClick={handleLogout} className="dropdown-item">
                 <LogOut size={16} /> {t('navbar.logout')}
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