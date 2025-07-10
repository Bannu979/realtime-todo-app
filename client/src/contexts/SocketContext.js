import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef();

  useEffect(() => {
    if (token) {
      socketRef.current = io('http://localhost:5000', {
        auth: { token },
      });
      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
} 