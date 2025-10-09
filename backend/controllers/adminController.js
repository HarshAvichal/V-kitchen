const Order = require('../models/Order');
const Dish = require('../models/Dish');
const User = require('../models/User');

// @desc    Get all orders (Admin)
// @route   GET /api/v1/admin/orders
// @access  Private (Admin only)
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filter by status if provided
    let query = {};
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      // For "All Orders" filter, exclude completed and cancelled orders
      query.status = { $nin: ['completed', 'cancelled'] };
    }

    // Filter by date range if provided
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'name email phone'
      })
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

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private (Admin only)
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total orders
    const totalOrders = await Order.countDocuments();

    // Today's orders
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfDay }
    });

    // This week's orders
    const weekOrders = await Order.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    // This month's orders
    const monthOrders = await Order.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Total revenue
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Today's revenue
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          status: { $in: ['completed'] },
          createdAt: { $gte: startOfDay }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Most popular dishes
    const popularDishes = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.dish',
          totalQuantity: { $sum: '$items.quantity' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'dishes',
          localField: '_id',
          foreignField: '_id',
          as: 'dish'
        }
      },
      { $unwind: '$dish' },
      {
        $project: {
          dishName: '$dish.name',
          totalQuantity: 1,
          totalOrders: 1,
          price: '$dish.price'
        }
      }
    ]);

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueByMonth = await Order.aggregate([
      {
        $match: {
          status: { $in: ['completed'] },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          today: todayOrders,
          thisWeek: weekOrders,
          thisMonth: monthOrders,
          byStatus: ordersByStatus
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
          byMonth: revenueByMonth
        },
        popularDishes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/v1/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await User.countDocuments({ role: 'user' });

    const users = await User.find({ role: 'user' })
      .select('-password')
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
      count: users.length,
      total,
      pagination,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status (Admin)
// @route   PUT /api/v1/admin/users/:id/toggle-status
// @access  Private (Admin only)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify admin user status'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Order (Admin only)
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow deletion of completed or cancelled orders
    if (!['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only completed or cancelled orders can be deleted'
      });
    }

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
  getAllOrders,
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  deleteOrder
};
