const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'order-placed',
      'kitchen-started',
      'ready-pickup',
      'ready-delivery',
      'out-for-delivery',
      'delivered',
      'cancelled',
      'payment-success',
      'payment-failed',
      'refund-requested',
      'refund-processed',
      'refund-issued',
      'order-updated',
      'system-alert'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderNumber: String,
    totalAmount: Number,
    status: String,
    paymentStatus: String,
    estimatedTime: Number, // in minutes
    deliveryAddress: String,
    restaurantName: String,
    driverName: String,
    driverPhone: String,
    // Additional data for different notification types
    additionalData: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for id (convert _id to id)
notificationSchema.virtual('id').get(function() {
  return this._id ? this._id.toHexString() : null;
});

// Ensure virtual fields are included in JSON output
notificationSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    read = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = { userId };
  
  if (type) query.type = type;
  if (read !== null) query.read = read;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('data.orderId', 'orderNumber totalAmount status paymentStatus'),
    this.countDocuments(query)
  ]);

  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      userId: userId 
    },
    { 
      read: true,
      readAt: new Date()
    }
  );
};

// Static method to mark all user notifications as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { 
      read: true,
      readAt: new Date()
    }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Static method to clean up old notifications
notificationSchema.statics.cleanupOldNotifications = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
};

module.exports = mongoose.model('Notification', notificationSchema);
