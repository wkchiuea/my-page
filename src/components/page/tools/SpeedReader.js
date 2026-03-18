import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarContext } from '../../../context/SidebarContext';
import '../../ArticlePage.css';
import './SpeedReader.css';

function SpeedReader() {
  const navigate = useNavigate();
  const { sidebarVisible, setSidebarVisible } = useContext(SidebarContext);
  const [passage, setPassage] = useState('');
  const [wpmInput, setWpmInput] = useState('600');
  const [displayTimeSecInput, setDisplayTimeSecInput] = useState('0.3');
  const [timingMode, setTimingMode] = useState('wpm');
  const [chunkSizeInput, setChunkSizeInput] = useState('3');
  const [fontSizeInput, setFontSizeInput] = useState('16');
  const [activeDurationMs, setActiveDurationMs] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const displayChunk = chunks.length ? chunks[Math.min(currentIndex, chunks.length - 1)] : '';
  const isDone = chunks.length > 0 && currentIndex >= chunks.length;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return clearTimer;
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused || chunks.length === 0) return;
    if (currentIndex >= chunks.length) {
      setIsRunning(false);
      return;
    }
    const durationMs = Math.max(1, activeDurationMs);
    timerRef.current = setTimeout(() => {
      setCurrentIndex((i) => {
        const next = i + 1;
        if (next >= chunks.length) setIsRunning(false);
        return next;
      });
    }, durationMs);
    return clearTimer;
  }, [isRunning, isPaused, currentIndex, chunks.length, activeDurationMs]);

  const handleStart = () => {
    const words = passage.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    const parsedChunkSize = Number(chunkSizeInput);
    const parsedWpm = Number(wpmInput);
    const parsedDisplayTimeSec = Number(displayTimeSecInput);

    if (!Number.isFinite(parsedChunkSize) || parsedChunkSize <= 0) return;
    if (timingMode === 'wpm' && (!Number.isFinite(parsedWpm) || parsedWpm <= 0)) return;
    if (timingMode === 'displayTime' && (!Number.isFinite(parsedDisplayTimeSec) || parsedDisplayTimeSec <= 0)) return;

    const size = Math.max(1, Math.min(Math.floor(parsedChunkSize), words.length));
    const list = [];
    for (let i = 0; i < words.length; i += size) {
      list.push(words.slice(i, i + size).join(' '));
    }
    const durationMs =
      timingMode === 'wpm'
        ? (size / parsedWpm) * 60 * 1000
        : parsedDisplayTimeSec * 1000;

    setActiveDurationMs(durationMs);
    setChunks(list);
    setCurrentIndex(0);
    setIsPaused(false);
    setIsRunning(true);
  };

  const handlePauseResume = () => {
    if (chunks.length === 0) return;
    if (isPaused) {
      setIsPaused(false);
    } else {
      clearTimer();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  };

  const canStart =
    passage.trim().length > 0 &&
    !isRunning &&
    Number(chunkSizeInput) > 0 &&
    (timingMode === 'wpm'
      ? Number(wpmInput) > 0
      : Number(displayTimeSecInput) > 0);

  const displayFontSize = Math.max(8, Number(fontSizeInput) || 12);

  return (
    <div className="speed-reader-page">
      <div className="speed-reader-container">
        <div className="speed-reader-top-bar">
          <button onClick={() => navigate('/tools')} className="back-button">← Back to Tools</button>
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="speed-reader-sidebar-toggle"
          >
            {sidebarVisible ? '▶ Hide sidebar' : '◀ Show sidebar'}
          </button>
        </div>

        <h1 className="speed-reader-title">Speed Reader 速讀工具</h1>

        <div className="speed-reader-config">
          {!isRunning ? (
            <label className="speed-reader-label">
              <span>Passage</span>
              <textarea
                className="speed-reader-textarea"
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="Paste or type text here..."
                rows={6}
              />
            </label>
          ) : (
            <div className="speed-reader-passage-masked">
              <span className="speed-reader-masked-label">Passage</span>
              <div className="speed-reader-masked-content" aria-hidden="true">{'*'.repeat(Math.min(passage.length || 1, 80))}</div>
            </div>
          )}
          <div className="speed-reader-row">
            <label className="speed-reader-label">
              <span>Timing mode</span>
              <div className="speed-reader-radio-group">
                <label className="speed-reader-radio-option">
                  <input
                    type="radio"
                    name="timingMode"
                    value="wpm"
                    checked={timingMode === 'wpm'}
                    onChange={() => setTimingMode('wpm')}
                    disabled={isRunning}
                  />
                  <span>Use WPM</span>
                </label>
                <label className="speed-reader-radio-option">
                  <input
                    type="radio"
                    name="timingMode"
                    value="displayTime"
                    checked={timingMode === 'displayTime'}
                    onChange={() => setTimingMode('displayTime')}
                    disabled={isRunning}
                  />
                  <span>Use display time</span>
                </label>
              </div>
            </label>
          </div>
          <div className="speed-reader-row">
            <label className="speed-reader-label">
              <span>Words per minute (WPM)</span>
              <input
                type="number"
                min={1}
                value={wpmInput}
                onChange={(e) => setWpmInput(e.target.value)}
                disabled={isRunning || timingMode !== 'wpm'}
                className="speed-reader-input"
              />
            </label>
            <label className="speed-reader-label">
              <span>Display time per chunk (sec)</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={displayTimeSecInput}
                onChange={(e) => setDisplayTimeSecInput(e.target.value)}
                disabled={isRunning || timingMode !== 'displayTime'}
                className="speed-reader-input"
              />
            </label>
            <label className="speed-reader-label">
              <span>Chunk size (words)</span>
              <input
                type="number"
                min={1}
                value={chunkSizeInput}
                onChange={(e) => setChunkSizeInput(e.target.value)}
                disabled={isRunning}
                className="speed-reader-input"
              />
            </label>
            <label className="speed-reader-label">
              <span>Word size (px)</span>
              <input
                type="number"
                min={8}
                value={fontSizeInput}
                onChange={(e) => setFontSizeInput(e.target.value)}
                disabled={isRunning}
                className="speed-reader-input"
              />
            </label>
          </div>
          {!isRunning && (
            <button onClick={handleStart} disabled={!canStart} className="speed-reader-btn speed-reader-btn-primary">
              Start
            </button>
          )}
        </div>

        {chunks.length > 0 && (
          <div className="speed-reader-display-wrap">
            <div className="speed-reader-display" style={{ fontSize: `${displayFontSize}px` }}>
              {displayChunk}
            </div>
            <div className="speed-reader-progress">
              Chunk {Math.min(currentIndex + 1, chunks.length)} of {chunks.length}
              {isDone && ' (done)'}
            </div>
            {isRunning && (
              <div className="speed-reader-controls">
                <button onClick={handlePauseResume} className="speed-reader-btn">
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="speed-reader-btn">Stop</button>
              </div>
            )}
            {!isRunning && !isPaused && currentIndex > 0 && (
              <div className="speed-reader-controls">
                <button onClick={handleStart} className="speed-reader-btn speed-reader-btn-primary">Restart</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpeedReader;
