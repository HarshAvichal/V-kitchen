const Newsletter = require('../models/Newsletter');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Try multiple email configurations for better reliability
  const configs = [
    // Configuration 1: Gmail with TLS (optimized for Render)
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'studynotion.pro@gmail.com',
        pass: (process.env.EMAIL_PASS || 'your-app-password').replace(/\s/g, '')
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      pool: false,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'TLSv1.2'
      },
      debug: true,
      logger: true
    },
    // Configuration 2: Gmail with SSL (optimized for Render)
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'studynotion.pro@gmail.com',
        pass: (process.env.EMAIL_PASS || 'your-app-password').replace(/\s/g, '')
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      pool: false,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'TLSv1.2'
      },
      debug: true,
      logger: true
    }
  ];
  
  // Try the first configuration
  let transporter = nodemailer.createTransport(configs[0]);
  
  // Add error handling for connection issues
  transporter.verify((error, success) => {
    if (error) {
      // Try the second configuration if first fails
      transporter = nodemailer.createTransport(configs[1]);
    }
  });
  
  return transporter;
};

// Beautiful HTML email template for order cancellation notifications to admin
const createOrderCancellationTemplate = (order) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsList = order.items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">
        <div style="font-weight: 600; color: #1f2937;">${item.dish?.name || 'Item'}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${item.dish?.description || ''}</div>
      </td>
      <td style="padding: 12px; text-align: center; color: #1f2937;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 600;">$${(item.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Cancellation Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
            🚫 Order Cancelled
          </h1>
          <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 16px;">
            Customer has cancelled their order
          </p>
        </div>

        <!-- Order Details -->
        <div style="padding: 30px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">📋</span>
              Order Details
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="color: #374151;">Order Number:</strong><br>
                <span style="color: #6b7280; font-size: 18px; font-weight: 600;">#${order.orderNumber}</span>
              </div>
              <div>
                <strong style="color: #374151;">Order Date:</strong><br>
                <span style="color: #6b7280;">${orderDate}</span>
              </div>
              <div>
                <strong style="color: #374151;">Customer:</strong><br>
                <span style="color: #6b7280;">${order.user.name}</span>
              </div>
              <div>
                <strong style="color: #374151;">Email:</strong><br>
                <span style="color: #6b7280;">${order.user.email}</span>
              </div>
              <div>
                <strong style="color: #374151;">Phone:</strong><br>
                <span style="color: #6b7280;">${order.user.phone || 'Not provided'}</span>
              </div>
              <div>
                <strong style="color: #374151;">Delivery Type:</strong><br>
                <span style="color: #6b7280; text-transform: capitalize;">${order.deliveryType}</span>
              </div>
            </div>
          </div>

          <!-- Order Items -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <thead style="background-color: #f3f4f6;">
                <tr>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Item</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
          </div>

          <!-- Order Summary -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #1f2937; font-weight: 700; font-size: 18px;">Total Amount:</span>
              <span style="color: #dc2626; font-weight: 700; font-size: 18px;">$${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <!-- Refund Information -->
          ${order.paymentStatus === 'refunded' ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">💰</span>
              Refund Processed
            </h3>
            <p style="color: #166534; margin: 0; font-size: 14px;">
              A refund of $${(order.totalAmount || 0).toFixed(2)} has been automatically processed and will appear in the customer's account within 5-10 business days.
            </p>
          </div>
          ` : ''}

          <!-- Action Required -->
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">⚠️</span>
              Action Required
            </h3>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              This order has been cancelled by the customer. Please update your kitchen systems and inventory accordingly.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            This is an automated notification from V-Kitchen Admin Panel
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            © ${new Date().getFullYear()} V-Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Beautiful HTML email template for order status updates to customer
const createOrderStatusUpdateTemplate = (order, status) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const statusInfo = {
    'ready': {
      title: '🍽️ Your Order is Ready!',
      message: 'Great news! Your delicious order is ready and waiting for you.',
      color: '#059669',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      icon: '✅'
    },
    'completed': {
      title: '🎉 Order Delivered Successfully!',
      message: 'Your order has been delivered successfully. We hope you enjoy your meal!',
      color: '#7c3aed',
      bgColor: '#faf5ff',
      borderColor: '#d8b4fe',
      icon: '🚚'
    }
  };

  const currentStatus = statusInfo[status] || statusInfo['ready'];
  const deliveryMessage = order.deliveryType === 'pickup' 
    ? 'Please come to our kitchen to pick up your order.' 
    : 'Your order is on its way to you!';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${currentStatus.color} 0%, ${currentStatus.color}dd 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
            ${currentStatus.icon} ${currentStatus.title}
          </h1>
          <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">
            ${currentStatus.message}
          </p>
        </div>

        <!-- Status Update -->
        <div style="padding: 30px;">
          <div style="background-color: ${currentStatus.bgColor}; border: 1px solid ${currentStatus.borderColor}; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
            <h2 style="color: ${currentStatus.color}; margin: 0 0 10px 0; font-size: 20px;">
              Order #${order.orderNumber}
            </h2>
            <p style="color: #374151; margin: 0; font-size: 16px;">
              ${deliveryMessage}
            </p>
            ${status === 'ready' && order.deliveryType === 'delivery' ? `
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">
              Estimated delivery time: 45 minutes
            </p>
            ` : ''}
          </div>

          <!-- Order Details -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="color: #374151;">Order Date:</strong><br>
                <span style="color: #6b7280;">${orderDate}</span>
              </div>
              <div>
                <strong style="color: #374151;">Delivery Type:</strong><br>
                <span style="color: #6b7280; text-transform: capitalize;">${order.deliveryType}</span>
              </div>
              <div>
                <strong style="color: #374151;">Total Amount:</strong><br>
                <span style="color: #1f2937; font-weight: 600; font-size: 18px;">$${(order.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div>
                <strong style="color: #374151;">Payment Status:</strong><br>
                <span style="color: #059669; text-transform: capitalize;">${order.paymentStatus}</span>
              </div>
            </div>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">ℹ️</span>
              What's Next?
            </h3>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              ${status === 'ready' 
                ? (order.deliveryType === 'pickup' 
                    ? 'Please visit our kitchen to collect your order. Our staff will have it ready for you.'
                    : 'Our delivery partner is on their way to deliver your order to your address.')
                : 'Thank you for choosing V-Kitchen! We hope you enjoyed your meal. Please consider leaving a review.'
              }
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Thank you for choosing V-Kitchen!
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
            © ${new Date().getFullYear()} V-Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Beautiful HTML email template for order notifications
const createOrderNotificationTemplate = (order) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Alert - V-Kitchen</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">
            🍽️ New Order Alert!
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Order #${order.orderNumber} has been placed
          </p>
        </div>

        <!-- Order Details -->
        <div style="padding: 30px;">
          <!-- Order Info -->
          <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; text-align: center;">
              📋 Order Information
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="color: #92400e;">Order Number:</strong><br>
                <span style="color: #1f2937;">#${order.orderNumber}</span>
              </div>
              <div>
                <strong style="color: #92400e;">Order Time:</strong><br>
                <span style="color: #1f2937;">${formatDate(order.createdAt)}</span>
              </div>
              <div>
                <strong style="color: #92400e;">Delivery Type:</strong><br>
                <span style="color: #1f2937; text-transform: capitalize;">${order.deliveryType}</span>
              </div>
              <div>
                <strong style="color: #92400e;">Total Amount:</strong><br>
                <span style="color: #1f2937; font-weight: bold; font-size: 18px;">$${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Customer Info -->
          <div style="background-color: #e0f2fe; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px;">
              👤 Customer Information
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="color: #0369a1;">Name:</strong><br>
                <span style="color: #1f2937;">${order.user?.name || 'N/A'}</span>
              </div>
              <div>
                <strong style="color: #0369a1;">Phone:</strong><br>
                <span style="color: #1f2937;">${formatPhoneNumber(order.contactPhone)}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <strong style="color: #0369a1;">Email:</strong><br>
                <span style="color: #1f2937;">${order.user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Order Items -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
              🍽️ Order Items (${order.items.length})
            </h3>
            <div style="space-y: 10px;">
              ${order.items.map((item, index) => {
                const dishName = item.dish?.name || 'Item No Longer Available';
                const dishPrice = item.dish?.price || item.price || 0;
                const itemTotal = dishPrice * item.quantity;
                
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937;">${dishName}</div>
                    <div style="font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</div>
                    ${dishPrice > 0 ? `<div style="font-size: 14px; color: #6b7280;">$${dishPrice.toFixed(2)} each</div>` : '<div style="font-size: 14px; color: #dc2626;">Price not available</div>'}
                  </div>
                  <div style="font-weight: bold; color: #059669; font-size: 16px;">
                    $${itemTotal.toFixed(2)}
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Delivery Address (if delivery) -->
          ${order.deliveryType === 'delivery' && order.deliveryAddress ? `
            <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">
                🚚 Delivery Address
              </h3>
              <div style="color: #1f2937; line-height: 1.6;">
                ${order.deliveryAddress.street}<br>
                ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}<br>
                ${order.deliveryAddress.landmark ? `Landmark: ${order.deliveryAddress.landmark}<br>` : ''}
                ${order.deliveryAddress.instructions ? `Instructions: ${order.deliveryAddress.instructions}` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/orders" 
               style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); 
                      color: #ffffff; text-decoration: none; padding: 15px 30px; 
                      border-radius: 8px; font-weight: 600; font-size: 16px; 
                      box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
              📋 View Order Details
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            This is an automated notification from V-Kitchen Admin Panel
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 11px;">
            © 2025 V-Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Beautiful HTML email template for newsletter
const createWelcomeEmailTemplate = (email) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to V-Kitchen Newsletter</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">
            🍽️ Welcome to V-Kitchen!
          </h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
            Your culinary journey starts here
          </p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
              Thank you for subscribing! 🎉
            </h2>
            <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.6;">
              We're thrilled to have you join our V-Kitchen family! Get ready for an amazing culinary experience.
            </p>
          </div>

          <!-- Features Section -->
          <div style="background-color: #fef3c7; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
              What's in store for you:
            </h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🍕</span>
                <span style="color: #92400e; font-weight: 500;">Exclusive new dish announcements</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">💰</span>
                <span style="color: #92400e; font-weight: 500;">Special offers and discounts</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🎁</span>
                <span style="color: #92400e; font-weight: 500;">Early access to limited-time deals</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">👨‍🍳</span>
                <span style="color: #92400e; font-weight: 500;">Chef's special recipes and tips</span>
              </div>
            </div>
          </div>

          <!-- CTA Section -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); 
                      color: #ffffff; text-decoration: none; padding: 15px 30px; 
                      border-radius: 8px; font-weight: 600; font-size: 16px; 
                      box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
              🍽️ Explore Our Menu
            </a>
          </div>

          <!-- Contact Info -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
              <strong>V-Kitchen</strong> - Where every meal is a celebration
            </p>
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              📍 New York City, NY | 📞 +1 (845) 597-5135 | ✉️ v-kitchen@gmail.com
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px;">
            You received this email because you subscribed to our newsletter.
          </p>
          <p style="color: #9ca3af; margin: 0; font-size: 11px;">
            © 2025 V-Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// @desc    Subscribe to newsletter
// @route   POST /api/v1/newsletter/subscribe
// @access  Public
const subscribeToNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    
    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered for our newsletter'
        });
      } else {
        // Reactivate subscription
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
      }
    } else {
      // Create new subscription
      await Newsletter.create({ email: email.toLowerCase() });
    }

    // Send welcome email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"V-Kitchen" <${process.env.EMAIL_USER || 'v-kitchen@gmail.com'}>`,
        to: email,
        subject: '🎉 Welcome to V-Kitchen Newsletter!',
        html: createWelcomeEmailTemplate(email)
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      // Don't fail the subscription if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter! Welcome email sent.'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Unsubscribe from newsletter
// @route   POST /api/v1/newsletter/unsubscribe
// @access  Public
const unsubscribeFromNewsletter = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    const subscriber = await Newsletter.findOne({ 
      email: email.toLowerCase(),
      unsubscribeToken: token 
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Invalid unsubscribe request'
      });
    }

    subscriber.isActive = false;
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get newsletter stats (Admin only)
// @route   GET /api/v1/newsletter/stats
// @access  Private (Admin only)
const getNewsletterStats = async (req, res, next) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments({ isActive: true });
    const recentSubscribers = await Newsletter.find({ isActive: true })
      .sort('-subscribedAt')
      .limit(10)
      .select('email subscribedAt');

    res.status(200).json({
      success: true,
      data: {
        totalSubscribers,
        recentSubscribers
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Send order notification to admins
// @route   POST /api/v1/newsletter/notify-order
// @access  Private (Admin only)
const sendOrderNotification = async (order) => {
  try {
    // Try to send email with retry mechanism
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        
        const transporter = createTransporter();
        
        const mailOptions = {
          from: `"V-Kitchen Admin" <${process.env.EMAIL_USER || 'studynotion.pro@gmail.com'}>`,
          to: process.env.ADMIN_EMAIL || 'studynotion.pro@gmail.com',
          subject: `🍽️ New Order Alert - #${order.orderNumber}`,
          html: createOrderNotificationTemplate(order)
        };

        // Use a shorter timeout for each attempt
        const emailPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout after 10 seconds')), 10000)
        );
        
        await Promise.race([emailPromise, timeoutPromise]);
        return true;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    
    // If all attempts failed, return false but don't fail the order
    return false;
    
  } catch (error) {
    return false;
  }
};

// @desc    Send order cancellation notification to admin
// @route   POST /api/v1/newsletter/notify-cancellation
// @access  Private
const sendOrderCancellationNotification = async (order) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"V-Kitchen Admin" <${process.env.EMAIL_USER || 'v-kitchen@gmail.com'}>`,
      to: process.env.ADMIN_EMAIL || 'studynotion.pro@gmail.com', // Admin email
      subject: `🚫 Order Cancelled - #${order.orderNumber}`,
      html: createOrderCancellationTemplate(order)
    };
    
    // Use a promise with timeout to prevent hanging
    const emailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([emailPromise, timeoutPromise]);
    return true;
  } catch (error) {
    return false;
  }
};

