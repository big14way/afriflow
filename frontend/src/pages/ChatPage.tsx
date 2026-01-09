import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Wallet,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useWalletStore } from '../hooks/useWallet';
import { useToast } from '../hooks/useToast';

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

const suggestedPrompts = [
  "Send $100 to my family in Kenya",
  "Create an escrow payment for a supplier in Lagos",
  "What are the exchange rates for NGN?",
  "Send $50 to three different recipients",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { address, isConnected, connect } = useWalletStore();
  const { toast } = useToast();

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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat`, {
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

        if (data.data.requiresConfirmation && data.data.action) {
          setPendingAction(data.data.action);
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

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: pendingAction,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const resultMessage: Message = {
          id: `result-${Date.now()}`,
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
          transactionHash: data.data.transactionHash,
        };

        setMessages((prev) => [...prev, resultMessage]);
        setPendingAction(null);

        toast({
          title: 'Payment Successful!',
          description: 'Your transaction has been confirmed',
          variant: 'success',
        });
      } else {
        throw new Error(data.error || 'Transaction failed');
      }
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
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
      <div className="text-center mb-8">
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
                  <div className="prose prose-sm dark:prose-invert max-w-none">
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
                        <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />
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
                          href={`https://explorer.cronos.org/tx/${message.transactionHash}`}
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

          {/* Confirmation buttons */}
          {pendingAction && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center gap-4 py-4"
            >
              <button
                onClick={handleConfirm}
                className="btn-primary"
              >
                <Check className="w-4 h-4" />
                Confirm Payment
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="btn-ghost text-red-600 dark:text-red-400"
              >
                Cancel
              </button>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts (shown when no messages) */}
        {messages.length <= 1 && (
          <div className="px-6 pb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Try saying:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
