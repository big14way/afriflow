import { v4 as uuidv4 } from 'uuid';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  transactionHash?: string;
}

export interface PendingAction {
  type: 'instant_payment' | 'create_escrow' | 'confirmation_required';
  params: any;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

export interface UserPreferences {
  defaultCurrency: string;
  frequentRecipients: string[];
  recentAmounts: number[];
  preferredCorridors: {
    from: string;
    to: string;
  };
}

export interface ConversationContext {
  conversationId: string;
  userAddress: string;
  messages: ConversationMessage[];
  pendingAction: PendingAction | null;
  userPreferences: UserPreferences;
  lastActivity: Date;
  metadata: {
    totalPaymentsSent: number;
    totalEscrowsCreated: number;
    averagePaymentAmount: number;
  };
}

/**
 * Conversation Context Manager
 * Manages conversation state, user preferences, and AI context
 */
export class ConversationManager {
  private context: ConversationContext;

  constructor(userAddress: string, conversationId?: string) {
    this.context = {
      conversationId: conversationId || uuidv4(),
      userAddress,
      messages: [],
      pendingAction: null,
      userPreferences: {
        defaultCurrency: 'USDC',
        frequentRecipients: [],
        recentAmounts: [],
        preferredCorridors: {
          from: 'US',
          to: 'KE',
        },
      },
      lastActivity: new Date(),
      metadata: {
        totalPaymentsSent: 0,
        totalEscrowsCreated: 0,
        averagePaymentAmount: 0,
      },
    };

    // Load from localStorage if exists
    this.loadContext();
  }

  /**
   * Add a message to the conversation
   */
  addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const newMessage: ConversationMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message,
    };

    this.context.messages.push(newMessage);
    this.context.lastActivity = new Date();
    this.saveContext();

    return newMessage;
  }

  /**
   * Get conversation history for AI context
   * Returns last N messages to avoid token limits
   */
  getConversationHistory(maxMessages: number = 10): ConversationMessage[] {
    return this.context.messages.slice(-maxMessages);
  }

  /**
   * Set pending action that requires confirmation
   */
  setPendingAction(action: PendingAction): void {
    this.context.pendingAction = action;
    this.saveContext();
  }

  /**
   * Clear pending action
   */
  clearPendingAction(): void {
    this.context.pendingAction = null;
    this.saveContext();
  }

  /**
   * Get pending action
   */
  getPendingAction(): PendingAction | null {
    return this.context.pendingAction;
  }

  /**
   * Update user preferences based on behavior
   */
  updatePreferences(data: {
    recipient?: string;
    amount?: number;
    fromCorridor?: string;
    toCorridor?: string;
  }): void {
    if (data.recipient && !this.context.userPreferences.frequentRecipients.includes(data.recipient)) {
      this.context.userPreferences.frequentRecipients.push(data.recipient);

      // Keep only last 5 recipients
      if (this.context.userPreferences.frequentRecipients.length > 5) {
        this.context.userPreferences.frequentRecipients.shift();
      }
    }

    if (data.amount) {
      this.context.userPreferences.recentAmounts.push(data.amount);

      // Keep only last 10 amounts
      if (this.context.userPreferences.recentAmounts.length > 10) {
        this.context.userPreferences.recentAmounts.shift();
      }
    }

    if (data.fromCorridor && data.toCorridor) {
      this.context.userPreferences.preferredCorridors = {
        from: data.fromCorridor,
        to: data.toCorridor,
      };
    }

    this.saveContext();
  }

  /**
   * Update metadata after successful transaction
   */
  updateMetadata(type: 'payment' | 'escrow', amount?: number): void {
    if (type === 'payment') {
      this.context.metadata.totalPaymentsSent++;
      if (amount) {
        const total = this.context.metadata.averagePaymentAmount * (this.context.metadata.totalPaymentsSent - 1);
        this.context.metadata.averagePaymentAmount = (total + amount) / this.context.metadata.totalPaymentsSent;
      }
    } else {
      this.context.metadata.totalEscrowsCreated++;
    }

    this.saveContext();
  }

  /**
   * Get smart suggestions based on user history
   */
  getSmartSuggestions(): string[] {
    const suggestions: string[] = [];

    // Frequent recipient suggestion
    if (this.context.userPreferences.frequentRecipients.length > 0) {
      const lastRecipient = this.context.userPreferences.frequentRecipients[
        this.context.userPreferences.frequentRecipients.length - 1
      ];
      suggestions.push(`Send payment to ${lastRecipient.slice(0, 10)}...`);
    }

    // Recent amount suggestion
    if (this.context.userPreferences.recentAmounts.length > 0) {
      const avgAmount = Math.round(
        this.context.userPreferences.recentAmounts.reduce((a, b) => a + b, 0) /
          this.context.userPreferences.recentAmounts.length
      );
      suggestions.push(`Send $${avgAmount} (your usual amount)`);
    }

    // Action suggestions based on history
    if (this.context.metadata.totalEscrowsCreated > 0) {
      suggestions.push('View my escrows');
    }

    if (this.context.metadata.totalPaymentsSent > 0) {
      suggestions.push('Show transaction history');
    }

    return suggestions.slice(0, 4); // Max 4 suggestions
  }

  /**
   * Get context summary for AI prompts
   */
  getContextSummary(): string {
    const summary = [
      `User has sent ${this.context.metadata.totalPaymentsSent} payments`,
      `Created ${this.context.metadata.totalEscrowsCreated} escrows`,
    ];

    if (this.context.userPreferences.frequentRecipients.length > 0) {
      summary.push(
        `Frequent recipients: ${this.context.userPreferences.frequentRecipients.map(r => r.slice(0, 10) + '...').join(', ')}`
      );
    }

    if (this.context.metadata.averagePaymentAmount > 0) {
      summary.push(`Average payment: $${this.context.metadata.averagePaymentAmount.toFixed(2)}`);
    }

    return summary.join('. ');
  }

  /**
   * Save context to localStorage
   */
  private saveContext(): void {
    try {
      const key = `afriflow_conversation_${this.context.userAddress}`;
      localStorage.setItem(key, JSON.stringify(this.context));
    } catch (error) {
      console.error('Failed to save conversation context:', error);
    }
  }

  /**
   * Load context from localStorage
   */
  private loadContext(): void {
    try {
      const key = `afriflow_conversation_${this.context.userAddress}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle version changes
        this.context = {
          ...this.context,
          ...parsed,
          messages: parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
          lastActivity: new Date(parsed.lastActivity),
        };
      }
    } catch (error) {
      console.error('Failed to load conversation context:', error);
    }
  }

  /**
   * Clear conversation history (keep preferences)
   */
  clearHistory(): void {
    this.context.messages = [];
    this.context.pendingAction = null;
    this.saveContext();
  }

  /**
   * Reset everything
   */
  reset(): void {
    const key = `afriflow_conversation_${this.context.userAddress}`;
    localStorage.removeItem(key);
    this.context.messages = [];
    this.context.pendingAction = null;
    this.context.userPreferences = {
      defaultCurrency: 'USDC',
      frequentRecipients: [],
      recentAmounts: [],
      preferredCorridors: {
        from: 'US',
        to: 'KE',
      },
    };
    this.context.metadata = {
      totalPaymentsSent: 0,
      totalEscrowsCreated: 0,
      averagePaymentAmount: 0,
    };
  }

  /**
   * Get full context
   */
  getContext(): ConversationContext {
    return this.context;
  }
}
