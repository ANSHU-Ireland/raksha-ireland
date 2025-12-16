#!/usr/bin/env node
// Bulk resolve all active emergency alerts in Supabase
// Usage: node scripts/resolve_all_active.js

const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log('Resolving all active alerts...');
    const { data, error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('status', 'active')
      .select('id');

    if (error) throw error;

    console.log(`Resolved ${data?.length || 0} active alerts.`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to resolve active alerts:', e.message);
    process.exit(1);
  }
})();
