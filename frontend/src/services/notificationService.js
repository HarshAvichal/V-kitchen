// Desktop notification service
class NotificationService {
  constructor() {
    this.permission = null;
    this.initialize();
  }

  async initialize() {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Request permission
    if (Notification.permission === 'default') {
      this.permission = await Notification.requestPermission();
    } else {
      this.permission = Notification.permission;
    }
  }

  // Show desktop notification
  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/v-logo.svg',
      badge: '/v-logo.svg',
      requireInteraction: true,
      silent: false,
      ...options
    };

    const notification = new Notification(title, defaultOptions);

    // Auto close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  // Show new order notification
  showNewOrderNotification(order) {
    const title = `🍽️ New Order #${order.orderNumber}`;
    const body = `${order.user?.name || 'Customer'} placed an order for $${order.totalAmount.toFixed(2)}`;
    
    return this.showNotification(title, {
      body,
      tag: `order-${order._id}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        type: 'new-order'
      }
    });
  }

  // Show order status update notification
  showOrderUpdateNotification(order, status) {
    const statusMessages = {
      'preparing': '🍳 Order is being prepared',
      'ready': '📦 Order is ready for pickup',
      'completed': '✅ Order completed',
      'cancelled': '❌ Order cancelled'
    };

    const title = `Order #${order.orderNumber} Update`;
    const body = statusMessages[status] || `Order status changed to ${status}`;
    
    return this.showNotification(title, {
      body,
      tag: `order-update-${order._id}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        type: 'order-update'
      }
    });
  }

  // Check if notifications are supported and enabled
  isSupported() {
    return 'Notification' in window && this.permission === 'granted';
  }

  // Get permission status
  getPermissionStatus() {
    return this.permission;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
