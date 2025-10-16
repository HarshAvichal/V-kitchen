import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export const useWebSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Initialize WebSocket connection with optimized settings
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000, // Reduced timeout for faster connection
      reconnection: true,
      reconnectionAttempts: 10, // More attempts
      reconnectionDelay: 500, // Faster reconnection
      reconnectionDelayMax: 2000, // Max delay between attempts
      maxReconnectionAttempts: 10,
      forceNew: true, // Force new connection
      upgrade: true, // Allow upgrade from polling to websocket
      rememberUpgrade: true, // Remember upgrade preference
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_error', (error) => {
      setConnectionError(error.message);
    });

    socket.on('reconnect_failed', () => {
      setConnectionError('Failed to reconnect to server');
    });


    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, token]);

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    off
  };
};
