import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  ChartBarIcon,
  ShoppingBagIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Failed to load dashboard</h1>
            <button
              onClick={fetchStats}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Orders',
      value: stats?.orders?.total || 0,
      change: stats?.orders?.today || 0,
      changeLabel: 'Today',
      icon: ShoppingBagIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Total Revenue',
      value: `$${(stats?.revenue?.total || 0).toLocaleString()}`,
      change: `$${(stats?.revenue?.today || 0).toLocaleString()}`,
      changeLabel: 'Today',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500'
    },
    {
      name: 'This Week',
      value: stats?.orders?.thisWeek || 0,
      change: stats?.orders?.thisMonth || 0,
      changeLabel: 'This Month',
      icon: ChartBarIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Total Dishes',
      value: stats?.dishes?.total || 0,
      change: stats?.dishes?.active || 0,
      changeLabel: 'Active',
      icon: UsersIcon,
      color: 'bg-orange-500'
    }
  ];

  const orderStatusData = stats?.orders?.byStatus || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">
            Overview of your V Kitchen business
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">
                    {card.changeLabel}: {card.change}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Status Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Overview</h2>
            <div className="space-y-4">
              {orderStatusData.length > 0 ? (
                orderStatusData.map((status) => (
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
                    <span className="text-sm font-bold text-gray-900">{status.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
              )}
            </div>
          </div>

          {/* Popular Dishes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Dishes</h2>
            <div className="space-y-4">
              {stats?.popularDishes && stats.popularDishes.length > 0 ? (
                stats.popularDishes.slice(0, 5).map((dish, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 mr-2">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{dish.dishName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{dish.totalQuantity} orders</div>
                      <div className="text-xs text-gray-500">${dish.price}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No popular dishes yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          {stats?.revenue?.byMonth && stats.revenue.byMonth.length > 0 ? (
            <div className="space-y-4">
              {stats.revenue.byMonth.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{month.orders} orders</span>
                    <span className="text-sm font-bold text-green-600">${month.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No revenue data available yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
