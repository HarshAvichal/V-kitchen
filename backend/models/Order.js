const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dish',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  deliveryType: {
    type: String,
    required: [true, 'Please specify delivery type'],
    enum: ['pickup', 'delivery'],
    lowercase: true
  },
  deliveryAddress: {
    street: {
      type: String,
      required: function() {
        return this.deliveryType === 'delivery';
      }
    },
    city: {
      type: String,
      required: function() {
        return this.deliveryType === 'delivery';
      }
    },
    state: {
      type: String,
      required: function() {
        return this.deliveryType === 'delivery';
      }
    },
    zipCode: {
      type: String,
      required: function() {
        return this.deliveryType === 'delivery';
      }
    },
    landmark: String,
    instructions: String
  },
  contactPhone: {
    type: String,
    required: [true, 'Please add contact phone number'],
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please add a valid phone number'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending',
    lowercase: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    lowercase: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet', 'stripe'],
    default: 'cash',
    lowercase: true
  },
  // Specific payment method details for better customer display
  paymentMethodType: {
    type: String,
    lowercase: true
  },
  cardBrand: {
    type: String,
    lowercase: true
  },
  walletType: {
    type: String,
    lowercase: true
  },
  paymentIntentId: {
    type: String,
    sparse: true // Allows multiple null values
  },
  refundId: {
    type: String,
    sparse: true
  },
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot be more than 500 characters']
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `VK${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Create indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
