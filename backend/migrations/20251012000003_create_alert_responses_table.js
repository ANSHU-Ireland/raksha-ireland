/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('alert_responses', function(table) {
    table.uuid('id').primary();
    table.uuid('alert_id').references('id').inTable('emergency_alerts').onDelete('CASCADE');
    table.uuid('responder_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('response_type', ['acknowledged', 'responding', 'arrived']).defaultTo('acknowledged');
    table.text('notes');
    table.timestamps(true, true);
    
    table.index(['alert_id']);
    table.index(['responder_id']);
    table.index(['response_type']);
    table.unique(['alert_id', 'responder_id']); // Prevent duplicate responses
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('alert_responses');
};