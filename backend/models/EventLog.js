const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  stripeEventId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    required: true 
  },
  processed: { 
    type: Boolean, 
    default: true 
  },
  processedAt: { 
    type: Date, 
    default: Date.now 
  },
  retryCount: { 
    type: Number, 
    default: 0 
  },
  error: { 
    type: String 
  },
  metadata: {
    orderId: String,
    userId: String,
    amount: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
eventLogSchema.index({ stripeEventId: 1 });
eventLogSchema.index({ type: 1, processed: 1 });
eventLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EventLog', eventLogSchema);
