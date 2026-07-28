import { pool } from "../database/connection.js";
import { enrichPendingArticles } from "../services/article-enrichment.service.js";

async function run(): Promise<void> {
  try {
    const batchSizeArgument = process.argv[2];

    const batchSize =
      batchSizeArgument !== undefined
        ? Number(batchSizeArgument)
        : undefined;

    const result = await enrichPendingArticles(batchSize);

    console.log("Article enrichment completed.");
    console.log(`Processed: ${result.processed}`);
    console.log(`Succeeded: ${result.succeeded}`);
    console.log(`Failed: ${result.failed}`);
  } catch (error) {
    console.error("Article enrichment failed.", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();