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

    console.log("Successfully connected to PostgreSQL!");
    const row = result.rows[0];

    if (!row) {
      throw new Error("Database test query returned no rows.");
    }

    console.log(`Database Time : ${row.now}`);
    console.log(`PostgreSQL    : ${row.version}`);
  } catch (error) {
    console.error("Failed to connect to PostgreSQL");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void testConnection();