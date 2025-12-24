# AfriFlow Testing Guide

## 📋 Overview

This guide covers how to test all components of AfriFlow, including smart contracts, backend API, frontend, and end-to-end testing.

---

## 🔧 Prerequisites

Before running tests, ensure you have:

```bash
# Node.js 18+
node --version  # Should be >= 18.0.0

# Install all dependencies
npm run install:all

# Copy environment file
cp .env.example .env
```

---

## 📦 Smart Contract Tests

### Running Tests

```bash
# Run all contract tests
npm run test:contracts

# Run with gas reporting
REPORT_GAS=true npm run test:contracts

# Run specific test file
npx hardhat test test/AfriFlow.test.ts

# Run with coverage
npx hardhat coverage
```

### Expected Output

```
 PASS  test/AfriFlow.test.ts
  AfriFlow Contracts
    AfriFlowPayment
      Deployment
        ✓ should deploy with correct parameters (234ms)
        ✓ should initialize African corridors correctly (89ms)
        ✓ should support configured tokens (45ms)
      Instant Payments
        ✓ should execute instant payment correctly (567ms)
        ✓ should calculate fees correctly (34ms)
        ✓ should revert for unsupported corridors (78ms)
        ✓ should revert for amount below minimum (56ms)
        ✓ should track user payment history (234ms)
      Batch Payments
        ✓ should execute batch payments correctly (789ms)
      Access Control
        ✓ should allow admin to update fee (123ms)
        ✓ should revert if non-admin tries to update fee (45ms)
        ✓ should allow operator to update corridors (89ms)
        ✓ should allow operator to pause/unpause (67ms)
    EscrowVault
      Escrow Creation
        ✓ should create escrow with milestones (456ms)
        ✓ should transfer funds to escrow on creation (234ms)
      Milestone Release
        ✓ should allow sender to release milestone (345ms)
        ✓ should complete escrow when all milestones released (456ms)
        ✓ should auto-release milestone after release time (567ms)
      Disputes
        ✓ should allow recipient to dispute milestone (234ms)
        ✓ should allow arbiter to resolve dispute in favor of recipient (345ms)
        ✓ should allow arbiter to resolve dispute in favor of sender (289ms)
      Cancellation
        ✓ should allow sender to cancel escrow before any release (234ms)
        ✓ should not allow cancellation after partial release (123ms)

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        12.345s
```

### Test Coverage Goals

| Contract | Target Coverage |
|----------|-----------------|
| AfriFlowPayment | >95% |
| EscrowVault | >95% |
| All Contracts | >90% |

---

## 🖥️ Backend Tests

### Running Tests

```bash
# Run all backend tests
npm run test:backend

# Run with watch mode
cd backend && npm run test:watch

# Run with coverage
cd backend && npm run test:coverage
```

### Test Structure

```
backend/tests/
├── agents/
│   └── PaymentAgent.test.ts     # AI agent intent parsing tests
├── services/
│   ├── MarketDataService.test.ts # Exchange rate tests
│   ├── X402Service.test.ts       # Payment execution tests
│   └── ContractService.test.ts   # Contract interaction tests
├── routes/
│   └── api.test.ts               # API endpoint tests
└── integration/
    └── payment-flow.test.ts      # Full payment flow tests
```

### Expected Output

```
 PASS  tests/agents/PaymentAgent.test.ts
  PaymentAgent
    Intent Parsing
      ✓ should parse simple payment intent (89ms)
      ✓ should parse escrow payment intent (112ms)
      ✓ should handle multi-currency conversion (156ms)
      ✓ should identify missing fields (45ms)
      ✓ should resolve country codes correctly (34ms)
    Action Determination
      ✓ should return clarification for low confidence (23ms)
      ✓ should return execute_payment for instant payments (45ms)
      ✓ should return create_escrow for escrow payments (56ms)

 PASS  tests/routes/api.test.ts
  API Routes
    POST /api/chat
      ✓ should process chat message (234ms)
      ✓ should require wallet address (45ms)
      ✓ should handle confirmation flow (345ms)
    GET /api/rates
      ✓ should return African exchange rates (189ms)
    GET /api/corridors
      ✓ should return supported corridors (23ms)

Test Suites: 5 passed, 5 total
Tests:       25 passed, 25 total
Coverage:    94.7%
```

---

## 🎨 Frontend Tests

### Running Tests

```bash
# Run all frontend tests
npm run test:frontend

# Run with watch mode
cd frontend && npm run test:watch
```

### Test Files

