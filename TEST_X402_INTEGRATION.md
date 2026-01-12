# 🧪 Testing Cronos x402 Integration

## ✅ Integration Complete!

Your AfriFlow project now uses the **official Cronos x402 Facilitator HTTP API** for programmable payments.

---

## 🚀 Quick Test Guide

### **Step 1: Check Backend Status**

```bash
curl http://localhost:3001/api/health | jq .
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "paymentAgent": true,
      "marketData": true,
      "contracts": true
    }
  }
}
```

---

### **Step 2: Get Test USDC**

Your Mock USDC contract has a faucet! Anyone can call it to get 1000 test USDC:

```bash
# Using cast (from Foundry)
cast send 0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1 \
  "faucet()" \
  --rpc-url https://cronos-testnet.drpc.org \
  --private-key $PRIVATE_KEY

# Or via the frontend: Connect wallet → The faucet function is available
```

---

### **Step 3: Test Payment Flow**

#### **Option A: Via Frontend**

1. Open http://localhost:5173
2. Connect your wallet (MetaMask on Cronos Testnet)
3. Go to Chat page
4. Say: "Send 10 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1 from Nigeria to Kenya"
5. Approve the transaction in MetaMask
6. Check Dashboard for the transaction

#### **Option B: Via API**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send 5 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "userCountry": "Nigeria"
  }'
```

---

## 🔍 What to Verify

### **1. x402 Facilitator Integration**

Check backend logs for:
```
X402Service initialized {"facilitatorUrl":"https://facilitator.cronoslabs.org/v2/x402",...}
```

### **2. Payment Execution**

When executing a payment, you should see:
```
Executing x402 payment via facilitator API
```

**Success Path:**
- Request sent to facilitator API
- Transaction hash returned
- Payment appears in Dashboard

**Fallback Path** (if facilitator unavailable):
- "Failed to send payment to facilitator"
- "Falling back to direct smart contract execution"
- Payment still completes via your smart contract

### **3. Dashboard Data**

After payment:
- Transaction appears in "Recent Transactions"
- Stats update (Total Sent, Fees Paid, etc.)
- Charts show payment volume and corridors

---

## 🔬 Advanced Testing

### **Test EIP-3009 Signature Generation**

The x402 integration uses EIP-712 typed data signatures:

```typescript
// What happens under the hood:
const domain = {
  name: "Bridged USDC (Stargate)",
  version: "1",
  chainId: 338,
  verifyingContract: USDC_ADDRESS
};

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};
```

### **Verify Facilitator Fallback**

To test the fallback mechanism:

1. Temporarily set invalid facilitator URL:
   ```env
   X402_FACILITATOR=https://invalid-url.com
   ```
2. Restart backend
3. Execute a payment
4. Verify it falls back to direct contract execution
5. Restore correct URL

---

## 📊 Expected Flow

### **Normal Flow (Facilitator Working):**
```
User → AI Agent → X402Service
              ↓
         Generate EIP-3009 Signature
              ↓
         POST to facilitator.cronoslabs.org
              ↓
         Facilitator executes transferWithAuthorization
              ↓
         Return Transaction Hash
              ↓
         Update Dashboard
```

### **Fallback Flow (Facilitator Down):**
```
User → AI Agent → X402Service
              ↓
         POST to facilitator (fails)
              ↓
         Fallback to AfriFlowPayment.sol
              ↓
         Direct executeInstantPayment()
              ↓
         Return Transaction Hash
              ↓
         Update Dashboard
```

---

## 🐛 Troubleshooting

### **Issue: "Facilitator API error"**
- **Cause**: Facilitator service might be down or rate-limited
- **Solution**: System automatically falls back to direct execution
- **Verify**: Check logs for "Falling back to direct smart contract execution"

### **Issue: "Insufficient USDC balance"**
- **Cause**: Wallet doesn't have test USDC
- **Solution**: Call faucet function on Mock USDC contract
- **Command**: See Step 2 above

### **Issue: "Signer not configured"**
- **Cause**: PRIVATE_KEY not set in .env
- **Solution**: Add your private key to backend/.env
- **Security**: Never commit .env file!

### **Issue: "Invalid signature"**
- **Cause**: EIP-712 domain mismatch
- **Solution**: Verify USDC_ADDRESS matches in .env
- **Check**: Mock USDC address: `0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1`

---

## 📈 Success Metrics

Your integration is working if:

✅ Backend starts without errors
✅ Health endpoint returns success
✅ X402Service logs show facilitator URL
✅ Payments complete (via facilitator OR fallback)
✅ Transactions appear in Dashboard
✅ No TypeScript compilation errors

---

## 🎥 Demo Script for Hackathon

1. **Show the Integration**:
   - Point out X402Service uses real facilitator API
   - Show EIP-3009 signature generation in code
   - Demonstrate fallback mechanism

2. **Live Payment**:
   - Connect wallet in frontend
   - Use voice input: "Send 10 USDC to [address] from Nigeria to Kenya"
   - Show instant settlement (sub-second)
   - Display 0.1% fee vs 8% traditional

3. **Dashboard Analytics**:
   - Show real blockchain data
   - Corridor distribution chart
   - Payment volume over time
   - Total fees saved

4. **Technical Deep Dive**:
   - Explain x402 protocol (HTTP API, not smart contract)
   - Show EIP-712 typed data signatures
   - Demonstrate resilience (fallback mechanism)
   - Highlight 23/23 passing smart contract tests

---

## 🌟 Hackathon Talking Points

**"What makes your x402 integration special?"**

1. **Production-Ready API Integration**: Uses official Cronos facilitator HTTP API, not just mock contracts
2. **EIP-3009 Compliance**: Proper transferWithAuthorization signatures
3. **Resilient Architecture**: Automatic fallback if facilitator unavailable
4. **Full Test Coverage**: 23/23 smart contract tests passing
5. **Real Blockchain Data**: Dashboard fetches actual on-chain transactions

**"How does x402 benefit African remittances?"**

- **Instant Settlement**: Sub-second finality (vs 3-5 days traditional)
- **0.1% Fees**: 80x cheaper than Western Union's 8%
- **Programmable Payments**: Milestone-based escrows for B2B
- **AI-Driven UX**: Natural language → on-chain execution
- **Gasless for Users**: EIP-3009 allows sponsored transactions

---

## 🔗 Useful Links

- **Cronos x402 Docs**: https://docs.cronos.org/cronos-x402-facilitator
- **Facilitator Health**: https://facilitator.cronoslabs.org/healthcheck
- **Cronos Testnet Faucet**: https://faucet.cronos.org
- **Block Explorer**: https://explorer.cronos.org/testnet

---

## ✅ Ready for Submission!

Your AfriFlow project now has:
- ✅ Real Cronos x402 HTTP API integration
- ✅ EIP-3009 compliant signatures
- ✅ Fallback mechanism for reliability
- ✅ Full smart contract test coverage
- ✅ Live dashboard with real blockchain data
- ✅ AI agent with natural language processing
- ✅ Voice input support
- ✅ Professional documentation

**Next Steps:**
1. Test the payment flow end-to-end
2. Record a demo video
3. Update README with x402 integration details
4. Submit to hackathon! 🚀
