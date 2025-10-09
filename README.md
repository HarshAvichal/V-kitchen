# 🍽️ V Kitchen - Modern Food Delivery Platform

A full-stack food delivery application built with React, Node.js, and MongoDB. V Kitchen provides a complete solution for restaurants to manage their online presence and for customers to order food seamlessly.

![V Kitchen Banner](https://via.placeholder.com/1200x400/FF6B35/FFFFFF?text=V+Kitchen+-+Modern+Food+Delivery+Platform)

## ✨ Features

### 🎯 **Core Features**
- **User Authentication & Authorization** - Secure JWT-based authentication system
- **Admin Dashboard** - Comprehensive management interface for restaurant owners
- **Menu Management** - Add, edit, and delete dishes with rich media support
- **Shopping Cart** - Persistent cart with real-time updates
- **Order Management** - Complete order lifecycle tracking
- **Payment Integration** - Secure Stripe payment processing
- **Order Tracking** - Real-time order status updates
- **Responsive Design** - Mobile-first, modern UI/UX

### 💳 **Payment System**
- **Stripe Integration** - Secure payment processing
- **Multiple Payment Methods** - Cards, Apple Pay, Google Pay support
- **Payment Method Display** - Customer-friendly payment method names
- **Refund Management** - Admin-controlled refund system
- **Payment History** - Complete transaction tracking

### 👨‍💼 **Admin Features**
- **Dashboard Analytics** - Sales metrics and order statistics
- **Order Management** - Filter, update, and delete orders
- **Menu Management** - Full CRUD operations for dishes
- **User Management** - Customer account management
- **Order Filtering** - Smart filtering system (Active orders vs Completed/Cancelled)
- **Bulk Operations** - Efficient order management tools

### 🛒 **Customer Features**
- **Browse Menu** - Beautiful dish catalog with images and descriptions
- **Order Customization** - Special instructions and quantity selection
- **Order History** - Complete order tracking and history
- **Order Status Tracking** - Real-time status updates
- **Profile Management** - Account settings and preferences

## 🚀 **Upcoming Features (In Development)**

### 📡 **Real-Time Features with WebSockets**
- **Live Order Tracking** - Real-time order status updates
- **Admin Notifications** - Instant notifications for new orders
- **Customer Updates** - Live order progress notifications
- **Delivery Tracking** - GPS-based delivery tracking (Future)
- **Chat Support** - Real-time customer support chat
- **Live Kitchen Updates** - Real-time kitchen status updates

### 🗺️ **Advanced Tracking System**
- **Interactive Map** - Google Maps integration for delivery tracking
- **Driver Location** - Real-time driver location updates
- **ETA Calculation** - Dynamic delivery time estimation
- **Route Optimization** - Efficient delivery route planning
- **Push Notifications** - Mobile push notifications for updates

### 📱 **Mobile Enhancements**
- **Progressive Web App (PWA)** - Offline functionality and app-like experience
- **Push Notifications** - Real-time order updates
- **Geolocation Services** - Location-based features
- **Camera Integration** - Photo upload for custom orders

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Stripe Elements** - Payment form components
- **Heroicons** - Beautiful SVG icons
- **React Hot Toast** - Elegant notifications

### **Backend**
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **Stripe API** - Payment processing
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### **Development Tools**
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control
- **NPM** - Package management

## 📦 **Installation & Setup**

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Stripe account (for payments)

### **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm start
```

### **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### **Environment Variables**
```env
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/vkitchen
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:5001/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 🏗️ **Project Structure**

```
V-kitchen/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context providers
│   │   ├── services/        # API service functions
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── backend/                 # Node.js backend application
│   ├── controllers/         # Route controllers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   └── utils/              # Utility functions
└── README.md               # Project documentation
```

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile

### **Orders**
- `GET /api/v1/orders` - Get user orders
- `POST /api/v1/orders` - Create new order
- `PUT /api/v1/orders/:id/status` - Update order status
- `DELETE /api/v1/orders/:id` - Delete order

### **Admin**
- `GET /api/v1/admin/orders` - Get all orders (admin)
- `DELETE /api/v1/admin/orders/:id` - Delete order (admin)
- `GET /api/v1/admin/stats` - Get dashboard statistics

### **Payments**
- `POST /api/v1/payments/create-payment-intent` - Create payment intent
- `PUT /api/v1/payments/status/:orderId` - Update payment status
- `POST /api/v1/payments/refund` - Process refund

## 🎨 **Screenshots**

### **Customer Interface**
- 🏠 **Homepage** - Beautiful landing page with featured dishes
- 🍽️ **Menu** - Interactive menu with filtering and search
- 🛒 **Cart** - Shopping cart with quantity management
- 💳 **Checkout** - Secure payment form with Stripe integration
- 📋 **Orders** - Order history and tracking

### **Admin Dashboard**
- 📊 **Dashboard** - Analytics and statistics overview
- 📝 **Orders** - Order management with filtering
- 🍽️ **Menu** - Dish management interface
- 👥 **Users** - Customer management
- 📈 **Analytics** - Sales and performance metrics

## 🚀 **Deployment**

### **Frontend (Vercel/Netlify)**
```bash
npm run build
# Deploy dist/ folder to your hosting platform
```

### **Backend (Heroku/Railway)**
```bash
# Configure environment variables
# Deploy to your hosting platform
```

### **Database (MongoDB Atlas)**
- Create MongoDB Atlas cluster
- Update connection string in environment variables
- Configure IP whitelist and security settings

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Harsh Avichal**
- GitHub: [@HarshAvichal](https://github.com/HarshAvichal)
- LinkedIn: [Harsh Avichal](https://linkedin.com/in/harsh-avichal)

## 🙏 **Acknowledgments**

- Stripe for payment processing
- MongoDB for database services
- React team for the amazing framework
- Tailwind CSS for the utility-first approach
- All open-source contributors

## 📞 **Support**

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact us at support@vkitchen.com
- Check our documentation wiki

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

[![GitHub stars](https://img.shields.io/github/stars/HarshAvichal/V-kitchen?style=social)](https://github.com/HarshAvichal/V-kitchen)
[![GitHub forks](https://img.shields.io/github/forks/HarshAvichal/V-kitchen?style=social)](https://github.com/HarshAvichal/V-kitchen)
[![GitHub issues](https://img.shields.io/github/issues/HarshAvichal/V-kitchen)](https://github.com/HarshAvichal/V-kitchen/issues)

</div>
