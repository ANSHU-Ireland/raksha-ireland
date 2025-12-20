import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { sendSOSAlertSupabase, getAlertHistorySupabase, markMyLatestAlertResolved, getActiveAlertsSupabase } from './supabaseApi';
import { supabase } from '../lib/supabaseClient';

// API Configuration: choose based on device type
// - iOS simulator: use localhost with SSH tunnel
// - Physical devices: use EC2 public IP via Nginx (/api prefix)
// - Android emulator: use 10.0.2.2 to reach host
const getDefaultBaseUrl = () => {
  const isDevice = Constants.isDevice;
  
  if (Platform.OS === 'ios') {
    // iOS simulator uses localhost (requires SSH tunnel), physical devices use EC2
    return isDevice ? 'http://3.254.75.134/api' : 'http://localhost:3000';
  }
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2, physical devices use EC2
    // Check if isDevice is explicitly true, otherwise assume physical device for release builds
    return (isDevice === false) ? 'http://10.0.2.2:3000' : 'http://3.254.75.134/api';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl();
console.log('[API] Base URL:', API_BASE_URL, '| isDevice:', Constants.isDevice, '| Platform:', Platform.OS);

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
export const USE_SUPABASE = String(process.env.EXPO_PUBLIC_USE_SUPABASE).toLowerCase() === 'true';

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
    console.log('📤 Sending signup request with data:', {
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      hasDocument: !!userData.idDocument,
      documentName: userData.idDocument?.name
    });
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('name', String(userData.name || ''));
    formData.append('phone', String(userData.phone || ''));
    formData.append('email', String(userData.email || ''));
    formData.append('password', String(userData.password || ''));
    formData.append('timestamp', new Date().toISOString());
    
    // Add ID document if provided
    if (userData.idDocument) {
      formData.append('idDocument', {
        uri: userData.idDocument.uri,
        type: userData.idDocument.mimeType || 'application/pdf',
        name: userData.idDocument.name,
      });
    }
    
    const response = await api.post('/signup', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
    console.log('[API] Login attempt:', { 
      email: credentials.email, 
      hasPassword: !!credentials.password,
      deviceId: credentials.deviceId 
    });
    
    const response = await api.post('/login', {
      email: credentials.email,
      password: credentials.password,
      deviceId: credentials.deviceId,
    });
    
    console.log('[API] Login response:', response.data);
    
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
    console.error('[API] Login Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 403) {
      const message = error.response?.data?.message || 'Account not approved or activated';
      throw new Error(message);
    }
    
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// User Logout
export const logoutUser = async (email) => {
  try {
    const response = await api.post('/logout', {
      email: email,
    });
    
    // Clear auth token and email
    setAuthToken(null);
    setUserEmail(null);
    
    return response.data;
  } catch (error) {
    console.error('Logout API Error:', error.response?.data || error.message);
    // Clear local auth even if server call fails
    setAuthToken(null);
    setUserEmail(null);
    return { success: false };
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
    
    // Fetch from API with limit of 5
    const response = await api.get('/alert-history', {
      params: { limit: 5, offset: 0 }
    });
    
    console.log('[API] Alert history response:', {
      count: response.data?.alerts?.length || 0,
      sample: response.data?.alerts?.[0]
    });
    
    // Filter to last 1 hour AND only resolved alerts
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    let alerts = response.data?.alerts || [];
    alerts = alerts.filter(alert => {
      const alertTime = new Date(alert.created_at || alert.timestamp);
      const status = (alert.status || '').toLowerCase();
      return alertTime >= oneHourAgo && status === 'resolved';
    });
    
    console.log('[API] Filtered to', alerts.length, 'resolved alerts from last hour');
    
    // Enrich with profile images from Supabase
    if (alerts.length > 0 && supabase) {
      try {
        const userIds = Array.from(new Set(alerts.map(a => a.user_id).filter(Boolean)));
        
        if (userIds.length > 0) {
          console.log('[API] Fetching profile images for', userIds.length, 'users from Supabase');
          
          const { data: users, error } = await supabase
            .from('users')
            .select('id, full_name, email, profile_image')
            .in('id', userIds);
          
          if (!error && users) {
            const usersById = users.reduce((acc, u) => {
              acc[u.id] = u;
              return acc;
            }, {});
            
            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
            const publicBase = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public` : '';
            const normalizeImageUrl = (val) => {
              if (!val) return null;
              const s = String(val);
              if (s.startsWith('http://') || s.startsWith('https://')) return s;
              if (publicBase) return `${publicBase}/${s.replace(/^\//, '')}`;
              return null;
            };

            // Merge profile images into alerts with normalization
            alerts = alerts.map(alert => {
              const u = alert.user_id ? usersById[alert.user_id] : null;
              const raw = u?.profile_image || null;
              const normalized = normalizeImageUrl(raw);
              if (raw && !normalized) {
                console.warn('[API] Could not normalize profile_image for user', alert.user_id, 'value:', raw);
              }
              return {
                ...alert,
                profileImage: normalized || raw || null,
              };
            });
            
            const withImages = alerts.filter(a => a.profileImage).length;
            console.log('[API] Enriched', withImages, 'alerts with profile images');
          }
        }
      } catch (enrichError) {
        console.warn('[API] Profile image enrichment failed:', enrichError.message);
        // Continue without profile images
      }
    }
    
    return {
      ...response.data,
      alerts
    };
  } catch (error) {
    console.error('Alert History Error:', error.response?.data || error.message);
    return { success: true, alerts: [] };
  }
};

// Mark my latest alert as resolved
export const resolveMyLatestAlert = async () => {
  try {
    // Prefer Supabase path when available
    return await markMyLatestAlertResolved();
  } catch (error) {
    console.error('Resolve Alert Error:', error.response?.data || error.message);
    return { success: false, message: 'Failed to resolve alert' };
  }
};

// Get Active Alerts (Supabase)
export const getActiveAlerts = async () => {
  try {
    // Use Supabase helper
    return await getActiveAlertsSupabase(20);
  } catch (error) {
    console.error('Active Alerts Error:', error.response?.data || error.message);
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