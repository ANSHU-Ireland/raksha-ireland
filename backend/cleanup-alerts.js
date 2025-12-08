const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:RakshaIreland2025@db.mcyruxndjbxpvcjqdgyx.supabase.co:5432/postgres'
});

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

db('emergency_alerts')
  .where('status', 'active')
  .where('created_at', '<', oneHourAgo)
  .update({
    status: 'resolved',
    resolved_at: new Date(),
    updated_at: new Date()
  })
  .then(count => {
    console.log(`\n✅ Marked ${count} old alerts as resolved`);
    return db('emergency_alerts').where('status', 'active').count('* as count');
  })
  .then(result => {
    console.log(`📊 Remaining active alerts: ${result[0].count}\n`);
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