```
frontend/src/
├── components/
│   └── __tests__/
│       ├── Layout.test.tsx
│       └── Toaster.test.tsx
├── pages/
│   └── __tests__/
│       ├── HomePage.test.tsx
│       ├── ChatPage.test.tsx
│       ├── DashboardPage.test.tsx
│       └── EscrowsPage.test.tsx
└── hooks/
    └── __tests__/
        ├── useWallet.test.ts
        └── useToast.test.ts
```

### Expected Output

```
 PASS  src/pages/__tests__/ChatPage.test.tsx
  ChatPage
    ✓ renders welcome message (67ms)
    ✓ shows connect wallet button when not connected (45ms)
    ✓ sends message on submit (234ms)
    ✓ displays AI response (189ms)
    ✓ shows confirmation buttons for payment (156ms)
    ✓ handles payment confirmation (345ms)

 PASS  src/hooks/__tests__/useWallet.test.ts
  useWallet
    ✓ initializes with disconnected state (23ms)
    ✓ connects to wallet (456ms)
    ✓ handles network switching (234ms)

Test Suites: 8 passed, 8 total
Tests:       32 passed, 32 total
```

---

## 🔗 End-to-End Tests

### Setup

```bash
# Start backend
npm run dev:backend

# In another terminal, start frontend
npm run dev:frontend

# In another terminal, run e2e tests
npm run test:e2e
```

### E2E Test Scenarios

1. **Complete Payment Flow**
   - Connect wallet
   - Send natural language payment request
   - Confirm payment
   - Verify transaction on blockchain

2. **Escrow Creation Flow**
   - Connect wallet
   - Create escrow with milestones
   - Release milestone
   - Verify escrow completion

3. **Rate Checking Flow**
   - Request exchange rates
   - Verify rate accuracy
   - Check quote calculation

---

## 📊 API Response Examples

### Chat Endpoint

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send $100 to my family in Kenya",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1703923456789_abc123",
    "message": "💸 **Payment Summary**\n\n💰 Amount: $100 USD\n📍 To: Kenya\n🌍 Destination: KE\n💸 Fee: $0.10 (0.1%)\n✅ Recipient receives: $99.90\n\n⚡ Settlement: Instant (< 1 second via Cronos x402)\n\nReply **CONFIRM** to send, or tell me what you'd like to change.",
    "intent": {
      "type": "instant",
      "action": "send",
      "amount": 100,
      "currency": "USD",
      "recipient": {
        "country": "KE"
      },
      "confidence": 0.95
    },
    "requiresConfirmation": true
  }
}
```

### Rates Endpoint

**Request:**
```bash
curl http://localhost:3001/api/rates
```

**Response:**
```json
{
  "rates": {
    "NGN": { "from": "USD", "to": "NGN", "rate": 1550.00, "timestamp": "2024-01-15T12:00:00Z" },
    "KES": { "from": "USD", "to": "KES", "rate": 154.00, "timestamp": "2024-01-15T12:00:00Z" },
    "ZAR": { "from": "USD", "to": "ZAR", "rate": 18.50, "timestamp": "2024-01-15T12:00:00Z" },
    "GHS": { "from": "USD", "to": "GHS", "rate": 15.20, "timestamp": "2024-01-15T12:00:00Z" }
  }
}
```

### Payment Confirmation

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1703923456789_abc123",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "confirmed": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "✅ **Payment Successful!**\n\n🔗 Transaction: 0xabc123...\n⚡ Status: Confirmed\n💰 Amount: $100 sent to Kenya\n\nView on Cronos Explorer: https://explorer.cronos.org/tx/0xabc123...",
    "transactionHash": "0xabc123def456789...",
    "requiresConfirmation": false
  }
}
```

---

## 🐛 Debugging Tips

### Common Issues

1. **Contract deployment fails**
   ```bash
   # Check you have testnet TCRO
   # Get from faucet: https://cronos.org/faucet
   ```

2. **API returns 500 error**
   ```bash
   # Check OpenAI API key is set
   echo $OPENAI_API_KEY
   
   # Check contract addresses are set
   echo $PAYMENT_CONTRACT
   ```

3. **Wallet connection fails**
   ```bash
   # Ensure MetaMask is on Cronos Testnet
   # Chain ID: 338
   # RPC: https://evm-t3.cronos.org
   ```

### Logging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:backend

# View backend logs
tail -f backend/logs/combined.log
```

---

## ✅ Pre-Submission Checklist

- [ ] All contract tests pass
- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] Test coverage >90%
- [ ] E2E flow works on testnet
- [ ] Demo video recorded
- [ ] README updated with deployment addresses

---

## 📞 Support

If you encounter issues:

1. Check the logs for error details
2. Verify environment variables are set correctly
3. Ensure you're connected to Cronos Testnet
4. Check the [GitHub Issues](https://github.com/afriflow/afriflow/issues)
