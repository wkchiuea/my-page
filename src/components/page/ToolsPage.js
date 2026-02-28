import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../ArticlePage.css';
import './ToolsPage.css';

const TOOLS = [
  { path: 'speed-reader', name: 'Speed Reader', sub: '速讀工具' },
  { path: 'flash-number', name: 'Flash Number', sub: null },
  { path: 'metronome', name: 'Metronome', sub: '節拍器' },
  { path: 'timer', name: 'Timer', sub: '計時器' },
];

function ToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="tools-page">
      <div className="tools-container">
        <button onClick={() => navigate('/')} className="back-button">← Back to Home</button>

        <header className="tools-header">
          <h1 className="tools-title">Tools</h1>
          <p className="tools-desc">Small utilities for reading, focus, and timing.</p>
        </header>

        <div className="tools-grid">
          {TOOLS.map((tool) => (
            <Link
              key={tool.path}
              to={`/tools/${tool.path}`}
              className="tools-card"
            >
              <span className="tools-card-name">{tool.name}</span>
              {tool.sub && <span className="tools-card-sub">{tool.sub}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ToolsPage;
