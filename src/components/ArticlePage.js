import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchArticleContent, parseArticleMd } from '../api/articles';
import './ArticlePage.css';

function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setArticle(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchArticleContent(id)
      .then((raw) => {
        if (cancelled) return;
        if (raw == null) {
          setArticle(null);
          return;
        }
        const { frontmatter, content } = parseArticleMd(raw);
        setArticle({
          id,
          title: frontmatter.title || id,
          date: frontmatter.date || '',
          category: frontmatter.category || '',
          tag: frontmatter.tag || '',
          image: frontmatter.image || '',
          content,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load article');
          setArticle(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const formatContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const out = [];
    let i = 0;
    let inCodeBlock = false;
    let codeLines = [];

    const flushCodeBlock = () => {
      if (codeLines.length > 0) {
        out.push(
          <pre key={`code-${i}`} className="content-code">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      }
      inCodeBlock = false;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }
      if (line.startsWith('## ')) {
        out.push(<h2 key={idx} className="content-heading">{line.replace(/^##\s*/, '')}</h2>);
      } else if (line.startsWith('### ')) {
        out.push(<h3 key={idx} className="content-subheading">{line.replace(/^###\s*/, '')}</h3>);
      } else if (line.trim() === '') {
        out.push(<br key={idx} />);
      } else {
        out.push(<p key={idx} className="content-paragraph">{line}</p>);
      }
    }
    flushCodeBlock();
    return out;
  };

  const notFound = !loading && (article === null || error);

  if (loading) {
    return (
      <div className="article-page">
        <div className="article-container">
          <p className="article-loading">Loading…</p>
          <button onClick={() => navigate('/')} className="back-button">← Back to Home</button>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="article-page">
        <div className="article-container">
          <h1>Article not found</h1>
          <button onClick={() => navigate('/')} className="back-button">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="article-page">
      <div className="article-container">
        <button onClick={() => navigate('/')} className="back-button">← Back to Home</button>

        <article className="article-content">
          <h1 className="article-title">{article.title}</h1>

          <div className="article-meta">
            <span className="article-date">Posted on {article.date}</span>
            <span className="article-category">In {article.category}</span>
          </div>

          {article.image && (
            <img src={article.image} alt={article.title} className="article-image" />
          )}

          <div className="article-body">
            {formatContent(article.content)}
          </div>

          <div className="article-tags">
            <span className="tag-label">Tags:</span>
            <span className="tag">#{article.category}</span>
          </div>
        </article>
      </div>
    </div>
  );
}

export default ArticlePage;
