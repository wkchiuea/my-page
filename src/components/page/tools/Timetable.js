import React, { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarContext } from '../../../context/SidebarContext';
import '../../ArticlePage.css';
import './ToolCommon.css';
import './Timetable.css';

const STORAGE_KEY = 'my-page-timetable-config';
const TASK_STORAGE_KEY = 'my-page-timetable-tasks-config';

const DAY_LABELS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Common preset swatches for new tasks (hex without alpha). */
const PRESET_COLORS = [
  { hex: '#60a5fa', label: 'Blue' },
  { hex: '#a78bfa', label: 'Violet' },
  { hex: '#f472b6', label: 'Pink' },
  { hex: '#fbbf24', label: 'Amber' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#34d399', label: 'Emerald' },
  { hex: '#fdba74', label: 'Orange' },
  { hex: '#67e8f9', label: 'Cyan' },
  { hex: '#fca5a5', label: 'Red' },
];

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToLabel(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function makeTaskId() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cellKey(dayIdx, slotIdx) {
  return `${dayIdx}_${slotIdx}`;
}

function defaultConfigShape() {
  return {
    startTime: '06:00',
    endTime: '23:00',
    intervalMinutes: 20,
    weekStartsOn: 'monday',
    tasks: [],
    assignments: {},
  };
}

function normalizeTaskFromData(t) {
  const id = typeof t.id === 'string' && t.id ? t.id : makeTaskId();
  const name = typeof t.name === 'string' ? t.name : 'Task';
  const color = typeof t.color === 'string' && t.color ? t.color : '#64748b';
  const fc = t.fontColor != null ? t.fontColor : t.textColor;
  const fontColor = typeof fc === 'string' && fc ? fc : '#0f172a';
  return { id, name, color, fontColor };
}

function parseTasksPayload(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (Array.isArray(data)) {
    return data.map(normalizeTaskFromData);
  }
  if (data && typeof data === 'object' && Array.isArray(data.tasks)) {
    return data.tasks.map(normalizeTaskFromData);
  }
  throw new Error('Expected a task array or { "tasks": [...] }');
}

function flattenAssignments(rawAssignments) {
  if (!rawAssignments || typeof rawAssignments !== 'object') return {};
  const keys = Object.keys(rawAssignments);
  if (keys.length === 0) return {};
  const sample = rawAssignments[keys[0]];

  // Backward compatibility: old flat format { "0_0": "task-id" }.
  if (typeof sample === 'string' || sample == null) {
    const flat = {};
    keys.forEach((k) => {
      const tid = rawAssignments[k];
      if (tid == null || tid === '') return;
      flat[k] = String(tid);
    });
    return flat;
  }

  // New nested format: { "0": { "0": "task-id", "1": "task-id" }, ... }.
  const flat = {};
  keys.forEach((dayKey) => {
    const dayObj = rawAssignments[dayKey];
    if (!dayObj || typeof dayObj !== 'object') return;
    Object.keys(dayObj).forEach((slotKey) => {
      const tid = dayObj[slotKey];
      if (tid == null || tid === '') return;
      flat[`${dayKey}_${slotKey}`] = String(tid);
    });
  });
  return flat;
}

function nestAssignments(flatAssignments) {
  const nested = {};
  Object.keys(flatAssignments || {}).forEach((k) => {
    const tid = flatAssignments[k];
    const [day, slot] = k.split('_');
    if (day == null || slot == null) return;
    if (!nested[day]) nested[day] = {};
    nested[day][slot] = tid;
  });
  return nested;
}

function toCondensedJson(rawText) {
  try {
    return JSON.stringify(JSON.parse(rawText || '{}'));
  } catch {
    return (rawText || '').replace(/\s+/g, ' ').trim();
  }
}

function Timetable() {
  const navigate = useNavigate();
  const { sidebarVisible, setSidebarVisible } = useContext(SidebarContext);

  const [startTime, setStartTime] = useState(() => defaultConfigShape().startTime);
  const [endTime, setEndTime] = useState(() => defaultConfigShape().endTime);
  const [intervalMinutes, setIntervalMinutes] = useState(() => defaultConfigShape().intervalMinutes);
  const [weekStartsOn, setWeekStartsOn] = useState(() => defaultConfigShape().weekStartsOn);

  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState({});

  const [gridReady, setGridReady] = useState(false);
  const [numSlots, setNumSlots] = useState(0);

  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('#14b8a6');
  const [newTaskFontColor, setNewTaskFontColor] = useState('#0f172a');

  const [configText, setConfigText] = useState('');
  const [configError, setConfigError] = useState('');

  const [taskConfigText, setTaskConfigText] = useState('');
  const [taskListHidden, setTaskListHidden] = useState(false);

  const [picker, setPicker] = useState(null);

  const [taskJsonModalOpen, setTaskJsonModalOpen] = useState(false);
  const [configJsonModalOpen, setConfigJsonModalOpen] = useState(false);

  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [taskDragOverId, setTaskDragOverId] = useState(null);
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [selectionFocus, setSelectionFocus] = useState(null);
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState(undefined);

  const dayLabels = weekStartsOn === 'sunday' ? DAY_LABELS_SUN : DAY_LABELS_MON;

  const slotLabels = useMemo(() => {
    if (!gridReady || numSlots <= 0) return [];
    const start = parseTimeToMinutes(startTime);
    if (start === null) return [];
    return Array.from({ length: numSlots }, (_, i) =>
      minutesToLabel(start + i * intervalMinutes)
    );
  }, [gridReady, numSlots, startTime, intervalMinutes]);

  const taskById = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      m[t.id] = t;
    });
    return m;
  }, [tasks]);

  const buildPayload = useCallback(() => {
    return {
      version: 1,
      startTime,
      endTime,
      intervalMinutes,
      weekStartsOn,
      tasks,
      assignments: nestAssignments(assignments),
    };
  }, [startTime, endTime, intervalMinutes, weekStartsOn, tasks, assignments]);

  const applyPayload = useCallback((data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid config');

    const start = typeof data.startTime === 'string' ? data.startTime : defaultConfigShape().startTime;
    const end = typeof data.endTime === 'string' ? data.endTime : defaultConfigShape().endTime;
    const interval = Number(data.intervalMinutes);
    const wk = typeof data.weekStartsOn === 'string' ? data.weekStartsOn.toLowerCase() : '';
    const week = wk === 'sunday' ? 'sunday' : 'monday';

    if (!Number.isFinite(interval) || interval <= 0) {
      throw new Error('intervalMinutes must be a positive number');
    }

    const t0 = parseTimeToMinutes(start);
    const t1 = parseTimeToMinutes(end);
    if (t0 === null || t1 === null || t1 <= t0) {
      throw new Error('Invalid start/end time');
    }

    // End-of-day is inclusive: include a final slot whose start may equal `endTime`.
    const slots = Math.floor((t1 - t0) / interval) + 1;
    if (slots > 200) throw new Error('Too many time slots; widen interval or shorten day range');

    const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
    const normalizedTasks = rawTasks.map(normalizeTaskFromData);

    const nextAssign = flattenAssignments(data.assignments);

    setStartTime(start);
    setEndTime(end);
    setIntervalMinutes(interval);
    setWeekStartsOn(week);
    setTasks(normalizedTasks);
    setAssignments(nextAssign);
    setNumSlots(slots);
    setGridReady(true);
    setPicker(null);
    setSelectionAnchor(null);
    setSelectionFocus(null);
  }, []);

  const handleCreate = useCallback(() => {
    setConfigError('');
    const t0 = parseTimeToMinutes(startTime);
    const t1 = parseTimeToMinutes(endTime);
    if (t0 === null || t1 === null) {
      setConfigError('Use HH:mm for start and end time.');
      return;
    }
    if (t1 <= t0) {
      setConfigError('End time must be after start time.');
      return;
    }
    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      setConfigError('Interval must be a positive number of minutes.');
      return;
    }
    // End-of-day is inclusive: include a final slot whose start may equal `endTime`.
    const slots = Math.floor((t1 - t0) / intervalMinutes) + 1;
    if (slots > 200) {
      setConfigError('Too many slots; increase interval or shorten the day.');
      return;
    }

    const keysToDrop = new Set();
    const re = /^(\d+)_(\d+)$/;
    Object.keys(assignments).forEach((k) => {
      const m = k.match(re);
      if (!m) {
        keysToDrop.add(k);
        return;
      }
      const day = parseInt(m[1], 10);
      const slot = parseInt(m[2], 10);
      if (day < 0 || day > 6 || slot < 0 || slot >= slots) keysToDrop.add(k);
    });
    const nextAssign = { ...assignments };
    keysToDrop.forEach((k) => {
      delete nextAssign[k];
    });

    setAssignments(nextAssign);
    setNumSlots(slots);
    setGridReady(true);
    setPicker(null);
  }, [startTime, endTime, intervalMinutes, assignments]);

  const handleSetConfig = useCallback(() => {
    setConfigError('');
    try {
      const json = JSON.stringify(buildPayload(), null, 2);
      setConfigText(json);
      setConfigJsonModalOpen(true);
    } catch (e) {
      setConfigError(e.message || 'Could not serialize config');
    }
  }, [buildPayload]);

  const handleLoadConfig = useCallback(() => {
    setConfigError('');
    try {
      const data = JSON.parse(configText);
      applyPayload(data);
    } catch (e) {
      setConfigError(e.message || 'Invalid JSON or config');
    }
  }, [configText, applyPayload]);

  const handleSaveLocal = useCallback(() => {
    setConfigError('');
    try {
      const raw = configText.trim();
      const json = raw || JSON.stringify(buildPayload());
      JSON.parse(json);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (e) {
      setConfigError(e.message || 'Could not save: fix JSON in config or use Set config first');
    }
  }, [buildPayload, configText]);

  const handleSaveTaskConfig = useCallback(() => {
    setConfigError('');
    try {
      const payload = { version: 1, tasks };
      const json = JSON.stringify(payload, null, 2);
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(payload));
      setTaskConfigText(json);
    } catch (e) {
      setConfigError(e.message || 'Could not save task config');
    }
  }, [tasks]);

  const handleLoadTaskConfig = useCallback(() => {
    setConfigError('');
    try {
      let raw = taskConfigText.trim();
      if (!raw) raw = localStorage.getItem(TASK_STORAGE_KEY) || '';
      if (!raw) {
        setConfigError('Task config is empty — paste JSON or save tasks first.');
        return;
      }
      const nextTasks = parseTasksPayload(raw);
      const ids = new Set(nextTasks.map((t) => t.id));
      setTaskListHidden(false);
      setTasks(nextTasks);
      setAssignments((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => {
          if (ids.has(prev[k])) next[k] = prev[k];
        });
        return next;
      });
    } catch (e) {
      setConfigError(e.message || 'Invalid task JSON');
    }
  }, [taskConfigText]);

  const handleClearConfig = useCallback(() => {
    const defaults = defaultConfigShape();
    localStorage.removeItem(STORAGE_KEY);
    setConfigText('');
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
    setIntervalMinutes(defaults.intervalMinutes);
    setWeekStartsOn(defaults.weekStartsOn);
    setTasks([]);
    setAssignments({});
    setGridReady(false);
    setNumSlots(0);
    setPicker(null);
    setSelectionAnchor(null);
    setSelectionFocus(null);
    setCopiedTaskId(undefined);
    setConfigError('');
    setTaskListHidden(false);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    setConfigText(raw);
    try {
      applyPayload(JSON.parse(raw));
    } catch {
      /* show empty until user fixes */
    }
  }, [applyPayload]);

  const addTask = () => {
    const name = newTaskName.trim();
    if (!name) return;
    setTaskListHidden(false);
    setTasks((prev) => [
      ...prev,
      { id: makeTaskId(), name, color: newTaskColor, fontColor: newTaskFontColor },
    ]);
    setNewTaskName('');
  };

  const reorderTasks = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setTasks((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const patchTask = (id, partial) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
  };

  const assignCell = (taskId) => {
    if (!picker) return;
    const { dayIdx, slotIdx } = picker;
    const key = cellKey(dayIdx, slotIdx);
    setAssignments((prev) => {
      const next = { ...prev };
      if (taskId == null) delete next[key];
      else next[key] = taskId;
      return next;
    });
    setPicker(null);
  };

  const setCellTask = useCallback((dayIdx, slotIdx, taskId) => {
    const key = cellKey(dayIdx, slotIdx);
    setAssignments((prev) => {
      const next = { ...prev };
      if (taskId == null || taskId === '') delete next[key];
      else next[key] = taskId;
      return next;
    });
  }, []);

  const getSelectionBounds = useCallback(() => {
    if (!selectionAnchor || !selectionFocus) return null;
    const minDay = Math.min(selectionAnchor.dayIdx, selectionFocus.dayIdx);
    const maxDay = Math.max(selectionAnchor.dayIdx, selectionFocus.dayIdx);
    const minSlot = Math.min(selectionAnchor.slotIdx, selectionFocus.slotIdx);
    const maxSlot = Math.max(selectionAnchor.slotIdx, selectionFocus.slotIdx);
    return { minDay, maxDay, minSlot, maxSlot };
  }, [selectionAnchor, selectionFocus]);

  const isCellSelected = useCallback(
    (dayIdx, slotIdx) => {
      const bounds = getSelectionBounds();
      if (!bounds) return false;
      return (
        dayIdx >= bounds.minDay &&
        dayIdx <= bounds.maxDay &&
        slotIdx >= bounds.minSlot &&
        slotIdx <= bounds.maxSlot
      );
    },
    [getSelectionBounds]
  );

  const copySelectedCell = useCallback(() => {
    const bounds = getSelectionBounds();
    if (!bounds) return;
    const key = cellKey(bounds.minDay, bounds.minSlot);
    setCopiedTaskId(assignments[key] ?? null);
  }, [getSelectionBounds, assignments]);

  const pasteToSelectedCell = useCallback(() => {
    const bounds = getSelectionBounds();
    if (!bounds || copiedTaskId === undefined) return;
    for (let dayIdx = bounds.minDay; dayIdx <= bounds.maxDay; dayIdx += 1) {
      for (let slotIdx = bounds.minSlot; slotIdx <= bounds.maxSlot; slotIdx += 1) {
        setCellTask(dayIdx, slotIdx, copiedTaskId);
      }
    }
  }, [getSelectionBounds, copiedTaskId, setCellTask]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (!selectionAnchor || !selectionFocus) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        copySelectedCell();
      } else if (key === 'v') {
        e.preventDefault();
        pasteToSelectedCell();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectionAnchor, selectionFocus, copySelectedCell, pasteToSelectedCell]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (picker) {
        setPicker(null);
        return;
      }
      if (taskJsonModalOpen) {
        setTaskJsonModalOpen(false);
        return;
      }
      if (configJsonModalOpen) {
        setConfigJsonModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [picker, taskJsonModalOpen, configJsonModalOpen]);

  useEffect(() => {
    const onMouseUp = () => setIsSelectingCells(false);
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div className="tool-page timetable-page">
      <div className="tool-container">
        <div className="tool-top-bar">
          <button type="button" onClick={() => navigate('/tools')} className="back-button">
            ← Back to Tools
          </button>
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="tool-sidebar-toggle"
          >
            {sidebarVisible ? '⊟ Hide sidebar' : '⊞ Show sidebar'}
          </button>
        </div>

        <h1 className="tool-title">Timetable</h1>

        <section className="timetable-section">
          <h2 className="timetable-section-title">Grid</h2>
          <div className="timetable-grid-form">
            <label className="tool-label">
              <span>Start of day</span>
              <input
                className="tool-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="tool-label">
              <span>End of day</span>
              <input
                className="tool-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
            <label className="tool-label">
              <span>Block interval (minutes)</span>
              <input
                className="tool-input timetable-interval"
                type="number"
                min={5}
                step={5}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label className="tool-label">
              <span>Week starts on</span>
              <select
                className="tool-input timetable-select"
                value={weekStartsOn}
                onChange={(e) => setWeekStartsOn(e.target.value)}
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
            <button type="button" className="tool-btn tool-btn-primary timetable-create-btn" onClick={handleCreate}>
              Create timetable
            </button>
          </div>
        </section>

        <section className="timetable-section">
          <div className="timetable-task-section-head">
            <h2 className="timetable-section-title timetable-task-section-title">Tasks</h2>
          </div>
          <div className="timetable-task-add">
            <label className="tool-label timetable-task-name">
              <span>Task name</span>
              <input
                className="tool-input timetable-task-name-input"
                type="text"
                value={newTaskName}
                placeholder="e.g. Deep work"
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
            </label>
            <div className="tool-label timetable-color-field">
              <span>Color</span>
              <div className="timetable-color-row">
                <div className="timetable-preset-colors" role="group" aria-label="Preset colors">
                  {PRESET_COLORS.map(({ hex, label }) => {
                    const active = newTaskColor.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        className={`timetable-preset-swatch${active ? ' timetable-preset-swatch--active' : ''}`}
                        style={{ backgroundColor: hex }}
                        title={label}
                        aria-label={`${label} ${hex}`}
                        aria-pressed={active}
                        onClick={() => setNewTaskColor(hex)}
                      />
                    );
                  })}
                </div>
                <input
                  className="timetable-color-input"
                  type="color"
                  value={newTaskColor}
                  onChange={(e) => setNewTaskColor(e.target.value)}
                  aria-label="Block background color"
                />
              </div>
            </div>
            <label className="tool-label timetable-new-task-font">
              <span>Text color</span>
              <input
                className="timetable-color-input"
                type="color"
                value={newTaskFontColor}
                onChange={(e) => setNewTaskFontColor(e.target.value)}
                aria-label="Task text color"
              />
            </label>
          </div>
          <div className="timetable-task-import-export">
            <button type="button" className="tool-btn tool-btn-primary timetable-add-task-btn" onClick={addTask}>
                Add task
              </button>
            <button type="button" className="tool-btn tool-btn-primary" onClick={handleSaveTaskConfig}>
              Save task config
            </button>
            <button type="button" className="tool-btn" onClick={() => setTaskJsonModalOpen(true)}>
              Edit task JSON
            </button>
            {tasks.length > 0 && (
              <button
                type="button"
                className="tool-btn"
                onClick={() => setTaskListHidden((h) => !h)}
              >
                {taskListHidden ? 'Show task list' : 'Hide task list'}
              </button>
            )}
          </div>
          {tasks.length > 0 && !taskListHidden && (
            <ul className="timetable-task-list timetable-task-list--compact">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className={`timetable-task-item${taskDragOverId === t.id ? ' timetable-task-item--drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setTaskDragOverId(t.id);
                  }}
                  onDragLeave={() => {
                    setTaskDragOverId((cur) => (cur === t.id ? null : cur));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingTaskId && draggingTaskId !== t.id) {
                      reorderTasks(draggingTaskId, t.id);
                    }
                    setDraggingTaskId(null);
                    setTaskDragOverId(null);
                  }}
                >
                  <span
                    className="timetable-task-swatch timetable-task-dnd-handle"
                    style={{ background: t.color }}
                    title="Drag to reorder"
                    draggable
                    onDragStart={(e) => {
                      setDraggingTaskId(t.id);
                      setTaskDragOverId(t.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', t.id);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskId(null);
                      setTaskDragOverId(null);
                    }}
                  />
                  <input
                    type="text"
                    className="timetable-task-name-edit"
                    style={{ color: t.fontColor || '#0f172a' }}
                    value={t.name}
                    onChange={(e) => patchTask(t.id, { name: e.target.value })}
                    aria-label={`Edit task name: ${t.name}`}
                  />
                  <input
                    type="color"
                    className="timetable-task-mini-color"
                    value={t.color}
                    onChange={(e) => patchTask(t.id, { color: e.target.value })}
                    title="Block color"
                    aria-label={`${t.name} block color`}
                  />
                  <input
                    type="color"
                    className="timetable-task-mini-color"
                    value={t.fontColor || '#0f172a'}
                    onChange={(e) => patchTask(t.id, { fontColor: e.target.value })}
                    title="Text color"
                    aria-label={`${t.name} text color`}
                  />
                  <button
                    type="button"
                    className="timetable-task-remove-icon"
                    onClick={() => removeTask(t.id)}
                    aria-label={`Remove ${t.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {configError && <p className="timetable-error">{configError}</p>}

        {gridReady && numSlots > 0 && (
          <section className="timetable-section timetable-grid-wrap">
            <h2 className="timetable-section-title">Schedule</h2>
            <div className="timetable-copy-row">
              <button
                type="button"
                className="tool-btn"
                onClick={copySelectedCell}
                disabled={!selectionAnchor || !selectionFocus}
              >
                Copy cell
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={pasteToSelectedCell}
                disabled={!selectionAnchor || !selectionFocus || copiedTaskId === undefined}
              >
                Paste cell
              </button>
              <span className="timetable-copy-hint">
                Drag to select multiple cells. Double-click a cell to edit. Cmd/Ctrl+C and Cmd/Ctrl+V supported.
              </span>
            </div>
            <div className="timetable-table-scroll">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th className="timetable-corner" />
                    {dayLabels.map((d) => (
                      <th key={d} className="timetable-day-head">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slotLabels.map((label, slotIdx) => (
                    <tr key={slotIdx}>
                      <td className="timetable-time-cell">{label}</td>
                      {dayLabels.map((_, dayIdx) => {
                        const key = cellKey(dayIdx, slotIdx);
                        const tid = assignments[key];
                        const task = tid ? taskById[tid] : null;
                        return (
                          <td
                            key={key}
                            className={`timetable-slot${
                              isCellSelected(dayIdx, slotIdx) ? ' timetable-slot-selected' : ''
                            }`}
                            style={{
                              background: task ? task.color : '#f8fafc',
                            }}
                            onMouseDown={(e) => {
                              setPicker(null);
                              if (e.shiftKey && selectionAnchor) {
                                setSelectionFocus({ dayIdx, slotIdx });
                              } else {
                                setSelectionAnchor({ dayIdx, slotIdx });
                                setSelectionFocus({ dayIdx, slotIdx });
                              }
                              setIsSelectingCells(true);
                            }}
                            onMouseEnter={() => {
                              if (!isSelectingCells) return;
                              setSelectionFocus({ dayIdx, slotIdx });
                            }}
                            onMouseUp={() => setIsSelectingCells(false)}
                            onDoubleClick={() => setPicker({ dayIdx, slotIdx })}
                            title={task ? task.name : 'Empty — click to assign'}
                          >
                            {task && (
                              <span
                                className="timetable-slot-label"
                                style={{ color: task.fontColor || '#0f172a' }}
                              >
                                {task.name}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {picker && (
          <div className="timetable-picker-backdrop" role="presentation" onClick={() => setPicker(null)}>
            <div
              className="timetable-picker"
              role="dialog"
              aria-label="Choose task for block"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="timetable-picker-hint">Assign task to this block</p>
              <div className="timetable-picker-actions">
                <button type="button" className="tool-btn" onClick={() => assignCell(null)}>
                  Clear
                </button>
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="tool-btn timetable-picker-task"
                    onClick={() => assignCell(t.id)}
                  >
                    <span className="timetable-task-swatch small" style={{ background: t.color }} />
                    <span style={{ color: t.fontColor || '#0f172a' }}>{t.name}</span>
                  </button>
                ))}
              </div>
              {tasks.length === 0 && (
                <p className="timetable-picker-empty">Add tasks above first, or clear this block.</p>
              )}
            </div>
          </div>
        )}

        {taskJsonModalOpen && (
          <div
            className="timetable-picker-backdrop"
            role="presentation"
            onClick={() => setTaskJsonModalOpen(false)}
          >
            <div
              className="timetable-picker timetable-json-modal"
              role="dialog"
              aria-label="Edit task JSON"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="timetable-picker-hint">Task JSON editor</p>
              <textarea
                className="timetable-task-json-textarea"
                value={taskConfigText}
                onChange={(e) => setTaskConfigText(e.target.value)}
                rows={10}
                spellCheck={false}
              />
              <label className="tool-label timetable-json-condensed-label">
                <span>Condensed JSON (single line)</span>
                <input
                  type="text"
                  className="tool-input timetable-json-condensed-input"
                  value={toCondensedJson(taskConfigText)}
                  onChange={(e) => setTaskConfigText(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="timetable-json-modal-actions">
                <button type="button" className="tool-btn" onClick={() => setTaskJsonModalOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="tool-btn tool-btn-primary"
                  onClick={() => {
                    handleLoadTaskConfig();
                    setTaskJsonModalOpen(false);
                  }}
                >
                  Load task config
                </button>
              </div>
            </div>
          </div>
        )}

        {configJsonModalOpen && (
          <div
            className="timetable-picker-backdrop"
            role="presentation"
            onClick={() => setConfigJsonModalOpen(false)}
          >
            <div
              className="timetable-picker timetable-json-modal"
              role="dialog"
              aria-label="Edit config JSON"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="timetable-picker-hint">Config JSON editor</p>
              <textarea
                className="timetable-config-textarea"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={12}
                spellCheck={false}
              />
              <label className="tool-label timetable-json-condensed-label">
                <span>Condensed JSON (single line)</span>
                <input
                  type="text"
                  className="tool-input timetable-json-condensed-input"
                  value={toCondensedJson(configText)}
                  onChange={(e) => setConfigText(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="timetable-json-modal-actions">
                <button type="button" className="tool-btn" onClick={() => setConfigJsonModalOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="tool-btn timetable-clear-config-btn"
                  onClick={() => {
                    handleClearConfig();
                    setConfigJsonModalOpen(false);
                  }}
                >
                  Clear local config
                </button>
                <button
                  type="button"
                  className="tool-btn tool-btn-primary"
                  onClick={() => {
                    handleLoadConfig();
                    setConfigJsonModalOpen(false);
                  }}
                >
                  Load config
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="timetable-section timetable-config-section">
          <h2 className="timetable-section-title">Config (JSON)</h2>
          <div className="timetable-config-actions">
            <button type="button" className="tool-btn tool-btn-primary" onClick={handleSetConfig}>
              Set config
            </button>
            <button type="button" className="tool-btn" onClick={handleSaveLocal}>
              Save to local
            </button>
            <button type="button" className="tool-btn" onClick={() => setConfigJsonModalOpen(true)}>
              Edit config JSON
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Timetable;
