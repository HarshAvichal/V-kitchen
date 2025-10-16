const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(server) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://vkitchen.vercel.app',
      process.env.FRONTEND_URL,
      process.env.VITE_FRONTEND_URL
    ].filter(Boolean);

    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          // In production, allow any Vercel domain
          if (process.env.NODE_ENV === 'production' && origin.includes('vercel.app')) {
            return callback(null, true);
          }

          const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    return this.io;
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userName = user.name;
        
        // Store user connection
        this.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          role: user.role,
          name: user.name,
          connectedAt: new Date()
        });

        next();
      } catch (err) {
        console.error('WebSocket authentication error:', err.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      
      // Join user to their personal room
      socket.join(`user-${socket.userId}`);
      
      // Join admin to admin room
      if (socket.userRole === 'admin') {
        socket.join('admin-room');
      }

      // Handle joining payment room
      socket.on('join-payment-room', (orderId) => {
        socket.join(`payment-${orderId}`);
      });

      // Handle leaving payment room
      socket.on('leave-payment-room', (orderId) => {
        socket.leave(`payment-${orderId}`);
      });

      // Handle joining order tracking room
      socket.on('join-order-room', (orderId) => {
        socket.join(`order-${orderId}`);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Payment success notification
  notifyPaymentSuccess(orderId, orderData) {
    
    // Notify customer
    this.io.to(`payment-${orderId}`).emit('payment-success', {
      type: 'payment-success',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      paymentStatus: 'paid',
      status: 'preparing',
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethodType,
      timestamp: new Date().toISOString()
    });

    // Notify admin
    this.io.to('admin-room').emit('new-paid-order', {
      type: 'new-paid-order',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      customerName: orderData.user?.name || 'Unknown',
      customerEmail: orderData.user?.email || 'Unknown',
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethodType,
      timestamp: new Date().toISOString()
    });
  }

  // Payment failure notification
  notifyPaymentFailure(orderId, orderData, error) {
    
    this.io.to(`payment-${orderId}`).emit('payment-failed', {
      type: 'payment-failed',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      paymentStatus: 'failed',
      status: 'cancelled',
      error: error || 'Payment could not be processed',
      timestamp: new Date().toISOString()
    });
  }

  // Order placed notification (new order created and visible to admin)
  notifyOrderPlaced(orderId, orderData) {
    
    // Notify customer
    this.io.to(`order-${orderId}`).emit('order-placed', {
      type: 'order-placed',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      statusTimestamps: orderData.statusTimestamps,
      totalAmount: orderData.totalAmount,
      timestamp: new Date().toISOString()
    });

    // Notify admin with full order data
    this.io.to('admin-room').emit('new-order', orderData);
  }

  // Order status update notification
  notifyOrderStatusUpdate(orderId, orderData) {
    
    // Notify customer
    this.io.to(`order-${orderId}`).emit('order-status-updated', {
      type: 'order-status-updated',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      statusTimestamps: orderData.statusTimestamps,
      timestamp: new Date().toISOString()
    });

    // Notify admin
    this.io.to('admin-room').emit('order-status-updated', {
      type: 'order-status-updated',
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
      customerName: orderData.user?.name || 'Unknown',
      statusTimestamps: orderData.statusTimestamps,
      timestamp: new Date().toISOString()
    });
    
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected admins
  getConnectedAdmins() {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.role === 'admin');
  }

  // Broadcast to all users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  // Send notification to user
  sendNotification(userId, notification) {
    this.sendToUser(userId, 'notification-created', notification);
  }

  // Send notification to multiple users
  sendNotificationToUsers(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  // Send notification to all connected users
  broadcastNotification(notification) {
    this.broadcastToAll('notification-created', notification);
  }

  // Send notification update to user (mark as read, delete, etc.)
  sendNotificationUpdate(userId, updateType, data) {
    this.sendToUser(userId, 'notification-updated', {
      type: updateType,
      ...data
    });
  }

  // Send refund notification to user
  sendRefundNotification(userId, refundData) {
    this.sendToUser(userId, 'refund-processed', refundData);
  }

  // Send refund request notification to admin
  sendRefundRequestToAdmin(refundData) {
    this.sendToAdmin('refund-requested', refundData);
  }

  // Send unread count update to user
  sendUnreadCountUpdate(userId, unreadCount) {
    this.sendToUser(userId, 'unread-count-updated', {
      unreadCount
    });
  }

  // Send new notification to user
  sendNewNotification(userId, notification) {
    this.sendToUser(userId, 'notification-created', notification);
  }

  // Notify all users about dish updates
  notifyDishUpdate(dishData, action) {
    
    // Broadcast to all connected users
    this.broadcastToAll('dish-updated', {
      type: 'dish-updated',
      action: action, // 'created', 'updated', 'deleted'
      dish: dishData,
      timestamp: new Date().toISOString()
    });
  }

  // Notify all users about menu changes
  notifyMenuUpdate(updateType, data) {
    
    this.broadcastToAll('menu-updated', {
      type: 'menu-updated',
      updateType: updateType, // 'dish-added', 'dish-updated', 'dish-deleted', 'dish-availability-changed'
      data: data,
      timestamp: new Date().toISOString()
    });
  }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
