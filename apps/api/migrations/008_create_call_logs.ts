import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('call_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('session_id').nullable().references('id').inTable('sessions').onDelete('SET NULL');
    table.uuid('app_user_id').nullable().references('id').inTable('app_users').onDelete('SET NULL');
    table.uuid('prompt_version_id').nullable().references('id').inTable('prompt_versions').onDelete('SET NULL');
    table.string('model', 100).notNullable();
    table.jsonb('messages_payload').nullable(); // full context sent to LLM
    table.jsonb('response_payload').nullable();
    table.integer('prompt_tokens').nullable();
    table.integer('completion_tokens').nullable();
    table.integer('total_tokens').nullable();
    table.integer('latency_ms').nullable();
    table.decimal('cost_usd', 10, 6).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    'CREATE INDEX idx_call_logs_project ON call_logs(project_id, created_at DESC)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_call_logs_session ON call_logs(session_id)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('call_logs');
}
