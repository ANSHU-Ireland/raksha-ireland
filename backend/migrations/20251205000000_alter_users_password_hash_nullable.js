/**
 * Migration: Make password_hash nullable for Firebase users
 * @param { import("knex").Knex } knex
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255).nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255).notNullable().alter();
  });
};
