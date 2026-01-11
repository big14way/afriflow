import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Activity,
  DollarSign,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Wallet,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useWalletStore } from '../hooks/useWallet';

interface Payment {
  paymentId: string;
  recipient: string;
  amount: string;
  fee: string;
  status: string;
  createdAt: Date;
  toCorridor?: string;
}

interface Stats {
  totalSent: number;
  totalSaved: number;
  paymentCount: number;
  averageAmount: number;
}

// Mock data for demo
const mockChartData = [
  { month: 'Jan', volume: 2400 },
  { month: 'Feb', volume: 1398 },
  { month: 'Mar', volume: 9800 },
  { month: 'Apr', volume: 3908 },
  { month: 'May', volume: 4800 },
  { month: 'Jun', volume: 3800 },
  { month: 'Jul', volume: 4300 },
];

const corridorData = [
  { name: 'Nigeria', value: 45, color: '#22C55E' },
  { name: 'Kenya', value: 25, color: '#3B82F6' },
  { name: 'Ghana', value: 15, color: '#F59E0B' },
  { name: 'Other', value: 15, color: '#6B7280' },
];

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { bg: 'bg-prosperity-500/10', text: 'text-prosperity-600 dark:text-prosperity-400', icon: CheckCircle2 },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: XCircle },
};

export default function DashboardPage() {
  const { address, isConnected, connect } = useWalletStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    totalSaved: 0,
    paymentCount: 0,
    averageAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');

  useEffect(() => {
    if (isConnected && address) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Fetch payments
      const paymentsRes = await fetch(`${baseUrl}/api/payments/${address}`);
      const paymentsData = await paymentsRes.json();

      console.log('Dashboard payments response:', paymentsData);

      if (paymentsData.success && paymentsData.data) {
        setPayments(paymentsData.data);

        // Calculate stats
        const total = paymentsData.data.reduce((acc: number, p: Payment) => acc + parseFloat(p.amount), 0);
        const fees = paymentsData.data.reduce((acc: number, p: Payment) => acc + parseFloat(p.fee || '0'), 0);
        const traditionalFees = total * 0.08; // 8% traditional fee
        const saved = traditionalFees - fees;

        setStats({
          totalSent: total,
          totalSaved: saved,
          paymentCount: paymentsData.data.length,
          averageAmount: paymentsData.data.length > 0 ? total / paymentsData.data.length : 0,
        });
      }

      // Fetch balance
      const balanceRes = await fetch(`${baseUrl}/api/wallet/${address}/balance`);
      const balanceData = await balanceRes.json();
      console.log('Dashboard balance response:', balanceData);
      if (balanceData.success && balanceData.data) {
        setBalance(balanceData.data.USDC || '0');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data for demo
      setStats({
        totalSent: 15420,
        totalSaved: 1234,
        paymentCount: 47,
        averageAmount: 328,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-afri-500/10 mb-6">
            <Wallet className="w-10 h-10 text-afri-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Connect your wallet to view your payment dashboard, track transactions, and manage escrows.
          </p>
          <button onClick={connect} className="btn-primary text-lg px-8 py-4">
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track your payments and savings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/chat" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Payment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-afri-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-afri-500" />
            </div>
            <span className="flex items-center text-sm font-medium text-prosperity-600 dark:text-prosperity-400">
              <ArrowUpRight className="w-4 h-4" />
              12%
            </span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            ${stats.totalSent.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Sent</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-prosperity-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-prosperity-500" />
            </div>
            <span className="flex items-center text-sm font-medium text-prosperity-600 dark:text-prosperity-400">
              vs 8% fees
            </span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            ${stats.totalSaved.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Saved</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-ocean-500/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-ocean-500" />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {stats.paymentCount}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Payments Made</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            ${stats.averageAmount.toFixed(0)}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Amount</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 card p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Payment Volume
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Corridor Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            By Corridor
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={corridorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {corridorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {corridorData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {item.name} ({item.value}%)
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Payments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Payments
            </h3>
            <Link
              to="/chat"
              className="text-sm text-afri-600 dark:text-afri-400 hover:underline"
            >
              View All
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No payments yet
              </h4>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Start by sending your first payment
              </p>
              <Link to="/chat" className="btn-primary">
                <Plus className="w-4 h-4" />
                Make a Payment
              </Link>
            </div>
          ) : (
            payments.slice(0, 5).map((payment, index) => {
              const statusConfig = statusColors[payment.status] || statusColors.PENDING;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={payment.paymentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        To: {payment.recipient.slice(0, 6)}...{payment.recipient.slice(-4)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                      {payment.status}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
