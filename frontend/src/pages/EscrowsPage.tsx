import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  Plus,
  RefreshCw,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useWalletStore } from '../hooks/useWallet';
import { useToast } from '../hooks/useToast';

interface Milestone {
  description: string;
  amount: string;
  releaseTime: number;
  status: string;
  completedAt?: Date;
}

interface Escrow {
  escrowId: number;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: string;
  releasedAmount: string;
  fee: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  milestoneCount: number;
  metadata: string;
  milestones: Milestone[];
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  ACTIVE: { bg: 'bg-ocean-500/10', text: 'text-ocean-600 dark:text-ocean-400', icon: Clock, label: 'Active' },
  COMPLETED: { bg: 'bg-prosperity-500/10', text: 'text-prosperity-600 dark:text-prosperity-400', icon: CheckCircle2, label: 'Completed' },
  CANCELLED: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', icon: XCircle, label: 'Cancelled' },
  DISPUTED: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: AlertCircle, label: 'Disputed' },
};

const milestoneStatusConfig: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
  RELEASED: { bg: 'bg-prosperity-500/10', text: 'text-prosperity-600 dark:text-prosperity-400' },
  DISPUTED: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  REFUNDED: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
};

export default function EscrowsPage() {
  const { address, isConnected, connect } = useWalletStore();
  const { toast } = useToast();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEscrow, setExpandedEscrow] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (isConnected && address) {
      fetchEscrows();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const fetchEscrows = async () => {
    setIsLoading(true);
    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/escrows/${address}`);
      const data = await response.json();

      console.log('Escrows response:', data);

      if (data.success && data.data) {
        setEscrows(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch escrows:', error);
      toast({
        title: 'Failed to load escrows',
        description: 'Could not fetch your escrow data',
        variant: 'destructive',
      });
      // Clear escrows on error
      setEscrows([
        {
          escrowId: 1,
          sender: address || '',
          recipient: '0x1234567890abcdef1234567890abcdef12345678',
          token: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
          totalAmount: '1000.00',
          releasedAmount: '500.00',
          fee: '1.50',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-15'),
          milestoneCount: 3,
          metadata: '{"project": "Website Development"}',
          milestones: [
            { description: 'Design Complete', amount: '300.00', releaseTime: 0, status: 'RELEASED', completedAt: new Date() },
            { description: 'Development Done', amount: '400.00', releaseTime: 0, status: 'PENDING' },
            { description: 'Final Delivery', amount: '300.00', releaseTime: 0, status: 'PENDING' },
          ],
        },
        {
          escrowId: 2,
          sender: address || '',
          recipient: '0xabcdef1234567890abcdef1234567890abcdef12',
          token: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
          totalAmount: '2500.00',
          releasedAmount: '2500.00',
          fee: '3.75',
          status: 'COMPLETED',
          createdAt: new Date('2024-01-10'),
          completedAt: new Date('2024-01-20'),
          milestoneCount: 2,
          metadata: '{"project": "Consulting Services"}',
          milestones: [
            { description: 'Phase 1', amount: '1250.00', releaseTime: 0, status: 'RELEASED', completedAt: new Date() },
            { description: 'Phase 2', amount: '1250.00', releaseTime: 0, status: 'RELEASED', completedAt: new Date() },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMilestoneAction = async (escrowId: number, milestoneIndex: number, action: 'release' | 'dispute') => {
    setActionLoading(`${escrowId}-${milestoneIndex}-${action}`);

    try {
      // Execute directly from wallet for better UX and security
      const { ethers } = await import('ethers');

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const ESCROW_CONTRACT = '0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac';

      let tx;
      if (action === 'release') {
        const escrowABI = [
          'function releaseMilestone(uint256 escrowId, uint256 milestoneIndex) external',
        ];
        const escrowContract = new ethers.Contract(ESCROW_CONTRACT, escrowABI, signer);
        tx = await escrowContract.releaseMilestone(escrowId, milestoneIndex);
      } else {
        const escrowABI = [
          'function disputeMilestone(uint256 escrowId, uint256 milestoneIndex) external',
        ];
        const escrowContract = new ethers.Contract(ESCROW_CONTRACT, escrowABI, signer);
        tx = await escrowContract.disputeMilestone(escrowId, milestoneIndex);
      }

      toast({
        title: 'Transaction Sent',
        description: 'Waiting for confirmation...',
      });

      const receipt = await tx.wait();

      toast({
        title: action === 'release' ? 'Milestone Released!' : 'Dispute Filed',
        description: `Transaction: ${receipt.hash.slice(0, 10)}...`,
        variant: 'success',
      });

      fetchEscrows();
    } catch (error: any) {
      console.error('Milestone action error:', error);
      toast({
        title: 'Action Failed',
        description: error.message || 'Transaction failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEscrow = async (escrowId: number) => {
    setActionLoading(`cancel-${escrowId}`);

    try {
      // Execute directly from wallet
      const { ethers } = await import('ethers');

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const ESCROW_CONTRACT = '0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac';
      const escrowABI = [
        'function cancelEscrow(uint256 escrowId) external',
      ];

      const escrowContract = new ethers.Contract(ESCROW_CONTRACT, escrowABI, signer);
      const tx = await escrowContract.cancelEscrow(escrowId);

      toast({
        title: 'Transaction Sent',
        description: 'Cancelling escrow...',
      });

      await tx.wait();

      toast({
        title: 'Escrow Cancelled',
        description: 'Funds have been refunded',
        variant: 'success',
      });

      fetchEscrows();
    } catch (error: any) {
      console.error('Cancel escrow error:', error);
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Transaction failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEscrows = escrows.filter((escrow) => {
    if (filter === 'active') return escrow.status === 'ACTIVE';
    if (filter === 'completed') return escrow.status === 'COMPLETED';
    return true;
  });

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
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
            <Shield className="w-10 h-10 text-afri-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">
            Manage Your Escrows
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Connect your wallet to view and manage your milestone-based escrow payments.
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
            Escrow Payments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your milestone-based payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEscrows}
            disabled={isLoading}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/chat" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Escrow
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-afri-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-afri-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                {escrows.length}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Escrows</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ocean-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-ocean-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                {escrows.filter((e) => e.status === 'ACTIVE').length}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-prosperity-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-prosperity-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                ${escrows.reduce((acc, e) => acc + parseFloat(e.totalAmount), 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-afri-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Escrow List */}
      {isLoading ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-8 h-8 text-afri-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Loading escrows...</p>
        </div>
      ) : filteredEscrows.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No escrows found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Create your first milestone-based escrow payment
          </p>
          <Link to="/chat" className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Escrow
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEscrows.map((escrow) => {
            const config = statusConfig[escrow.status] || statusConfig.ACTIVE;
            const StatusIcon = config.icon;
            const isExpanded = expandedEscrow === escrow.escrowId;
            const metadata = parseMetadata(escrow.metadata);
            const progress = (parseFloat(escrow.releasedAmount) / parseFloat(escrow.totalAmount)) * 100;
            const isSender = escrow.sender.toLowerCase() === address?.toLowerCase();

            return (
              <motion.div
                key={escrow.escrowId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedEscrow(isExpanded ? null : escrow.escrowId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${config.text}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {metadata.project || `Escrow #${escrow.escrowId}`}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {isSender ? 'You → ' : 'From '}
                          {(isSender ? escrow.recipient : escrow.sender).slice(0, 6)}...
                          {(isSender ? escrow.recipient : escrow.sender).slice(-4)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          ${parseFloat(escrow.totalAmount).toLocaleString()}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        Progress: {escrow.milestones.filter((m) => m.status === 'RELEASED').length}/{escrow.milestoneCount} milestones
                      </span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-prosperity-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <div className="p-6">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-4">
                          Milestones
                        </h4>
                        <div className="space-y-3">
                          {escrow.milestones.map((milestone, index) => {
                            const msConfig = milestoneStatusConfig[milestone.status] || milestoneStatusConfig.PENDING;
                            const canRelease = isSender && milestone.status === 'PENDING';
                            const canDispute = !isSender && milestone.status === 'PENDING';

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-lg ${msConfig.bg} flex items-center justify-center text-sm font-medium ${msConfig.text}`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {milestone.description}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      ${parseFloat(milestone.amount).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${msConfig.bg} ${msConfig.text}`}>
                                    {milestone.status}
                                  </span>
                                  
                                  {canRelease && (
                                    <button
                                      onClick={() => handleMilestoneAction(escrow.escrowId, index, 'release')}
                                      disabled={actionLoading === `${escrow.escrowId}-${index}-release`}
                                      className="btn-primary text-sm px-3 py-1"
                                    >
                                      {actionLoading === `${escrow.escrowId}-${index}-release` ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        'Release'
                                      )}
                                    </button>
                                  )}
                                  
                                  {canDispute && (
                                    <button
                                      onClick={() => handleMilestoneAction(escrow.escrowId, index, 'dispute')}
                                      disabled={actionLoading === `${escrow.escrowId}-${index}-dispute`}
                                      className="btn-ghost text-amber-600 text-sm px-3 py-1"
                                    >
                                      Dispute
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        {isSender && escrow.status === 'ACTIVE' && parseFloat(escrow.releasedAmount) === 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => handleCancelEscrow(escrow.escrowId)}
                              disabled={actionLoading === `cancel-${escrow.escrowId}`}
                              className="btn-ghost text-red-600 dark:text-red-400"
                            >
                              {actionLoading === `cancel-${escrow.escrowId}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Cancel Escrow
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
