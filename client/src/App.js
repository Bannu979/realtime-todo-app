import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import KanbanBoard from './components/KanbanBoard';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();
  const [showLog, setShowLog] = useState(false);

  return (
    <Router>
      {user && (
        <>
          {!showLog && (
            <button
              onClick={() => setShowLog(true)}
              style={{
                position: 'fixed',
                top: 18,
                right: 18,
                zIndex: 101,
                background: '#4f8cff',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.6rem 1.2rem',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'right 0.2s',
              }}
            >
              Activity Log
            </button>
          )}
        </>
      )}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/board" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/board" />} />
        <Route path="/board" element={user ? <KanbanBoard /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/board" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App; 