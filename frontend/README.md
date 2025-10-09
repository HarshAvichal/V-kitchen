# V Kitchen Frontend

A modern React.js frontend for the V Kitchen food ordering and delivery application.

## 🚀 Features

- **Modern UI**: Built with React.js and Tailwind CSS
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Authentication**: Complete user authentication system
- **Menu Management**: Browse and filter dishes with advanced search
- **Shopping Cart**: Add to cart, quantity management, and checkout
- **Order Management**: Track orders and view order history
- **Admin Dashboard**: Complete admin panel for managing the business
- **Real-time Updates**: Toast notifications and loading states

## 🛠️ Tech Stack

- **Framework**: React.js 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Notifications**: React Hot Toast
- **State Management**: React Context API

## 📁 Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   └── layout/         # Layout components (Navbar, Footer)
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── admin/          # Admin pages
│   │   └── ...             # Other pages
│   ├── services/           # API service layer
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main App component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- V Kitchen Backend running on port 5001

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 🔗 API Integration

The frontend integrates with the V Kitchen backend API:

- **Base URL**: `http://localhost:5001/api/v1`
- **Authentication**: JWT token-based
- **Endpoints**: All backend routes are mapped to frontend services

### API Services

- `authAPI` - User authentication
- `dishesAPI` - Menu management
- `ordersAPI` - Order management
- `adminAPI` - Admin panel
- `healthAPI` - Health checks

## 📱 Pages & Features

### Public Pages
- **Home** (`/`) - Landing page with features and popular dishes
- **Menu** (`/menu`) - Browse and filter dishes
- **Dish Detail** (`/dish/:id`) - Individual dish details
- **Cart** (`/cart`) - Shopping cart management
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration

### Protected Pages (User)
- **Checkout** (`/checkout`) - Order placement
- **Profile** (`/profile`) - User profile management
- **Orders** (`/orders`) - Order history
- **Order Detail** (`/order/:id`) - Individual order details

### Admin Pages
- **Dashboard** (`/admin`) - Business analytics
- **Dishes** (`/admin/dishes`) - Menu management
- **Orders** (`/admin/orders`) - Order management
- **Users** (`/admin/users`) - User management

## 🎨 UI Components

### Layout Components
- `Navbar` - Navigation with user menu and cart
- `Footer` - Site footer with links and contact info

### Authentication Components
- `ProtectedRoute` - Route protection for authenticated users
- `AdminRoute` - Route protection for admin users

### Context Providers
- `AuthProvider` - User authentication state
- `CartProvider` - Shopping cart state

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

### Tailwind CSS

The project uses Tailwind CSS for styling. Configuration is in `tailwind.config.js`.

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy!

### Netlify

1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Configure redirects for SPA routing

### Other Platforms

The built files in the `dist` directory can be deployed to any static hosting service.

## 🔄 State Management

The application uses React Context API for state management:

- **AuthContext**: User authentication, login, logout, profile management
- **CartContext**: Shopping cart items, quantities, totals

## 🎯 Key Features

### User Experience
- Responsive design for all devices
- Smooth animations and transitions
- Loading states and error handling
- Toast notifications for user feedback
- Intuitive navigation and user flow

### Admin Features
- Real-time dashboard with analytics
- Order management with status updates
- User management with activation/deactivation
- Menu management with CRUD operations

### Performance
- Optimized bundle size with Vite
- Lazy loading for better performance
- Efficient state management
- Clean component architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the backend documentation
- Review the API endpoints

---

**Note**: Make sure the V Kitchen backend is running on port 5001 before starting the frontend development server.