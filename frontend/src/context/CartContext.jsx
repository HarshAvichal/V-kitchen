import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

// Load cart from localStorage or return initial state
const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem('vkitchen_cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      // Validate that the cart has the required structure
      if (parsedCart.items && Array.isArray(parsedCart.items)) {
        return parsedCart;
      }
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  return {
    items: [],
    totalItems: 0,
    totalAmount: 0,
  };
};

const initialState = loadCartFromStorage();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.items.find(item => item.dish._id === action.payload.dish._id);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.dish._id === action.payload.dish._id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: updatedItems.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0),
        };
      } else {
        const newItems = [...state.items, action.payload];
        return {
          ...state,
          items: newItems,
          totalItems: newItems.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: newItems.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0),
        };
      }

    case 'REMOVE_FROM_CART':
      const filteredItems = state.items.filter(item => item.dish._id !== action.payload);
      return {
        ...state,
        items: filteredItems,
        totalItems: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: filteredItems.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0),
      };

    case 'UPDATE_QUANTITY':
      const updatedItems = state.items.map(item =>
        item.dish._id === action.payload.dishId
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      return {
        ...state,
        items: updatedItems,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: updatedItems.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalAmount: 0,
      };

    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('vkitchen_cart', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state]);

  const addToCart = (dish, quantity = 1) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: { dish, quantity },
    });
  };

  const removeFromCart = (dishId) => {
    dispatch({
      type: 'REMOVE_FROM_CART',
      payload: dishId,
    });
  };

  const updateQuantity = (dishId, quantity) => {
    dispatch({
      type: 'UPDATE_QUANTITY',
      payload: { dishId, quantity },
    });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    // Also clear from localStorage
    try {
      localStorage.removeItem('vkitchen_cart');
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  };

  const value = {
    ...state,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isEmpty: state.items.length === 0,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
