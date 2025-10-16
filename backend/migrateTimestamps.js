const mongoose = require('mongoose');
const Order = require('./models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/v-kitchen', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateTimestamps() {
  try {
    console.log('🔄 Starting timestamp migration...');
    
    // Get all orders
    const orders = await Order.find({});
    
    console.log(`📦 Found ${orders.length} total orders`);
    
    // Filter orders that need timestamps
    const ordersToMigrate = orders.filter(order => 
      !order.statusTimestamps || 
      Object.keys(order.statusTimestamps).length === 0
    );
    
    console.log(`📦 Found ${ordersToMigrate.length} orders to migrate`);
    
    for (const order of ordersToMigrate) {
      const timestamps = {};
      
      // Set placed timestamp to createdAt (when order was first created)
      timestamps.placed = order.createdAt;
      
      // For other statuses, we'll estimate based on order creation time
      // This is a rough estimation since we don't have exact timestamps
      const baseTime = new Date(order.createdAt);
      
      // If order is preparing or beyond, estimate preparing time (5 minutes after placed)
      if (['preparing', 'ready', 'completed'].includes(order.status)) {
        timestamps.preparing = new Date(baseTime.getTime() + 5 * 60 * 1000);
      }
      
      // If order is ready or beyond, estimate ready time (25 minutes after placed)
      if (['ready', 'completed'].includes(order.status)) {
        timestamps.ready = new Date(baseTime.getTime() + 25 * 60 * 1000);
      }
      
      // If order is completed, estimate completion time (30 minutes after placed)
      if (order.status === 'completed') {
        timestamps.completed = new Date(baseTime.getTime() + 30 * 60 * 1000);
      }
      
      // If order is cancelled, set cancelled timestamp
      if (order.status === 'cancelled') {
        timestamps.cancelled = new Date(baseTime.getTime() + 10 * 60 * 1000); // 10 minutes after placed
      }
      
      // Update the order with timestamps
      await Order.findByIdAndUpdate(order._id, {
        statusTimestamps: timestamps
      });
      
      console.log(`✅ Updated order ${order.orderNumber} with timestamps`);
    }
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTimestamps();
