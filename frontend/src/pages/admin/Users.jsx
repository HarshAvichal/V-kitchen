import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { 
  EyeIcon,
  EnvelopeIcon,
  PhoneIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20
  });
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    user: null,
    stats: null,
    loadingStats: false
  });

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(filters);
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format date with day suffix (e.g., 9th Oct 2025)
  const formatDateWithSuffix = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }); // e.g., Oct
    const year = date.getFullYear();

    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
      suffix = 'st';
    } else if (day === 2 || day === 22) {
      suffix = 'nd';
    } else if (day === 3 || day === 23) {
      suffix = 'rd';
    }
    return `${day}${suffix} ${month} ${year}`;
  };

  const handlePreviewClick = async (user) => {
    setPreviewModal({
      isOpen: true,
      user: user,
      stats: null,
      loadingStats: true
    });

    try {
      const response = await adminAPI.getUserStats(user._id);
      setPreviewModal(prev => ({
        ...prev,
        stats: response.data.data,
        loadingStats: false
      }));
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setPreviewModal(prev => ({
        ...prev,
        stats: null,
        loadingStats: false
      }));
    }
  };

  const handlePreviewClose = () => {
    setPreviewModal({ isOpen: false, user: null, stats: null, loadingStats: false });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-lg text-gray-600 mt-2">
            View and manage customer accounts
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-600 font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user._id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center mb-1">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {formatPhoneNumber(user.phone)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handlePreviewClick(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View User Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found.</p>
          </div>
        )}

        {/* User Preview Modal */}
        {previewModal.isOpen && previewModal.user && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={handlePreviewClose}
          >
            <div 
              className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  User Details - {previewModal.user.name}
                </h3>
                <button
                  onClick={handlePreviewClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Personal Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="text-sm font-medium">{previewModal.user.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium">{previewModal.user.email}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="text-sm font-medium">
                          {previewModal.user.phone ? formatPhoneNumber(previewModal.user.phone) : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Member Since:</span>
                        <span className="text-sm font-medium">
                          {formatDateWithSuffix(previewModal.user.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Account Status:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          previewModal.user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {previewModal.user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Account Statistics */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Account Statistics</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Orders:</span>
                        <span className="text-sm font-medium">
                          {previewModal.loadingStats ? 'Loading...' : (previewModal.stats?.totalOrders || 0)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Spent:</span>
                        <span className="text-sm font-medium">
                          {previewModal.loadingStats ? 'Loading...' : `$${(previewModal.stats?.totalSpent || 0).toFixed(2)}`}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Order:</span>
                        <span className="text-sm font-medium">
                          {previewModal.loadingStats ? 'Loading...' : 
                            previewModal.stats?.lastOrder ? 
                              `${previewModal.stats.lastOrder.orderNumber} (${formatDate(previewModal.stats.lastOrder.date)})` : 
                              'Never'
                          }
                        </span>
                      </div>
                      
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h5>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">
                          Account created on {formatDateWithSuffix(previewModal.user.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last updated on {formatDateWithSuffix(previewModal.user.updatedAt)}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
