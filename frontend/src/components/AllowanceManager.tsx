import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import { useWalletStore } from '../hooks/useWallet';

interface AllowanceManagerProps {
  onApprove?: () => void;
}

interface AllowanceInfo {
  contract: string;
  contractName: string;
  allowance: string;
  isUnlimited: boolean;
  needsApproval: boolean;
}

export function AllowanceManager({ onApprove }: AllowanceManagerProps) {
  const { address } = useWalletStore();
  const [allowances, setAllowances] = useState<AllowanceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const CONTRACTS = [
    { address: '0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88', name: 'AfriFlow Payment' },
    { address: '0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac', name: 'Escrow Vault' },
  ];

  useEffect(() => {
    if (address) {
      fetchAllowances();
    }
  }, [address]);

  const fetchAllowances = async () => {
    setIsLoading(true);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);

      const USDC_ADDRESS = '0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1';
      const erc20ABI = ['function allowance(address owner, address spender) view returns (uint256)'];
      const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20ABI, provider);

      const allowancePromises = CONTRACTS.map(async (contract) => {
        const allowance = await usdcContract.allowance(address, contract.address);
        const formattedAllowance = ethers.formatUnits(allowance, 6);
        const isUnlimited = Number(formattedAllowance) > 1000000;

        return {
          contract: contract.address,
          contractName: contract.name,
          allowance: isUnlimited ? 'Unlimited' : formattedAllowance,
          isUnlimited,
          needsApproval: Number(formattedAllowance) === 0,
        };
      });

      const results = await Promise.all(allowancePromises);
      setAllowances(results);
    } catch (error) {
      console.error('Failed to fetch allowances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (contractAddress: string, amount?: string) => {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const USDC_ADDRESS = '0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1';
      const erc20ABI = ['function approve(address spender, uint256 amount) returns (bool)'];
      const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20ABI, signer);

      // Default to unlimited approval (max uint256)
      const approvalAmount = amount
        ? ethers.parseUnits(amount, 6)
        : ethers.MaxUint256;

      const tx = await usdcContract.approve(contractAddress, approvalAmount);
      await tx.wait();

      fetchAllowances();
      if (onApprove) onApprove();
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleRevoke = async (contractAddress: string) => {
    await handleApprove(contractAddress, '0');
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-afri-500" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">Checking approvals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-afri-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Token Approvals</h3>
        </div>
        <button
          onClick={fetchAllowances}
          className="btn-ghost text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Token approvals allow contracts to spend your USDC. Only approve trusted contracts and revoke unused approvals.
        </p>
      </div>

      <div className="space-y-3">
        {allowances.map((item) => (
          <motion.div
            key={item.contract}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              {item.needsApproval ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-prosperity-500" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{item.contractName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Allowance: {item.allowance} USDC
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.needsApproval ? (
                <button
                  onClick={() => handleApprove(item.contract)}
                  className="btn-primary text-sm px-3 py-1"
                >
                  Approve
                </button>
              ) : (
                <button
                  onClick={() => handleRevoke(item.contract)}
                  className="btn-ghost text-red-600 dark:text-red-400 text-sm px-3 py-1"
                >
                  Revoke
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
