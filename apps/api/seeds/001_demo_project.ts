import CryptoJS from 'crypto-js';
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clean up existing data (in reverse FK order)
  await knex('routing_rules').del();
  await knex('usage_daily').del();
  await knex('call_logs').del();
  await knex('prompt_versions').del();
  await knex('prompt_templates').del();
  await knex('memories').del();
  await knex('messages').del();
  await knex('sessions').del();
  await knex('app_users').del();
  await knex('projects').del();

  const apiKey = 'ctx_demo_key_2026_hackathon_testsprite';
  const apiKeyHash = CryptoJS.SHA256(apiKey).toString();

  // Create demo project
  const [project] = await knex('projects').insert({
    owner_id: 'demo-owner-001',
    name: 'Demo Project',
    api_key: apiKey,
    api_key_hash: apiKeyHash,
    llm_provider: 'openai',
    settings: JSON.stringify({
      recentTurnsToKeep: 10,
      compressionThreshold: 0.8,
      defaultModel: 'gpt-4o-mini',
    }),
  }).returning('*');

  // Create demo app user
  const [appUser] = await knex('app_users').insert({
    project_id: project.id,
    external_id: 'alex',
    metadata: JSON.stringify({ name: 'Alex Demo', plan: 'starter' }),
  }).returning('*');

  // Create demo session
  const [session] = await knex('sessions').insert({
    project_id: project.id,
    app_user_id: appUser.id,
    turn_count: 4,
    token_count: 680,
  }).returning('*');

  // Create demo messages
  await knex('messages').insert([
    { session_id: session.id, role: 'user', content: 'Hi, my name is Alex!', token_count: 8 },
    { session_id: session.id, role: 'assistant', content: 'Hello Alex! Nice to meet you. How can I help you today?', token_count: 14 },
    { session_id: session.id, role: 'user', content: 'I prefer dark mode and concise answers.', token_count: 9 },
    { session_id: session.id, role: 'assistant', content: 'Got it! I\'ll keep my responses brief and to the point. What would you like to know?', token_count: 18 },
  ]);

  const [secondSession] = await knex('sessions').insert({
    project_id: project.id,
    app_user_id: appUser.id,
    turn_count: 2,
    token_count: 420,
  }).returning('*');

  await knex('messages').insert([
    { session_id: secondSession.id, role: 'user', content: 'Can you summarize my plan for this week?', token_count: 10 },
    { session_id: secondSession.id, role: 'assistant', content: 'You want concise planning help and prefer dark-mode interfaces.', token_count: 12 },
  ]);

  // Create demo memories
  await knex('memories').insert([
    {
      project_id: project.id,
      app_user_id: appUser.id,
      content: 'User\'s name is Alex',
      category: 'personal',
      confidence: 0.95,
      source_session_id: session.id,
    },
    {
      project_id: project.id,
      app_user_id: appUser.id,
      content: 'User prefers dark mode',
      category: 'preference',
      confidence: 0.9,
      source_session_id: session.id,
    },
    {
      project_id: project.id,
      app_user_id: appUser.id,
      content: 'User prefers concise, brief answers',
      category: 'preference',
      confidence: 0.85,
      source_session_id: session.id,
    },
  ]);

  // Create demo prompt template + versions
  const [template] = await knex('prompt_templates').insert({
    project_id: project.id,
    name: 'Customer Support Assistant',
    description: 'A helpful customer support chatbot prompt',
  }).returning('*');

  const promptVersions = await knex('prompt_versions').insert([
    {
      template_id: template.id,
      version: '1.0.0',
      content: 'You are a helpful customer support assistant for {productName}. Be polite and professional.',
      variables: JSON.stringify(['productName']),
      deployment: 'staging',
    },
    {
      template_id: template.id,
      version: '1.1.0',
      content: 'You are a friendly customer support assistant for {productName}. Address the user by {userName} when possible. Keep answers concise.',
      variables: JSON.stringify(['productName', 'userName']),
      deployment: 'production',
    },
  ]).returning('*');

  const stagingPromptVersion = promptVersions.find((version) => version.deployment === 'staging') || promptVersions[0];
  const productionPromptVersion = promptVersions.find((version) => version.deployment === 'production') || promptVersions[1];

  await knex('call_logs').insert([
    {
      project_id: project.id,
      session_id: session.id,
      app_user_id: appUser.id,
      prompt_version_id: productionPromptVersion.id,
      model: 'gpt-4o-mini',
      messages_payload: JSON.stringify([
        { role: 'system', content: productionPromptVersion.content },
        { role: 'user', content: 'I prefer dark mode and concise answers.' },
      ]),
      response_payload: JSON.stringify({
        role: 'assistant',
        content: 'Got it. I will keep answers concise and remember your dark mode preference.',
      }),
      prompt_tokens: 82,
      completion_tokens: 21,
      total_tokens: 103,
      latency_ms: 420,
      cost_usd: '0.0008',
    },
    {
      project_id: project.id,
      session_id: secondSession.id,
      app_user_id: appUser.id,
      prompt_version_id: stagingPromptVersion.id,
      model: 'gpt-4o-mini',
      messages_payload: JSON.stringify([
        { role: 'system', content: stagingPromptVersion.content },
        { role: 'user', content: 'What do you remember about me?' },
      ]),
      response_payload: JSON.stringify({
        role: 'assistant',
        content: 'You are Alex, prefer dark mode, and like concise answers.',
      }),
      prompt_tokens: 74,
      completion_tokens: 18,
      total_tokens: 92,
      latency_ms: 380,
      cost_usd: '0.0007',
    },
  ]);

  // Create demo routing rule
  await knex('routing_rules').insert({
    project_id: project.id,
    priority: 1,
    condition: JSON.stringify({ messageLength: { lt: 100 } }),
    target_model: 'gpt-4o-mini',
    is_active: true,
  });

  // Create demo usage data (last 7 days)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    await knex('usage_daily').insert({
      project_id: project.id,
      date: dateStr,
      model: 'gpt-4o-mini',
      total_tokens: 10000 + i * 6500,
      total_calls: 50 + i * 18,
      total_cost_usd: (0.5 + i * 0.25).toFixed(4),
    });
  }

  console.log('✅ Seed data inserted successfully');
  console.log(`   API Key: ${apiKey}`);
  console.log(`   Project: ${project.name} (${project.id})`);
  console.log(`   App User: ${appUser.external_id} (${appUser.id})`);
  console.log(`   Sessions: ${session.id}, ${secondSession.id}`);
  console.log(`   Call Logs: 2`);
}
