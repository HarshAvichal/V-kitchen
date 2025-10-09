require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Dish = require('../models/Dish');

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
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.paymentMethod = 'stripe';
      order.paymentIntentId = paymentIntent.id;
      order.status = 'preparing'; // Changed from 'confirmed' to 'preparing'
      
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
      
      console.log(`Order ${orderId} payment successful`);
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
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();
      
      console.log(`Order ${orderId} payment failed`);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
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

// Update Payment Status (for direct frontend updates)
const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId, status } = req.body;
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

    // Update order status based on payment status
    if (status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.paymentMethod = 'stripe';
      order.paymentIntentId = paymentIntentId;
      order.status = 'preparing'; // Changed from 'confirmed' to 'preparing'
      
      // Extract specific payment method details from Stripe
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
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
    } else if (status === 'requires_payment_method') {
      order.paymentStatus = 'pending';
      order.paymentMethod = 'stripe';
      order.paymentIntentId = paymentIntentId;
    } else {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
    }

    await order.save();

    res.json({
      success: true,
      data: {
        order: {
          id: order._id,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          status: order.status
        }
      }
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
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
  handleWebhook,
  processRefund,
  getPaymentDetails,
  updatePaymentStatus
};
