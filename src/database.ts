import mysql, { type Pool } from "mysql2/promise";

const port = Number(process.env.DB_PORT ?? "3306");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT must be a valid TCP port between 1 and 65535.");
}

const host = process.env.DB_HOST?.trim();
const user = process.env.DB_USER?.trim();
const database = process.env.DB_NAME?.trim();

export const databasePool: Pool | null =
  host && user && database
    ? mysql.createPool({
        host,
        port,
        user,
        password: process.env.DB_PASSWORD ?? "",
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    : null;
