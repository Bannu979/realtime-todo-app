import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

export default function ActivityLog({ hideHeader }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socket = useSocket();
  const topRef = useRef();

  // Fetch logs on mount
  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/logs')
      .then(res => setLogs(res.data))
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time log updates
  useEffect(() => {
    if (!socket) return;
    const onLogUpdate = (log) => {
      setLogs(prev => [log, ...prev].slice(0, 20));
      if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    };
    socket.on('logUpdate', onLogUpdate);
    return () => socket.off('logUpdate', onLogUpdate);
  }, [socket]);

  return (
    <div style={{ width: 320, background: '#fff', borderLeft: '2px solid #e0e7ef', height: '100vh', position: 'relative', zIndex: 100, boxShadow: '-2px 0 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
      {!hideHeader && (
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #e0e7ef', fontWeight: 600, fontSize: '1.15rem', color: '#4f8cff', background: '#f6f7fb' }}>
          Activity Log
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem' }}>
        <div ref={topRef} />
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: 'red' }}>{error}</div>
        ) : logs.length === 0 ? (
          <div>No recent activity.</div>
        ) : (
          logs.map(log => (
            <div key={log._id} style={{ marginBottom: '1.1rem', paddingBottom: '0.7rem', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontWeight: 500, color: '#333' }}>{log.user?.username || 'Unknown'} <span style={{ color: '#888', fontWeight: 400 }}>({log.user?.email || 'N/A'})</span></div>
              <div style={{ color: '#4f8cff', fontWeight: 500, fontSize: '0.98rem', margin: '0.2rem 0' }}>{log.action.replace('_', ' ').toUpperCase()}</div>
              <div style={{ color: '#555', fontSize: '0.97rem' }}>Task: <b>{log.task?.title || 'Untitled'}</b></div>
              <div style={{ color: '#aaa', fontSize: '0.92rem', marginTop: '0.1rem' }}>{new Date(log.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 