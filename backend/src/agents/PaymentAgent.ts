import { ethers } from "ethers";
import OpenAI from "openai";
import { z } from "zod";
import { logger } from "../utils/logger";
import { MarketDataService } from "../services/MarketDataService";
import { X402Service } from "../services/X402Service";
import { ContractService } from "../services/ContractService";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const PaymentIntentSchema = z.object({
  type: z.enum(["instant", "escrow", "batch", "recurring", "query"]),
  action: z.enum(["send", "create_escrow", "release_milestone", "check_status", "get_rate", "get_info"]),
  // Allow any number or null during intent parsing - validate positive amounts later when executing
  amount: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  recipient: z.object({
    address: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional().nullable(),
  milestones: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    releaseCondition: z.string().optional().nullable(),
  })).optional().nullable(),
  // Accept metadata as object, string, or null (AI sometimes returns string)
  metadata: z.union([z.record(z.any()), z.string()]).optional().nullable(),
  confidence: z.number().min(0).max(1),
});

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export interface AgentContext {
  userId: string;
  walletAddress: string;
  userCountry?: string;
  conversationHistory: ConversationMessage[];
  preferences?: UserPreferences;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface UserPreferences {
  defaultCurrency: string;
  defaultRecipients: Array<{
    name: string;
    address: string;
    country: string;
  }>;
  notifications: boolean;
}

export interface AgentResponse {
  message: string;
  intent?: PaymentIntent;
  action?: PaymentAction;
  requiresConfirmation: boolean;
  transactionHash?: string;
  metadata?: Record<string, any>;
}

export interface PaymentAction {
  type: "execute_payment" | "create_escrow" | "release_milestone" | "get_quote" | "clarify";
  params: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class PaymentAgent {
  private openai: OpenAI;
  private marketData: MarketDataService;
  private x402Service: X402Service;
  private contractService: ContractService;

  // Country code mappings for corridors
  private countryCorridors: Record<string, string> = {
    nigeria: "NG",
    kenya: "KE",
    "south africa": "ZA",
    ghana: "GH",
    tanzania: "TZ",
    uganda: "UG",
    zimbabwe: "ZW",
    egypt: "EG",
    morocco: "MA",
    senegal: "SN",
    usa: "US",
    "united states": "US",
    uk: "GB",
    "united kingdom": "GB",
    uae: "AE",
    china: "CN",
    lagos: "NG",
    nairobi: "KE",
    accra: "GH",
    cairo: "EG",
    johannesburg: "ZA",
    "cape town": "ZA",
  };

  // Currency mappings
  private currencyMap: Record<string, string> = {
    ngn: "NGN",
    naira: "NGN",
    kes: "KES",
    "kenyan shilling": "KES",
    zar: "ZAR",
    rand: "ZAR",
    ghs: "GHS",
    cedi: "GHS",
    usd: "USD",
    dollars: "USD",
    gbp: "GBP",
    pounds: "GBP",
    eur: "EUR",
    euros: "EUR",
  };

  constructor(
    openaiApiKey: string,
    marketDataService: MarketDataService,
    x402Service: X402Service,
    contractService: ContractService
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.marketData = marketDataService;
    this.x402Service = x402Service;
    this.contractService = contractService;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PROCESSING METHOD
  // ═══════════════════════════════════════════════════════════════════════════

  async processMessage(
    message: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    logger.info("Processing user message", {
      userId: context.userId,
      messageLength: message.length,
    });

    try {
      // Step 1: Parse intent from natural language
      const intent = await this.parseIntent(message, context);

      // Step 2: Validate and enrich intent
      const enrichedIntent = await this.enrichIntent(intent, context);

      // Step 3: Determine required action
      const action = this.determineAction(enrichedIntent);

      // Step 4: Generate response
      const response = await this.generateResponse(
        message,
        enrichedIntent,
        action,
        context
      );

      return response;
    } catch (error) {
      logger.error("Error processing message", { error });
      return {
        message: "I apologize, but I encountered an issue processing your request. Could you please rephrase that?",
        requiresConfirmation: false,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENT PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  private async parseIntent(
    message: string,
    context: AgentContext
  ): Promise<PaymentIntent> {
    // Build conversation context summary for the AI
    const recentHistory = context.conversationHistory.slice(-6);
    const historyContext = recentHistory.length > 0
      ? `\nRecent conversation:\n${recentHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
      : '';

    const systemPrompt = `You are AfriFlow's payment intent parser. Extract payment information from natural language.

IMPORTANT: This may be a FOLLOW-UP message in an ongoing conversation. If the conversation history shows a previous payment request (with amount, destination, etc.) and the current message provides missing information (like a wallet address or amount), you MUST combine the information from BOTH messages to form a complete intent.

For example:
- If conversation shows "Send $100 to Kenya" followed by user message "0x123...", the intent should include BOTH the $100 amount AND the 0x123 recipient address.
- If the user was asked "How much would you like to send?" and replies "$50", combine with any previous context about recipient.
${historyContext}
User's country: ${context.userCountry || "Unknown"}
User's wallet: ${context.walletAddress}

African countries supported: Nigeria (NG), Kenya (KE), South Africa (ZA), Ghana (GH), Tanzania (TZ), Uganda (UG), Zimbabwe (ZW), Egypt (EG), Morocco (MA), Senegal (SN)
International: USA (US), UK (GB), UAE (AE), China (CN), EU (EU)

Common patterns:
- "Send $X to [person/place]" → instant payment (type: "instant", action: "send")
- "Pay my [relationship] in [country]" → instant payment (type: "instant", action: "send")
- "Create escrow for [project]" → escrow creation (type: "escrow", action: "create_escrow")
- "Release payment when [condition]" → milestone escrow (type: "escrow", action: "create_escrow")
- "Send X to multiple people" → batch payment (type: "batch", action: "send")
- A wallet address (0x...) as a response to "who?" → recipient for previous payment
- "What are the exchange rates for [currency]?" → rate query (type: "query", action: "get_rate")
- "Show me rates", "Get quotes", "Currency rates" → rate query (type: "query", action: "get_rate")
- "Check status", "Payment history", "Show my transactions" → info query (type: "query", action: "get_info")

Extract and return JSON with these fields:
{
  "type": "instant" | "escrow" | "batch" | "recurring" | "query",
  "action": "send" | "create_escrow" | "release_milestone" | "check_status" | "get_rate" | "get_info",
  "amount": number (in USD if currency unclear) - IMPORTANT: Look in conversation history if not in current message,
  "currency": "USD" | "NGN" | "KES" | "ZAR" | etc,
  "recipient": {
    "name": string or null,
    "address": wallet address if provided (check current message AND conversation history) or null,
    "country": country code or null (check conversation history for mentions like "Kenya", "Nigeria", etc.)
  },
  "milestones": [{ "description": string, "amount": number }] for escrow,
  "metadata": any relevant context,
  "confidence": 0.0-1.0 how confident in parsing
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...context.conversationHistory.slice(-5).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    logger.info("AI parsed intent", {
      currentMessage: message,
      parsedRecipient: parsed.recipient?.address,
      parsedAmount: parsed.amount,
      conversationHistoryLength: context.conversationHistory.length
    });
    return PaymentIntentSchema.parse(parsed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENT ENRICHMENT
  // ═══════════════════════════════════════════════════════════════════════════

  private async enrichIntent(
    intent: PaymentIntent,
    context: AgentContext
  ): Promise<PaymentIntent> {
    const enriched = { ...intent };

    // Resolve country codes
    if (enriched.recipient?.country) {
      const normalized = enriched.recipient.country.toLowerCase();
      enriched.recipient.country = this.countryCorridors[normalized] || enriched.recipient.country;
    }

    // Resolve currency
    if (enriched.currency) {
      const normalized = enriched.currency.toLowerCase();
      enriched.currency = this.currencyMap[normalized] || enriched.currency.toUpperCase();
    }

    // Get exchange rate if converting currencies
    if (enriched.amount && enriched.currency && enriched.currency !== "USD") {
      try {
        const rate = await this.marketData.getExchangeRate("USD", enriched.currency);
        enriched.metadata = {
          ...enriched.metadata,
          exchangeRate: rate,
          originalAmount: enriched.amount,
          convertedAmount: enriched.amount * rate,
        };
      } catch (error) {
        logger.warn("Failed to get exchange rate", { error });
      }
    }

    // Check recipient in user's saved recipients
    if (enriched.recipient?.name && !enriched.recipient.address) {
      const savedRecipient = context.preferences?.defaultRecipients.find(
        (r) => r.name.toLowerCase() === enriched.recipient!.name!.toLowerCase()
      );
      if (savedRecipient) {
        enriched.recipient.address = savedRecipient.address;
        enriched.recipient.country = savedRecipient.country;
      }
    }

    return enriched;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION DETERMINATION
  // ═══════════════════════════════════════════════════════════════════════════

  private determineAction(intent: PaymentIntent): PaymentAction {
    // Low confidence - need clarification
    if (intent.confidence < 0.7) {
      return {
        type: "clarify",
        params: {
          reason: "Low confidence in understanding request",
          missingFields: this.identifyMissingFields(intent),
        },
      };
    }

    // Missing critical information
    const missing = this.identifyMissingFields(intent);
    if (missing.length > 0) {
      return {
        type: "clarify",
        params: {
          reason: "Missing required information",
          missingFields: missing,
        },
      };
    }

    // Determine action type based on intent
    switch (intent.type) {
      case "instant":
        // Safety check - ensure we have a valid recipient address
        const instantRecipient = intent.recipient?.address;
        if (!instantRecipient || !instantRecipient.startsWith("0x")) {
          return {
            type: "clarify",
            params: {
              reason: "Invalid recipient address",
              missingFields: ["recipient"],
            },
          };
        }
        return {
          type: "execute_payment",
          params: {
            recipient: instantRecipient,
            amount: intent.amount,
            fromCorridor: "US", // Default, should come from context
            toCorridor: intent.recipient?.country || "KE",
            metadata: JSON.stringify(intent.metadata || {}),
          },
        };

      case "escrow":
        // Safety check for escrow recipient
        const escrowRecipient = intent.recipient?.address;
        if (!escrowRecipient || !escrowRecipient.startsWith("0x")) {
          return {
            type: "clarify",
            params: {
              reason: "Invalid recipient address",
              missingFields: ["recipient"],
            },
          };
        }
        return {
          type: "create_escrow",
          params: {
            recipient: escrowRecipient,
            totalAmount: intent.amount,
            milestones: intent.milestones,
            metadata: JSON.stringify(intent.metadata || {}),
          },
        };

      case "batch":
        return {
          type: "execute_payment",
          params: {
            batch: true,
            payments: intent.metadata?.recipients || [],
          },
        };

      case "query":
        if (intent.action === "get_rate") {
          return {
            type: "get_quote",
            params: {
              amount: intent.amount || 100, // Default to 100 for rate display
              fromCurrency: "USD",
              toCurrency: intent.currency || "NGN",
            },
          };
        } else if (intent.action === "get_info") {
          return {
            type: "get_quote",
            params: {
              queryType: "info",
            },
          };
        }
        // Fallthrough to default

      default:
        return {
          type: "get_quote",
          params: {
            amount: intent.amount || 100,
            fromCurrency: "USD",
            toCurrency: intent.currency || "NGN",
          },
        };
    }
  }

  private identifyMissingFields(intent: PaymentIntent): string[] {
    const missing: string[] = [];

    // Queries don't need amount or recipient
    if (intent.type === "query") {
      return missing;
    }

    if (intent.action === "send" || intent.action === "create_escrow") {
      // Check for valid positive amount (0, null, undefined are all invalid)
      if (!intent.amount || intent.amount <= 0) missing.push("amount");
      // For payments, we MUST have a valid wallet address (not just a name)
      const recipientAddress = intent.recipient?.address;
      if (!recipientAddress || typeof recipientAddress !== 'string' || !recipientAddress.startsWith("0x")) {
        missing.push("recipient");
      }
    }

    if (intent.type === "escrow" && (!intent.milestones || intent.milestones.length === 0)) {
      missing.push("milestones");
    }

    return missing;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async generateResponse(
    originalMessage: string,
    intent: PaymentIntent,
    action: PaymentAction,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Handle clarification needed
    if (action.type === "clarify") {
      return this.generateClarificationResponse(action.params.missingFields);
    }

    // Handle get quote
    if (action.type === "get_quote") {
      return this.generateQuoteResponse(intent, action.params);
    }

    // Handle payment execution (requires confirmation)
    if (action.type === "execute_payment" || action.type === "create_escrow") {
      return this.generateConfirmationResponse(intent, action);
    }

    // Default response
    return {
      message: "I understand you want to make a payment. Could you provide more details?",
      requiresConfirmation: false,
    };
  }

  private generateClarificationResponse(missingFields: string[]): AgentResponse {
    const fieldPrompts: Record<string, string> = {
      amount: "How much would you like to send?",
      recipient: "Who would you like to send this to? Please provide their wallet address or name.",
      milestones: "What milestones should the payment be released at?",
    };

    const prompts = missingFields.map((f) => fieldPrompts[f] || `Please provide: ${f}`);

    return {
      message: `I'd be happy to help with that payment! ${prompts.join(" ")}`,
      requiresConfirmation: false,
    };
  }

  private async generateQuoteResponse(
    intent: PaymentIntent,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    try {
      // Check if this is just a query (not a payment intent)
      const isQueryOnly = intent.type === "query";

      const rate = await this.marketData.getExchangeRate(
        params.fromCurrency,
        params.toCurrency
      );
      const amount = params.amount || 100;
      const converted = amount * rate;

      if (isQueryOnly) {
        // Just showing rates, not asking to proceed with payment
        return {
          message: `💱 **Current Exchange Rates**

1 ${params.fromCurrency} = ${rate.toFixed(4)} ${params.toCurrency}

**Example conversion:**
$${amount} USD = ${converted.toFixed(2)} ${params.toCurrency}

Would you like to send money using this rate? Just tell me the amount and recipient!`,
          intent,
          requiresConfirmation: false,
          metadata: { exchangeRate: rate, convertedAmount: converted },
        };
      } else {
        // User wants to make a payment
        return {
          message: `Current exchange rate: 1 ${params.fromCurrency} = ${rate.toFixed(4)} ${params.toCurrency}\n\n$${amount} USD = ${converted.toFixed(2)} ${params.toCurrency}\n\nWould you like to proceed with this payment?`,
          intent,
          requiresConfirmation: true,
          metadata: { exchangeRate: rate, convertedAmount: converted },
        };
      }
    } catch {
      return {
        message: "I couldn't fetch the current exchange rate. Please try again.",
        requiresConfirmation: false,
      };
    }
  }

  private generateConfirmationResponse(
    intent: PaymentIntent,
    action: PaymentAction
  ): AgentResponse {
    const fee = ((intent.amount || 0) * 0.001).toFixed(2); // 0.1% fee
    const net = ((intent.amount || 0) * 0.999).toFixed(2);

    let message: string;

    if (action.type === "create_escrow") {
      const milestoneList = intent.milestones
        ?.map((m, i) => `  ${i + 1}. ${m.description}: $${m.amount}`)
        .join("\n");

      message = `📋 **Escrow Payment Summary**

💰 Total Amount: $${intent.amount} USD
📍 Recipient: ${intent.recipient?.name || intent.recipient?.address || "Unknown"}
🌍 Destination: ${intent.recipient?.country || "Unknown"}

📌 **Milestones:**
${milestoneList}

💸 Fee: $${fee} (0.1%)
✅ Net Amount: $${net}

Reply **CONFIRM** to create this escrow, or tell me what you'd like to change.`;
    } else {
      message = `💸 **Payment Summary**

💰 Amount: $${intent.amount} USD
📍 To: ${intent.recipient?.name || intent.recipient?.address || "Unknown"}
🌍 Destination: ${intent.recipient?.country || "Unknown"}
💸 Fee: $${fee} (0.1%)
✅ Recipient receives: $${net}

⚡ Settlement: Instant (< 1 second via Cronos x402)

⚠️ **Before confirming:** Ensure you have approved USDC spending for the AfriFlow contract. You need at least $${intent.amount} USDC in your wallet.

Reply **CONFIRM** to send, or tell me what you'd like to change.`;
    }

    return {
      message,
      intent,
      action,
      requiresConfirmation: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  async executePayment(
    action: PaymentAction,
    context: AgentContext
  ): Promise<AgentResponse> {
    logger.info("Executing payment", { action, userId: context.userId });

    try {
      if (action.type === "execute_payment") {
        // Execute instant payment via x402
        const txHash = await this.x402Service.executePayment({
          sender: context.walletAddress,
          recipient: action.params.recipient,
          amount: action.params.amount,
          fromCorridor: action.params.fromCorridor,
          toCorridor: action.params.toCorridor,
          metadata: action.params.metadata,
        });

        return {
          message: `✅ **Payment Successful!**

🔗 Transaction: ${txHash}
⚡ Status: Confirmed
💰 Amount: $${action.params.amount} sent to ${action.params.recipient}

View on Cronos Explorer: https://explorer.cronos.org/tx/${txHash}`,
          transactionHash: txHash,
          requiresConfirmation: false,
        };
      }

      if (action.type === "create_escrow") {
        const escrowId = await this.contractService.createEscrow({
          sender: context.walletAddress,
          recipient: action.params.recipient,
          totalAmount: action.params.totalAmount,
          milestones: action.params.milestones,
          metadata: action.params.metadata,
        });

        return {
          message: `✅ **Escrow Created!**

📋 Escrow ID: ${escrowId}
💰 Total: $${action.params.totalAmount}
📌 Milestones: ${action.params.milestones.length}

The funds are now held securely. Milestones will be released as conditions are met.`,
          requiresConfirmation: false,
          metadata: { escrowId },
        };
      }

      return {
        message: "Unknown action type",
        requiresConfirmation: false,
      };
    } catch (error: any) {
      logger.error("Payment execution failed", { error });
      return {
        message: `❌ **Payment Failed**

Error: ${error.message || "Unknown error"}

Please check your wallet balance and try again. If the issue persists, contact support.`,
        requiresConfirmation: false,
      };
    }
  }
}
