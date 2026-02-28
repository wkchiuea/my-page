import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

  /** Parse inline **bold** (and *italic*) into React nodes */
  const renderInlineMarkdown = (text, keyPrefix) => {
    if (!text || typeof text !== 'string') return text;
    const parts = [];
    let key = 0;
    const combinedRegex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;
    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[1] !== undefined) {
        parts.push(<strong key={`${keyPrefix}-${key++}`}>{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        parts.push(<em key={`${keyPrefix}-${key++}`}>{match[2]}</em>);
      }
      lastIndex = combinedRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  const formatContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const out = [];
    let i = 0;
    let inCodeBlock = false;
    let codeBlockLang = 'text';
    let codeLines = [];

    const flushCodeBlock = () => {
      if (codeLines.length > 0) {
        const code = codeLines.join('\n');
        out.push(
          <div key={`code-${i}`} className="content-code-wrap">
            <SyntaxHighlighter
              language={codeBlockLang}
              style={vscDarkPlus}
              showLineNumbers
              customStyle={{ margin: 0 }}
              codeTagProps={{ style: { fontFamily: 'inherit' } }}
              wrapLongLines
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
        i += 1;
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
          codeBlockLang = (line.slice(3).trim() || 'text').toLowerCase();
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }
      if (line.startsWith('## ')) {
        out.push(<h2 key={idx} className="content-heading">{renderInlineMarkdown(line.replace(/^##\s*/, ''), `h2-${idx}`)}</h2>);
      } else if (line.startsWith('### ')) {
        out.push(<h3 key={idx} className="content-subheading">{renderInlineMarkdown(line.replace(/^###\s*/, ''), `h3-${idx}`)}</h3>);
      } else if (line.trim() === '') {
        out.push(<br key={idx} />);
      } else {
        out.push(<p key={idx} className="content-paragraph">{renderInlineMarkdown(line, `p-${idx}`)}</p>);
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
