import axios from 'axios';
import { sendSOSAlertSupabase, getAlertHistorySupabase } from './supabaseApi';

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
let userEmail = null;
const USE_SUPABASE = String(process.env.EXPO_PUBLIC_USE_SUPABASE).toLowerCase() === 'true';

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const setUserEmail = (email) => {
  userEmail = email;
  if (email) {
    api.defaults.headers.common['x-user-email'] = email;
  } else {
    delete api.defaults.headers.common['x-user-email'];
  }
};

// User Registration
export const signupUser = async (userData) => {
  try {
    const response = await api.post('/signup', {
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      password: userData.password,
      timestamp: new Date().toISOString(),
    });
    
    if (response.data.success) {
      setUserEmail(userData.email);
    }
    
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
      setUserEmail(response.data.user?.email);
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
    if (USE_SUPABASE) {
      return await sendSOSAlertSupabase(sosData);
    }
    const response = await api.post('/sos', {
      ...sosData,
      timestamp: new Date().toISOString(),
    });
    
    return response.data;
  } catch (error) {
    console.error('SOS Alert API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send SOS alert');
  }
};

// Get Alert History (supports Supabase when enabled)
export const getAlertHistory = async () => {
  try {
    if (USE_SUPABASE) {
      return await getAlertHistorySupabase();
    }
    const response = await api.get('/alert-history');
    return response.data;
  } catch (error) {
    console.error('Alert History Error:', error.response?.data || error.message);
    return { success: true, alerts: [] };
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

// Update User Profile
export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/profile', {
      name: profileData.name,
      phone: profileData.phone,
      profileImage: profileData.profileImage,
    });
    
    return response.data;
  } catch (error) {
    console.error('Profile Update Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update profile');
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