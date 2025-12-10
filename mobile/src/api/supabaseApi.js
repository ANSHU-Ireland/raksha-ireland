import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure a user record exists in Supabase users table; returns id or null
async function ensureSupabaseUserId(appUser) {
  try {
    const email = appUser?.email;
    const name = appUser?.name || appUser?.full_name || 'Anonymous User';
    if (!email) return null;

    // Try to find by email
    const { data: found, error: findErr } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .maybeSingle();

    if (findErr) {
      console.warn('[Supabase] find user error', findErr.message);
    }

    if (found?.id) {
      return found.id;
    }

    // Create minimal user row
    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert([{ email, full_name: name }])
      .select('id')
      .single();

    if (insertErr) {
      console.warn('[Supabase] create user error', insertErr.message);
      return null;
    }

    return inserted?.id || null;
  } catch (e) {
    console.warn('[Supabase] ensureSupabaseUserId failed', e.message);
    return null;
  }
}

export async function sendSOSAlertSupabase(sosData) {
  // sosData: { userId, location{lat,lon}, message, h3Index } and possibly user info serialized elsewhere
  try {
    const savedUserStr = await AsyncStorage.getItem('user');
    const appUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    const supabaseUserId = await ensureSupabaseUserId(appUser);

    const latitude = sosData?.location?.latitude;
    const longitude = sosData?.location?.longitude;
    const message = 'Emergency assistance needed';
    const radius_meters = 3000;

    const payload = {
      user_id: supabaseUserId,
      latitude,
      longitude,
      message,
      radius_meters,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([payload])
      .select('id');

    if (error) throw error;

    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.warn('[Supabase] sendSOSAlert failed', error.message);
    throw new Error('Failed to send SOS via Supabase');
  }
}

export async function getAlertHistorySupabase() {
  try {
    // Fetch latest alerts
    const { data: alerts, error: alertsErr } = await supabase
      .from('emergency_alerts')
      .select('id, user_id, latitude, longitude, message, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (alertsErr) throw alertsErr;

    if (!alerts || alerts.length === 0) return { success: true, alerts: [] };

    // Build user id set
    const userIds = Array.from(new Set(alerts.map(a => a.user_id).filter(Boolean)));
    let usersById = {};

    if (userIds.length) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      if (!usersErr && users) {
        usersById = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
      }
    }

    // Map to app alert shape
    const mapped = alerts.map(a => {
      const u = a.user_id ? usersById[a.user_id] : null;
      return {
        alertId: a.id,
        name: u?.full_name || 'Unknown User',
        phone: null,
        location: a.latitude && a.longitude ? { latitude: Number(a.latitude), longitude: Number(a.longitude) } : null,
        timestamp: a.created_at || new Date().toISOString(),
        message: a.message || 'Emergency assistance needed',
      };
    });

    return { success: true, alerts: mapped };
  } catch (error) {
    console.warn('[Supabase] getAlertHistory failed', error.message);
    return { success: true, alerts: [] };
  }
}
