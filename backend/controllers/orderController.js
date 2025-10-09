const Order = require('../models/Order');
const Dish = require('../models/Dish');

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

    // Generate order number - use timestamp to avoid race conditions
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `VK${timestamp.toString().slice(-6)}${randomSuffix}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      user: req.user.id,
      items: orderItems,
      totalAmount,
      deliveryType,
      deliveryAddress,
      contactPhone,
      specialInstructions
    });

    // Populate the order with dish details
    await order.populate({
      path: 'items.dish',
      select: 'name description price imageUrl'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
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

    // Filter by status if provided
    let query = { user: req.user.id };
    if (req.query.status) {
      query.status = req.query.status;
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

    let order = await Order.findById(req.params.id);

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

    // Set delivery times based on status
    if (status === 'ready') {
      order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    } else if (status === 'completed') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

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
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
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

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder
};
