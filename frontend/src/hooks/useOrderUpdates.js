import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import toast from 'react-hot-toast';

export const useOrderUpdates = (orderId, onOrderUpdate) => {
  const { socket, isConnected, emit, on, off } = useWebSocket();

  // Join order room when orderId is available
  useEffect(() => {
    if (socket && isConnected && orderId) {
      emit('join-order-room', orderId);
    }
  }, [socket, isConnected, orderId, emit]);

  // Leave order room when component unmounts or orderId changes
  useEffect(() => {
    return () => {
      if (socket && orderId) {
        emit('leave-order-room', orderId);
      }
    };
  }, [socket, orderId, emit]);

  // Handle order status updates
  const handleOrderStatusUpdate = useCallback((data) => {
    
    // Toast notifications are handled by the notification system
    if (onOrderUpdate) {
      onOrderUpdate(data);
    }
  }, [onOrderUpdate]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    on('order-status-updated', handleOrderStatusUpdate);

    return () => {
      off('order-status-updated', handleOrderStatusUpdate);
    };
  }, [socket, on, off, handleOrderStatusUpdate]);

  return {
    isConnected,
    socket
  };
};
