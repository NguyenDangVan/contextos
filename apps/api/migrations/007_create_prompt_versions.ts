import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('prompt_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_id').notNullable().references('id').inTable('prompt_templates').onDelete('CASCADE');
    table.string('version', 20).notNullable(); // semver: "1.0.0"
    table.text('content').notNullable();
    table.jsonb('variables').defaultTo('[]'); // ["userName", "productName"]
    table.string('deployment', 20).defaultTo('draft'); // 'draft' | 'staging' | 'production' | 'canary'
    table.integer('canary_pct').defaultTo(0); // 0-100
    table.string('created_by', 255).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    'CREATE INDEX idx_prompt_versions_template ON prompt_versions(template_id, created_at DESC)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('prompt_versions');
}
