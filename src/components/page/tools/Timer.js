import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarContext } from '../../../context/SidebarContext';
import '../../ArticlePage.css';
import './ToolCommon.css';
import './Timer.css';

function playAlarm(audioContextRef) {
  if (!audioContextRef.current) return;
  const ctx = audioContextRef.current;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function Timer() {
  const navigate = useNavigate();
  const { sidebarVisible, setSidebarVisible } = useContext(SidebarContext);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const totalSeconds = minutes * 60 + seconds;
  const displaySeconds = remaining !== null ? remaining : totalSeconds;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRunning || remaining === null) return;
    if (remaining <= 0) {
      setIsRunning(false);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (soundEnabled && audioContextRef.current) playAlarm(audioContextRef);
          setIsRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining, soundEnabled]);

  const handleStart = () => {
    const total = Math.max(0, minutes * 60 + seconds);
    if (total === 0) return;
    if (soundEnabled && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setRemaining(total);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemaining(null);
  };

  const handleSetFromDisplay = () => {
    if (remaining !== null && !isRunning) {
      setMinutes(Math.floor(displaySeconds / 60));
      setSeconds(displaySeconds % 60);
    }
  };

  return (
    <div className="tool-page timer-page">
      <div className="tool-container">
        <div className="tool-top-bar">
          <button onClick={() => navigate('/tools')} className="back-button">← Back to Tools</button>
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="tool-sidebar-toggle"
          >
            {sidebarVisible ? '⊟ Hide sidebar' : '⊞ Show sidebar'}
          </button>
        </div>

        <h1 className="tool-title">Timer 計時器</h1>

        <div className="tool-config">
          <div className="timer-input-row">
            <label className="tool-label">
              <span>Minutes</span>
              <input
                type="number"
                min={0}
                max={99}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 0)}
                disabled={isRunning}
                className="tool-input"
              />
            </label>
            <label className="tool-label">
              <span>Seconds</span>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value) || 0)}
                disabled={isRunning}
                className="tool-input"
              />
            </label>
          </div>
          <label className="tool-sound-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <span>Enable sound (alarm when timer ends)</span>
          </label>
          {!isRunning && remaining === null && (
            <button onClick={handleStart} disabled={totalSeconds <= 0} className="tool-btn tool-btn-primary">
              Start
            </button>
          )}
          {isRunning && (
            <div className="timer-controls">
              <button onClick={handlePause} className="tool-btn">Pause</button>
            </div>
          )}
          {!isRunning && remaining !== null && (
            <div className="timer-controls">
              <button onClick={handleStart} className="tool-btn tool-btn-primary">Resume</button>
              <button onClick={handleReset} className="tool-btn">Reset</button>
            </div>
          )}
        </div>

        <div className="timer-display" onClick={handleSetFromDisplay}>
          {formatTime(displaySeconds)}
        </div>
        {remaining !== null && remaining <= 0 && (
          <p className="timer-done">Time’s up</p>
        )}
      </div>
    </div>
  );
}

export default Timer;
