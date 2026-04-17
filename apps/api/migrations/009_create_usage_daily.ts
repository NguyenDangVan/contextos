import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('usage_daily', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.date('date').notNullable();
    table.string('model', 100).nullable();
    table.bigInteger('total_tokens').defaultTo(0);
    table.integer('total_calls').defaultTo(0);
    table.decimal('total_cost_usd', 10, 4).defaultTo(0);
    table.unique(['project_id', 'date', 'model']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('usage_daily');
}
