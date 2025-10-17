import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import toast from 'react-hot-toast';

export const useMenuUpdates = (onMenuUpdate) => {
  const { socket, isConnected, on, off } = useWebSocket();

  // Set up event listeners
  useEffect(() => {
    if (!socket || !onMenuUpdate) return;

    const handleDishUpdate = (data) => {
      onMenuUpdate(data);
    };

    const handleMenuUpdate = (data) => {
      onMenuUpdate(data);
    };

    on('dish-updated', handleDishUpdate);
    on('menu-updated', handleMenuUpdate);

    return () => {
      off('dish-updated', handleDishUpdate);
      off('menu-updated', handleMenuUpdate);
    };
  }, [socket, on, off, onMenuUpdate]);

  return {
    isConnected,
    socket
  };
};
