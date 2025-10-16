import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatPhoneNumber, validatePhoneNumber, cleanPhoneNumber } from '../../utils/phoneUtils';
import toast from 'react-hot-toast';
import { 
  MapPinIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  HomeIcon,
  BuildingOfficeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    getDeliveryAddresses,
    addDeliveryAddress,
    updateDeliveryAddress,
    deleteDeliveryAddress,
    setDefaultAddress
  } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  // Address management state
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressFormData, setAddressFormData] = useState({
    label: 'Home',
    customLabel: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    isDefault: false
  });
  const [addressErrors, setAddressErrors] = useState({});


  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'India'
        }
      });
    }
  }, [user]);

  // Load addresses on component mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const result = await getDeliveryAddresses();
    if (result.success) {
      setAddresses(result.data);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else if (name === 'phone') {
      // Format phone number as user types
      const formattedPhone = formatPhoneNumber(value);
      setProfileData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.phone) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }

    setIsLoading(true);
    const result = await updateProfile(profileData);
    setIsLoading(false);

    if (result.success) {
      setActiveTab('profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    const { confirmPassword, ...data } = passwordData;
    const result = await changePassword(data);
    setIsLoading(false);

    if (result.success) {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  // Address management functions
  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (addressErrors[name]) {
      setAddressErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateAddressForm = () => {
    const newErrors = {};

    if (!addressFormData.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!addressFormData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!addressFormData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!addressFormData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    }

    if (addressFormData.label === 'Other' && !addressFormData.customLabel.trim()) {
      newErrors.customLabel = 'Custom label is required when selecting "Other"';
    }

    setAddressErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    if (!validateAddressForm()) {
      return;
    }

    setIsLoading(true);
    const result = await addDeliveryAddress(addressFormData);
    setIsLoading(false);

    if (result.success) {
      setAddressFormData({
        label: 'Home',
        customLabel: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        isDefault: false
      });
      setShowAddressForm(false);
      loadAddresses();
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressFormData({
      label: address.label,
      customLabel: address.customLabel || '',
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setShowAddressForm(true);
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    
    if (!validateAddressForm()) {
      return;
    }

    setIsLoading(true);
    const result = await updateDeliveryAddress(editingAddress._id, addressFormData);
    setIsLoading(false);

    if (result.success) {
      setAddressFormData({
        label: 'Home',
        customLabel: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        isDefault: false
      });
      setEditingAddress(null);
      setShowAddressForm(false);
      loadAddresses();
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      setIsLoading(true);
      const result = await deleteDeliveryAddress(addressId);
      setIsLoading(false);

      if (result.success) {
        loadAddresses();
      }
    }
  };

  const handleSetDefault = async (addressId) => {
    setIsLoading(true);
    const result = await setDefaultAddress(addressId);
    setIsLoading(false);

    if (result.success) {
      loadAddresses();
    }
  };

  const resetAddressForm = () => {
    setAddressFormData({
      label: 'Home',
      customLabel: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      isDefault: false
    });
    setEditingAddress(null);
    setShowAddressForm(false);
    setAddressErrors({});
  };

  const getAddressIcon = (label) => {
    switch (label) {
      case 'Home':
        return <HomeIcon className="h-5 w-5" />;
      case 'Work':
        return <BuildingOfficeIcon className="h-5 w-5" />;
      default:
        return <TagIcon className="h-5 w-5" />;
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'addresses'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Delivery Addresses
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'password'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Change Password
                </button>
              </nav>
            </div>

            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full border ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={user.email}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full border ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                      placeholder="(845) 597-5135"
                      maxLength="14"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Account Type
                    </label>
                    <input
                      type="text"
                      name="role"
                      id="role"
                      value={user.role === 'admin' ? 'Administrator' : 'Customer'}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="address.street" className="block text-sm font-medium text-gray-700">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        id="address.street"
                        value={profileData.address.street}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        id="address.city"
                        value={profileData.address.city}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address.state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        id="address.state"
                        value={profileData.address.state}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        id="address.zipCode"
                        value={profileData.address.zipCode}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address.country" className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        id="address.country"
                        value={profileData.address.country}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Delivery Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                {/* Header with Add Button */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Delivery Addresses</h3>
                    <p className="text-sm text-gray-500">Manage your saved delivery addresses</p>
                  </div>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Address
                  </button>
                </div>

                {/* Address List */}
                {addresses.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No addresses</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding a new delivery address.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Address
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {addresses.map((address) => (
                      <div
                        key={address._id}
                        className={`relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                          address.isDefault ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                        }`}
                      >
                        {address.isDefault && (
                          <div className="absolute top-2 right-2">
                            <StarIcon className="h-5 w-5 text-orange-500 fill-current" />
                          </div>
                        )}
                        
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {getAddressIcon(address.label)}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {address.label === 'Other' ? address.customLabel : address.label}
                              </p>
                              {address.isDefault && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              <p>{address.street}</p>
                              <p>{address.city}, {address.state} {address.zipCode}</p>
                              <p>{address.country}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex space-x-2">
                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefault(address._id)}
                              disabled={isLoading}
                              className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                              <StarIcon className="h-3 w-3 mr-1" />
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleEditAddress(address)}
                            disabled={isLoading}
                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                          >
                            <PencilIcon className="h-3 w-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address._id)}
                            disabled={isLoading}
                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <TrashIcon className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Address Form Modal */}
                {showAddressForm && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                          </h3>
                          <button
                            onClick={resetAddressForm}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <form onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress} className="space-y-4">
                          {/* Label Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Label</label>
                            <select
                              name="label"
                              value={addressFormData.label}
                              onChange={handleAddressChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            >
                              <option value="Home">Home</option>
                              <option value="Work">Work</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Custom Label */}
                          {addressFormData.label === 'Other' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Custom Label</label>
                              <input
                                type="text"
                                name="customLabel"
                                value={addressFormData.customLabel}
                                onChange={handleAddressChange}
                                placeholder="e.g., Grandma's House"
                                className={`mt-1 block w-full border ${
                                  addressErrors.customLabel ? 'border-red-300' : 'border-gray-300'
                                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                              />
                              {addressErrors.customLabel && (
                                <p className="mt-1 text-sm text-red-600">{addressErrors.customLabel}</p>
                              )}
                            </div>
                          )}

                          {/* Street Address */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Street Address</label>
                            <input
                              type="text"
                              name="street"
                              value={addressFormData.street}
                              onChange={handleAddressChange}
                              className={`mt-1 block w-full border ${
                                addressErrors.street ? 'border-red-300' : 'border-gray-300'
                              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                            />
                            {addressErrors.street && (
                              <p className="mt-1 text-sm text-red-600">{addressErrors.street}</p>
                            )}
                          </div>

                          {/* City and State */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">City</label>
                              <input
                                type="text"
                                name="city"
                                value={addressFormData.city}
                                onChange={handleAddressChange}
                                className={`mt-1 block w-full border ${
                                  addressErrors.city ? 'border-red-300' : 'border-gray-300'
                                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                              />
                              {addressErrors.city && (
                                <p className="mt-1 text-sm text-red-600">{addressErrors.city}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">State</label>
                              <input
                                type="text"
                                name="state"
                                value={addressFormData.state}
                                onChange={handleAddressChange}
                                className={`mt-1 block w-full border ${
                                  addressErrors.state ? 'border-red-300' : 'border-gray-300'
                                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                              />
                              {addressErrors.state && (
                                <p className="mt-1 text-sm text-red-600">{addressErrors.state}</p>
                              )}
                            </div>
                          </div>

                          {/* ZIP Code and Country */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                              <input
                                type="text"
                                name="zipCode"
                                value={addressFormData.zipCode}
                                onChange={handleAddressChange}
                                className={`mt-1 block w-full border ${
                                  addressErrors.zipCode ? 'border-red-300' : 'border-gray-300'
                                } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                              />
                              {addressErrors.zipCode && (
                                <p className="mt-1 text-sm text-red-600">{addressErrors.zipCode}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Country</label>
                              <input
                                type="text"
                                name="country"
                                value={addressFormData.country}
                                onChange={handleAddressChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              />
                            </div>
                          </div>

                          {/* Default Address Checkbox */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isDefault"
                              checked={addressFormData.isDefault}
                              onChange={handleAddressChange}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                              Set as default address
                            </label>
                          </div>

                          {/* Form Actions */}
                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={resetAddressForm}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border ${
                        errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    />
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
