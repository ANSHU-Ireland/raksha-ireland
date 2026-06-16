import { Platform } from 'react-native';
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

// Firebase web configuration (public, not secret)
const firebaseConfig = {
  apiKey: 'AIzaSyBLkrUSTdQsBgchVDOOvhv84vfntzaEyBU',
  authDomain: 'raksha-ireland-app.firebaseapp.com',
  projectId: 'raksha-ireland-app',
  storageBucket: 'raksha-ireland-app.firebasestorage.app',
  messagingSenderId: '267338469966',
  appId: '1:267338469966:android:9f4dcf927a787fc673e91f',
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
