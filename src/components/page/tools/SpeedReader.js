import React, { useState, useRef, useEffect, useLayoutEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarContext } from '../../../context/SidebarContext';
import '../../ArticlePage.css';
import './SpeedReader.css';

/** Same length & whitespace as `text` so layout/height stays close to the real passage. */
function maskPassage(text) {
  if (!text) return '';
  return text.replace(/[^\s\n\r]/g, '*');
}

function SpeedReader() {
  const navigate = useNavigate();
  const { sidebarVisible, setSidebarVisible } = useContext(SidebarContext);
  const [passage, setPassage] = useState('');
  const [wpmInput, setWpmInput] = useState('600');
  const [displayTimeSecInput, setDisplayTimeSecInput] = useState('0.3');
  const [timingMode, setTimingMode] = useState('wpm');
  const [chunkSizeInput, setChunkSizeInput] = useState('3');
  const [fontSizeInput, setFontSizeInput] = useState('16');
  const [isRecall, setIsRecall] = useState(false);
  const [activeDurationMs, setActiveDurationMs] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  /** Recall: chunk text visible during flash */
  const [recallFlashVisible, setRecallFlashVisible] = useState(false);
  const [recallUserInput, setRecallUserInput] = useState('');
  const [recallResult, setRecallResult] = useState(null);
  const timerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const passageTextareaRef = useRef(null);
  const passageScrollTopRef = useRef(0);

  const displayChunk = chunks.length ? chunks[Math.min(currentIndex, chunks.length - 1)] : '';
  const isDone = chunks.length > 0 && currentIndex >= chunks.length;
  const isRecallSession = isRunning && isRecall;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearFlashTimer = () => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      clearFlashTimer();
    };
  }, []);

  /** Keep passage scroll + box size stable when recall flash toggles (re-renders can reset scroll / flex-shrink textarea). */
  useLayoutEffect(() => {
    const el = passageTextareaRef.current;
    if (!el || !isRunning) return;
    el.scrollTop = passageScrollTopRef.current;
  }, [recallFlashVisible, isRunning]);

  /** Normal mode: auto-advance chunks */
  useEffect(() => {
    if (isRecall || !isRunning || isPaused || chunks.length === 0) return;
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
  }, [isRecall, isRunning, isPaused, currentIndex, chunks.length, activeDurationMs]);

  const startRecallFlash = useCallback(
    (durationMs) => {
      clearFlashTimer();
      setRecallFlashVisible(true);
      setRecallResult(null);
      setRecallUserInput('');
      flashTimerRef.current = setTimeout(() => {
        setRecallFlashVisible(false);
        flashTimerRef.current = null;
      }, Math.max(1, durationMs));
    },
    []
  );

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
    setRecallResult(null);
    setRecallUserInput('');

    if (isRecall) {
      clearFlashTimer();
      setIsRunning(true);
      startRecallFlash(durationMs);
    } else {
      setIsRunning(true);
    }
  };

  const handleRecallCheck = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!isRecallSession || recallFlashVisible || recallResult != null) return;
    const expected = displayChunk;
    const entered = recallUserInput;
    const match = entered.trim() === expected.trim();
    setRecallResult({ match, expected, entered });
  };

  const handleRecallNext = () => {
    if (!isRecallSession || !recallResult) return;
    if (currentIndex >= chunks.length - 1) {
      clearFlashTimer();
      setIsRunning(false);
      setRecallFlashVisible(false);
      setRecallResult(null);
      setRecallUserInput('');
      return;
    }
    setCurrentIndex((i) => i + 1);
    startRecallFlash(activeDurationMs);
  };

  const handlePauseResume = () => {
    if (chunks.length === 0 || isRecall) return;
    if (isPaused) {
      setIsPaused(false);
    } else {
      clearTimer();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    clearTimer();
    clearFlashTimer();
    setIsRunning(false);
    setIsPaused(false);
    setRecallFlashVisible(false);
    setRecallResult(null);
    setRecallUserInput('');
  };

  const canStart =
    passage.trim().length > 0 &&
    !isRunning &&
    Number(chunkSizeInput) > 0 &&
    (timingMode === 'wpm'
      ? Number(wpmInput) > 0
      : Number(displayTimeSecInput) > 0);

  const displayFontSize = Math.max(8, Number(fontSizeInput) || 12);

  const showDisplayText =
    isRecallSession
      ? recallFlashVisible
        ? displayChunk
        : ''
      : displayChunk;

  const recallCanNext =
    isRecallSession && recallResult != null && currentIndex < chunks.length - 1;
  const recallFinishedLast =
    isRecallSession && recallResult != null && currentIndex >= chunks.length - 1;

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
          <div className="speed-reader-passage-slot">
            <label className="speed-reader-label speed-reader-passage-label">
              <span>Passage</span>
              <textarea
                ref={passageTextareaRef}
                className={`speed-reader-textarea${isRunning ? ' speed-reader-textarea--frozen' : ''}`}
                value={isRunning ? maskPassage(passage) : passage}
                onChange={(e) => setPassage(e.target.value)}
                onScroll={(e) => {
                  passageScrollTopRef.current = e.currentTarget.scrollTop;
                }}
                placeholder="Paste or type text here..."
                rows={6}
                disabled={isRunning}
                spellCheck={!isRunning}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="speed-reader-row">
            <label className="speed-reader-label">
              <span>Mode</span>
              <div className="speed-reader-radio-group">
                <label className="speed-reader-radio-option">
                  <input
                    type="radio"
                    name="readerMode"
                    value="continuous"
                    checked={!isRecall}
                    onChange={() => setIsRecall(false)}
                    disabled={isRunning}
                  />
                  <span>Continuous (auto-advance)</span>
                </label>
                <label className="speed-reader-radio-option">
                  <input
                    type="radio"
                    name="readerMode"
                    value="recall"
                    checked={isRecall}
                    onChange={() => setIsRecall(true)}
                    disabled={isRunning}
                  />
                  <span>Recall (flash → type → check → next)</span>
                </label>
              </div>
            </label>
          </div>
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
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="speed-reader-btn speed-reader-btn-primary"
          >
            Start
          </button>
        </div>

        {chunks.length > 0 && (
          <div className="speed-reader-display-wrap">
            <div className="speed-reader-display" style={{ fontSize: `${displayFontSize}px` }}>
              {showDisplayText}
              {isRecallSession && !recallFlashVisible && !recallResult && (
                <span className="speed-reader-recall-prompt">…</span>
              )}
            </div>
            <div className="speed-reader-progress">
              Chunk {Math.min(currentIndex + 1, chunks.length)} of {chunks.length}
              {isRecall && recallFinishedLast && ' (recall complete)'}
              {!isRecall && isDone && ' (done)'}
            </div>

            {isRecallSession && (
              <div className="speed-reader-recall-panel">
                <label className="speed-reader-label">
                  <span>Type what you saw, then press Enter</span>
                  <input
                    type="text"
                    className="speed-reader-recall-input"
                    value={recallUserInput}
                    onChange={(e) => setRecallUserInput(e.target.value)}
                    onKeyDown={handleRecallCheck}
                    disabled={recallFlashVisible || recallResult != null}
                    placeholder="Your recall…"
                  />
                </label>
                {recallResult && (
                  <div
                    className={`speed-reader-recall-result ${recallResult.match ? 'speed-reader-recall-result--match' : 'speed-reader-recall-result--miss'}`}
                  >
                    <p className="speed-reader-recall-result-title">
                      {recallResult.match ? 'Match' : 'No match'}
                    </p>
                    <p>
                      <strong>Yours:</strong> <span className="speed-reader-recall-text">{recallResult.entered || '(empty)'}</span>
                    </p>
                    <p>
                      <strong>Original:</strong> <span className="speed-reader-recall-text">{recallResult.expected}</span>
                    </p>
                  </div>
                )}
                <div className="speed-reader-controls speed-reader-recall-actions">
                  {recallCanNext && (
                    <button type="button" onClick={handleRecallNext} className="speed-reader-btn speed-reader-btn-primary">
                      Next chunk
                    </button>
                  )}
                  {recallFinishedLast && (
                    <button type="button" onClick={handleStop} className="speed-reader-btn speed-reader-btn-primary">
                      Done
                    </button>
                  )}
                </div>
              </div>
            )}

            {isRunning && !isRecall && (
              <div className="speed-reader-controls">
                <button onClick={handlePauseResume} className="speed-reader-btn">
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="speed-reader-btn">Stop</button>
              </div>
            )}
            {isRecallSession && (
              <div className="speed-reader-controls">
                <button onClick={handleStop} className="speed-reader-btn">Stop</button>
              </div>
            )}
            {!isRunning && !isPaused && currentIndex > 0 && !isRecall && (
              <div className="speed-reader-controls">
                <button onClick={handleStart} className="speed-reader-btn speed-reader-btn-primary">Restart</button>
              </div>
            )}
            {!isRunning && isRecall && chunks.length > 0 && (
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
