import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('owner_id', 255).notNullable(); // simplified: no auth.users FK for hackathon
    table.string('name', 255).notNullable();
    table.string('api_key', 64).unique().notNullable();
    table.string('api_key_hash', 128).unique().notNullable(); // SHA-256 hash for lookup
    table.string('llm_provider', 50).notNullable().defaultTo('openai');
    table.jsonb('settings').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('projects');
}
