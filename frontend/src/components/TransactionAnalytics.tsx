import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Activity,
  PieChart,
  Download,
  FileText,
} from 'lucide-react';
import { analyzeTransactions, exportToCSV, exportToPDF } from '../utils/exportTransactions';

interface TransactionAnalyticsProps {
  transactions: any[];
  onClose?: () => void;
}

export function TransactionAnalyticsPanel({ transactions, onClose }: TransactionAnalyticsProps) {
  const analytics = analyzeTransactions(transactions);

  const handleExport = (format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') {
        exportToCSV(transactions);
      } else {
        exportToPDF(transactions);
      }
    } catch (error: any) {
      alert(error.message || 'Export failed');
    }
  };

  // Calculate percentage changes (mock data for demo)
  const monthOverMonth = analytics.monthlyBreakdown.length >= 2
    ? ((analytics.monthlyBreakdown[analytics.monthlyBreakdown.length - 1].amount -
        analytics.monthlyBreakdown[analytics.monthlyBreakdown.length - 2].amount) /
        analytics.monthlyBreakdown[analytics.monthlyBreakdown.length - 2].amount) * 100
    : 0;

  const successRate = analytics.transactionCount > 0
    ? (analytics.statusBreakdown.completed / analytics.transactionCount) * 100
    : 0;

  const traditionalFees = analytics.totalSent * 0.08;
  const savedVsTraditional = traditionalFees - analytics.totalFees;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-afri-500/10">
              <PieChart className="w-6 h-6 text-afri-600 dark:text-afri-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Transaction Analytics
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Insights from {analytics.transactionCount} transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="btn-ghost text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="btn-ghost text-sm"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            {onClose && (
              <button onClick={onClose} className="btn-ghost text-sm">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-4 bg-gradient-to-br from-prosperity-50 to-prosperity-100 dark:from-prosperity-900/20 dark:to-prosperity-800/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-prosperity-700 dark:text-prosperity-400">
                  Total Sent
                </span>
                <DollarSign className="w-5 h-5 text-prosperity-600 dark:text-prosperity-400" />
              </div>
              <p className="text-2xl font-bold text-prosperity-900 dark:text-prosperity-100">
                ${analytics.totalSent.toFixed(2)}
              </p>
              <p className="text-xs text-prosperity-600 dark:text-prosperity-400 mt-1">
                Across {analytics.transactionCount} payments
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-4 bg-gradient-to-br from-afri-50 to-ocean-100 dark:from-afri-900/20 dark:to-ocean-800/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-afri-700 dark:text-afri-400">
                  Money Saved
                </span>
                <TrendingUp className="w-5 h-5 text-afri-600 dark:text-afri-400" />
              </div>
              <p className="text-2xl font-bold text-afri-900 dark:text-afri-100">
                ${savedVsTraditional.toFixed(2)}
              </p>
              <p className="text-xs text-afri-600 dark:text-afri-400 mt-1">
                vs. traditional 8% fees
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Success Rate
                </span>
                <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {analytics.statusBreakdown.completed} successful
              </p>
            </motion.div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Breakdown */}
            <div className="card p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Monthly Breakdown
              </h3>
              <div className="space-y-3">
                {analytics.monthlyBreakdown.slice(-6).map((month, index) => {
                  const maxAmount = Math.max(...analytics.monthlyBreakdown.map(m => m.amount));
                  const percentage = (month.amount / maxAmount) * 100;

                  return (
                    <div key={month.month}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400">
                          {new Date(month.month + '-01').toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ${month.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-full bg-gradient-to-r from-afri-500 to-ocean-500"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {month.count} transactions
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="card p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Transaction Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-prosperity-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Completed</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {analytics.statusBreakdown.completed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Pending</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {analytics.statusBreakdown.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Failed</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {analytics.statusBreakdown.failed}
                  </span>
                </div>
              </div>

              {/* Key Insights */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">
                  Key Insights
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-afri-500 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Your average transaction is <strong>${analytics.averageAmount.toFixed(2)}</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-afri-500 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Largest payment: <strong>${analytics.largestTransaction.toFixed(2)}</strong>
                    </p>
                  </div>
                  {monthOverMonth !== 0 && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-afri-500 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {monthOverMonth > 0 ? 'Up' : 'Down'} {Math.abs(monthOverMonth).toFixed(1)}% from last month
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Most Frequent Recipient */}
          {analytics.mostFrequentRecipient && (
            <div className="card p-4 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Most Frequent Recipient
              </h3>
              <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {analytics.mostFrequentRecipient.slice(0, 20)}...{analytics.mostFrequentRecipient.slice(-10)}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
