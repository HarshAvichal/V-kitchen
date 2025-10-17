# V Kitchen Backend API

A complete backend API for V Kitchen food ordering and delivery application built with Node.js, Express.js, and MongoDB.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Menu Management**: CRUD operations for dishes with categories and tags
- **Order System**: Complete order management with status tracking
- **Admin Panel**: Dashboard with statistics and user management
- **Security**: Rate limiting, CORS, Helmet, and input validation
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator
- **Password Hashing**: bcryptjs

## Project Structure

```
V kitchen/
├── backend/                 # Backend API
│   ├── config/
│   │   └── database.js      # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── dishController.js    # Dish management logic
│   │   ├── orderController.js   # Order management logic
│   │   └── adminController.js   # Admin panel logic
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication middleware
│   │   └── errorHandler.js # Global error handling
│   ├── models/
│   │   ├── User.js         # User model
│   │   ├── Dish.js         # Dish model
│   │   └── Order.js        # Order model
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── dishes.js       # Dish routes
│   │   ├── orders.js       # Order routes
│   │   └── admin.js        # Admin routes
│   ├── utils/
│   │   ├── validation.js   # Input validation rules
│   │   └── seedAdmin.js    # Admin user seeding
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies and scripts
│   ├── env.example         # Environment variables template
│   └── README.md           # Backend documentation
└── frontend/               # Frontend (React.js) - To be created
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "V kitchen"
   ```

2. **Navigate to backend directory**
   ```bash
   cd backend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/v-kitchen
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   ADMIN_EMAIL=studynotion.pro@gmail.com
   ADMIN_PASSWORD=Admin123@
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/password` - Change password
- `POST /api/v1/auth/logout` - Logout user

### Dishes (Public)
- `GET /api/v1/dishes` - Get all dishes
- `GET /api/v1/dishes/:id` - Get single dish
- `GET /api/v1/dishes/categories` - Get dish categories
- `GET /api/v1/dishes/tags` - Get dish tags

### Dishes (Admin Only)
- `POST /api/v1/dishes` - Create new dish
- `PUT /api/v1/dishes/:id` - Update dish
- `DELETE /api/v1/dishes/:id` - Delete dish

### Orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/my-orders` - Get user's orders
- `GET /api/v1/orders/:id` - Get single order
- `PUT /api/v1/orders/:id/cancel` - Cancel order

### Orders (Admin Only)
- `PUT /api/v1/orders/:id/status` - Update order status

### Admin Panel
- `GET /api/v1/admin/stats` - Get dashboard statistics
- `GET /api/v1/admin/orders` - Get all orders
- `GET /api/v1/admin/users` - Get all users
- `PUT /api/v1/admin/users/:id/toggle-status` - Toggle user status

## Default Admin Credentials

After running the application, you can login with:
- **Email**: admin@vkitchen.com
- **Password**: admin123

## API Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create a dish (Admin)
```bash
curl -X POST http://localhost:5000/api/v1/dishes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Chicken Biryani",
    "description": "Aromatic basmati rice with tender chicken pieces",
    "price": 12.99,
    "category": "lunch",
    "tags": ["spicy", "non-vegetarian", "popular"]
  }'
```

### Create an order
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "items": [
      {
        "dish": "DISH_ID",
        "quantity": 2
      }
    ],
    "deliveryType": "delivery",
    "deliveryAddress": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001"
    },
    "contactPhone": "+919876543210"
  }'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/v-kitchen |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `ADMIN_EMAIL` | Admin email for notifications | studynotion.pro@gmail.com |
| `ADMIN_PASSWORD` | Admin password for login | Admin123@ |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## Development

The application uses nodemon for development, which automatically restarts the server when files change.

```bash
npm run dev
```

## Production

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Use a production MongoDB instance
4. Set up proper logging and monitoring

## License

MIT License
