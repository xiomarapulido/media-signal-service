import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { Pool } = pg;

const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5439;

export const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: dbPort,
  database: process.env.DB_NAME || "media_signal",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});