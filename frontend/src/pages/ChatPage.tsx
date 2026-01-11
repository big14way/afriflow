import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  ExternalLink,
  Sparkles,
  Wallet,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useWalletStore } from '../hooks/useWallet';
import { useToast } from '../hooks/useToast';
import { ConversationManager } from '../utils/conversationContext';
import { validateBalance, generateErrorMessage, PAYMENT_CONTRACT, ESCROW_CONTRACT } from '../utils/balanceValidator';
import { PaymentCard } from '../components/chat/PaymentCard';
import { QuickActions, SmartSuggestions } from '../components/chat/QuickActions';
import { BalanceDisplay } from '../components/chat/BalanceDisplay';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: any;
  action?: any;
  requiresConfirmation?: boolean;
  transactionHash?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [balanceWarning, setBalanceWarning] = useState<string>('');
  const [allowanceWarning, setAllowanceWarning] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { address, isConnected, connect } = useWalletStore();
  const { toast } = useToast();

  // Initialize conversation manager
  const conversationManager = useMemo(() => {
    if (!address) return null;
    return new ConversationManager(address, conversationId || undefined);
  }, [address, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 **Welcome to AfriFlow!**

I'm your AI payment assistant. I can help you:

• **Send money** across Africa instantly
• **Create escrow** payments with milestones
• **Get quotes** for currency conversion
• **Track** your payment history

Just tell me what you need in plain English!`,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    if (!isConnected) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet to send payments',
        variant: 'warning',
      });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          walletAddress: address,
          userCountry: 'US', // Default, could be detected
          conversationId: conversationId || undefined, // Send conversation ID if we have one
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store conversation ID for subsequent messages
        if (data.data.conversationId && !conversationId) {
          setConversationId(data.data.conversationId);
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
          intent: data.data.intent,
          action: data.data.action,
          requiresConfirmation: data.data.requiresConfirmation,
          transactionHash: data.data.transactionHash,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Add message to conversation manager
        if (conversationManager) {
          conversationManager.addMessage({
            role: 'user',
            content: userMessage.content,
          });
          conversationManager.addMessage({
            role: 'assistant',
            content: data.data.message,
          });
        }

        // Validate balance if action requires confirmation
        if (data.data.requiresConfirmation && data.data.action) {
          await handleActionValidation(data.data.action);
        }
      } else {
        throw new Error(data.error || 'Failed to process message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionValidation = async (action: any) => {
    setPendingAction(action);
    setBalanceWarning('');
    setAllowanceWarning('');

    try {
      if (!address) return;

      // Determine amount and contract based on action type
      const amount = action.type === 'create_escrow'
        ? action.params.totalAmount.toString()
        : action.params.amount.toString();

      const contractAddress = action.type === 'create_escrow'
        ? ESCROW_CONTRACT
        : PAYMENT_CONTRACT;

      // Validate balance and allowance
      const validation = await validateBalance(address, amount, contractAddress);

      if (!validation.hasEnoughBalance) {
        setBalanceWarning(
          `Insufficient balance. You have $${validation.currentBalance} but need $${amount}. Short by $${validation.shortfall}.`
        );
      }

      if (!validation.hasEnoughAllowance) {
        setAllowanceWarning(
          'Token approval needed. Please approve AfriFlow to spend your USDC before sending.'
        );
      }

      // Show any additional warnings
      if (validation.warnings.length > 0 && validation.hasEnoughBalance) {
        validation.warnings.forEach(warning => {
          toast({
            title: 'Notice',
            description: warning,
            variant: 'warning',
          });
        });
      }
    } catch (error) {
      console.error('Balance validation error:', error);
      // Don't block the transaction, just warn
      toast({
        title: 'Validation Warning',
        description: 'Could not verify balance. Proceed with caution.',
        variant: 'warning',
      });
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setIsLoading(true);

    try {
      // Execute payment directly from user's wallet using MetaMask
      const { ethers } = await import('ethers');

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Contract addresses from env
      const PAYMENT_CONTRACT = '0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88';
      const ESCROW_CONTRACT = '0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac';
      const USDC_ADDRESS = '0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1';

      let tx, receipt;
      let resultMessage: Message;

      if (pendingAction.type === 'create_escrow') {
        // Handle escrow creation
        const escrowABI = [
          'function createEscrow(address recipient, address token, uint256 totalAmount, string[] milestoneDescriptions, uint256[] milestoneAmounts, uint256[] milestoneReleaseTimes, string metadata) external returns (uint256)',
        ];

        const escrowContract = new ethers.Contract(ESCROW_CONTRACT, escrowABI, signer);

        const totalAmount = ethers.parseUnits(pendingAction.params.totalAmount.toString(), 6);

        // Prepare milestone arrays
        const milestoneDescriptions = pendingAction.params.milestones.map((m: any) => m.description);
        const milestoneAmounts = pendingAction.params.milestones.map((m: any) =>
          ethers.parseUnits(m.amount.toString(), 6)
        );
        const milestoneReleaseTimes = pendingAction.params.milestones.map(() =>
          Math.floor(Date.now() / 1000) // Current timestamp for now
        );

        console.log('Creating escrow...', {
          recipient: pendingAction.params.recipient,
          totalAmount: pendingAction.params.totalAmount,
          milestoneDescriptions,
          milestoneAmounts: pendingAction.params.milestones.map((m: any) => m.amount),
        });

        tx = await escrowContract.createEscrow(
          pendingAction.params.recipient,
          USDC_ADDRESS,
          totalAmount,
          milestoneDescriptions,
          milestoneAmounts,
          milestoneReleaseTimes,
          pendingAction.params.metadata || '{}'
        );

        toast({
          title: 'Transaction Sent',
          description: 'Creating escrow...',
        });

        receipt = await tx.wait();

        resultMessage = {
          id: `result-${Date.now()}`,
          role: 'assistant',
          content: `✅ **Escrow Created Successfully!**

🔗 Transaction: ${receipt.hash}
⚡ Status: Confirmed
💰 Total Amount: $${pendingAction.params.totalAmount}
📍 Recipient: ${pendingAction.params.recipient}
📋 Milestones: ${pendingAction.params.milestones.length}

View on Cronos Explorer: https://explorer.cronos.org/testnet/tx/${receipt.hash}`,
          timestamp: new Date(),
          transactionHash: receipt.hash,
        };

      } else {
        // Handle instant payment
        const paymentABI = [
          'function executeInstantPayment(address recipient, address token, uint256 amount, bytes32 fromCorridor, bytes32 toCorridor, string calldata metadata) external returns (bytes32)',
        ];

        const paymentContract = new ethers.Contract(PAYMENT_CONTRACT, paymentABI, signer);

        const fromCorridor = ethers.encodeBytes32String(pendingAction.params.fromCorridor || 'US');
        const toCorridor = ethers.encodeBytes32String(pendingAction.params.toCorridor || 'KE');
        const amount = ethers.parseUnits(pendingAction.params.amount.toString(), 6);

        console.log('Executing payment...', {
          recipient: pendingAction.params.recipient,
          amount: pendingAction.params.amount,
          fromCorridor: pendingAction.params.fromCorridor,
          toCorridor: pendingAction.params.toCorridor,
        });

        tx = await paymentContract.executeInstantPayment(
          pendingAction.params.recipient,
          USDC_ADDRESS,
          amount,
          fromCorridor,
          toCorridor,
          pendingAction.params.metadata || '{}'
        );

        toast({
          title: 'Transaction Sent',
          description: 'Waiting for confirmation...',
        });

        receipt = await tx.wait();

        resultMessage = {
          id: `result-${Date.now()}`,
          role: 'assistant',
          content: `✅ **Payment Successful!**

🔗 Transaction: ${receipt.hash}
⚡ Status: Confirmed
💰 Amount: $${pendingAction.params.amount} sent to ${pendingAction.params.recipient}

View on Cronos Explorer: https://explorer.cronos.org/testnet/tx/${receipt.hash}`,
          timestamp: new Date(),
          transactionHash: receipt.hash,
        };
      }

      setMessages((prev) => [...prev, resultMessage]);
      setPendingAction(null);
      setBalanceWarning('');
      setAllowanceWarning('');

      // Update conversation manager metadata and preferences
      if (conversationManager) {
        const actionType = pendingAction.type === 'create_escrow' ? 'escrow' : 'payment';
        const amount = pendingAction.type === 'create_escrow'
          ? pendingAction.params.totalAmount
          : pendingAction.params.amount;

        conversationManager.updateMetadata(actionType, amount);

        if (actionType === 'payment') {
          conversationManager.updatePreferences({
            recipient: pendingAction.params.recipient,
            amount: amount,
            fromCorridor: pendingAction.params.fromCorridor,
            toCorridor: pendingAction.params.toCorridor,
          });
        }
      }

      toast({
        title: pendingAction.type === 'create_escrow' ? 'Escrow Created!' : 'Payment Successful!',
        description: 'Your transaction has been confirmed',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Payment error:', error);

      // Generate user-friendly error message
      const errorInfo = generateErrorMessage(error);

      const resultMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Transaction Failed**

${errorInfo.message}

${errorInfo.actionButton ? `💡 **Next Step:** ${errorInfo.actionButton.label}` : 'Please try again or contact support if the issue persists.'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, resultMessage]);

      toast({
        title: 'Transaction Failed',
        description: errorInfo.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Transaction hash copied to clipboard',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-afri-500/10 dark:bg-afri-500/20 mb-4"
          >
            <Sparkles className="w-4 h-4 text-afri-500" />
            <span className="text-sm font-medium text-afri-600 dark:text-afri-400">
              AI-Powered Payments
            </span>
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
            How can I help you today?
          </h1>
        </div>

        {/* Balance Display */}
        {isConnected && address && (
          <div className="flex justify-center">
            <BalanceDisplay userAddress={address} />
          </div>
        )}
      </div>

      {/* Chat container */}
      <div className="card overflow-hidden">
        {/* Messages area */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-6 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'chat-bubble-user'
                      : 'chat-bubble-assistant'
                  }
                >
                  {/* Render markdown-like content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                    {message.content.split('\n').map((line, i) => {
                      // Bold text
                      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      // Bullet points
                      if (line.startsWith('• ')) {
                        return (
                          <div key={i} className="flex gap-2 my-1">
                            <span>•</span>
                            <span dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />
                          </div>
                        );
                      }
                      return (
                        <p key={i} className="my-1 break-all" dangerouslySetInnerHTML={{ __html: processedLine }} />
                      );
                    })}
                  </div>

                  {/* Transaction hash */}
                  {message.transactionHash && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-prosperity-500" />
                        <span className="text-slate-500 dark:text-slate-400">Transaction:</span>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {message.transactionHash.slice(0, 10)}...{message.transactionHash.slice(-8)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(message.transactionHash!)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <a
                          href={`https://explorer.cronos.org/testnet/tx/${message.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="chat-bubble-assistant">
                <div className="typing-indicator text-afri-500">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Confirmation Card */}
          {pendingAction && !isLoading && (
            <div className="flex justify-center">
              <PaymentCard
                type={pendingAction.type}
                recipient={pendingAction.params.recipient}
                amount={
                  pendingAction.type === 'create_escrow'
                    ? pendingAction.params.totalAmount
                    : pendingAction.params.amount
                }
                currency="USDC"
                milestones={pendingAction.params.milestones}
                fromCorridor={pendingAction.params.fromCorridor}
                toCorridor={pendingAction.params.toCorridor}
                balanceWarning={balanceWarning}
                allowanceWarning={allowanceWarning}
                onConfirm={handleConfirm}
                onCancel={() => {
                  setPendingAction(null);
                  setBalanceWarning('');
                  setAllowanceWarning('');
                }}
                isLoading={isLoading}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Smart Suggestions and Quick Actions */}
        {!pendingAction && isConnected && (
          <div className="px-6 pb-4 space-y-4">
            {/* Smart suggestions based on user history */}
            {conversationManager && messages.length > 1 && (
              <SmartSuggestions
                suggestions={conversationManager.getSmartSuggestions()}
                onSuggestionClick={(suggestion) => {
                  setInput(suggestion);
                  inputRef.current?.focus();
                }}
              />
            )}

            {/* Quick actions for new users */}
            {messages.length <= 1 && (
              <QuickActions
                onActionClick={(prompt) => {
                  setInput(prompt);
                  inputRef.current?.focus();
                }}
                showDefault={true}
              />
            )}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          {!isConnected ? (
            <button
              onClick={connect}
              className="w-full btn-primary justify-center py-4"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet to Start
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Tell me what you'd like to do..."
                  className="input-primary resize-none h-14 pr-14"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <p className="flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-prosperity-500 animate-pulse" />
          Powered by Cronos x402 • Instant settlement • 0.1% fees
        </p>
      </div>
    </div>
  );
}
