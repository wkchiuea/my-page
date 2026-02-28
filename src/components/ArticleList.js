import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles } from '../api/articles';
import './ArticleList.css';

const ARTICLES_PER_PAGE = 10;

function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    fetchArticles()
      .then((data) => {
        if (!cancelled) {
          setArticles(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load articles');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const currentArticles = articles.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="article-list">
        <div className="article-list-header">
          <h1>My Blog</h1>
        </div>
        <p className="article-list-loading">Loading articles…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="article-list">
        <div className="article-list-header">
          <h1>My Blog</h1>
        </div>
        <p className="article-list-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      <div className="article-list-header">
        <h1>My Blog</h1>
      </div>
      {currentArticles.map((article) => (
        <article key={article.id} className="article-card">
          <h2 className="article-title">
            <Link to={`/article/${article.id}`}>{article.title}</Link>
          </h2>
          <div className="article-meta">
            <span className="article-date">Posted on {article.date}</span>
            <span className="article-category">In {article.category}</span>
          </div>
          {article.image && (
            <img src={article.image} alt={article.title} className="article-image" />
          )}
          <div className="article-preview">
            <p>{article.excerpt}</p>
          </div>
          <Link
            to={`/article/${article.id}`}
            className="read-more-link"
          >
            Read more »
          </Link>
        </article>
      ))}
      <div className="pagination">
        {renderPagination()}
      </div>
    </div>
  );
}

export default ArticleList;
