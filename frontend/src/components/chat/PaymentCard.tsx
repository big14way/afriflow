import { motion } from 'framer-motion';
import { Send, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

interface PaymentCardProps {
  type: 'instant_payment' | 'create_escrow';
  recipient: string;
  amount: string | number;
  currency?: string;
  milestones?: Array<{ description: string; amount: number }>;
  fromCorridor?: string;
  toCorridor?: string;
  balanceWarning?: string;
  allowanceWarning?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PaymentCard({
  type,
  recipient,
  amount,
  currency = 'USDC',
  milestones,
  fromCorridor,
  toCorridor,
  balanceWarning,
  allowanceWarning,
  onConfirm,
  onCancel,
  isLoading = false,
}: PaymentCardProps) {
  const isEscrow = type === 'create_escrow';
  const hasWarnings = balanceWarning || allowanceWarning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 max-w-md"
    >
      <div className="card p-4 border-2 border-afri-500/20 bg-gradient-to-br from-afri-50 to-ocean-50 dark:from-slate-800 dark:to-slate-900">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-afri-500 animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-afri-500" />
          )}
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {isEscrow ? 'Create Escrow Payment' : 'Instant Payment'}
          </h3>
        </div>

        {/* Payment Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Recipient</span>
            <span className="text-sm font-mono text-slate-900 dark:text-white">
              {recipient.slice(0, 10)}...{recipient.slice(-8)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">Amount</span>
            <span className="text-lg font-bold text-prosperity-600 dark:text-prosperity-400">
              ${typeof amount === 'number' ? amount.toFixed(2) : amount} {currency}
            </span>
          </div>

          {!isEscrow && fromCorridor && toCorridor && (
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Corridor</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {fromCorridor} → {toCorridor}
              </span>
            </div>
          )}

          {isEscrow && milestones && (
            <div className="py-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 block mb-2">
                Milestones ({milestones.length})
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start text-xs bg-white/50 dark:bg-slate-800/50 p-2 rounded"
                  >
                    <span className="text-slate-700 dark:text-slate-300 flex-1">
                      {index + 1}. {milestone.description}
                    </span>
                    <span className="font-semibold text-prosperity-600 dark:text-prosperity-400 ml-2">
                      ${milestone.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="space-y-2 mb-4">
            {balanceWarning && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {balanceWarning}
                  </p>
                </div>
              </div>
            )}

            {allowanceWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {allowanceWarning}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fee Info */}
        <div className="flex items-center gap-2 p-2 bg-prosperity-500/10 rounded-lg mb-4">
          <CheckCircle2 className="w-4 h-4 text-prosperity-600 dark:text-prosperity-400" />
          <span className="text-xs text-prosperity-800 dark:text-prosperity-200">
            Only 0.1% platform fee • {isEscrow ? 'Milestone-based release' : 'Instant settlement with x402'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-ghost flex-1 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || !!balanceWarning}
            className="btn-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Confirm & Send
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
