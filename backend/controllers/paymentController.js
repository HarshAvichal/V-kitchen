require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const EventLog = require('../models/EventLog');
const socketService = require('../services/socketService');
const { createPaymentNotification } = require('./notificationController');

// Create Payment Intent
const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Find the order
    const order = await Order.findById(orderId).populate('items.dish');
    
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

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }


    // Calculate total amount (in cents for Stripe)
    const totalAmount = Math.round(order.totalAmount * 100);


    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      metadata: {
        orderId: orderId,
        userId: userId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment intent ID
    order.paymentIntentId = paymentIntent.id;
    await order.save();

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Create Payment Intent for Order Data (before order creation)
const createPaymentIntentForOrder = async (req, res) => {
  try {
    const { orderData } = req.body;
    const userId = req.user.id;

    // Validate and calculate total amount
    let totalAmount = 0;
    const Dish = require('../models/Dish');

    for (const item of orderData.items) {
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
    }

    // Calculate total amount (in cents for Stripe)
    const totalAmountCents = Math.round(totalAmount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      metadata: {
        userId: userId,
        orderData: JSON.stringify(orderData)
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totalAmount: totalAmount
      }
    });
  } catch (error) {
    console.error('Error creating payment intent for order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Handle Stripe Webhook
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Check for duplicate events (idempotency)
    const existingEvent = await EventLog.findOne({ stripeEventId: event.id });
    
    if (existingEvent) {
      return res.json({ received: true, message: 'Event already processed' });
    }

    // Log the event
    const eventLog = new EventLog({
      stripeEventId: event.id,
      type: event.type,
      metadata: {
        orderId: event.data.object.metadata?.orderId,
        userId: event.data.object.metadata?.userId,
        amount: event.data.object.amount
      }
    });

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
    }

    // Mark event as processed
    eventLog.processed = true;
    await eventLog.save();

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    
    // Log failed event
    try {
      await EventLog.create({
        stripeEventId: event.id,
        type: event.type,
        processed: false,
        error: error.message,
        metadata: {
          orderId: event.data.object.metadata?.orderId,
          userId: event.data.object.metadata?.userId,
          amount: event.data.object.amount
        }
      });
    } catch (logError) {
      console.error('Error logging failed event:', logError);
    }
    
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    const orderData = paymentIntent.metadata.orderData;
    
    let order;
    
    if (orderId) {
      // Existing order - update status
      order = await Order.findById(orderId).populate('user');
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentMethod = 'stripe';
        order.paymentIntentId = paymentIntent.id;
        order.status = 'placed'; // Order is now placed and visible to admin
        
        // Extract specific payment method details from Stripe
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
          
          // Set payment method type and details
          if (paymentMethod.type === 'card') {
            order.paymentMethodType = 'card';
            order.cardBrand = paymentMethod.card.brand; // visa, mastercard, amex, etc.
          } else if (paymentMethod.type === 'wallet') {
            order.paymentMethodType = 'wallet';
            order.walletType = paymentMethod.wallet.type; // apple_pay, google_pay, etc.
          } else {
            order.paymentMethodType = paymentMethod.type;
          }
        } catch (stripeError) {
          console.error('Error fetching payment method details from Stripe:', stripeError);
          // Continue without failing the payment update
        }
        
        await order.save();
      }
    } else if (orderData) {
      // Create new order from payment metadata
      const parsedOrderData = JSON.parse(orderData);
      const userId = paymentIntent.metadata.userId;
      
      // Validate and calculate total amount
      let totalAmount = 0;
      const Dish = require('../models/Dish');
      const orderItems = [];

      for (const item of parsedOrderData.items) {
        const dish = await Dish.findById(item.dish);
        
        if (!dish) {
          console.error(`Dish with ID ${item.dish} not found`);
          continue;
        }

        if (!dish.availability) {
          console.error(`Dish "${dish.name}" is not available`);
          continue;
        }

        const itemTotal = dish.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          dish: dish._id,
          quantity: item.quantity,
          price: dish.price
        });
      }

      // Generate order number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `VK${timestamp.toString().slice(-6)}${randomSuffix}`;

      // Create order
      order = await Order.create({
        orderNumber,
        user: userId,
        items: orderItems,
        totalAmount,
        deliveryType: parsedOrderData.deliveryType,
        deliveryAddress: parsedOrderData.deliveryAddress,
        contactPhone: parsedOrderData.contactPhone,
        specialInstructions: parsedOrderData.specialInstructions,
        status: 'placed', // Order is placed and visible to admin
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        paymentIntentId: paymentIntent.id
      });

      // Populate the order with dish details
      await order.populate({
        path: 'items.dish',
        select: 'name description price imageUrl'
      });
      
      await order.populate('user');
    }
    
    if (order) {
      // 🚀 Send real-time WebSocket notifications
      socketService.notifyPaymentSuccess(order._id, order);
      
      // Create order placed notification (order is now visible to admin)
      try {
        const { createOrderTimelineNotification } = require('./notificationController');
        await createOrderTimelineNotification(order._id, 'order-placed');
      } catch (notificationError) {
        console.error('Error creating order placed notification:', notificationError);
        // Don't fail the payment if notification fails
      }
      
      // Create payment success notification
      try {
        await createPaymentNotification(order._id, 'payment-success');
      } catch (notificationError) {
        console.error('Error creating payment success notification:', notificationError);
        // Don't fail the payment if notification fails
      }
      
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    // Update order status
    const order = await Order.findById(orderId).populate('user');
    if (order) {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();
      
      // 🚀 Send real-time WebSocket notifications
      socketService.notifyPaymentFailure(orderId, order, 'Payment could not be processed');
      
      // Create payment failure notification
      try {
        await createPaymentNotification(orderId, 'payment-failed');
      } catch (notificationError) {
        console.error('Error creating payment failure notification:', notificationError);
        // Don't fail the payment if notification fails
      }
      
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Handle canceled payment
const handlePaymentCanceled = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    // Update order status
    const order = await Order.findById(orderId).populate('user');
    if (order) {
      order.paymentStatus = 'canceled';
      order.status = 'cancelled';
      await order.save();
      
      // 🚀 Send real-time WebSocket notifications
      socketService.notifyPaymentFailure(orderId, order, 'Payment was canceled');
      
    }
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
};

// Customer Refund Request
const requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.id;

    // Find the order
    const order = await Order.findById(orderId).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request refund for this order'
      });
    }

    // Check if order is paid
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is not paid, cannot request refund'
      });
    }

    // Check if already refunded
    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order is already refunded'
      });
    }

    // Check if refund already requested
    if (order.refundRequested) {
      return res.status(400).json({
        success: false,
        message: 'Refund already requested for this order'
      });
    }

    // Update order with refund request
    order.refundRequested = true;
    order.refundReason = reason;
    order.refundRequestedAt = new Date();
    await order.save();

    // Create notification for refund request
    const Notification = require('../models/Notification');
    const notification = await Notification.createNotification({
      userId: order.user._id,
      type: 'refund-requested',
      title: 'Refund Request Submitted',
      message: `Your refund request for order #${order.orderNumber} has been submitted successfully. We'll review it and get back to you within 24 hours.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundReason: reason,
        refundRequestedAt: order.refundRequestedAt
      }
    });

    // Send WebSocket notification to admin
    const socketService = require('../services/socketService');
    socketService.sendRefundRequestToAdmin({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      amount: order.totalAmount,
      reason: reason,
      requestedAt: order.refundRequestedAt
    });

    // Send new notification to user
    socketService.sendNewNotification(order.user._id, notification);
    
    // Update unread count
    const unreadCount = await Notification.getUnreadCount(order.user._id);
    socketService.sendUnreadCountUpdate(order.user._id, unreadCount);

    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: {
        orderId: order._id,
        refundRequestedAt: order.refundRequestedAt,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: error.message
    });
  }
};

// Process Refund
const processRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const adminId = req.user.id;

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is paid
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is not paid, cannot refund'
      });
    }

    // Check if already refunded
    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order is already refunded'
      });
    }

    // Create refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      reason: reason || 'requested_by_customer',
      metadata: {
        orderId: orderId,
        adminId: adminId
      }
    });

    // Update order status
    order.paymentStatus = 'refunded';
    order.status = 'cancelled';
    order.refundId = refund.id;
    await order.save();

    // Create notification for refund processed
    const Notification = require('../models/Notification');
    const notification = await Notification.createNotification({
      userId: order.user._id,
      type: 'refund-processed',
      title: 'Refund Processed Successfully',
      message: `Your refund of $${(refund.amount / 100).toFixed(2)} for order #${order.orderNumber} has been processed successfully. The amount will be credited to your original payment method within 3-5 business days.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: 'cancelled',
        paymentStatus: 'refunded',
        refundId: refund.id,
        refundAmount: refund.amount / 100,
        refundStatus: refund.status
      }
    });

    // Send WebSocket notification to user
    const socketService = require('../services/socketService');
    socketService.sendRefundNotification(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    });

    // Send new notification to user
    socketService.sendNewNotification(order.user._id, notification);

    // Create additional "refund-issued" notification
    const refundIssuedNotification = await Notification.createNotification({
      userId: order.user._id,
      type: 'refund-issued',
      title: 'Refund Issued',
      message: `Your refund of $${(refund.amount / 100).toFixed(2)} for order #${order.orderNumber} has been issued and will be credited to your account within 3-5 business days.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: 'cancelled',
        paymentStatus: 'refunded',
        refundId: refund.id,
        refundAmount: refund.amount / 100,
        refundStatus: refund.status
      }
    });

    // Send refund-issued notification to user
    socketService.sendNewNotification(order.user._id, refundIssuedNotification);
    
    // Update unread count
    const unreadCount = await Notification.getUnreadCount(order.user._id);
    socketService.sendUnreadCountUpdate(order.user._id, unreadCount);

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Verify Payment Status (secure server-side verification)
const verifyPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
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

    // If no payment intent, return pending status
    if (!order.paymentIntentId) {
      return res.json({
        success: true,
        data: {
          paymentStatus: 'pending',
          status: order.status
        }
      });
    }

    // Verify with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      
      // Update local status if different from Stripe
      if (paymentIntent.status === 'succeeded' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'preparing';
        await order.save();
        
        // Notify via WebSocket
        socketService.notifyPaymentSuccess(orderId, order);
      } else if (paymentIntent.status === 'requires_payment_method' && order.paymentStatus !== 'pending') {
        order.paymentStatus = 'pending';
        await order.save();
      }

      res.json({
        success: true,
        data: {
          paymentStatus: order.paymentStatus,
          status: order.status,
          stripeStatus: paymentIntent.status
        }
      });
    } catch (stripeError) {
      console.error('Error verifying payment with Stripe:', stripeError);
      res.json({
        success: true,
        data: {
          paymentStatus: order.paymentStatus,
          status: order.status,
          stripeStatus: 'unknown'
        }
      });
    }

  } catch (error) {
    console.error('Error verifying payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment status',
      error: error.message
    });
  }
};

// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user or user is admin
    if (order.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment details'
      });
    }

    let paymentDetails = null;
    
    // Get payment details from Stripe if payment intent exists
    if (order.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        paymentDetails = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          created: paymentIntent.created,
          paymentMethod: paymentIntent.payment_method
        };
      } catch (stripeError) {
        console.error('Error fetching payment details from Stripe:', stripeError);
      }
    }

    res.json({
      success: true,
      data: {
        order: {
          id: order._id,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          refundId: order.refundId
        },
        payment: paymentDetails
      }
    });

  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: error.message
    });
  }
};


module.exports = {
  createPaymentIntent,
  createPaymentIntentForOrder,
  handleWebhook,
  requestRefund,
  processRefund,
  getPaymentDetails,
  verifyPaymentStatus,
  handlePaymentSuccess,
  handlePaymentFailed,
  handlePaymentCanceled
};
