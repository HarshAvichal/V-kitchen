import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import toast from 'react-hot-toast';

export const useMenuUpdates = (onMenuUpdate) => {
  const { socket, isConnected, on, off } = useWebSocket();

  // Handle dish updates
  const handleDishUpdate = useCallback((data) => {
    
    if (onMenuUpdate) {
      onMenuUpdate(data);
    }
  }, [onMenuUpdate]);

  // Handle menu updates
  const handleMenuUpdate = useCallback((data) => {
    
    if (onMenuUpdate) {
      onMenuUpdate(data);
    }
  }, [onMenuUpdate]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    on('dish-updated', handleDishUpdate);
    on('menu-updated', handleMenuUpdate);

    return () => {
      off('dish-updated', handleDishUpdate);
      off('menu-updated', handleMenuUpdate);
    };
  }, [socket, on, off, handleDishUpdate, handleMenuUpdate]);

  return {
    isConnected,
    socket
  };
};
