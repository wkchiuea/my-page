import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-profile">
          <div className="profile-image-wrapper">
            <img src="/logo192.png" alt="Profile" className="sidebar-icon" />
          </div>
          <h2 className="sidebar-name">Yoshida Lemon</h2>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/" className="nav-link">
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Home</span>
          </Link>
          <a href="#about" className="nav-link">
            <span className="nav-icon">👤</span>
            <span className="nav-text">About</span>
          </a>
          <a href="#projects" className="nav-link">
            <span className="nav-icon">💼</span>
            <span className="nav-text">Projects</span>
          </a>
          <a href="#categories" className="nav-link">
            <span className="nav-icon">🏷️</span>
            <span className="nav-text">Category</span>
          </a>
        </nav>
        
        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-number">61</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">57</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>

        <div className="sidebar-social">
          <h3 className="social-title">Follow Me</h3>
          <div className="social-links">
            <a href="https://github.com/wkchiuea" target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon">🔗</span>
              <span>GitHub</span>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon">🔗</span>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
      
      <div className="sidebar-footer">
        <p>© 2026 Yoshida Lemon</p>
        <p className="footer-note">Powered by React</p>
      </div>
    </div>
  );
}

export default Sidebar;
