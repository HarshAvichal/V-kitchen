import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import NotificationCenter from '../NotificationCenter';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ShoppingCartIcon, 
  UserIcon,
  HomeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Menu Card', href: '/menu-card', icon: ClipboardDocumentListIcon },
  ];

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Dishes', href: '/admin/dishes' },
    { name: 'Orders', href: '/admin/orders' },
    { name: 'Users', href: '/admin/users' },
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Kitchen</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}

            {isAuthenticated && user?.role === 'admin' && (
              <div className="relative group">
                <button className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Admin
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {isAuthenticated && <NotificationCenter />}

            {/* Only show cart for logged-in customers (not admins) */}
            {isAuthenticated && user?.role !== 'admin' && (
              <Link
                to="/cart"
                className="relative text-gray-700 hover:text-orange-500 p-2 rounded-md transition-colors"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center text-gray-700 hover:text-orange-500 p-2 rounded-md transition-colors">
                  <UserIcon className="h-6 w-6" />
                  <span className="ml-1 text-sm font-medium">{user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-orange-500 p-2 rounded-md transition-colors"
            >
              {isOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {isAuthenticated && user?.role === 'admin' && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Admin
                </div>
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t pt-2 mt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="text-gray-700 hover:text-orange-500 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-orange-500 text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-orange-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
