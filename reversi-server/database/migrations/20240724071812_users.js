/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
        table.string('username').notNullable();
        table.string('email').unique();
        table.string('password').nullable();
        table.string('salt').nullable();
        table.boolean('is_anonymous').defaultTo(false);
        table.string('google_id').unique().nullable();
        table.string('avatar_url').nullable();
        table.string('first_name').nullable();
        table.string('last_name').nullable();
        table.enu('auth_provider', ['local', 'google', 'anonymous']).notNullable();
        table.enu('status', ['active', 'suspended', 'deleted']).defaultTo('active');
        table.timestamp('last_login').nullable();
        table.enu('role', ['user', 'admin']).defaultTo('user');
        table.timestamps(true, true);

        // Composite unique constraint
        table.unique(['auth_provider', 'username']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('users');
};
