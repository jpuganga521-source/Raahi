import mysql from "mysql2/promise";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { open } from "node:fs/promises";
import { emitKeypressEvents } from "node:readline";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const database = "raahi_dev";
const appUser = "raahi_app";
const appHost = "127.0.0.1";
const projectEnv = fileURLToPath(new URL("../.env", import.meta.url));

async function readHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run `npm run db:setup` in an interactive terminal so passwords can be entered without echo.");
  }

  return new Promise((resolve, reject) => {
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(label);
    let value = "";

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Database setup cancelled."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value);
        return;
      }

      if (key.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      if (character && !key.ctrl && character >= " ") {
        value += character;
        process.stdout.write("*");
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

function sameSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

async function main() {
  const rootPassword = await readHidden("MySQL root password (input hidden; blank if none): ");
  const appPassword = await readHidden("Choose a new password for raahi_app (input hidden): ");
  if (appPassword.length < 16 || appPassword.includes("\n") || appPassword.includes("\r")) {
    throw new Error("Choose an app password with at least 16 characters and no line breaks.");
  }
  if (sameSecret(rootPassword, appPassword)) {
    throw new Error("Use a different password for raahi_app than for MySQL root.");
  }

  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST ?? appHost,
      port: Number(process.env.DB_PORT ?? "3306"),
      user: "root",
      password: rootPassword,
      connectTimeout: 5000,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.query(
      `CREATE USER IF NOT EXISTS '${appUser}'@'${appHost}' IDENTIFIED BY ${mysql.escape(appPassword)}`,
    );
    await connection.query(
      `ALTER USER '${appUser}'@'${appHost}' IDENTIFIED BY ${mysql.escape(appPassword)}`,
    );
    await connection.query(
      `GRANT ALL PRIVILEGES ON ${mysql.escapeId(database)}.* TO '${appUser}'@'${appHost}'`,
    );
  } catch (error) {
    console.error("Could not configure the local Raahi database. Check the root password and retry.");
    throw error;
  } finally {
    await connection?.end();
  }

  let envFile;
  try {
    envFile = await open(projectEnv, "wx", 0o600);
    await envFile.writeFile([
      "PORT=3000",
      `DB_HOST=${process.env.DB_HOST ?? appHost}`,
      `DB_PORT=${process.env.DB_PORT ?? "3306"}`,
      `DB_USER=${appUser}`,
      `DB_PASSWORD=${JSON.stringify(appPassword)}`,
      `DB_NAME=${database}`,
      `OTP_HASH_SECRET=${randomBytes(32).toString("base64url")}`,
      "",
    ].join("\n"), "utf8");
  } catch (error) {
    console.error("The database account was created, but the project .env file could not be created.");
    throw error;
  } finally {
    await envFile?.close();
  }

  dotenv.config({ path: projectEnv, override: true });
  console.log("Local Raahi database and app account are configured. Applying the initial schema...");
  await import("./migrate.ts");
  if (process.exitCode !== 0) {
    throw new Error("Database migration failed. Check the migration output and run `npm run db:migrate` after fixing the issue.");
  }
  console.log("MySQL setup complete. The raahi_app password is saved only in the git-ignored .env file.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Local database setup failed.");
  process.exitCode = 1;
});
