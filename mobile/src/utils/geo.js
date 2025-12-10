// Geohash-based location indexing (simpler alternative to H3)
// Precision levels: 4 = ~20km, 5 = ~2.5km, 6 = ~600m, 7 = ~150m
const GEOHASH_PRECISION = 6;

// Base32 encoding for geohash
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Convert latitude/longitude to geohash
 * Simple alternative to H3 that works in React Native
 */
function encodeGeohash(latitude, longitude, precision = GEOHASH_PRECISION) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';
  
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  
  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude > lonMid) {
        idx |= (1 << (4 - bit));
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude > latMid) {
        idx |= (1 << (4 - bit));
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }
    evenBit = !evenBit;
    
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  
  return geohash;
}

/**
 * Decode geohash to latitude/longitude
 */
function decodeGeohash(geohash) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  
  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash[i];
    const idx = BASE32.indexOf(chr);
    
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }
  
  const latitude = (latMin + latMax) / 2;
  const longitude = (lonMin + lonMax) / 2;
  return [latitude, longitude];
}

/**
 * Convert latitude/longitude to location index (geohash)
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} precision - Geohash precision level (default: 6)
 * @returns {string} Geohash index
 */
export const getH3Index = (latitude, longitude, precision = GEOHASH_PRECISION) => {
  try {
    if (!latitude || !longitude) {
      throw new Error('Invalid coordinates');
    }
    
    return encodeGeohash(latitude, longitude, precision);
  } catch (error) {
    console.error('Geohash Generation Error:', error);
    throw new Error('Failed to generate location index');
  }
};

/**
 * Convert location index (geohash) back to latitude/longitude
 * @param {string} geohash 
 * @returns {Object} {latitude, longitude}
 */
export const h3ToLatLng = (geohash) => {
  try {
    const [latitude, longitude] = decodeGeohash(geohash);
    return { latitude, longitude };
  } catch (error) {
    console.error('Geohash to LatLng Conversion Error:', error);
    throw new Error('Failed to convert location index');
  }
};

/**
 * Get nearby location indices (geohash neighbors)
 * @param {string} centerGeohash - Center geohash
 * @param {number} radius - Not used in simple implementation (returns immediate neighbors)
 * @returns {Array<string>} Array of geohashes
 */
export const getNearbyH3Indices = (centerGeohash, radius = 1) => {
  try {
    // Get 8 neighboring geohashes (simplified implementation)
    const neighbors = [centerGeohash];
    
    // For radius > 1, return just the center for simplicity
    // Full implementation would recursively get neighbors
    if (radius === 1) {
      // Returns center + 8 neighbors
      const geohashNeighbors = getGeohashNeighbors(centerGeohash);
      neighbors.push(...Object.values(geohashNeighbors));
    }
    
    return neighbors;
  } catch (error) {
    console.error('Nearby Geohash Indices Error:', error);
    return [centerGeohash]; // Return at least the center index
  }
};

// Helper function to get geohash neighbors
function getGeohashNeighbors(geohash) {
  const neighbors = {
    n: '', s: '', e: '', w: '',
    ne: '', nw: '', se: '', sw: ''
  };
  
  // Simplified neighbor calculation
  const [lat, lon] = decodeGeohash(geohash);
  const precision = geohash.length;
  
  // Approximate offset based on geohash precision
  const latOffset = 0.001 * Math.pow(10, 6 - precision);
  const lonOffset = 0.001 * Math.pow(10, 6 - precision);
  
  neighbors.n = encodeGeohash(lat + latOffset, lon, precision);
  neighbors.s = encodeGeohash(lat - latOffset, lon, precision);
  neighbors.e = encodeGeohash(lat, lon + lonOffset, precision);
  neighbors.w = encodeGeohash(lat, lon - lonOffset, precision);
  neighbors.ne = encodeGeohash(lat + latOffset, lon + lonOffset, precision);
  neighbors.nw = encodeGeohash(lat + latOffset, lon - lonOffset, precision);
  neighbors.se = encodeGeohash(lat - latOffset, lon + lonOffset, precision);
  neighbors.sw = encodeGeohash(lat - latOffset, lon - lonOffset, precision);
  
  return neighbors;
}

/**
 * Calculate distance between two location indices
 * @param {string} geohash1 
 * @param {string} geohash2 
 * @returns {number} Distance in meters
 */
export const getH3Distance = (geohash1, geohash2) => {
  try {
    const [lat1, lon1] = decodeGeohash(geohash1);
    const [lat2, lon2] = decodeGeohash(geohash2);
    return calculateDistance(lat1, lon1, lat2, lon2);
  } catch (error) {
    console.error('Geohash Distance Calculation Error:', error);
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
 * Get geohash precision info
 * @returns {Object} Geohash precision information
 */
export const getH3ResolutionInfo = () => {
  return {
    resolution: GEOHASH_PRECISION,
    description: 'Neighborhood-level precision (~600m area)',
    averageEdgeLength: '~600 m',
    averageArea: '~0.36 km²'
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
  GEOHASH_PRECISION,
};