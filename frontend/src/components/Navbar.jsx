import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/PMC-Navbar.png';
import '../css/Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-wrapper">
          <Link to="/" onClick={closeMenu}>
            <img src={logo} alt="PickMyCollege Logo" className="navbar-logo" />
          </Link>
        </div>
      </div>

      {/* Hamburger menu icon for mobile */}
      <div className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Toggle menu" aria-expanded={menuOpen}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </div>

      <div className={`navbar-right ${menuOpen ? 'active' : ''}`}>
        <Link to="/" className="nav-link" onClick={closeMenu}>Home</Link>
        <Link to="/about" className="nav-link" onClick={closeMenu}>About Us</Link>
        <Link to="/instructions" className="nav-link" onClick={closeMenu}>Instructions</Link>
      </div>
    </nav>
  );
};

export default Navbar;