// @desc    Send order status update notification to customer
// @route   POST /api/v1/newsletter/notify-status-update
// @access  Private
const sendOrderStatusUpdateNotification = async (order, status) => {
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"V-Kitchen" <${process.env.EMAIL_USER || 'v-kitchen@gmail.com'}>`,
        to: order.user.email,
        subject: status === 'ready' 
          ? `🍽️ Your Order #${order.orderNumber} is Ready!` 
          : `🎉 Your Order #${order.orderNumber} has been Delivered!`,
        html: createOrderStatusUpdateTemplate(order, status)
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  return false;
};

// @desc    Test email configuration
// @route   GET /api/v1/newsletter/test-email
// @access  Private (Admin only)
const testEmailConfiguration = async (req, res) => {
  try {
    
    const emailConfig = {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***SET***' : 'NOT SET',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      hasEmailUser: !!process.env.EMAIL_USER,
      hasEmailPass: !!process.env.EMAIL_PASS,
      hasAdminEmail: !!process.env.ADMIN_EMAIL
    };
    
    
    // Try to create transporter
    let transporterTest = false;
    let errorMessage = null;
    
    try {
      const transporter = createTransporter();
      transporterTest = true;
    } catch (error) {
      errorMessage = error.message;
    }
    
    res.json({
      success: true,
      message: 'Email configuration test completed',
      data: {
        configuration: emailConfig,
        transporterCreated: transporterTest,
        error: errorMessage
      }
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration',
      error: error.message
    });
  }
};

// @desc    Send test email
// @route   POST /api/v1/newsletter/send-test-email
// @access  Public (for testing)
const sendTestEmail = async (req, res) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"V-Kitchen Test" <${process.env.EMAIL_USER || 'v-kitchen@gmail.com'}>`,
      to: process.env.ADMIN_EMAIL || 'studynotion.pro@gmail.com',
      subject: '🧪 Test Email from V-Kitchen',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from V-Kitchen backend.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you receive this, the email service is working correctly!</p>
        <p>Environment Variables:</p>
        <ul>
          <li>EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}</li>
          <li>EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET' : 'NOT SET'}</li>
          <li>ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || 'NOT SET'}</li>
        </ul>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        to: mailOptions.to,
        from: mailOptions.from,
        envCheck: {
          EMAIL_USER: process.env.EMAIL_USER || 'NOT SET',
          EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'NOT SET'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      details: {
        envCheck: {
          EMAIL_USER: process.env.EMAIL_USER || 'NOT SET',
          EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'NOT SET'
        }
      }
    });
  }
};

module.exports = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterStats,
  sendOrderNotification,
  sendOrderCancellationNotification,
  sendOrderStatusUpdateNotification,
  testEmailConfiguration,
  sendTestEmail
};
