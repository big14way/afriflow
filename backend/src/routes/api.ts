import { Router, Request, Response } from "express";
import { z } from "zod";
import { PaymentAgent, AgentContext } from "../agents/PaymentAgent";
import { MarketDataService } from "../services/MarketDataService";
import { X402Service } from "../services/X402Service";
import { ContractService } from "../services/ContractService";
import { logger } from "../utils/logger";

const router = Router();

// Validation schemas
const ChatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  userCountry: z.string().optional(),
  conversationId: z.string().optional(),
});

const ConfirmPaymentSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  action: z.object({
    type: z.enum(["execute_payment", "create_escrow", "release_milestone"]),
    params: z.record(z.any()),
  }),
});

const QuoteSchema = z.object({
  amount: z.number().positive(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
});

// Initialize services (in production, use dependency injection)
let paymentAgent: PaymentAgent | null = null;
let marketDataService: MarketDataService | null = null;
let contractService: ContractService | null = null;

export function initializeServices(config: {
  openaiApiKey: string;
  rpcUrl: string;
  facilitatorAddress: string;
  paymentContractAddress: string;
  escrowVaultAddress: string;
  usdcAddress: string;
  privateKey?: string;
}) {
  marketDataService = new MarketDataService();

  const x402Service = new X402Service({
    rpcUrl: config.rpcUrl,
    facilitatorAddress: config.facilitatorAddress,
    paymentContractAddress: config.paymentContractAddress,
    privateKey: config.privateKey,
  });

  contractService = new ContractService({
    rpcUrl: config.rpcUrl,
    escrowVaultAddress: config.escrowVaultAddress,
    paymentContractAddress: config.paymentContractAddress,
    usdcAddress: config.usdcAddress,
    privateKey: config.privateKey,
  });

  paymentAgent = new PaymentAgent(
    config.openaiApiKey,
    marketDataService,
    x402Service,
    contractService
  );

  logger.info("Payment services initialized");
}

// In-memory conversation storage (use Redis in production)
const conversations = new Map<string, any[]>();

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/chat
 * Process a chat message through the AI agent
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, walletAddress, userCountry, conversationId } =
      ChatMessageSchema.parse(req.body);

    if (!paymentAgent) {
      return res.status(503).json({
        success: false,
        error: "Payment agent not initialized",
      });
    }

    // Get or create conversation history
    const convId = conversationId || `${walletAddress}-${Date.now()}`;
    const history = conversations.get(convId) || [];

    // Build agent context
    const context: AgentContext = {
      userId: walletAddress,
      walletAddress,
      userCountry,
      conversationHistory: history.map((h) => ({
        role: h.role,
        content: h.content,
        timestamp: new Date(h.timestamp),
      })),
    };

    // Process message
    const response = await paymentAgent.processMessage(message, context);

    // Update conversation history
    history.push(
      { role: "user", content: message, timestamp: Date.now() },
      { role: "assistant", content: response.message, timestamp: Date.now() }
    );
    conversations.set(convId, history.slice(-20)); // Keep last 20 messages

    res.json({
      success: true,
      data: {
        message: response.message,
        requiresConfirmation: response.requiresConfirmation,
        intent: response.intent,
        action: response.action,
        transactionHash: response.transactionHash,
        conversationId: convId,
      },
    });
  } catch (error: any) {
    logger.error("Chat endpoint error", { error: error.message });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to process message",
    });
  }
});

/**
 * POST /api/chat/confirm
 * Confirm and execute a pending payment action
 */
