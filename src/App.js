import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ArticleList from './components/ArticleList';
import ArticlePage from './components/ArticlePage';
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
