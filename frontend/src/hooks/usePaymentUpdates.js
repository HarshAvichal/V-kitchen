import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const usePaymentUpdates = (orderId, onPaymentSuccess, onPaymentError) => {
  const { socket, isConnected, emit, on, off } = useWebSocket();
  const navigate = useNavigate();

  // Join payment room when orderId is available
  useEffect(() => {
    if (socket && isConnected && orderId) {
      emit('join-payment-room', orderId);
    }
  }, [socket, isConnected, orderId, emit]);

  // Leave payment room when component unmounts or orderId changes
  useEffect(() => {
    return () => {
      if (socket && orderId) {
        emit('leave-payment-room', orderId);
      }
    };
  }, [socket, orderId, emit]);

  // Handle payment success
  const handlePaymentSuccess = useCallback((data) => {
    
    if (onPaymentSuccess) {
      onPaymentSuccess(data);
    }
    
    // Navigate to order detail page
    navigate(`/order/${data.orderId}`);
  }, [onPaymentSuccess, navigate]);

  // Handle payment failure
  const handlePaymentFailed = useCallback((data) => {
    
    if (onPaymentError) {
      onPaymentError(data);
    }
  }, [onPaymentError]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    on('payment-success', handlePaymentSuccess);
    on('payment-failed', handlePaymentFailed);

    return () => {
      off('payment-success', handlePaymentSuccess);
      off('payment-failed', handlePaymentFailed);
    };
  }, [socket, on, off, handlePaymentSuccess, handlePaymentFailed]);

  return {
    isConnected,
    socket
  };
};
