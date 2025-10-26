const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  isOpen: {
    type: Boolean,
    default: true,
    required: true
  },
  closedMessage: {
    type: String,
    default: 'We are currently closed. Please check back later!',
    maxlength: [500, 'Closed message cannot be more than 500 characters']
  },
  lastUpdatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
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
storeSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get current store status
storeSettingsSchema.statics.getCurrentStatus = async function() {
  const settings = await this.findOne().sort({ updatedAt: -1 });
  if (!settings) {
    // If no settings exist, create default
    const defaultSettings = await this.create({
      isOpen: true,
      closedMessage: 'We are currently closed. Please check back later!',
      lastUpdatedBy: new mongoose.Types.ObjectId() // Temporary ID
    });
    return defaultSettings;
  }
  return settings;
};

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);

