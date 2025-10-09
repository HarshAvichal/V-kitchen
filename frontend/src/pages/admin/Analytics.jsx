import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const timeRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  const metrics = [
    {
      name: 'Total Revenue',
      value: `$${analytics?.revenue?.total?.toLocaleString() || '0'}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Orders',
      value: analytics?.orders?.total || '0',
      change: '+8.2%',
      changeType: 'positive',
      icon: ShoppingBagIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Average Order Value',
      value: `$${analytics?.revenue?.total && analytics?.orders?.total ? 
        (analytics.revenue.total / analytics.orders.total).toFixed(2) : '0'}`,
      change: '+5.1%',
      changeType: 'positive',
      icon: ArrowTrendingUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Active Users',
      value: analytics?.users?.total || '0',
      change: '+15.3%',
      changeType: 'positive',
      icon: UsersIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Insights into your restaurant's performance</p>
        </div>
        
        <div className="flex space-x-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <div className="flex items-center mt-1">
                  {metric.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${
                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Revenue chart will be displayed here</p>
              <p className="text-sm text-gray-400">Integration with chart library needed</p>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="space-y-4">
            {analytics?.orders?.byStatus?.map((status) => (
              <div key={status._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status._id === 'pending' ? 'bg-yellow-400' :
                    status._id === 'preparing' ? 'bg-blue-400' :
                    status._id === 'ready' ? 'bg-green-400' :
                    status._id === 'completed' ? 'bg-green-500' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status._id}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics.orders.total > 0 ? (status.count / analytics.orders.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">
                    {status.count}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No order data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Popular Dishes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Dishes</h3>
        <div className="space-y-4">
          {analytics?.popularDishes?.length > 0 ? (
            analytics.popularDishes.slice(0, 5).map((dish, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-orange-600 mr-3">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{dish.dishName}</p>
                    <p className="text-sm text-gray-500">${dish.price} each</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{dish.totalQuantity} orders</p>
                  <p className="text-sm text-gray-500">
                    ${(dish.totalQuantity * dish.price).toFixed(2)} revenue
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No dish data available</p>
          )}
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
        <div className="space-y-4">
          {analytics?.revenue?.byMonth?.length > 0 ? (
            analytics.revenue.byMonth.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-gray-500">{month.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${month.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    ${month.orders > 0 ? (month.revenue / month.orders).toFixed(2) : '0'} avg
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No revenue data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
