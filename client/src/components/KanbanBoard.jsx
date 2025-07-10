import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TaskCard from './TaskCard';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import ConflictDialog from './ConflictDialog';
import ActivityLog from './ActivityLog';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const columns = [
  { key: 'Todo', label: 'Todo' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Done', label: 'Done' },
];

// Top-level constant for forbidden words
const DEFAULT_FORBIDDEN_WORDS = ['test', 'sample', 'invalid', 'foo', 'bar', 'baz'];
function getForbiddenWords() {
  try {
    const stored = localStorage.getItem('forbiddenWords');
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_FORBIDDEN_WORDS;
}

function AddTaskModal({ open, onClose, setTasks }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/tasks', { title, description, priority });
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setTasks(prev => [res.data, ...prev]); // Optimistically add new task
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      const firstInput = document.querySelector('#add-task-title');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="glass fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s'
    }} role="dialog" tabIndex={-1}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.13)', padding: '2rem', minWidth: 320, display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
        <h3 style={{ margin: 0 }}>
          <span className="icon-bounce">+</span> Add Task
        </h3>
        <label htmlFor="add-task-title">Title</label>
        <input id="add-task-title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <label htmlFor="add-task-description">Description</label>
        <textarea id="add-task-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
        <label htmlFor="add-task-priority">Priority</label>
        <select id="add-task-priority" value={priority} onChange={e => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        {error && <div style={{ color: '#e74c3c', background: '#fbeaea', borderRadius: 4, padding: '0.4rem 0.7rem', fontSize: '0.97rem', textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <RippleButton type="submit" disabled={loading} style={{ background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }} aria-label="Add task">{loading ? 'Adding...' : 'Add Task'}</RippleButton>
          <RippleButton type="button" onClick={onClose} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 500, cursor: 'pointer' }} aria-label="Cancel adding task">Cancel</RippleButton>
        </div>
      </form>
    </div>
  );
}