router.post("/chat/confirm", async (req: Request, res: Response) => {
  try {
    const { walletAddress, action } = ConfirmPaymentSchema.parse(req.body);

    if (!paymentAgent) {
      return res.status(503).json({
        success: false,
        error: "Payment agent not initialized",
      });
    }

    const context: AgentContext = {
      userId: walletAddress,
      walletAddress,
      conversationHistory: [],
    };

    const response = await paymentAgent.executePayment(action, context);

    res.json({
      success: true,
      data: {
        message: response.message,
        transactionHash: response.transactionHash,
        metadata: response.metadata,
      },
    });
  } catch (error: any) {
    logger.error("Confirm endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute payment",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/quote
 * Get a payment quote with exchange rate
 */
router.post("/quote", async (req: Request, res: Response) => {
  try {
    const { amount, fromCurrency, toCurrency } = QuoteSchema.parse(req.body);

    if (!marketDataService) {
      return res.status(503).json({
        success: false,
        error: "Market data service not initialized",
      });
    }

    const quote = await marketDataService.calculatePaymentAmount({
      sendAmount: amount,
      sendCurrency: fromCurrency,
      receiveCurrency: toCurrency,
    });

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    logger.error("Quote endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: "Failed to get quote",
    });
  }
});

/**
 * GET /api/rates
 * Get current exchange rates for African currencies
 */
router.get("/rates", async (_req: Request, res: Response) => {
  try {
    if (!marketDataService) {
      return res.status(503).json({
        success: false,
        error: "Market data service not initialized",
      });
    }

    const rates = await marketDataService.getAfricanMarketOverview();

    res.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    logger.error("Rates endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: "Failed to get rates",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT HISTORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/payments/:address
 * Get payment history for an address
 */
router.get("/payments/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!contractService) {
      return res.status(503).json({
        success: false,
        error: "Contract service not initialized",
      });
    }

    const payments = await contractService.getUserPayments(address);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    logger.error("Payments endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: "Failed to get payments",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCROW ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/escrows/:address
 * Get escrows for an address
 */
router.get("/escrows/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { type } = req.query; // 'sent' or 'received'

    if (!contractService) {
      return res.status(503).json({
        success: false,
        error: "Contract service not initialized",
      });
    }

    let escrowIds: number[];

    if (type === "received") {
      escrowIds = await contractService.getRecipientEscrows(address);
    } else {
      escrowIds = await contractService.getSenderEscrows(address);
    }

    const escrows = await Promise.all(
      escrowIds.map(async (id) => {
        const escrow = await contractService!.getEscrow(id);
        const milestones = await contractService!.getMilestones(id);
        return { ...escrow, milestones };
      })
    );

    res.json({
      success: true,
      data: escrows,
    });
  } catch (error: any) {
    logger.error("Escrows endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: "Failed to get escrows",
    });
  }
});

/**
 * GET /api/escrow/:id
 * Get escrow details
 */
router.get("/escrow/:id", async (req: Request, res: Response) => {
  try {
    const escrowId = parseInt(req.params.id);

    if (!contractService) {
      return res.status(503).json({
        success: false,
        error: "Contract service not initialized",
      });
    }

    const escrow = await contractService.getEscrow(escrowId);
    const milestones = await contractService.getMilestones(escrowId);

    res.json({
      success: true,
      data: { ...escrow, milestones },
    });
  } catch (error: any) {
    logger.error("Escrow detail endpoint error", { error: error.message });

    res.status(500).json({
      success: false,
      error: "Failed to get escrow",
    });
  }
});

/**
 * POST /api/escrow/:id/release
 * Release a milestone
 */
router.post("/escrow/:id/release", async (req: Request, res: Response) => {
  try {
    const escrowId = parseInt(req.params.id);
    const { milestoneIndex } = req.body;

    if (!contractService) {
      return res.status(503).json({
        success: false,
        error: "Contract service not initialized",
      });
    }

    const txHash = await contractService.releaseMilestone(escrowId, milestoneIndex);

    res.json({
      success: true,
      data: { transactionHash: txHash },
    });
  } catch (error: any) {
    logger.error("Milestone release error", { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to release milestone",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORRIDOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/corridors
 * Get supported payment corridors
 */
router.get("/corridors", async (_req: Request, res: Response) => {
  const corridors = {
    african: [
      { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
      { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
      { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
      { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
      { code: "TZ", name: "Tanzania", currency: "TZS", flag: "🇹🇿" },
      { code: "UG", name: "Uganda", currency: "UGX", flag: "🇺🇬" },
      { code: "ZW", name: "Zimbabwe", currency: "ZWL", flag: "🇿🇼" },
      { code: "EG", name: "Egypt", currency: "EGP", flag: "🇪🇬" },
      { code: "MA", name: "Morocco", currency: "MAD", flag: "🇲🇦" },
      { code: "SN", name: "Senegal", currency: "XOF", flag: "🇸🇳" },
    ],
    international: [
      { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
      { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
      { code: "EU", name: "European Union", currency: "EUR", flag: "🇪🇺" },
      { code: "AE", name: "UAE", currency: "AED", flag: "🇦🇪" },
      { code: "CN", name: "China", currency: "CNY", flag: "🇨🇳" },
    ],
  };

  res.json({
    success: true,
    data: corridors,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        paymentAgent: !!paymentAgent,
        marketData: !!marketDataService,
        contracts: !!contractService,
      },
    },
  });
});

export default router;
