import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Bell } from 'lucide-react';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    unreadCount
  } = useNotifications();

  // Handle bell click - directly navigate to notifications page
  const handleBellClick = () => {
    navigate('/notifications');
  };

  return (
    <button
      onClick={handleBellClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full hover:bg-gray-100 transition-colors"
      title="View notifications"
    >
      <Bell className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationCenter;
