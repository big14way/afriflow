import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface TransactionStatusProps {
  hash?: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  message?: string;
  onClose?: () => void;
}

export function TransactionStatus({ hash, status, message, onClose }: TransactionStatusProps) {
  const [confirmations, setConfirmations] = useState(0);

  useEffect(() => {
    if (status === 'confirming') {
      const interval = setInterval(() => {
        setConfirmations((prev) => Math.min(prev + 1, 12));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const statusConfig = {
    pending: {
      icon: Loader2,
      color: 'text-ocean-500',
      bg: 'bg-ocean-500/10',
      title: 'Transaction Pending',
      description: 'Waiting for wallet confirmation...',
    },
    confirming: {
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      title: 'Confirming on Blockchain',
      description: `Confirmation ${confirmations}/12 - This usually takes 30-60 seconds`,
    },
    confirmed: {
      icon: CheckCircle2,
      color: 'text-prosperity-500',
      bg: 'bg-prosperity-500/10',
      title: 'Transaction Confirmed!',
      description: 'Your transaction has been successfully processed',
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      title: 'Transaction Failed',
      description: message || 'Your transaction could not be processed',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 max-w-md"
      >
        <div className={`card p-4 ${config.bg} border-2 border-${config.color.split('-')[1]}-500/20`}>
          <div className="flex items-start gap-3">
            <div className={`${config.bg} rounded-lg p-2`}>
              <Icon className={`w-5 h-5 ${config.color} ${status === 'pending' ? 'animate-spin' : ''}`} />
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                {config.title}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {config.description}
              </p>

              {hash && (
                <a
                  href={`https://explorer.cronos.org/testnet/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-afri-600 dark:text-afri-400 hover:underline"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {status === 'confirming' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-prosperity-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(confirmations / 12) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {(status === 'confirmed' || status === 'failed') && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
