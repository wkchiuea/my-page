import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../ArticlePage.css';
import './PlaceholderPage.css';

function PlaceholderPage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page">
      <div className="article-container">
        <div className="placeholder-content">
          <h1 className="placeholder-title">{title}</h1>
          <p className="placeholder-message">developing</p>
        </div>
      </div>
    </div>
  );
}

export default PlaceholderPage;
