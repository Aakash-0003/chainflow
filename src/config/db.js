import pg from 'pg';
import { config } from './env.js';
import logger from './logger.js';
const { Pool } = pg;

const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: false
});

pool.on('connect', () => {
    logger.info('Connected to the database');
});

pool.on("error", (err) => {
    logger.error("Unexpected Postgres error", err);
    process.exit(1);
});

export default pool;