import React, { useState } from 'react';

export default function ConflictDialog({ open, userTask, serverTask, onResolve, onCancel }) {
  const [merged, setMerged] = useState({
    title: userTask?.title || '',
    description: userTask?.description || '',
    priority: userTask?.priority || 'Medium',
    status: userTask?.status || 'Todo',
    assignedUser: userTask?.assignedUser || '',
  });

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.13)', padding: '2rem', minWidth: 350, maxWidth: 500 }}>
        <h3>Task Conflict Detected</h3>
        <p style={{ color: '#e67e22', fontWeight: 500 }}>Another user has updated this task. Choose how to resolve:</p>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Your Version</div>
            <div><b>Title:</b> {userTask.title}</div>
            <div><b>Description:</b> {userTask.description}</div>
            <div><b>Priority:</b> {userTask.priority}</div>
            <div><b>Status:</b> {userTask.status}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Server Version</div>
            <div><b>Title:</b> {serverTask.title}</div>
            <div><b>Description:</b> {serverTask.description}</div>
            <div><b>Priority:</b> {serverTask.priority}</div>
            <div><b>Status:</b> {serverTask.status}</div>
          </div>
        </div>
        <div style={{ marginBottom: '1rem', fontWeight: 500 }}>Merge (choose fields):</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label>Title
            <input value={merged.title} onChange={e => setMerged(m => ({ ...m, title: e.target.value }))} style={{ width: '100%' }} />
          </label>
          <label>Description
            <textarea value={merged.description} onChange={e => setMerged(m => ({ ...m, description: e.target.value }))} rows={2} style={{ width: '100%' }} />
          </label>
          <label>Priority
            <select value={merged.priority} onChange={e => setMerged(m => ({ ...m, priority: e.target.value }))}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label>Status
            <select value={merged.status} onChange={e => setMerged(m => ({ ...m, status: e.target.value }))}>
              <option>Todo</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
          <button onClick={() => onResolve('overwrite', userTask)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}>Overwrite</button>
          <button onClick={() => onResolve('merge', merged)} style={{ background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' }}>Merge</button>
          <button onClick={onCancel} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 5, padding: '0.6rem 1.2rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
} 