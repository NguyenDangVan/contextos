import knex from 'knex';
import { config } from './config.js';

export const db = knex({
  client: 'pg',
  connection: config.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
});

export default db;
