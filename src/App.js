import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ArticleList from './components/ArticleList';
import ArticlePage from './components/ArticlePage';
import AboutPage from './components/page/AboutPage';
import PlaceholderPage from './components/page/PlaceholderPage';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="main-content">
          <div className="left-column">
            <Routes>
              <Route path="/" element={<ArticleList />} />
              <Route path="/article/:id" element={<ArticlePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
              <Route path="/category" element={<PlaceholderPage title="Category" />} />
            </Routes>
          </div>
          <div className="right-column">
            <Sidebar />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
