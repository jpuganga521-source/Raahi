import "dotenv/config";
import { app } from "./app.ts";
import { databasePool } from "./database.ts";

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535.");
}

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Raahi API listening on http://127.0.0.1:${port}`);
});

let isShuttingDown = false;
function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; closing the Raahi API.`);

  server.close((error) => {
    if (error) {
      console.error("Could not close the HTTP server cleanly:", error);
      process.exitCode = 1;
    }

    void databasePool?.end().catch((poolError: unknown) => {
      console.error("Could not close the MySQL pool cleanly:", poolError);
      process.exitCode = 1;
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
