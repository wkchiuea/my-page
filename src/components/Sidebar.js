import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles } from '../api/articles';
import config from '../config/config.json';
import './Sidebar.css';

function Sidebar() {
  const [postCount, setPostCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchArticles()
      .then((articles) => {
        if (cancelled) return;
        setPostCount(articles.length);
        const categories = new Set(articles.map((a) => a.category).filter(Boolean));
        setCategoryCount(categories.size);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const urls = config.sidebarUrl || {};

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-profile">
          <div className="profile-image-wrapper">
            <img src="/logo192.png" alt="Profile" className="sidebar-icon" />
          </div>
          <h2 className="sidebar-name">Louis Chiu</h2>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-link">
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Home</span>
          </Link>
          <Link to="/about" className="nav-link">
            <span className="nav-icon">👤</span>
            <span className="nav-text">About</span>
          </Link>
          <Link to="/projects" className="nav-link">
            <span className="nav-icon">💼</span>
            <span className="nav-text">Projects</span>
          </Link>
          <Link to="/category" className="nav-link">
            <span className="nav-icon">🏷️</span>
            <span className="nav-text">Category</span>
          </Link>
          <Link to="/tools" className="nav-link">
            <span className="nav-icon">🛠️</span>
            <span className="nav-text">Tools</span>
          </Link>
        </nav>

        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-number">{postCount}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{categoryCount}</span>
            <span className="stat-label">Categories</span>
          </div>
        </div>

        <div className="sidebar-social">
          <h3 className="social-title">Follow Me</h3>
          <div className="social-links">
            <a href={urls.github || '#'} target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon">🔗</span>
              <span>GitHub</span>
            </a>
            <a href={urls.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon">🔗</span>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <p>© 2026 Louis Chiu</p>
        <p className="footer-note">Powered by React</p>
      </div>
    </div>
  );
}

export default Sidebar;
