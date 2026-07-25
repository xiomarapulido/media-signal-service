import { pool } from "../database/connection.js";

async function testConnection(): Promise<void> {
  try {
    console.log("Connecting to PostgreSQL...");

    const result = await pool.query<{
      now: Date;
      version: string;
    }>(`
      SELECT
        NOW() AS now,
        version() AS version;
    `);

    console.log("✅ Successfully connected to PostgreSQL!");
    console.log(`Database Time : ${result.rows[0].now}`);
    console.log(`PostgreSQL    : ${result.rows[0].version}`);
  } catch (error) {
    console.error("Failed to connect to PostgreSQL");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void testConnection();