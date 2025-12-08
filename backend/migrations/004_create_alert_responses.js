/**
 * Migration: Create alert_responses table
 * Tracks which users responded to which emergency alerts
 */

exports.up = async function(knex) {
  // Create alert_responses table
  await knex.schema.createTable('alert_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_id').notNullable().references('id').inTable('emergency_alerts').onDelete('CASCADE');
    table.uuid('responder_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('responded_at').notNullable().defaultTo(knex.fn.now());
    table.text('message').nullable(); // Optional message from responder
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Unique constraint: one user can only respond once per alert
    table.unique(['alert_id', 'responder_id']);
    
    // Indexes for performance
    table.index('alert_id');
    table.index('responder_id');
  });

  console.log('✅ Created alert_responses table');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('alert_responses');
  console.log('✅ Dropped alert_responses table');
};
