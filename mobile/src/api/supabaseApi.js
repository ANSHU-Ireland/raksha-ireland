import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure a user record exists in Supabase users table; returns id or null
export async function ensureSupabaseUserId(appUser) {
  try {
    const email = appUser?.email;
    const name = appUser?.name || appUser?.full_name || 'Anonymous User';
    const phone = appUser?.phone_number || appUser?.phone || null;
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

    // Create minimal user row with all required fields
    const newUser = {
      email,
      full_name: name,
      phone_number: phone,
      status: 'active',
      role: 'user',
      verification_status: 'verified',
      location_enabled: true,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert([newUser])
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
  // sosData: { userId, location{lat,lon}, message, h3Index, name, phone } and possibly user info serialized elsewhere
  try {
    const savedUserStr = await AsyncStorage.getItem('user');
    const appUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    
    console.log('[SOS] App user:', appUser ? { email: appUser.email, name: appUser.name } : 'null');
    
    const supabaseUserId = await ensureSupabaseUserId(appUser);
    
    if (!supabaseUserId) {
      console.error('[SOS] Failed to get/create Supabase user ID');
      throw new Error('User not found. Please log in again.');
    }
    
    console.log('[SOS] Supabase user ID:', supabaseUserId);

    const latitude = sosData?.location?.latitude;
    const longitude = sosData?.location?.longitude;
    const message = sosData?.message || 'Emergency assistance needed';
    const radius_meters = sosData?.radius_meters || 3000;
    const h3_index = sosData?.h3Index || null;
    const name = sosData?.name || appUser?.full_name || appUser?.name || null;
    const phone = sosData?.phone || appUser?.phone_number || appUser?.phone || null;

    const payload = {
      user_id: supabaseUserId,
      latitude,
      longitude,
      message,
      radius_meters,
      h3_index,
      name,
      phone,
      status: 'active',
      responder_count: 0,
    };
    
    console.log('[SOS] Alert payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([payload])
      .select('id');

    if (error) {
      console.error('[SOS] Supabase insert error:', error);
      throw error;
    }

    console.log('[SOS] Alert created successfully:', data);
    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.error('[Supabase] sendSOSAlert failed', error.message, error);
    throw new Error(`Failed to send SOS: ${error.message}`);
  }
}

export async function getAlertHistorySupabase() {
  try {
    // Calculate timestamp for 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const oneHourAgoISO = oneHourAgo.toISOString();

    console.log('[Supabase] Fetching RESOLVED alerts from last 1 hour, limit: 5');

    // Fetch alerts from the last 1 hour only, limit to 5
    const { data: alerts, error: alertsErr } = await supabase
      .from('emergency_alerts')
      .select('id, user_id, latitude, longitude, message, created_at, status')
      .eq('status', 'resolved')
      .gte('created_at', oneHourAgoISO)
      .order('created_at', { ascending: false })
      .limit(5);

    if (alertsErr) throw alertsErr;

    console.log('[Supabase] Found', alerts?.length || 0, 'alerts');

    if (!alerts || alerts.length === 0) return { success: true, alerts: [] };

    // Build user id set
    const userIds = Array.from(new Set(alerts.map(a => a.user_id).filter(Boolean)));
    let usersById = {};

    console.log('[Supabase] Fetching user data for', userIds.length, 'users');

    if (userIds.length) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email, profile_image')
        .in('id', userIds);
      
      console.log('[Supabase] User data:', users);
      
      if (!usersErr && users) {
        usersById = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
      }
    }

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const publicBase = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public` : '';
    const normalizeImageUrl = (val) => {
      if (!val) return null;
      const s = String(val);
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      if (publicBase) return `${publicBase}/${s.replace(/^\//, '')}`;
      return null;
    };

    // Map to app alert shape
    const mapped = alerts.map(a => {
      const u = a.user_id ? usersById[a.user_id] : null;
      const alert = {
        alertId: a.id,
        name: u?.full_name || 'Unknown User',
        phone: null,
        profileImage: normalizeImageUrl(u?.profile_image) || null,
        location: a.latitude && a.longitude ? { latitude: Number(a.latitude), longitude: Number(a.longitude) } : null,
        timestamp: a.created_at || new Date().toISOString(),
        message: a.message || 'Emergency assistance needed',
        status: a.status,
      };
      
      if (alert.profileImage) {
        console.log('[Supabase] Alert includes profile image:', alert.profileImage, 'for user:', alert.name);
      }
      
      return alert;
    });

    return { success: true, alerts: mapped };
  } catch (error) {
    console.warn('[Supabase] getAlertHistory failed', error.message);
    return { success: true, alerts: [] };
  }
}

// Mark the current user's latest active alert as resolved
export async function markMyLatestAlertResolved() {
  try {
    // Identify current app user
    const savedUserStr = await AsyncStorage.getItem('user');
    const appUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    const email = appUser?.email || null;
    if (!email) {
      throw new Error('No user email found');
    }

    // Fetch Supabase user id by email
    const { data: sbUser, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (userErr) throw userErr;
    const userId = sbUser?.id;
    if (!userId) throw new Error('Supabase user not found');

    // Get latest active alert for this user
    const { data: alerts, error: alertsErr } = await supabase
      .from('emergency_alerts')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    if (alertsErr) throw alertsErr;
    const latest = alerts && alerts[0];
    if (!latest) {
      return { success: false, message: 'No active alert to resolve' };
    }

    // Update status to resolved
    const { error: updErr } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', latest.id);
    if (updErr) throw updErr;

    return { success: true, alertId: latest.id };
  } catch (e) {
    console.warn('[Supabase] markMyLatestAlertResolved failed', e.message);
    return { success: false, message: e.message };
  }
}

// Fetch active alerts (recent first, limited)
export async function getActiveAlertsSupabase(limit = 20) {
  try {
    const { data: alerts, error } = await supabase
      .from('emergency_alerts')
      .select('id, user_id, name, phone, latitude, longitude, message, created_at, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    // Fetch users for profile images
    const userIds = Array.from(new Set((alerts || []).map(a => a.user_id).filter(Boolean)));
    let usersById = {};
    if (userIds.length) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email, profile_image')
        .in('id', userIds);
      if (!usersErr && users) {
        usersById = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
      }
    }

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const publicBase = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public` : '';
    const normalizeImageUrl = (val) => {
      if (!val) return null;
      const s = String(val);
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      if (publicBase) return `${publicBase}/${s.replace(/^\//, '')}`;
      return null;
    };

    const mapped = (alerts || []).map(a => {
      const u = a.user_id ? usersById[a.user_id] : null;
      return {
        alertId: a.id,
        name: u?.full_name || u?.email || a?.name || 'Unknown User',
        phone: a?.phone || null,
        profileImage: normalizeImageUrl(u?.profile_image) || null,
        location: a.latitude && a.longitude ? { latitude: Number(a.latitude), longitude: Number(a.longitude) } : null,
        timestamp: a.created_at,
        message: a.message || 'Emergency assistance needed',
        status: a.status,
      };
    });

    return { success: true, alerts: mapped };
  } catch (e) {
    console.warn('[Supabase] getActiveAlertsSupabase failed', e.message);
    return { success: true, alerts: [] };
  }
}
