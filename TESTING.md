# Testing AfriFlow on Cronos Testnet

This guide explains how to test AfriFlow payments on Cronos testnet.

## Prerequisites

1. **Cronos Testnet TCRO**: Get testnet CRO tokens from [https://cronos.org/faucet](https://cronos.org/faucet)
2. **MetaMask**: Add Cronos testnet network
   - Network Name: Cronos Testnet
   - RPC URL: `https://cronos-testnet.drpc.org`
   - Chain ID: `338`
   - Currency Symbol: `TCRO`
   - Block Explorer: `https://explorer.cronos.org/testnet`

## Getting Test USDC

AfriFlow uses Mock USDC for testing since Cronos testnet doesn't have native USDC tokens.

### Mock USDC Contract
- **Address**: `0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1`
- **Decimals**: 6
- **Symbol**: USDC

### Option 1: Use the Faucet Script (Recommended)

```bash
npm run claim-usdc
```

This will give you **1000 USDC** for testing. You can run it multiple times if needed.

### Option 2: Call the Faucet Directly

You can call the `faucet()` function directly from the contract in MetaMask or a block explorer:

1. Go to [https://explorer.cronos.org/testnet](https://explorer.cronos.org/testnet)
2. Search for contract: `0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1`
3. Connect your wallet
4. Call the `faucet()` function
5. Confirm the transaction

### Option 3: Mint Custom Amounts

If you need a specific amount, you can call `mint(address to, uint256 amount)`:

```bash
npx hardhat run scripts/mintUSDC.ts --network cronosTestnet
```

## Testing Payments

1. **Start the application**:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. **Connect your wallet** on [http://localhost:5173](http://localhost:5173)

3. **Get test USDC** using one of the methods above

4. **Approve USDC spending**:
   - Before making your first payment, you need to approve the AfriFlow contract
   - Payment contract: `0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88`
   - The app will prompt you to approve when needed

5. **Make a test payment**:
   ```
   "Send $10 to Kenya"
   [Provide a recipient wallet address when asked]
   "CONFIRM"
   ```

## Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| Mock USDC | `0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1` | Test token for payments |
| AfriFlowPayment | `0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88` | Main payment contract |
| EscrowVault | `0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac` | Escrow functionality |

## Troubleshooting

### "Insufficient USDC balance" Error
- Run `npm run claim-usdc` to get 1000 test USDC
- Check your balance in MetaMask (add the token using the contract address above)

### "Insufficient USDC allowance" Error
- You need to approve the AfriFlow contract to spend your USDC
- Go to the Mock USDC contract on the explorer
- Call `approve(spender, amount)`:
  - `spender`: `0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88`
  - `amount`: A large number like `1000000` (for unlimited approval)

### "Network changed" Error
- Make sure you're connected to Cronos testnet (Chain ID 338)
- Check that MetaMask is on the correct network

## Block Explorer

View transactions and contracts on:
- **Testnet Explorer**: [https://explorer.cronos.org/testnet](https://explorer.cronos.org/testnet)

## Need Help?

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Check the browser console for frontend errors
3. Verify you're connected to Cronos testnet
4. Ensure you have both TCRO (for gas) and test USDC
