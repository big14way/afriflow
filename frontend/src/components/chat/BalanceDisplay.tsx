import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { getFormattedBalance } from '../../utils/balanceValidator';

interface BalanceDisplayProps {
  userAddress: string;
  onBalanceUpdate?: (balance: string) => void;
}

export function BalanceDisplay({ userAddress, onBalanceUpdate }: BalanceDisplayProps) {
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBalance = async (showRefreshAnimation = false) => {
    if (showRefreshAnimation) setIsRefreshing(true);
    setIsLoading(true);

    try {
      const formattedBalance = await getFormattedBalance(userAddress);
      setBalance(formattedBalance);
      if (onBalanceUpdate) {
        onBalanceUpdate(formattedBalance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setIsLoading(false);
      if (showRefreshAnimation) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchBalance();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => fetchBalance(), 30000);
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  const balanceNum = parseFloat(balance);
  const isLowBalance = balanceNum < 10 && balanceNum > 0;
  const hasBalance = balanceNum > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-2 flex-1">
        <div className={`p-2 rounded-lg ${
          isLowBalance
            ? 'bg-amber-100 dark:bg-amber-900/20'
            : hasBalance
            ? 'bg-prosperity-100 dark:bg-prosperity-900/20'
            : 'bg-slate-100 dark:bg-slate-700'
        }`}>
          <Wallet className={`w-4 h-4 ${
            isLowBalance
              ? 'text-amber-600 dark:text-amber-400'
              : hasBalance
              ? 'text-prosperity-600 dark:text-prosperity-400'
              : 'text-slate-500'
          }`} />
        </div>

        <div className="flex-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">USDC Balance</p>
          <div className="flex items-baseline gap-1">
            {isLoading && balance === '0.00' ? (
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <>
                <span className={`text-lg font-bold ${
                  isLowBalance
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  ${parseFloat(balance).toFixed(2)}
                </span>
                {hasBalance && (
                  <TrendingUp className="w-3 h-3 text-prosperity-500" />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isLowBalance && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/20">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Low
          </span>
        </div>
      )}

      <button
        onClick={() => fetchBalance(true)}
        disabled={isRefreshing}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Refresh balance"
      >
        <RefreshCw
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
        />
      </button>
    </motion.div>
  );
}
