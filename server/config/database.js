const { Pool } = require('pg');

// Always target the arms_system database unless explicitly overridden
const TARGET_DB = process.env.DB_NAME || 'arms_system';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: TARGET_DB,
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
};

let pool;

async function initPool() {
  try {
    pool = new Pool(dbConfig);
    const client = await pool.connect();
    console.log(`✓ Database connected successfully (schema: ${TARGET_DB})`);
    client.release();
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    console.error('Ensure PostgreSQL is running and credentials are correct.');
  }
}

// Kick off initialization immediately and keep a promise we can await
const initPromise = initPool();

// Helper function to convert MySQL-style ? placeholders to PostgreSQL-style $1, $2, etc.
function convertPlaceholders(query, params) {
  if (!params || params.length === 0) return query;

  let paramIndex = 0;
  const convertedQuery = query.replace(/\?/g, () => {
    paramIndex++;
    return `$${paramIndex}`;
  });

  return convertedQuery;
}

// Export a lightweight wrapper that waits for the pool to be ready
module.exports = {
  execute: async (...args) => {
    if (!pool) await initPromise;
    const client = await pool.connect();
    try {
      const query = args[0];
      const params = args[1] || [];
      const convertedQuery = convertPlaceholders(query, params);
      const result = await client.query(convertedQuery, params);
      return [result.rows, result];
    } finally {
      client.release();
    }
  },
  query: async (...args) => {
    if (!pool) await initPromise;
    const client = await pool.connect();
    try {
      const query = args[0];
      const params = args[1] || [];
      const convertedQuery = convertPlaceholders(query, params);
      const result = await client.query(convertedQuery, params);
      return result.rows;
    } finally {
      client.release();
    }
  },
  getConnection: async () => {
    if (!pool) await initPromise;
    const connection = await pool.connect();
    // Add execute and query methods to the connection for compatibility
    const originalQuery = connection.query;
    connection.execute = async (...args) => {
      const query = args[0];
      const params = args[1] || [];
      const convertedQuery = convertPlaceholders(query, params);
      const result = await originalQuery.call(connection, convertedQuery, params);
      return [result.rows, result];
    };
    connection.query = async (...args) => {
      const query = args[0];
      const params = args[1] || [];
      const convertedQuery = convertPlaceholders(query, params);
      const result = await originalQuery.call(connection, convertedQuery, params);
      return result.rows;
    };
    return connection;
  }
};

