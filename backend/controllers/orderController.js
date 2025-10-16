const Order = require('../models/Order');
const Dish = require('../models/Dish');
const { createOrderTimelineNotification } = require('./notificationController');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { items, deliveryType, deliveryAddress, contactPhone, specialInstructions } = req.body;

    // Validate and calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const dish = await Dish.findById(item.dish);
      
      if (!dish) {
        return res.status(400).json({
          success: false,
          message: `Dish with ID ${item.dish} not found`
        });
      }

      if (!dish.availability) {
        return res.status(400).json({
          success: false,
          message: `Dish "${dish.name}" is currently not available`
        });
      }

      const itemTotal = dish.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        dish: dish._id,
        quantity: item.quantity,
        price: dish.price
      });
    }

    // Generate unique order number
    let orderNumber;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      const totalOrders = await Order.countDocuments();
      orderNumber = `VK${(totalOrders + 1 + attempts).toString().padStart(3, '0')}`;
      attempts++;
      
      // Check if this order number already exists
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) break;
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique order number');
      }
    } while (true);

    // Create order with pending status (will be updated to 'placed' after payment)
    const order = await Order.create({
      orderNumber,
      user: req.user.id,
      items: orderItems,
      totalAmount,
      deliveryType,
      deliveryAddress,
      contactPhone,
      specialInstructions,
      status: 'pending' // Will be updated to 'placed' after payment success
    });

    // Populate the order with dish details
    await order.populate({
      path: 'items.dish',
      select: 'name description price imageUrl'
    });

    // Don't create notifications for pending orders - only after payment success

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status after payment success
// @route   PUT /api/v1/orders/:id/confirm-payment
// @access  Private
const confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('user');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    try {
      // Update order status to placed and payment status to paid FIRST
      order.status = 'placed';
      order.paymentStatus = 'paid';
      order.paymentMethod = 'stripe';
      
      // Set status timestamp for placed
      const now = new Date();
      if (order.statusTimestamps) {
        order.statusTimestamps.placed = now;
      } else {
        order.statusTimestamps = { placed: now };
      }
      
      await order.save();
      
      // Send real-time WebSocket notifications AFTER status update
      const socketService = require('../services/socketService');
      socketService.notifyOrderPlaced(order._id, order);
      
      // Send email notification to admin
      try {
        // Ensure order is populated with dish details before sending email
        const populatedOrder = await Order.findById(order._id).populate({
          path: 'items.dish',
          select: 'name description price imageUrl'
        }).populate('user', 'name email phone');
        
        const { sendOrderNotification } = require('./newsletterController');
        await sendOrderNotification(populatedOrder);
      } catch (emailError) {
        console.error('Error sending order email notification:', emailError);
        // Don't fail the order update if email fails
      }
      
      // Create order placed notification (order is now visible to admin)
      try {
        await createOrderTimelineNotification(order._id, 'order-placed');
      } catch (notificationError) {
        console.error('Error creating order placed notification:', notificationError);
        // Don't fail the order update if notification fails
      }
      
      // Create payment success notification
      try {
        const { createPaymentNotification } = require('./notificationController');
        await createPaymentNotification(order._id, 'payment-success');
      } catch (notificationError) {
        console.error('Error creating payment success notification:', notificationError);
        // Don't fail the order update if notification fails
      }
      
    } catch (error) {
      console.error('❌ Error in confirmPayment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order payment confirmed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/v1/orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filter by status if provided and exclude soft-deleted orders
    let query = { 
      user: req.user.id,
      isDeletedByCustomer: { $ne: true } // Exclude orders deleted by customer
    };
    
    if (req.query.status) {
      // Map frontend status values to backend status values
      const statusMapping = {
        'placed': ['placed'],                // Order Placed - only placed status
        'preparing': ['preparing'],          // Preparing
        'ready': ['ready'],                  // Out for Delivery  
        'completed': ['completed'],          // Delivered
        'cancelled': ['cancelled']           // Cancelled
      };
      
      const statusFilter = statusMapping[req.query.status];
      if (statusFilter) {
        if (statusFilter.length === 1) {
          query.status = statusFilter[0];
        } else {
          query.status = { $in: statusFilter };
        }
      } else {
        // Fallback to exact match for any other status values
        query.status = req.query.status;
      }
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Date filtering - single date
    if (req.query.date) {
      // Create date boundaries in local timezone to avoid UTC conversion issues
      // The date comes from the frontend in YYYY-MM-DD format
      const selectedDate = new Date(req.query.date + 'T00:00:00');
      
      // Create start and end of day in local timezone
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate({
        path: 'items.dish',
        select: 'name description price imageUrl'
      })
      .sort('-createdAt')
      .limit(limit)
      .skip(startIndex);

    // Pagination result
    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'items.dish',
      select: 'name description price imageUrl'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Admin only)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    let order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }


    // Prevent admins from cancelling orders - only customers can cancel
    if (status === 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot cancel orders. Only customers can cancel their own orders.'
      });
    }

    // Update order
    order.status = status;
    if (notes) {
      order.notes = notes;
    }

    // Set status timestamp
    const now = new Date();
    if (order.statusTimestamps) {
      order.statusTimestamps[status] = now;
    } else {
      order.statusTimestamps = { [status]: now };
    }

    // Set delivery times based on status
    if (status === 'ready') {
      order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    } else if (status === 'completed') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Send WebSocket notification for real-time updates
    const socketService = require('../services/socketService');
    socketService.notifyOrderStatusUpdate(order._id, order);

    // Send email notification to customer for status updates (ready and completed)
    if (status === 'ready' || status === 'completed') {
      try {
        // Ensure order is populated with user details before sending email
        const populatedOrder = await Order.findById(order._id).populate('user', 'name email phone');
        
        const { sendOrderStatusUpdateNotification } = require('./newsletterController');
        await sendOrderStatusUpdateNotification(populatedOrder, status);
      } catch (emailError) {
        console.error('Error sending order status update email notification:', emailError);
        // Don't fail the status update if email fails
      }
    }

    // Create order timeline notification based on status
    try {
      let notificationType = null;
      let additionalData = {};


      switch (status) {
        case 'preparing':
          notificationType = 'kitchen-started';
          break;
        case 'ready':
          // Check delivery type to send appropriate notification
          if (order.deliveryType === 'pickup') {
            notificationType = 'ready-pickup';
            additionalData = { estimatedTime: 30 }; // 30 minutes ETA for pickup
          } else if (order.deliveryType === 'delivery') {
            notificationType = 'ready-delivery';
            additionalData = { 
              driverName: 'Delivery Driver', // You can enhance this with real driver data
              estimatedTime: 45 // 45 minutes ETA for delivery
            };
          } else {
            // Fallback to pickup for backward compatibility
            notificationType = 'ready-pickup';
            additionalData = { estimatedTime: 30 };
          }
          break;
        case 'out-for-delivery':
          notificationType = 'out-for-delivery';
          additionalData = { driverName: 'Delivery Driver' }; // You can enhance this with real driver data
          break;
        case 'completed':
          notificationType = 'delivered';
          break;
        case 'cancelled':
          notificationType = 'cancelled';
          additionalData = { reason: notes || 'Order cancelled' };
          break;
      }

      if (notificationType) {
        await createOrderTimelineNotification(order._id, notificationType, additionalData);
      }
    } catch (notificationError) {
      console.error('Error creating order status notification:', notificationError);
      // Don't fail the status update if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    // Compare user IDs (order.user is populated, so use _id)
    if (order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }

    order.status = 'cancelled';
    
    // Set status timestamp for cancelled
    const now = new Date();
    if (order.statusTimestamps) {
      order.statusTimestamps.cancelled = now;
    } else {
      order.statusTimestamps = { cancelled: now };
    }
    
    // Process automatic refund if order was paid
    let refundResult = null;
    if (order.paymentStatus === 'paid') {
      if (order.paymentIntentId) {
        // Real Stripe payment - process actual refund
        try {
          const refund = await stripe.refunds.create({
            payment_intent: order.paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              orderId: order._id.toString(),
              cancelledBy: 'customer'
            }
          });
          
          order.paymentStatus = 'refunded';
          order.refundId = refund.id;
          order.refundReason = 'Order cancelled by customer';
          order.refundRequestedAt = new Date();
          
          refundResult = {
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          };
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          // Don't fail the cancellation if refund fails
          // Admin can process refund manually later
        }
      } else {
        // Simulated payment - mark as refunded without Stripe call
        order.paymentStatus = 'refunded';
        order.refundId = `simulated_refund_${Date.now()}`;
        order.refundReason = 'Order cancelled by customer (simulated payment)';
        order.refundRequestedAt = new Date();
        
        refundResult = {
          refundId: order.refundId,
          amount: order.totalAmount,
          status: 'succeeded'
        };
      }
    }
    
    await order.save();
    
    // Send email notification to admin about order cancellation
    try {
      // Ensure order is populated with dish details before sending email
      const populatedOrder = await Order.findById(order._id).populate({
        path: 'items.dish',
        select: 'name description price imageUrl'
      }).populate('user', 'name email phone');
      
      const { sendOrderCancellationNotification } = require('./newsletterController');
      await sendOrderCancellationNotification(populatedOrder);
    } catch (emailError) {
      console.error('Error sending order cancellation email notification:', emailError);
      // Don't fail the cancellation if email fails
    }
    
    // Create notification for order cancellation
    const Notification = require('../models/Notification');
    const notification = await Notification.createNotification({
      userId: order.user._id,
      type: 'cancelled',
      title: 'Order Cancelled',
      message: `Your order #${order.orderNumber} has been cancelled successfully.${refundResult ? ` A refund of $${refundResult.amount} will be processed within 3-5 business days.` : ''}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: 'cancelled',
        paymentStatus: order.paymentStatus,
        refundId: refundResult?.refundId
      }
    });

    // Create refund-issued notification if refund was processed
    let refundIssuedNotification = null;
    if (refundResult) {
      refundIssuedNotification = await Notification.createNotification({
        userId: order.user._id,
        type: 'refund-issued',
        title: 'Refund Issued',
        message: `Your refund of $${refundResult.amount} for order #${order.orderNumber} has been issued and will be credited to your account within 3-5 business days.`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: 'cancelled',
          paymentStatus: 'refunded',
          refundId: refundResult.refundId,
          refundAmount: refundResult.amount,
          refundStatus: refundResult.status
        }
      });
    }
    
    // Trigger WebSocket notification for real-time updates
    const socketService = require('../services/socketService');
    socketService.notifyOrderStatusUpdate(order._id, order);
    
    // Send new notification to user
    socketService.sendNewNotification(order.user._id, notification);
    
    // Send refund-issued notification if refund was processed
    if (refundIssuedNotification) {
      socketService.sendNewNotification(order.user._id, refundIssuedNotification);
    }
    
    // Update unread count
    const unreadCount = await Notification.getUnreadCount(order.user._id);
    socketService.sendUnreadCountUpdate(order.user._id, unreadCount);
    
    // Send refund notification if refund was processed
    if (refundResult) {
      socketService.sendRefundNotification(order.user._id, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        status: refundResult.status
      });
    }
    

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        ...order.toObject(),
        refundResult
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete order (hide from customer view only)
// @route   DELETE /api/v1/orders/:id
// @access  Private
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this order'
      });
    }

    // Check if order can be deleted (only allow deletion of cancelled or completed orders)
    if (!['cancelled', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled or completed orders can be deleted'
      });
    }

    // Soft delete: mark as deleted by customer (admin can still see it)
    await Order.findByIdAndUpdate(req.params.id, {
      isDeletedByCustomer: true,
      deletedByCustomerAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Order removed from your order history'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate payment success (Development only)
// @route   POST /api/v1/orders/:id/simulate-payment
// @access  Private
const simulatePayment = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Update order status to simulate successful payment
    order.paymentStatus = 'paid';
    order.status = 'preparing';
    order.paymentMethod = 'card';
    order.paymentIntentId = `pi_simulated_${Date.now()}`;
    
    await order.save();

    // Send WebSocket notification
    const socketService = require('../services/socketService');
    socketService.notifyPaymentSuccess(orderId, order);

    res.json({
      success: true,
      message: 'Payment simulation successful',
      data: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate payment'
    });
  }
};

module.exports = {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  simulatePayment
};
