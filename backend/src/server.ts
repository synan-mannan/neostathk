import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { initSocketIO } from "./sockets/index.js";

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO with server
initSocketIO(server);

server.listen(env.PORT, () => {
  console.log(`NeoStats Backend API running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Allowed CORS Origin: ${env.FRONTEND_URL}`);
});

// Graceful Shutdown Handler
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log(" HTTP server closed.");
    try {
      await pool.end();
      console.log(" PostgreSQL connection pool closed.");
      process.exit(0);
    } catch (err) {
      console.error(" Error closing PostgreSQL pool:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error(" Forcing server shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
