const User = require('../models/User');
const bcrypt = require('bcryptjs');

const updateAdminCredentials = async () => {
  try {
    // Find the existing admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    console.log('🔍 Found admin user:', admin.email);

    // Update email and password
    const hashedPassword = await bcrypt.hash('Admin123@', 10);
    
    const updatedAdmin = await User.findByIdAndUpdate(
      admin._id,
      {
        email: 'admin@vkitchen.com',
        password: hashedPassword,
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('✅ Admin credentials updated successfully');
    console.log(`📧 New Email: ${updatedAdmin.email}`);
    console.log(`🔑 New Password: Admin123@`);
    console.log('📝 Note: Email functionality still uses studynotion.pro@gmail.com');
    
  } catch (error) {
    console.error('❌ Error updating admin credentials:', error.message);
  }
};

module.exports = updateAdminCredentials;
