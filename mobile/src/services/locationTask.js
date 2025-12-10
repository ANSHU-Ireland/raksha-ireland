import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateUserLocation } from '../api/aws';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      try {
        // Update user location in backend
        await updateUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date(location.timestamp).toISOString(),
        });
        
        console.log('Background location updated:', {
          lat: location.coords.latitude.toFixed(4),
          lng: location.coords.longitude.toFixed(4),
        });
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    }
  }
});

// Start background location tracking
export const startBackgroundLocationTracking = async () => {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    if (isRegistered) {
      console.log('Background location tracking already active');
      return { success: true, message: 'Already tracking' };
    }

    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted, will use foreground only');
    }

    // Start location tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // Update every 1 minute
      distanceInterval: 100, // Or when moved 100 meters
      foregroundService: {
        notificationTitle: 'RAKSHA Ireland',
        notificationBody: 'Location tracking active for emergency services',
        notificationColor: '#d32f2f',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Background location tracking started');
    return { success: true, message: 'Tracking started' };
  } catch (error) {
    console.error('Failed to start background location tracking:', error);
    return { success: false, message: error.message };
  }
};

// Stop background location tracking
export const stopBackgroundLocationTracking = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
      return { success: true, message: 'Tracking stopped' };
    }
    
    return { success: true, message: 'Not tracking' };
  } catch (error) {
    console.error('Failed to stop background location tracking:', error);
    return { success: false, message: error.message };
  }
};

// Check if background tracking is active
export const isBackgroundTrackingActive = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch (error) {
    console.error('Failed to check tracking status:', error);
    return false;
  }
};

export default {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundTrackingActive,
};
