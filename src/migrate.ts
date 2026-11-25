import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import type { RowDataPacket } from "mysql2";
import { fileURLToPath } from "node:url";
import { databasePool } from "./database.ts";

if (!databasePool) {
  throw new Error("Database settings are missing. Configure .env before running migrations.");
}

const migrationDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

try {
  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  const [appliedRows] = await databasePool.query<(RowDataPacket & { migration_name: string })[]>(
    "SELECT migration_name FROM schema_migrations",
  );
  const appliedMigrations = new Set(appliedRows.map((row) => row.migration_name));
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
    .sort();

  for (const migrationName of migrationFiles) {
    if (appliedMigrations.has(migrationName)) continue;

    const contents = await readFile(new URL(`./migrations/${migrationName}`, import.meta.url), "utf8");
    const statements = contents.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await databasePool.query(statement);
    }

    await databasePool.execute(
      "INSERT INTO schema_migrations (migration_name) VALUES (?)",
      [migrationName],
    );
    console.log(`Applied migration ${migrationName}`);
  }

  console.log("Database migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await databasePool.end();
}
