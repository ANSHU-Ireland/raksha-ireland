import { geoToH3, h3GetResolution, h3ToGeo, kRing, h3Distance } from 'h3-js';

// H3 Resolution for proximity queries
// Resolution 7: ~5.16 km average edge length (good for city-level proximity)
// Resolution 8: ~1.22 km average edge length (good for neighborhood-level)
// Resolution 9: ~461.35 m average edge length (good for precise proximity)
const H3_RESOLUTION = 8;

/**
 * Convert latitude/longitude to H3 index
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} resolution - H3 resolution level (default: 8)
 * @returns {string} H3 index
 */
export const getH3Index = (latitude, longitude, resolution = H3_RESOLUTION) => {
  try {
    if (!latitude || !longitude) {
      throw new Error('Invalid coordinates');
    }
    
    return geoToH3(latitude, longitude, resolution);
  } catch (error) {
    console.error('H3 Index Generation Error:', error);
    throw new Error('Failed to generate location index');
  }
};

/**
 * Convert H3 index back to latitude/longitude
 * @param {string} h3Index 
 * @returns {Object} {latitude, longitude}
 */
export const h3ToLatLng = (h3Index) => {
  try {
    const [latitude, longitude] = h3ToGeo(h3Index);
    return { latitude, longitude };
  } catch (error) {
    console.error('H3 to LatLng Conversion Error:', error);
    throw new Error('Failed to convert location index');
  }
};

/**
 * Get nearby H3 indices within specified radius
 * @param {string} centerH3Index - Center H3 index
 * @param {number} radius - Radius in number of H3 cells (default: 2)
 * @returns {Array<string>} Array of H3 indices
 */
export const getNearbyH3Indices = (centerH3Index, radius = 2) => {
  try {
    return kRing(centerH3Index, radius);
  } catch (error) {
    console.error('Nearby H3 Indices Error:', error);
    return [centerH3Index]; // Return at least the center index
  }
};

/**
 * Calculate distance between two H3 indices
 * @param {string} h3Index1 
 * @param {string} h3Index2 
 * @returns {number} Distance in H3 cells
 */
export const getH3Distance = (h3Index1, h3Index2) => {
  try {
    return h3Distance(h3Index1, h3Index2);
  } catch (error) {
    console.error('H3 Distance Calculation Error:', error);
    return Infinity;
  }
};

/**
 * Calculate approximate distance in meters between two coordinates
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get all H3 indices for SOS proximity search
 * Includes the center index and surrounding cells
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radiusKm - Search radius in kilometers (default: 5km)
 * @returns {Array<string>} Array of H3 indices for proximity search
 */
export const getSOSProximityIndices = (latitude, longitude, radiusKm = 5) => {
  try {
    const centerH3 = getH3Index(latitude, longitude);
    
    // Calculate H3 ring radius based on distance
    // At resolution 8, each cell is approximately 1.22km edge length
    const cellRadius = Math.ceil(radiusKm / 1.22);
    
    return getNearbyH3Indices(centerH3, cellRadius);
  } catch (error) {
    console.error('SOS Proximity Indices Error:', error);
    return [];
  }
};

/**
 * Check if two locations are within proximity for SOS alerts
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @param {number} maxDistanceKm - Maximum distance in kilometers (default: 10km)
 * @returns {boolean} True if within proximity
 */
export const isWithinSOSRange = (lat1, lon1, lat2, lon2, maxDistanceKm = 10) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= (maxDistanceKm * 1000); // Convert km to meters
};

/**
 * Format location for display
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string} Formatted location string
 */
export const formatLocation = (latitude, longitude) => {
  if (!latitude || !longitude) return 'Location unavailable';
  
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

/**
 * Get H3 resolution info
 * @returns {Object} H3 resolution information
 */
export const getH3ResolutionInfo = () => {
  return {
    resolution: H3_RESOLUTION,
    description: 'Neighborhood-level precision (~1.22km edge length)',
    averageEdgeLength: '1.22 km',
    averageArea: '0.737 km²'
  };
};

export default {
  getH3Index,
  h3ToLatLng,
  getNearbyH3Indices,
  getH3Distance,
  calculateDistance,
  getSOSProximityIndices,
  isWithinSOSRange,
  formatLocation,
  getH3ResolutionInfo,
  H3_RESOLUTION,
};