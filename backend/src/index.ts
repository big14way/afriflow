import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file, override shell env vars
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

import apiRoutes, { initializeServices } from "./routes/api";
import {
  rateLimitMiddleware,
  requestLoggerMiddleware,
  errorHandlerMiddleware,
  corsConfig,
  securityHeadersMiddleware,
} from "./middleware/auth";
import { logger } from "./utils/logger";


const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time updates
const io = new SocketServer(httpServer, {
  cors: corsConfig,
});

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsConfig));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(securityHeadersMiddleware);
app.use(rateLimitMiddleware);
app.use(requestLoggerMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.use("/api", apiRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "AfriFlow API",
    version: "1.0.0",
    description: "AI-Powered Cross-Border Payment Agent for Africa",
    endpoints: {
      health: "/api/health",
      chat: "POST /api/chat",
      quote: "POST /api/quote",
      rates: "GET /api/rates",
      corridors: "GET /api/corridors",
      payments: "GET /api/payments/:address",
      escrows: "GET /api/escrows/:address",
    },
    documentation: "https://docs.afriflow.io",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use(errorHandlerMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET.IO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  logger.info("Client connected", { socketId: socket.id });

  // Join room for wallet address
  socket.on("subscribe", (walletAddress: string) => {
    socket.join(`wallet:${walletAddress}`);
    logger.info("Client subscribed to wallet updates", {
      socketId: socket.id,
      walletAddress,
    });
  });

  // Leave room
  socket.on("unsubscribe", (walletAddress: string) => {
    socket.leave(`wallet:${walletAddress}`);
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected", { socketId: socket.id });
  });
});

// Export for emitting events from other modules
export function emitPaymentUpdate(walletAddress: string, data: any) {
  io.to(`wallet:${walletAddress}`).emit("payment:update", data);
}

export function emitEscrowUpdate(walletAddress: string, data: any) {
  io.to(`wallet:${walletAddress}`).emit("escrow:update", data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZE & START
// ═══════════════════════════════════════════════════════════════════════════════

async function start() {
  try {
    // Initialize services
    initializeServices({
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      rpcUrl: process.env.CRONOS_RPC_URL || "https://evm-t3.cronos.org",
      facilitatorAddress: process.env.X402_FACILITATOR || "",
      paymentContractAddress: process.env.PAYMENT_CONTRACT || "",
      escrowVaultAddress: process.env.ESCROW_VAULT || "",
      usdcAddress: process.env.USDC_ADDRESS || "",
      privateKey: process.env.PRIVATE_KEY,
    });

    const PORT = process.env.PORT || 3001;

    httpServer.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌍 AfriFlow API Server                                     ║
║                                                              ║
║   Status:  Running                                           ║
║   Port:    ${PORT}                                              ║
║   Mode:    ${process.env.NODE_ENV || "development"}                                    ║
║                                                              ║
║   Endpoints:                                                 ║
║   • Health:    http://localhost:${PORT}/api/health              ║
║   • Chat:      http://localhost:${PORT}/api/chat                ║
║   • Rates:     http://localhost:${PORT}/api/rates               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

start();

export default app;