function EditTaskModal({ open, onClose, task }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [assignedUser, setAssignedUser] = useState(task?.assignedUser?._id || '');
  const [status, setStatus] = useState(task?.status || 'Todo');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [smartAssigning, setSmartAssigning] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [forbiddenWords, setForbiddenWords] = useState(getForbiddenWords());

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setPriority(task?.priority || 'Medium');
    setAssignedUser(task?.assignedUser?._id || '');
    setStatus(task?.status || 'Todo');
    setError('');
    // Fetch users when modal opens
    if (open) {
      api.get('/auth/users').then(res => setUsers(res.data)).catch(() => setUsers([]));
    }
  }, [task, open]);

  useEffect(() => {
    if (open) {
      const firstInput = document.querySelector('#edit-task-title');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e, overrideData) => {
    e && e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (forbiddenWords.some(word => title.toLowerCase().includes(word) || description.toLowerCase().includes(word))) {
      setError('Title or description contains forbidden words.');
      return;
    }
    if (title.length < 3 || title.length > 60) {
      setError('Title must be between 3 and 60 characters.');
      return;
    }
    if (description.length > 300) {
      setError('Description must be less than 300 characters.');
      return;
    }
    if (priority !== 'Low' && priority !== 'Medium' && priority !== 'High') {
      setError('Invalid priority.');
      return;
    }
    if (status !== 'Todo' && status !== 'In Progress' && status !== 'Done') {
      setError('Invalid status.');
      return;
    }
    if (assignedUser && !users.some(u => u._id === assignedUser)) {
      setError('Invalid assigned user.');
      return;
    }
    setLoading(true);
    try {
      let isDuplicate = false;
      if (title.trim()) {
        try {
          const duplicateCheck = await api.get('/tasks?title=' + encodeURIComponent(title));
          if (duplicateCheck.data.some(t => t._id !== task._id)) {
            isDuplicate = true;
          }
        } catch (err) {
          // If the backend returns 400 or error, do not treat as duplicate, just skip
        }
      }
      if (isDuplicate) {
        setError('Title already exists.');
        setLoading(false);
        return;
      }
      await api.put(`/tasks/${task._id}`, overrideData || {
        ...task,
        title,
        description,
        priority,
        assignedUser: assignedUser || null,
        status,
        version: task.version,
      });
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.serverTask) {
        setConflict({ userTask: overrideData || {
          ...task,
          title,
          description,
          priority,
          assignedUser: assignedUser || null,
          status,
          version: task.version,
        }, serverTask: err.response.data.serverTask });
      } else {
        setError(err.response?.data?.message || 'Failed to update task.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/tasks/${task._id}`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSmartAssign = async () => {
    setSmartAssigning(true);
    setError('');
    try {
      await api.put(`/tasks/${task._id}/smart-assign`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Smart assign failed.');
    } finally {
      setSmartAssigning(false);
    }
  };

  const handleResolveConflict = async (action, resolvedData) => {
    setConflict(null);
    setLoading(true);
    try {
      await api.put(`/tasks/${task._id}`, { ...resolvedData, version: conflict.serverTask.version });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve conflict.');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !task) return null;
  return (
    <>
      <ConflictDialog
        open={!!conflict}
        userTask={conflict?.userTask}
        serverTask={conflict?.serverTask}
        onResolve={handleResolveConflict}
        onCancel={() => setConflict(null)}
      />
      <div className="glass fade-in scale-in" style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s'
      }} role="dialog" tabIndex={-1}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.13)', padding: '2rem', minWidth: 320, display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
          <h3 style={{ margin: 0 }}>
            <span className="icon-bounce">×</span> Edit Task
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label htmlFor="edit-title" style={{ fontWeight: 500, marginBottom: 4 }}>Title</label>
              <input
                id="edit-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                style={{ width: '100%', fontSize: '1.08rem', padding: '0.6rem', boxSizing: 'border-box' }}
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="edit-description" style={{ fontWeight: 500, marginBottom: 4 }}>Description</label>
              <textarea
                id="edit-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', minHeight: 80, fontSize: '1.08rem', padding: '0.6rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="edit-priority" style={{ fontWeight: 500, marginBottom: 4 }}>Priority</label>
                <select id="edit-priority" value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '1.08rem', boxSizing: 'border-box' }}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="edit-status" style={{ fontWeight: 500, marginBottom: 4 }}>Status</label>
                <select id="edit-status" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '1.08rem', boxSizing: 'border-box' }}>
                  <option>Todo</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="edit-assigned-user" style={{ fontWeight: 500, marginBottom: 4 }}>Assigned User</label>
              <select id="edit-assigned-user" value={assignedUser} onChange={e => setAssignedUser(e.target.value)} style={{ width: '100%', padding: '0.6rem', fontSize: '1.08rem', boxSizing: 'border-box' }}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.username} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <RippleButton type="submit" disabled={loading} style={{ background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }} aria-label="Save changes">{loading ? 'Saving...' : 'Save Changes'}</RippleButton>
            <RippleButton type="button" onClick={onClose} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 500, cursor: 'pointer' }} aria-label="Cancel editing task">Cancel</RippleButton>
            <RippleButton type="button" onClick={handleDelete} disabled={deleting} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }} aria-label="Delete task">{deleting ? 'Deleting...' : 'Delete'}</RippleButton>
            <RippleButton type="button" onClick={handleSmartAssign} disabled={smartAssigning} style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }} aria-label="Smart assign">{smartAssigning ? 'Assigning...' : 'Smart Assign'}</RippleButton>
          </div>
          {error && <div className="error-shake">{error}</div>}
        </form>
      </div>
    </>
  );
}

