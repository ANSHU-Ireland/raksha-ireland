import { Platform } from 'react-native';
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

// Firebase web configuration (public, not secret)
const firebaseConfig = {
  apiKey: 'AIzaSyBYsgLaHBAkiNXzh3pMnZH5jzfWF3_4MFk',
  authDomain: 'raksha-ireland-d8840.firebaseapp.com',
  projectId: 'raksha-ireland-d8840',
  storageBucket: 'raksha-ireland-d8840.firebasestorage.app',
  messagingSenderId: '389047725848',
  appId: '1:389047725848:web:cc454e883f39147d5ff86d',
  measurementId: 'G-0SK2JRMNGS',
};

// Initialize (avoid re-initializing in dev reloads)
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Analytics: only available on web; skip on native
export let analytics = null;
(async () => {
  try {
    if (Platform.OS === 'web' && (await analyticsSupported())) {
      analytics = getAnalytics(app);
    }
  } catch (e) {
    // Silently ignore analytics init failures in non-web environments
  }
})();
