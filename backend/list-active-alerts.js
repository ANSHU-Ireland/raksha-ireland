const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: 'postgresql://postgres:RakshaIreland2025@db.mcyruxndjbxpvcjqdgyx.supabase.co:5432/postgres'
});

db('emergency_alerts')
  .join('users', 'emergency_alerts.user_id', 'users.id')
  .where('emergency_alerts.status', 'active')
  .select('emergency_alerts.id', 'emergency_alerts.user_id', 'users.email', 'emergency_alerts.created_at')
  .orderBy('emergency_alerts.created_at', 'desc')
  .then(alerts => {
    console.log('\n=== ACTIVE ALERTS ===\n');
    alerts.forEach(a => {
      const age = Math.round((Date.now() - new Date(a.created_at).getTime()) / 60000);
      console.log(`Alert: ${a.id.substring(0, 8)}...`);
      console.log(`  User: ${a.email}`);
      console.log(`  Created: ${a.created_at.toISOString()} (${age} mins ago)\n`);
    });
    process.exit();
  });
