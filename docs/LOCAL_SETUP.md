# 🚀 AfriFlow Local Setup Guide

Follow this step-by-step guide to get AfriFlow running on your local machine.

---

## 📋 Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org) |
| npm | 9.x or higher | Comes with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com) |
| MetaMask | Latest | [metamask.io](https://metamask.io) |

### Verify Installation

```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
git --version    # Should show git version x.x.x
```

---

## 🔧 Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/afriflow.git
cd afriflow

# Install all dependencies (root, backend, and frontend)
npm run install:all
```

Expected output:
```
added 850 packages in 45s
```

---

## ⚙️ Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Open .env in your editor
# For VS Code:
code .env
# For Vim:
vim .env
```

### Required Environment Variables

Edit your `.env` file with these values:

```env
# 1. Get an OpenAI API Key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# 2. Your wallet private key for deploying contracts
# ⚠️ Use a dedicated testnet wallet, NOT your main wallet!
PRIVATE_KEY=your-private-key-here

# 3. These will be filled after deployment
PAYMENT_CONTRACT=
ESCROW_VAULT=

# 4. Cronos Testnet config (pre-filled)
CRONOS_RPC_URL=https://evm-t3.cronos.org
CRONOS_CHAIN_ID=338
```

---

## 💰 Step 3: Get Testnet TCRO

You need test CRO (TCRO) to deploy contracts and pay for gas.

1. Go to: https://cronos.org/faucet
2. Connect your MetaMask wallet
3. Select "Cronos Testnet"
4. Request TCRO (you'll receive 1 TCRO)

Wait 30 seconds for the transaction to confirm.

---

## 📝 Step 4: Compile Smart Contracts

```bash
# Compile all contracts
npm run compile
```

Expected output:
```
Generating typings for: 5 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 24 typings!
Compiled 5 Solidity files successfully
```

---

## 🚀 Step 5: Deploy Contracts to Testnet

```bash
# Deploy to Cronos Testnet
npm run deploy:testnet
```

Expected output:
```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌍 AfriFlow Deployment Script                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📡 Network: cronosTestnet (Chain ID: 338)
👤 Deployer: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
💰 Balance: 0.98 CRO

🚀 Deploying AfriFlowPayment...
   ✅ AfriFlowPayment deployed at: 0x1234567890abcdef1234567890abcdef12345678

🚀 Deploying EscrowVault...
   ✅ EscrowVault deployed at: 0xabcdef1234567890abcdef1234567890abcdef12

═══════════════════════════════════════════════════════════════
🎉 DEPLOYMENT COMPLETE!
═══════════════════════════════════════════════════════════════

📍 Contract Addresses:
   AfriFlowPayment: 0x1234567890abcdef1234567890abcdef12345678
   EscrowVault:     0xabcdef1234567890abcdef1234567890abcdef12
```

### Update .env with Contract Addresses

Copy the deployed addresses to your `.env`:

```env
PAYMENT_CONTRACT=0x1234567890abcdef1234567890abcdef12345678
ESCROW_VAULT=0xabcdef1234567890abcdef1234567890abcdef12
```

---

## 🖥️ Step 6: Start Development Servers

Open **two terminal windows**:

### Terminal 1: Backend Server

```bash
npm run dev:backend
```

Expected output:
```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌍 AfriFlow API Server                                     ║
║                                                              ║
║   Status:  Running                                           ║
║   Port:    3001                                              ║
║   Mode:    development                                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Terminal 2: Frontend Server

```bash
npm run dev:frontend
```

Expected output:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 🌐 Step 7: Configure MetaMask

### Add Cronos Testnet to MetaMask

1. Open MetaMask
2. Click the network dropdown
3. Click "Add Network"
4. Enter:

| Field | Value |
|-------|-------|
| Network Name | Cronos Testnet |
| RPC URL | https://evm-t3.cronos.org |
| Chain ID | 338 |
| Currency Symbol | TCRO |
| Block Explorer | https://explorer.cronos.org/testnet |

5. Click "Save"

---

## ✅ Step 8: Test the Application

1. Open http://localhost:5173 in your browser
2. Click "Connect Wallet"
3. Approve the MetaMask connection
4. You should see your wallet address in the navbar

### Test the Chat

1. Navigate to "Send Money"
2. Type: "Send $100 to Kenya"
3. You should see the AI parse your intent and show a payment summary

---

## 🧪 Step 9: Run Tests

```bash
# Run all tests
npm test

# Run only contract tests
npm run test:contracts

# Run with coverage
npx hardhat coverage
```

---

## 🐛 Troubleshooting

### "Contract not initialized" Error

**Cause:** Contract addresses not set in `.env`

**Fix:**
```bash
# Verify your .env has the addresses
cat .env | grep CONTRACT
```

### "Insufficient funds" Error

**Cause:** Not enough TCRO for gas

**Fix:**
1. Go to https://cronos.org/faucet
2. Request more TCRO

### MetaMask "Wrong Network" Error

**Cause:** Not on Cronos Testnet

**Fix:**
1. Open MetaMask
2. Click network dropdown
3. Select "Cronos Testnet"

### Backend Crashes on Start

**Cause:** Missing OPENAI_API_KEY

**Fix:**
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Or check .env
cat .env | grep OPENAI
```

### Frontend Shows Blank Page

**Cause:** Backend not running

**Fix:**
```bash
# Make sure backend is running first
npm run dev:backend

# Then start frontend
npm run dev:frontend
```

---

## 📁 Project Structure

```
afriflow/
├── .env                    # Your local environment (don't commit!)
├── .env.example            # Template for environment
├── package.json            # Root package with scripts
├── hardhat.config.ts       # Hardhat configuration
│
├── contracts/              # Solidity smart contracts
│   ├── AfriFlowPayment.sol
│   ├── EscrowVault.sol
│   └── interfaces/
│
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── agents/         # AI payment agent
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   └── index.ts        # Entry point
│   └── package.json
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.tsx         # Root component
│   └── package.json
│
├── scripts/                # Deployment scripts
├── test/                   # Contract tests
└── docs/                   # Documentation
```

---

## 🎬 Quick Demo Commands

```bash
# Check API health
curl http://localhost:3001/api/health

# Get exchange rates
curl http://localhost:3001/api/rates

# Get supported corridors
curl http://localhost:3001/api/corridors

# Test chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the rates for sending to Kenya?",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

---

## 🚢 Next Steps

1. **Customize**: Modify the UI in `frontend/src/`
2. **Extend**: Add new corridors in `contracts/AfriFlowPayment.sol`
3. **Deploy**: Run `npm run deploy:mainnet` for production
4. **Document**: Update README with your contract addresses

---

## 📞 Need Help?

- Check the [Testing Guide](./TESTING.md)
- Open an issue on GitHub
- Join our Discord (coming soon)

---

**Happy Building! 🌍⚡**
