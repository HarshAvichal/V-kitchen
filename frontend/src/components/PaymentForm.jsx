import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentForm = ({ orderId, totalAmount, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      let result;

      if (paymentMethod === 'card') {
        // Handle card payment using PaymentElement
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/order/${orderId}`,
          },
          redirect: 'if_required',
        });
      } else if (paymentMethod === 'apple_pay') {
        // Handle Apple Pay
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/order/${orderId}`,
          },
          redirect: 'if_required',
        });
      }

      if (result.error) {
        console.error('Payment failed:', result.error);
        toast.error(result.error.message || 'Payment failed');
        onPaymentError(result.error);
      } else {
        console.log('Payment succeeded:', result.paymentIntent);
        
        // Update payment status in the database
        try {
          await paymentAPI.updatePaymentStatus(
            orderId, 
            result.paymentIntent.id, 
            result.paymentIntent.status
          );
          console.log('Payment status updated successfully');
        } catch (updateError) {
          console.error('Error updating payment status:', updateError);
          // Don't fail the payment if status update fails
        }
        
        toast.success('Payment successful!');
        onPaymentSuccess(result.paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
      onPaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
        
        <div className="space-y-3">
          <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Credit/Debit Card</div>
              <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
            </div>
          </label>

          <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="apple_pay"
              checked={paymentMethod === 'apple_pay'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Apple Pay</div>
              <div className="text-sm text-gray-500">Pay with Touch ID or Face ID</div>
            </div>
          </label>
        </div>
      </div>

      {/* Payment Element */}
      {paymentMethod === 'card' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Payment Details
          </label>
          <div className="p-4 border border-gray-300 rounded-lg">
            <PaymentElement />
          </div>
        </div>
      )}

      {/* Apple Pay Button */}
      {paymentMethod === 'apple_pay' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Apple Pay
          </label>
          <div className="p-4 border border-gray-300 rounded-lg">
            <PaymentElement />
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-gray-900">Total Amount</span>
          <span className="text-2xl font-bold text-orange-600">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </div>
        ) : (
          `Pay $${totalAmount.toFixed(2)}`
        )}
      </button>

      {/* Security Notice */}
      <div className="text-center text-sm text-gray-500">
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Your payment information is secure and encrypted
        </div>
      </div>
    </form>
  );
};

const PaymentFormWrapper = ({ orderId, totalAmount, onPaymentSuccess, onPaymentError }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      createPaymentIntent();
    }
  }, [orderId]);

  const createPaymentIntent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Creating payment intent for order:', orderId);
      const response = await paymentAPI.createPaymentIntent(orderId);
      console.log('Payment intent response:', response);
      console.log('Response data:', response.data);
      console.log('Client secret:', response.data.data?.clientSecret);
      
      if (response.data && response.data.data && response.data.data.clientSecret) {
        setClientSecret(response.data.data.clientSecret);
      } else {
        throw new Error('No client secret received from server');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      console.error('Error response:', error.response);
      setError('Failed to initialize payment');
      toast.error('Failed to initialize payment');
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#f97316', // Orange color to match the theme
      },
    },
  };

  // Show loading state while creating payment intent
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-gray-600">Initializing payment...</span>
      </div>
    );
  }

  // Show error state if payment intent creation failed
  if (error || !clientSecret) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-medium">Payment Initialization Failed</p>
          <p className="text-sm text-gray-500 mt-2">{error || 'Unable to create payment intent'}</p>
        </div>
        <button
          onClick={createPaymentIntent}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        orderId={orderId}
        totalAmount={totalAmount}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
      />
    </Elements>
  );
};

export default PaymentFormWrapper;
