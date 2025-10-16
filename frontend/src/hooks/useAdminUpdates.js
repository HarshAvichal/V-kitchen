import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useAdminUpdates = (onNewOrder, onOrderUpdate) => {
  const { socket, isConnected, emit, on, off } = useWebSocket();
  const { user } = useAuth();

  // Join admin room when user is admin
  useEffect(() => {
    if (socket && isConnected && user?.role === 'admin') {
      // Admin room is automatically joined in the backend
    }
  }, [socket, isConnected, user?.role]);

  // Handle new paid orders
  const handleNewOrder = useCallback((data) => {
    // Toast notifications are handled by the notification system
    if (onNewOrder) {
      onNewOrder(data);
    }
  }, [onNewOrder]);

  // Handle order updates
  const handleOrderUpdate = useCallback((data) => {
    // Toast notifications are handled by the notification system
    if (onOrderUpdate) {
      onOrderUpdate(data);
    }
  }, [onOrderUpdate]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || user?.role !== 'admin') return;

    on('new-order', handleNewOrder);
    on('order-status-updated', handleOrderUpdate);

    return () => {
      off('new-order', handleNewOrder);
      off('order-status-updated', handleOrderUpdate);
    };
  }, [socket, user?.role, on, off, handleNewOrder, handleOrderUpdate]);

  return {
    isConnected,
    socket
  };
};
