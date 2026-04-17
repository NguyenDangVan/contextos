import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('memories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('app_user_id').notNullable().references('id').inTable('app_users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.string('category', 50).nullable(); // 'personal' | 'preference' | 'goal' | 'context'
    table.float('confidence').defaultTo(1.0);
    table.string('embedding_id', 255).nullable(); // ID in Qdrant
    table.uuid('source_session_id').nullable().references('id').inTable('sessions').onDelete('SET NULL');
    table.timestamp('expires_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    'CREATE INDEX idx_memories_user ON memories(project_id, app_user_id)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_memories_category ON memories(project_id, category)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('memories');
}