function ForbiddenWordsAdmin({ open, onClose, words, setWords }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const handleAdd = () => {
    const word = input.trim().toLowerCase();
    if (!word) return;
    if (words.includes(word)) {
      setError('Word already exists.');
      return;
    }
    setWords([...words, word]);
    setInput('');
    setError('');
  };
  const handleRemove = (w) => setWords(words.filter(word => word !== w));

  useEffect(() => {
    if (open) {
      const firstInput = document.querySelector('#forbidden-word-input');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="glass fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} role="dialog" tabIndex={-1}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.13)', padding: '2rem', minWidth: 340, display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close Forbidden Words Admin" style={{ position: 'absolute', top: 12, right: 18, background: 'transparent', border: 'none', fontSize: '1.7rem', color: '#4f8cff', cursor: 'pointer', fontWeight: 700, lineHeight: 1, padding: 0 }}>
          <span className="animated-close icon-spin">×</span>
        </button>
        <h2 style={{ margin: 0, color: '#4f8cff', textAlign: 'center' }}>Forbidden Words Admin</h2>
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
          <input id="forbidden-word-input" aria-label="Add forbidden word" value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: 5, border: '1px solid #e0e7ef' }} placeholder="Add word..." />
          <button onClick={handleAdd} aria-label="Add word" style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 5, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: '0.97rem' }}>{error}</div>}
        <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: '0.5rem' }}>
          {words.length === 0 ? <div style={{ color: '#888' }}>No forbidden words.</div> : words.map(w => (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: 4 }}>
              <span style={{ flex: 1 }}>{w}</span>
              <button onClick={() => handleRemove(w)} aria-label={`Remove ${w}`} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, padding: '0.2rem 0.7rem', fontWeight: 600, cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onDropTask, onAddTask, onEditTask, onDeleteTask }) {
  const [, drop] = useDrop({
    accept: 'TASK',
    drop: (draggedTask) => {
      console.log('Drop event in column:', column.key, draggedTask); // DEBUG
      if (draggedTask.status !== column.key) {
        onDropTask(draggedTask, column.key);
      }
    },
  });

  return (
    <div
      ref={drop}
      style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '1rem', minHeight: '60vh', position: 'relative' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ textAlign: 'center', color: '#4f8cff', margin: 0 }}>
          <span className={`column-icon-animate ${column.key.toLowerCase()}`}>
            {column.key === 'Todo' && '📋'}
            {column.key === 'In Progress' && '🔄'}
            {column.key === 'Done' && '🏆'}
          </span>
          {column.label}
        </h3>
        {column.key === 'Todo' && (
          <RippleButton onClick={onAddTask} style={{ background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 5, padding: '0.4rem 0.9rem', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }} aria-label="Add task to Todo column">+ Add Task</RippleButton>
        )}
      </div>
      {tasks.map(task => (
        <TaskCard key={task._id} task={task} onClick={() => onEditTask(task)} onEditTask={() => onEditTask(task)} onDeleteTask={() => onDeleteTask(task)} />
      ))}
    </div>
  );
}

function ProfileModal({ open, onClose, user }) {
  useEffect(() => {
    if (open) {
      const firstInput = document.querySelector('#profile-username');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!open || !user) return null;
  return (
    <div className="glass fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }} role="dialog" tabIndex={-1}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.13)', padding: '2rem 2.5rem', minWidth: 320, display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close Profile" style={{ position: 'absolute', top: 12, right: 18, background: 'transparent', border: 'none', fontSize: '1.7rem', color: '#4f8cff', cursor: 'pointer', fontWeight: 700, lineHeight: 1, padding: 0 }}>
          <span className="animated-close icon-spin">×</span>
        </button>
        <h2 style={{ margin: 0, color: '#4f8cff', textAlign: 'center' }}>
          <span className="icon-bounce">👤</span> User Profile
        </h2>
        <div><b>Username:</b> <input id="profile-username" type="text" value={user.username} onChange={() => {}} disabled /></div>
        <div><b>Email:</b> <input id="profile-email" type="email" value={user.email} onChange={() => {}} disabled /></div>
      </div>
    </div>
  );
}

// Toast component
function Toast({ message, show, undo, onUndo }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: show ? 32 : -80,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(79,140,255,0.97)',
      color: '#fff',
      padding: '1rem 2.2rem',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: '1.08rem',
      boxShadow: '0 4px 24px rgba(79,140,255,0.13)',
      zIndex: 9999,
      opacity: show ? 1 : 0,
      transition: 'bottom 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s',
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: '1.2rem',
    }}>
      <span>{message}</span>
      {undo && (
        <button style={{ background: '#fff', color: '#4f8cff', border: 'none', borderRadius: 5, padding: '0.4rem 1.1rem', fontWeight: 700, fontSize: '1.01rem', cursor: 'pointer', pointerEvents: 'auto' }} onClick={onUndo}>Undo</button>
      )}
    </div>
  );
}

