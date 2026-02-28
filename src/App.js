import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { SidebarContext } from './context/SidebarContext';
import ArticleList from './components/ArticleList';
import ArticlePage from './components/ArticlePage';
import AboutPage from './components/page/AboutPage';
import PlaceholderPage from './components/page/PlaceholderPage';
import ToolsPage from './components/page/ToolsPage';
import SpeedReader from './components/page/tools/SpeedReader';
import Metronome from './components/page/tools/Metronome';
import Timer from './components/page/tools/Timer';
import Sidebar from './components/Sidebar';

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <SidebarContext.Provider value={{ sidebarVisible, setSidebarVisible }}>
      <Router>
        <div className="App">
          <div className={`main-content${sidebarVisible ? '' : ' sidebar-hidden'}`}>
            <div className="left-column">
            <Routes>
              <Route path="/" element={<ArticleList />} />
              <Route path="/article/:id" element={<ArticlePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
              <Route path="/category" element={<PlaceholderPage title="Category" />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/speed-reader" element={<SpeedReader />} />
              <Route path="/tools/flash-number" element={<PlaceholderPage title="Flash Number" />} />
              <Route path="/tools/metronome" element={<Metronome />} />
              <Route path="/tools/timer" element={<Timer />} />
            </Routes>
            </div>
            <div className="right-column">
            <Sidebar />
          </div>
          </div>
        </div>
      </Router>
    </SidebarContext.Provider>
  );
}

export default App;
