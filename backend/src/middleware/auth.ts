import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { logger } from "../utils/logger";

// Rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

const strictRateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // Per minute (for sensitive endpoints)
});

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.ip || "unknown";
    await rateLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({
      success: false,
      error: "Too many requests. Please slow down.",
    });
  }
};

/**
 * Strict rate limiting for payment endpoints
 */
export const strictRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.body?.walletAddress || req.ip || "unknown";
    await strictRateLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded for payment operations. Please wait.",
    });
  }
};

/**
 * Wallet signature verification middleware
 * For production, implement proper signature verification
 */
export const verifyWalletMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { walletAddress, signature, message } = req.body;

  // Skip verification in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  if (!walletAddress || !signature || !message) {
    return res.status(401).json({
      success: false,
      error: "Missing authentication parameters",
    });
  }

  try {
    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Verify message timestamp (prevent replay attacks)
    const messageData = JSON.parse(message);
    const messageTime = new Date(messageData.timestamp).getTime();
    const now = Date.now();

    if (now - messageTime > 5 * 60 * 1000) {
      // 5 minutes
      return res.status(401).json({
        success: false,
        error: "Message expired",
      });
    }

    next();
  } catch (error) {
    logger.error("Signature verification failed", { error });
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

/**
 * Request logging middleware
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
};

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://afriflow.cronos.org",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Wallet-Address"],
  credentials: true,
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};
