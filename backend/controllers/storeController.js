const StoreSettings = require('../models/StoreSettings');
const socketService = require('../services/socketService');

// @desc    Get current store status
// @route   GET /api/v1/store/status
// @access  Public
const getStoreStatus = async (req, res, next) => {
  try {
    const status = await StoreSettings.getCurrentStatus();
    
    res.status(200).json({
      success: true,
      data: {
        isOpen: status.isOpen,
        closedMessage: status.closedMessage,
        lastUpdated: status.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get store status (Admin)
// @route   GET /api/v1/admin/store/status
// @access  Private (Admin only)
const getAdminStoreStatus = async (req, res, next) => {
  try {
    const status = await StoreSettings.getCurrentStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle store status (Admin)
// @route   PUT /api/v1/admin/store/toggle
// @access  Private (Admin only)
const toggleStoreStatus = async (req, res, next) => {
  try {
    const { isOpen, closedMessage } = req.body;
    
    // Get current status or create default
    let status = await StoreSettings.findOne().sort({ updatedAt: -1 });
    
    if (!status) {
      // Create new settings
      status = await StoreSettings.create({
        isOpen: isOpen !== undefined ? isOpen : true,
        closedMessage: closedMessage || 'We are currently closed. Please check back later!',
        lastUpdatedBy: req.user.id
      });
    } else {
      // Update existing settings
      if (isOpen !== undefined) {
        status.isOpen = isOpen;
      }
      if (closedMessage) {
        status.closedMessage = closedMessage;
      }
      status.lastUpdatedBy = req.user.id;
      await status.save();
    }
    
    // Get updated status
    const updatedStatus = await StoreSettings.findById(status._id);
    
    // Emit WebSocket event to all users
    socketService.notifyStoreStatusUpdate({
      isOpen: updatedStatus.isOpen,
      closedMessage: updatedStatus.closedMessage
    });
    
    res.status(200).json({
      success: true,
      message: `Store is now ${updatedStatus.isOpen ? 'OPEN' : 'CLOSED'}`,
      data: updatedStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update closed message (Admin)
// @route   PUT /api/v1/admin/store/message
// @access  Private (Admin only)
const updateClosedMessage = async (req, res, next) => {
  try {
    const { closedMessage } = req.body;
    
    if (!closedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Closed message is required'
      });
    }
    
    let status = await StoreSettings.findOne().sort({ updatedAt: -1 });
    
    if (!status) {
      status = await StoreSettings.create({
        isOpen: true,
        closedMessage,
        lastUpdatedBy: req.user.id
      });
    } else {
      status.closedMessage = closedMessage;
      status.lastUpdatedBy = req.user.id;
      await status.save();
    }
    
    // Emit WebSocket event to all users
    socketService.notifyStoreStatusUpdate({
      isOpen: status.isOpen,
      closedMessage: status.closedMessage
    });
    
    res.status(200).json({
      success: true,
      message: 'Closed message updated successfully',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStoreStatus,
  getAdminStoreStatus,
  toggleStoreStatus,
  updateClosedMessage
};

