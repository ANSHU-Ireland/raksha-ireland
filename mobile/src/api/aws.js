import axios from 'axios';

// API Configuration - will be updated with actual endpoints
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store auth token
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// User Registration
export const signupUser = async (userData) => {
  try {
    const response = await api.post('/signup', {
      name: userData.name,
      age: parseInt(userData.age),
      sex: userData.sex,
      county: userData.county,
      email: userData.email,
      timestamp: new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error('Signup API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// User Login
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/login', {
      email: credentials.email,
      password: credentials.password,
    });
    
    if (response.data.success && response.data.token) {
      setAuthToken(response.data.token);
      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Login API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      throw new Error('Account not approved or activated');
    }
    
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Register Push Notification Token
export const registerPushToken = async (pushToken) => {
  try {
    const response = await api.post('/register-push-token', {
      pushToken,
      timestamp: new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error('Push Token Registration Error:', error.response?.data || error.message);
    // Don't throw error for push token registration as it's not critical
    return { success: false };
  }
};

// Send SOS Alert
export const sendSOSAlert = async (sosData) => {
  try {
    const response = await api.post('/sos-alert', {
      ...sosData,
      timestamp: new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error('SOS Alert API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send SOS alert');
  }
};

// Get User Profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response.data;
  } catch (error) {
    console.error('Profile API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to get profile');
  }
};

// Update User Location
export const updateUserLocation = async (locationData) => {
  try {
    const response = await api.post('/update-location', {
      ...locationData,
      timestamp: new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error('Location Update Error:', error.response?.data || error.message);
    // Don't throw error for location updates as they happen frequently
    return { success: false };
  }
};

// Get Nearby Users (for SOS)
export const getNearbyUsers = async (h3Index) => {
  try {
    const response = await api.get(`/nearby-users/${h3Index}`);
    return response.data;
  } catch (error) {
    console.error('Nearby Users API Error:', error.response?.data || error.message);
    return { users: [] };
  }
};

// Test API Connection
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API Connection Test Failed:', error.message);
    return { status: 'error', message: 'API not available' };
  }
};

export default api;