// Ripple effect for buttons
function withRipple(Wrapped) {
  return function RippleButton(props) {
    const btnRef = useRef();
    const handleClick = (e) => {
      if (props.onClick) props.onClick(e);
      const button = btnRef.current;
      const circle = document.createElement('span');
      circle.className = 'ripple';
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - button.getBoundingClientRect().left - diameter / 2}px`;
      circle.style.top = `${e.clientY - button.getBoundingClientRect().top - diameter / 2}px`;
      button.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    };
    return <Wrapped ref={btnRef} {...props} onClick={handleClick} />;
  };
}

const RippleButton = withRipple('button');

// Confetti burst (simple SVG burst)
function ConfettiBurst({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none' }}>
      <svg width="160" height="80">
        <g>
          <circle cx="80" cy="40" r="6" fill="#4f8cff" />
          <circle cx="40" cy="20" r="4" fill="#00b894" />
          <circle cx="120" cy="60" r="4" fill="#e74c3c" />
          <circle cx="60" cy="60" r="3" fill="#f1c40f" />
          <circle cx="100" cy="20" r="3" fill="#9b59b6" />
        </g>
      </svg>
    </div>
  );
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const socket = useSocket();
  const [showActivityLog, setShowActivityLog] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [confetti, setConfetti] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [showForbiddenAdmin, setShowForbiddenAdmin] = useState(false);
  const [forbiddenWords] = useState(getForbiddenWords());
  // Remove updateForbiddenWords, use setForbiddenWords directly where needed
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch tasks from backend
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    const onTaskUpdate = (updatedTask) => {
      console.log('Received taskUpdate from socket:', updatedTask); // Debug log
      setTasks(prev => {
        const exists = prev.some(t => t._id === updatedTask._id);
        if (exists) {
          return prev.map(t => t._id === updatedTask._id ? updatedTask : t);
        } else {
          return [...prev, updatedTask];
        }
      });
    };
    socket.on('taskUpdate', onTaskUpdate);
    return () => {
      socket.off('taskUpdate', onTaskUpdate);
    };
  }, [socket]);

  // Update task status in backend on drop
  const handleDropTask = async (draggedTask, newStatus) => {
    console.log('handleDropTask called:', { draggedTask, newStatus }); // DEBUG
    try {
      const res = await api.put(`/tasks/${draggedTask._id}`, { ...draggedTask, status: newStatus, version: draggedTask.version });
      console.log('PUT /tasks/:id response:', res.data); // DEBUG
      setTasks(prev => prev.map(t => t._id === draggedTask._id ? res.data : t));
      setToast({ show: true, message: 'Task updated!' });
      if (newStatus === 'Done') {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1200);
      }
      setTimeout(() => setToast({ show: false, message: '' }), 1800);
    } catch (err) {
      console.error('Error in handleDropTask:', err); // DEBUG
      if (err.response?.status === 409 && err.response.data?.serverTask) {
        try {
          const retryRes = await api.put(`/tasks/${draggedTask._id}`, {
            ...err.response.data.serverTask,
            status: newStatus,
            version: err.response.data.serverTask.version
          });
          setTasks(prev => prev.map(t => t._id === draggedTask._id ? retryRes.data : t));
        } catch (retryErr) {
          setError('Failed to update task after resolving version conflict.');
        }
      } else {
        setError('Failed to update task.');
      }
    }
  };

  const handleEditTask = (task) => setEditTask(task);
  const handleDeleteTask = async (task) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      setLastDeletedTask(task);
      setToast({ show: true, message: 'Task deleted! ', undo: true });
      const timeout = setTimeout(() => {
        setToast({ show: false, message: '', undo: false });
        setLastDeletedTask(null);
      }, 5000);
      setUndoTimeout(timeout);
      fetchTasks();
    } catch (err) {
      setToast({ show: true, message: 'Failed to delete task.' });
      setTimeout(() => setToast({ show: false, message: '' }), 1800);
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedTask) return;
    clearTimeout(undoTimeout);
    try {
      await api.post('/tasks', {
        ...lastDeletedTask,
        _id: undefined, // Let MongoDB assign a new ID
        version: 1,
      });
      setToast({ show: true, message: 'Task restored!' });
      setTimeout(() => setToast({ show: false, message: '' }), 1800);
      setLastDeletedTask(null);
      fetchTasks();
    } catch (err) {
      setToast({ show: true, message: 'Failed to restore task.' });
      setTimeout(() => setToast({ show: false, message: '' }), 1800);
    }
  };

  return (
    <>
      <svg className="animated-bg" viewBox="0 0 1440 900" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3e9f9" />
            <stop offset="100%" stopColor="#f6f7fb" />
          </linearGradient>
          <radialGradient id="blob1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00b894" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00b894" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blob2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a29bfe" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a29bfe" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blob3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1c40f" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#f1c40f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blob4" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb6b6" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#ffb6b6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blob5" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00b894" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00b894" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blob6" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e74c3c" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lavender" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a29bfe" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a29bfe" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="diagGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#00b894" stopOpacity="0.07" />
          </linearGradient>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="60" height="60" fill="none" />
            <path d="M60 0 V60 M0 60 H60" stroke="#b3d1ff" strokeWidth="0.7" opacity="0.08">
              <animateTransform attributeName="transform" type="translate" from="0 0" to="30 30" dur="32s" repeatCount="indefinite" />
            </path>
          </pattern>
        </defs>
        {/* Existing blobs and shapes */}
        <ellipse cx="350" cy="220" rx="260" ry="120" fill="url(#blob1)">
          <animate attributeName="rx" values="260;320;260" dur="28s" repeatCount="indefinite" />
          <animate attributeName="ry" values="120;180;120" dur="28s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="1200" cy="700" rx="200" ry="100" fill="url(#blob2)">
          <animate attributeName="rx" values="200;160;200" dur="24s" repeatCount="indefinite" />
          <animate attributeName="ry" values="100;140;100" dur="24s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="900" cy="300" rx="120" ry="70" fill="url(#blob3)">
          <animate attributeName="rx" values="120;150;120" dur="26s" repeatCount="indefinite" />
          <animate attributeName="ry" values="70;110;70" dur="26s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="700" cy="500" rx="180" ry="90" fill="url(#blob4)">
          <animate attributeName="rx" values="180;220;180" dur="32s" repeatCount="indefinite" />
          <animate attributeName="ry" values="90;130;90" dur="32s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="500" cy="350" rx="150" ry="75" fill="url(#blob5)">
          <animate attributeName="rx" values="150;180;150" dur="28s" repeatCount="indefinite" />
          <animate attributeName="ry" values="75;105;75" dur="28s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="1000" cy="550" rx="150" ry="75" fill="url(#blob6)">
          <animate attributeName="rx" values="150;180;150" dur="28s" repeatCount="indefinite" />
          <animate attributeName="ry" values="75;105;75" dur="28s" repeatCount="indefinite" />
        </ellipse>
        {/* More visible lavender circle */}
        <circle cx="1200" cy="500" r="160" fill="url(#lavender)">
          <animate attributeName="r" values="160;200;160" dur="36s" repeatCount="indefinite" />
        </circle>
        {/* Animated diamond */}
        <rect x="200" y="100" width="60" height="60" fill="#a29bfe" opacity="0.18" transform="rotate(45 230 130)">
          <animateTransform attributeName="transform" type="rotate" from="45 230 130" to="405 230 130" dur="40s" repeatCount="indefinite" />
        </rect>
        {/* Animated yellow diamond */}
        <rect x="1100" y="200" width="40" height="40" fill="#f1c40f" opacity="0.13" transform="rotate(30 1120 220)">
          <animateTransform attributeName="transform" type="rotate" from="30 1120 220" to="390 1120 220" dur="36s" repeatCount="indefinite" />
        </rect>
        {/* Animated zigzag red */}
        <polyline points="400,800 420,820 440,800 460,820 480,800" fill="none" stroke="#e74c3c" strokeWidth="4" opacity="0.13">
          <animate attributeName="points" values="400,800 420,820 440,800 460,820 480,800;400,820 420,800 440,800 460,820 480,800;400,800 420,820 440,800 460,820 480,800" dur="38s" repeatCount="indefinite" />
        </polyline>
        {/* Animated zigzag green */}
        <polyline points="900,100 920,120 940,100 960,120 980,100" fill="none" stroke="#00b894" strokeWidth="3" opacity="0.13">
          <animate attributeName="points" values="900,100 920,120 940,100 960,120 980,100;900,120 920,100 940,120 960,100 980,120;900,100 920,120 940,100 960,120 980,100" dur="42s" repeatCount="indefinite" />
        </polyline>
        {/* NEW: Dynamic moving gradient circles for depth and parallax */}
        <circle cx="200" cy="800" r="60" fill="url(#blob2)" opacity="0.22">
          <animate attributeName="cy" values="800;600;800" dur="22s" repeatCount="indefinite" />
          <animate attributeName="r" values="60;90;60" dur="18s" repeatCount="indefinite" />
        </circle>
        <circle cx="1300" cy="200" r="40" fill="url(#blob3)" opacity="0.18">
          <animate attributeName="cy" values="200;400;200" dur="28s" repeatCount="indefinite" />
          <animate attributeName="r" values="40;70;40" dur="20s" repeatCount="indefinite" />
        </circle>
        <circle cx="700" cy="100" r="30" fill="url(#blob4)" opacity="0.15">
          <animate attributeName="cy" values="100;300;100" dur="24s" repeatCount="indefinite" />
          <animate attributeName="r" values="30;60;30" dur="16s" repeatCount="indefinite" />
        </circle>
        {/* NEW: Floating polygons */}
        <polygon points="60,60 80,100 100,60 80,20" fill="#4f8cff" opacity="0.13">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="80 120" dur="30s" repeatCount="indefinite" />
        </polygon>
        <polygon points="1400,800 1420,860 1440,800 1420,740" fill="#00b894" opacity="0.11">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 -200" dur="36s" repeatCount="indefinite" />
        </polygon>
        <polygon points="800,400 820,440 840,400 820,360" fill="#e74c3c" opacity="0.10">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-60 80" dur="28s" repeatCount="indefinite" />
        </polygon>
        {/* NEW: Subtle animated sparkles/stars */}
        <g opacity="0.18">
          <circle cx="300" cy="300" r="2">
            <animate attributeName="cy" values="300;320;300" dur="8s" repeatCount="indefinite" />
          </circle>
          <circle cx="600" cy="700" r="1.5">
            <animate attributeName="cy" values="700;680;700" dur="7s" repeatCount="indefinite" />
          </circle>
          <circle cx="1100" cy="400" r="2.5">
            <animate attributeName="cy" values="400;420;400" dur="9s" repeatCount="indefinite" />
          </circle>
          <circle cx="900" cy="200" r="1.2">
            <animate attributeName="cy" values="200;220;200" dur="6s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Glassmorphism overlay */}
        <rect x="0" y="0" width="1440" height="900" fill="#fff" fillOpacity="0.18" style={{ backdropFilter: 'blur(16px)' }} />
        {/* Animated diagonal gradient overlay */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#diagGrad)" />
        {/* Animated grid pattern */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#grid)" />
        {/* Animated wave at bottom */}
        <path fill="url(#waveGradient)" fillOpacity="1">
          <animate attributeName="d" dur="28s" repeatCount="indefinite"
            values="
              M0,800 Q360,900 720,800 T1440,800 V900 H0 Z;
              M0,820 Q360,780 720,860 T1440,820 V900 H0 Z;
              M0,800 Q360,900 720,800 T1440,800 V900 H0 Z
            "
          />
        </path>
      </svg>
      <DndProvider backend={HTML5Backend}>
        <AddTaskModal open={showAddModal} onClose={() => setShowAddModal(false)} setTasks={setTasks} />
        <EditTaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
        {/* Navbar */}
        <nav style={{
          width: '100%',
          height: '64px',
          background: '#fff',
          borderBottom: '1px solid #e0e7ef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 200,
          padding: '0 2.5rem',
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {/* Hamburger and title on same line for mobile */}
          <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <button
              className="hamburger"
              aria-label="Open menu"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                fontSize: 28,
                color: '#4f8cff',
                cursor: 'pointer',
                marginRight: 12
              }}
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              <span className="icon-bounce">&#9776;</span>
            </button>
            <div className="navbar-title" style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '1.45rem', letterSpacing: '0.01em', color: '#2d3a4a', position: 'relative', top: '-2px' }}>
              Real-Time Collaborative To-Do Board
            </div>
          </div>
          <div className="navbar-buttons" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {/* Hide these on mobile, show in hamburger menu */}
            <div className="desktop-navbar-btns" style={{ display: 'flex', gap: '1rem' }}>
              {!showActivityLog && (
                <RippleButton
                  onClick={() => setShowActivityLog(true)}
                  style={{
                    background: '#4f8cff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.6rem 1.2rem',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  aria-label="Open Activity Log"
                >
                  <span className="icon-bounce" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                    </svg>
                    Activity Log
                  </span>
                </RippleButton>
              )}
              {user && (
                <>
                  <RippleButton
                    onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }}
                    style={{
                      background: '#f6f7fb',
                      color: '#4f8cff',
                      border: '1px solid #4f8cff',
                      borderRadius: 6,
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    aria-label="Open Profile"
                  >
                    <span className="icon-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                      </svg>
                      Profile
                    </span>
                  </RippleButton>
                  <RippleButton
                    onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false); }}
                    style={{
                      background: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    aria-label="Logout"
                  >
                    <span className="icon-spin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                      </svg>
                      Logout
                    </span>
                  </RippleButton>
                  <RippleButton
                    onClick={() => { setShowForbiddenAdmin(true); setMobileMenuOpen(false); }}
                    aria-label="Open Forbidden Words Admin"
                    style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem 1.2rem', fontWeight: 600, fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <span className="icon-bounce" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Forbidden Words</span>
                  </RippleButton>
                </>
              )}
            </div>
          </div>
        </nav>
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-menu" style={{ background: '#fff', borderRadius: '0 0 0 16px', boxShadow: '-2px 2px 16px rgba(0,0,0,0.13)', padding: '1.2rem 1.5rem', minWidth: 220, marginTop: 0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', fontSize: 24, color: '#4f8cff', cursor: 'pointer', marginBottom: 16, float: 'right' }}>×</button>
              {!showActivityLog && (
                <RippleButton
                  onClick={() => { setShowActivityLog(true); setMobileMenuOpen(false); }}
                  style={{
                    background: '#4f8cff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.6rem 1.2rem',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  aria-label="Open Activity Log"
                >
                  <span className="icon-bounce" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                    </svg>
                    Activity Log
                  </span>
                </RippleButton>
              )}
              {user && (
                <>
                  <RippleButton
                    onClick={() => { setShowProfile(true); setMobileMenuOpen(false); }}
                    style={{
                      background: '#f6f7fb',
                      color: '#4f8cff',
                      border: '1px solid #4f8cff',
                      borderRadius: 6,
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    aria-label="Open Profile"
                  >
                    <span className="icon-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                      </svg>
                      Profile
                    </span>
                  </RippleButton>
                  <RippleButton
                    onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false); }}
                    style={{
                      background: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '0.6rem 1.2rem',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    aria-label="Logout"
                  >
                    <span className="icon-spin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 20C4.48 20 0 15.52 0 10S4.48 0 10 0s10 4.48 10 10-4.48 10-10 10zm0-18C4.987 2 1 6.013 1 11s4.013 9 9 9 9-4.013 9-9S15.013 2 10 2zm0 16c-3.867 0-7-3.133-7-7s3.133-7 7-7 7 3.133 7 7-3.133 7-7 7zm0-12c-2.213 0-4 1.787-4 4s1.787 4 4 4 4-1.787 4-4-1.787-4-4-4z" />
                      </svg>
                      Logout
                    </span>
                  </RippleButton>
                  <RippleButton
                    onClick={() => { setShowForbiddenAdmin(true); setMobileMenuOpen(false); }}
                    aria-label="Open Forbidden Words Admin"
                    style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem 1.2rem', fontWeight: 600, fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <span className="icon-bounce" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Forbidden Words</span>
                  </RippleButton>
                </>
              )}
            </div>
          </div>
        )}
        {/* Activity Log Sidebar */}
        {showActivityLog && (
          <div style={{ position: 'fixed', right: 0, top: 0, zIndex: 300, height: '100vh' }}>
            <div style={{ width: 320, background: '#fff', borderLeft: '2px solid #e0e7ef', height: '100vh', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem 1.2rem 1.5rem', borderBottom: '1px solid #e0e7ef', background: '#f6f7fb', position: 'relative', zIndex: 310 }}>
                <span style={{ fontWeight: 600, fontSize: '1.15rem', color: '#4f8cff' }}>Activity Log</span>
                <button
                  onClick={() => setShowActivityLog(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.7rem',
                    color: '#4f8cff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    lineHeight: 1,
                    marginLeft: '0.5rem',
                    padding: 0,
                    zIndex: 320,
                  }}
                  aria-label="Close Activity Log"
                >
                  <span className="animated-close icon-spin">×</span>
                </button>
              </div>
              <ActivityLog hideHeader={true} />
            </div>
          </div>
        )}
        <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={user} />
        {/* Board Title */}
        <div style={{ height: '64px' }} /> {/* Spacer for navbar */}
        {/* Kanban Columns */}
        <div className="kanban-board-columns" style={{ display: 'flex', gap: '2rem', padding: '2rem', minHeight: '80vh', background: '#f6f7fb', marginTop: '1.5rem' }}>
          {loading ? (
            <div style={{ margin: 'auto', fontSize: '1.2rem' }}>Loading tasks...</div>
          ) : error ? (
            <div style={{ margin: 'auto', color: 'red' }}>{error}</div>
          ) : (
            columns.map(col => (
              <KanbanColumn
                key={col.key}
                column={col}
                tasks={tasks.filter(t => t.status === col.key)}
                onDropTask={handleDropTask}
                onAddTask={() => setShowAddModal(true)}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))
          )}
        </div>
        <Toast message={toast.message} show={toast.show} undo={toast.undo} onUndo={handleUndoDelete} />
        <ConfettiBurst show={confetti} />
        <ForbiddenWordsAdmin open={showForbiddenAdmin} onClose={() => setShowForbiddenAdmin(false)} words={forbiddenWords} setWords={setForbiddenWords} />
      </DndProvider>
    </>
  );
} 