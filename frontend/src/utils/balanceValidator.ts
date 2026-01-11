import { ethers } from 'ethers';

export interface BalanceCheckResult {
  hasEnoughBalance: boolean;
  hasEnoughAllowance: boolean;
  currentBalance: string;
  currentAllowance: string;
  requiredAmount: string;
  shortfall: string;
  warnings: string[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'insufficient_balance' | 'insufficient_allowance' | 'network_error' | 'wallet_error';
  message: string;
  actionButton?: {
    label: string;
    action: string; // URL or action identifier
  };
}

export const USDC_ADDRESS = '0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1';
export const PAYMENT_CONTRACT = '0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88';
export const ESCROW_CONTRACT = '0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac';

/**
 * Check if user has sufficient USDC balance and allowance for a transaction
 */
export async function validateBalance(
  userAddress: string,
  requiredAmount: string,
  contractAddress: string = PAYMENT_CONTRACT
): Promise<BalanceCheckResult> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const erc20ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
    ];

    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20ABI, provider);

    // Get balance and allowance in parallel
    const [balance, allowance] = await Promise.all([
      usdcContract.balanceOf(userAddress),
      usdcContract.allowance(userAddress, contractAddress),
    ]);

    const formattedBalance = ethers.formatUnits(balance, 6);
    const formattedAllowance = ethers.formatUnits(allowance, 6);
    const required = parseFloat(requiredAmount);

    const hasEnoughBalance = parseFloat(formattedBalance) >= required;
    const hasEnoughAllowance = parseFloat(formattedAllowance) >= required;

    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Generate warnings
    if (!hasEnoughBalance) {
      const shortfall = (required - parseFloat(formattedBalance)).toFixed(2);
      warnings.push(`Insufficient USDC balance. You need ${shortfall} more USDC.`);
      suggestions.push('Get test USDC from the faucet');
      suggestions.push('Check your wallet balance');
    }

    if (!hasEnoughAllowance) {
      warnings.push('Token approval needed before payment.');
      suggestions.push('Approve AfriFlow to spend your USDC');
    }

    // Low balance warning (< 50 USDC)
    if (hasEnoughBalance && parseFloat(formattedBalance) < 50) {
      warnings.push('Low balance detected. Consider topping up soon.');
    }

    return {
      hasEnoughBalance,
      hasEnoughAllowance,
      currentBalance: formattedBalance,
      currentAllowance: formattedAllowance,
      requiredAmount: requiredAmount,
      shortfall: !hasEnoughBalance
        ? (required - parseFloat(formattedBalance)).toFixed(2)
        : '0',
      warnings,
      suggestions,
    };
  } catch (error) {
    console.error('Balance validation error:', error);
    throw error;
  }
}

/**
 * Generate user-friendly error message with actionable steps
 */
export function generateErrorMessage(error: any): ValidationError {
  const errorMessage = error?.message?.toLowerCase() || '';

  // User rejected transaction
  if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
    return {
      type: 'wallet_error',
      message: 'Transaction was cancelled in your wallet. No funds were sent.',
    };
  }

  // Insufficient balance
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    return {
      type: 'insufficient_balance',
      message: 'Insufficient USDC balance to complete this transaction.',
      actionButton: {
        label: 'Get Test USDC',
        action: 'https://cronos.org/faucet',
      },
    };
  }

  // Not approved
  if (errorMessage.includes('allowance') || errorMessage.includes('approve') || errorMessage.includes('erc20')) {
    return {
      type: 'insufficient_allowance',
      message: 'You need to approve AfriFlow to spend your USDC first.',
      actionButton: {
        label: 'Approve Now',
        action: 'approve',
      },
    };
  }

  // Network issues
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return {
      type: 'network_error',
      message: 'Network connection issue. Please check your internet and try again.',
      actionButton: {
        label: 'Retry',
        action: 'retry',
      },
    };
  }

  // MetaMask not found
  if (errorMessage.includes('metamask') || errorMessage.includes('ethereum')) {
    return {
      type: 'wallet_error',
      message: 'MetaMask wallet not detected. Please install MetaMask to continue.',
      actionButton: {
        label: 'Install MetaMask',
        action: 'https://metamask.io/download/',
      },
    };
  }

  // Generic error
  return {
    type: 'network_error',
    message: error?.message || 'Transaction failed. Please try again.',
  };
}

/**
 * Get formatted balance display
 */
export async function getFormattedBalance(userAddress: string): Promise<string> {
  try {
    if (!window.ethereum) return '0.00';

    const provider = new ethers.BrowserProvider(window.ethereum);
    const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20ABI, provider);

    const balance = await usdcContract.balanceOf(userAddress);
    return ethers.formatUnits(balance, 6);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return '0.00';
  }
}
