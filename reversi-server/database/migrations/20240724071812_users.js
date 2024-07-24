/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
        table.string('username').notNullable().unique();
        table.string('email').unique();
        table.string('password');
        table.string('salt');
        table.boolean('is_anonymous').defaultTo(false);
        table.enu('status', ['active', 'suspended', 'deleted']).defaultTo('active');
        table.timestamp('last_login');
        table.enu('role', ['user', 'admin']).defaultTo('user');
        table.timestamps(true, true);
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('users');
  };
  