import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { cacheUtils } from '../services/api';
import toast from 'react-hot-toast';

export const useMenuUpdates = (onMenuUpdate) => {
  const { socket, isConnected, on, off } = useWebSocket();

  // Set up event listeners
  useEffect(() => {
    if (!socket || !onMenuUpdate) return;

    const handleDishUpdate = (data) => {
      console.log('🔄 WebSocket: Dish update received, clearing cache...');
      cacheUtils.forceClearDishesCache(); // Clear cache on WebSocket updates
      onMenuUpdate(data);
    };

    const handleMenuUpdate = (data) => {
      console.log('🔄 WebSocket: Menu update received, clearing cache...');
      cacheUtils.forceClearDishesCache(); // Clear cache on WebSocket updates
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
