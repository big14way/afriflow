import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ethers } from 'ethers';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  error: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
}

// Cronos chain configurations
const CRONOS_MAINNET = {
  chainId: '0x19', // 25
  chainName: 'Cronos Mainnet',
  nativeCurrency: {
    name: 'Cronos',
    symbol: 'CRO',
    decimals: 18,
  },
  rpcUrls: ['https://evm.cronos.org'],
  blockExplorerUrls: ['https://explorer.cronos.org'],
};

const CRONOS_TESTNET = {
  chainId: '0x152', // 338
  chainName: 'Cronos Testnet',
  nativeCurrency: {
    name: 'Test CRO',
    symbol: 'TCRO',
    decimals: 18,
  },
  rpcUrls: ['https://evm-t3.cronos.org'],
  blockExplorerUrls: ['https://explorer.cronos.org/testnet'],
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      balance: '0',
      error: null,
      provider: null,
      signer: null,

      connect: async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
          set({ error: 'Please install MetaMask or another Web3 wallet' });
          return;
        }

        set({ isConnecting: true, error: null });

        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Request accounts
          const accounts = await provider.send('eth_requestAccounts', []);
          
          if (accounts.length === 0) {
            throw new Error('No accounts found');
          }

          const address = accounts[0];
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const signer = await provider.getSigner();

          // Get balance
          const balance = await provider.getBalance(address);
          const formattedBalance = ethers.formatEther(balance);

          set({
            address,
            chainId,
            isConnected: true,
            isConnecting: false,
            balance: formattedBalance,
            provider,
            signer,
            error: null,
          });

          // Setup event listeners
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
              get().disconnect();
            } else {
              set({ address: accounts[0] });
              get().refreshBalance();
            }
          });

          window.ethereum.on('chainChanged', (chainIdHex: string) => {
            const newChainId = parseInt(chainIdHex, 16);
            set({ chainId: newChainId });
            get().refreshBalance();
          });

          // Check if on Cronos network, if not, prompt to switch
          if (chainId !== 25 && chainId !== 338) {
            await get().switchNetwork(338); // Switch to testnet by default
          }
        } catch (error: any) {
          set({
            isConnecting: false,
            error: error.message || 'Failed to connect wallet',
          });
        }
      },

      disconnect: () => {
        set({
          address: null,
          chainId: null,
          isConnected: false,
          balance: '0',
          provider: null,
          signer: null,
          error: null,
        });
      },

      switchNetwork: async (chainId: number) => {
        if (!window.ethereum) return;

        const chainConfig = chainId === 25 ? CRONOS_MAINNET : CRONOS_TESTNET;

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }],
          });
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [chainConfig],
              });
            } catch (addError: any) {
              set({ error: addError.message || 'Failed to add network' });
            }
          } else {
            set({ error: switchError.message || 'Failed to switch network' });
          }
        }
      },

      refreshBalance: async () => {
        const { address, provider } = get();
        if (!address || !provider) return;

        try {
          const balance = await provider.getBalance(address);
          set({ balance: ethers.formatEther(balance) });
        } catch (error) {
          console.error('Failed to refresh balance:', error);
        }
      },
    }),
    {
      name: 'afriflow-wallet',
      partialize: (state) => ({
        // Only persist these fields
        address: state.address,
        isConnected: state.isConnected,
      }),
    }
  )
);

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
