import { motion } from 'framer-motion';
import { AlertCircle, XCircle, Wifi, Wallet, ExternalLink, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  type: 'insufficient_balance' | 'insufficient_allowance' | 'network_error' | 'wallet_error' | 'generic';
  message: string;
  actionButton?: {
    label: string;
    action: string; // URL or action identifier
    onClick?: () => void;
  };
  onDismiss?: () => void;
}

const ERROR_ICONS = {
  insufficient_balance: XCircle,
  insufficient_allowance: AlertCircle,
  network_error: Wifi,
  wallet_error: Wallet,
  generic: AlertCircle,
};

const ERROR_COLORS = {
  insufficient_balance: 'red',
  insufficient_allowance: 'amber',
  network_error: 'orange',
  wallet_error: 'purple',
  generic: 'red',
};

export function ErrorMessage({ type, message, actionButton, onDismiss }: ErrorMessageProps) {
  const Icon = ERROR_ICONS[type];
  const color = ERROR_COLORS[type];

  const handleActionClick = () => {
    if (actionButton?.onClick) {
      actionButton.onClick();
    } else if (actionButton?.action.startsWith('http')) {
      window.open(actionButton.action, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="my-4 max-w-md"
    >
      <div className={`card p-4 border-2 border-${color}-500/20 bg-${color}-50 dark:bg-${color}-900/20`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400 flex-shrink-0 mt-0.5`} />

          <div className="flex-1">
            <h4 className={`font-semibold text-${color}-900 dark:text-${color}-100 mb-1`}>
              {type === 'insufficient_balance' && 'Insufficient Balance'}
              {type === 'insufficient_allowance' && 'Approval Required'}
              {type === 'network_error' && 'Network Error'}
              {type === 'wallet_error' && 'Wallet Issue'}
              {type === 'generic' && 'Transaction Failed'}
            </h4>

            <p className={`text-sm text-${color}-800 dark:text-${color}-200 mb-3`}>
              {message}
            </p>

            {actionButton && (
              <button
                onClick={handleActionClick}
                className={`btn-primary text-sm px-4 py-2 inline-flex items-center gap-2
                          bg-${color}-600 hover:bg-${color}-700 dark:bg-${color}-500 dark:hover:bg-${color}-600`}
              >
                {actionButton.label}
                {actionButton.action.startsWith('http') ? (
                  <ExternalLink className="w-3 h-3" />
                ) : actionButton.action === 'retry' ? (
                  <RefreshCw className="w-3 h-3" />
                ) : null}
              </button>
            )}
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`text-${color}-400 hover:text-${color}-600 dark:hover:text-${color}-300`}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
