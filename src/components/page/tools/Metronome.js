import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarContext } from '../../../context/SidebarContext';
import '../../ArticlePage.css';
import './ToolCommon.css';
import './Metronome.css';

function playTick(audioContextRef) {
  if (!audioContextRef.current) return;
  const ctx = audioContextRef.current;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

function Metronome() {
  const navigate = useNavigate();
  const { sidebarVisible, setSidebarVisible } = useContext(SidebarContext);
  const [bpm, setBpm] = useState(200);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [beat, setBeat] = useState(0);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRunning || bpm <= 0) return;
    const ms = Math.round(60000 / bpm);
    intervalRef.current = setInterval(() => {
      setBeat((b) => b + 1);
      if (soundEnabled && audioContextRef.current) {
        playTick(audioContextRef);
      }
    }, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, bpm, soundEnabled]);

  const handleStartStop = () => {
    if (!isRunning && soundEnabled && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setIsRunning((r) => !r);
    if (!isRunning) setBeat(0);
  };

  return (
    <div className="tool-page metronome-page">
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

        <h1 className="tool-title">Metronome 節拍器</h1>

        <div className="tool-config">
          <label className="tool-label">
            <span>BPM (beats per minute)</span>
            <input
              type="number"
              min={30}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 60)}
              disabled={isRunning}
              className="tool-input"
            />
          </label>
          <label className="tool-sound-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <span>Enable sound</span>
          </label>
          <button onClick={handleStartStop} className="tool-btn tool-btn-primary">
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>

        {isRunning && (
          <div className="metronome-beat" key={beat}>
            <span className="metronome-beat-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Metronome;
