import { ethers } from "ethers";
import { logger } from "../utils/logger";

interface PaymentParams {
  sender: string;
  recipient: string;
  amount: number;
  fromCorridor: string;
  toCorridor: string;
  metadata?: string;
}

interface X402PaymentRequest {
  sender: string;
  recipient: string;
  token: string;
  amount: bigint;
  nonce: string;
  deadline: bigint;
  signature?: string;
}

interface X402AuthorizationPayload {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

/**
 * X402Service
 * Handles integration with Cronos x402 Facilitator HTTP API for programmable payments
 *
 * The Cronos x402 Facilitator is an HTTP API service (not a smart contract) that enables
 * sellers to verify and settle blockchain payments using EIP-3009 transferWithAuthorization.
 */
export class X402Service {
  private provider: ethers.JsonRpcProvider;
  private facilitatorUrl: string;
  private signer?: ethers.Wallet;
  private paymentContractAddress: string;

  // Stablecoin addresses on Cronos Testnet
  private tokenAddresses: Record<string, string> = {
    USDC: process.env.USDC_ADDRESS || "0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1", // Mock USDC on testnet
  };

  // EIP-712 Domain for devUSDC.e on Cronos Testnet
  private readonly EIP712_DOMAIN = {
    name: "Bridged USDC (Stargate)",
    version: "1",
    chainId: 338, // Cronos Testnet
    verifyingContract: process.env.USDC_ADDRESS || "0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1",
  };

  constructor(config: {
    rpcUrl: string;
    facilitatorAddress: string; // This is now the HTTP URL
    paymentContractAddress: string;
    privateKey?: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    // Use Cronos x402 Facilitator HTTP API
    this.facilitatorUrl = config.facilitatorAddress.startsWith('http')
      ? config.facilitatorAddress
      : "https://facilitator.cronoslabs.org/v2/x402/";
    this.paymentContractAddress = config.paymentContractAddress;

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    logger.info("X402Service initialized", {
      facilitatorUrl: this.facilitatorUrl,
      usdcAddress: this.tokenAddresses.USDC
    });
  }

  /**
   * Execute an instant payment via x402 rails
   * This now uses the Cronos x402 Facilitator HTTP API with EIP-3009
   */
  async executePayment(params: PaymentParams): Promise<string> {
    logger.info("Executing x402 payment via facilitator API", { params });

    try {
      // Convert amount to token decimals (USDC has 6 decimals)
      const amount = ethers.parseUnits(params.amount.toString(), 6);

      // Check sender's USDC balance
      const balance = await this.getTokenBalance(params.sender, "USDC");
      const balanceNumber = parseFloat(balance);
      if (balanceNumber < params.amount) {
        throw new Error(
          `Insufficient USDC balance. You have ${balance} USDC but need ${params.amount} USDC. Please fund your wallet with USDC on Cronos testnet.`
        );
      }

      // Generate nonce for EIP-3009 (32 bytes in hex)
      const nonce = "0x" + ethers.hexlify(ethers.randomBytes(32)).slice(2);
      const validAfter = 0; // Valid immediately
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // Valid for 1 hour

      // Create EIP-3009 transferWithAuthorization signature
      const authorization = await this.signTransferAuthorization({
        from: params.sender,
        to: params.recipient,
        value: amount.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      });

      // Send payment request to x402 Facilitator API
      const txHash = await this.sendPaymentToFacilitator({
        ...authorization,
        fromCorridor: params.fromCorridor,
        toCorridor: params.toCorridor,
        metadata: params.metadata,
      });

      logger.info("Payment executed successfully via x402 facilitator", { txHash });
      return txHash;
    } catch (error: any) {
      logger.error("Payment execution failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Sign an EIP-3009 transferWithAuthorization message
   * This creates a signature that allows the facilitator to transfer tokens on behalf of the sender
   */
  private async signTransferAuthorization(params: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  }): Promise<X402AuthorizationPayload> {
    if (!this.signer) {
      throw new Error("Signer not configured for x402 service");
    }

    // EIP-712 typed data for transferWithAuthorization
    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const value = {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    };

    // Sign the typed data
    const signature = await this.signer.signTypedData(
      this.EIP712_DOMAIN,
      types,
      value
    );

    // Split signature into r, s, v
    const sig = ethers.Signature.from(signature);

    return {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    };
  }

  /**
   * Send payment request to Cronos x402 Facilitator HTTP API
   */
  private async sendPaymentToFacilitator(params: X402AuthorizationPayload & {
    fromCorridor?: string;
    toCorridor?: string;
    metadata?: string;
  }): Promise<string> {
    // Encode authorization payload as base64 for X-PAYMENT header
    const authPayload = Buffer.from(JSON.stringify({
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
      v: params.v,
      r: params.r,
      s: params.s,
    })).toString('base64');

    // Make HTTP request to facilitator
    try {
      const response = await fetch(`${this.facilitatorUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': authPayload,
        },
        body: JSON.stringify({
          token: this.tokenAddresses.USDC,
          fromCorridor: params.fromCorridor,
          toCorridor: params.toCorridor,
          metadata: params.metadata || {},
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Facilitator API error: ${response.status} - ${error}`);
      }

      const result: any = await response.json();
      return result.transactionHash || result.txHash || result.hash || result.tx;
    } catch (error: any) {
      logger.error("Failed to send payment to facilitator", { error: error.message });

      // Fallback: Execute payment directly through smart contract (without facilitator)
      logger.warn("Falling back to direct smart contract execution");
      return this.executePaymentDirect(params);
    }
  }

  /**
   * Fallback: Execute payment directly through smart contract without facilitator
   * This is used when the facilitator API is unavailable
   */
  private async executePaymentDirect(params: X402AuthorizationPayload & {
    fromCorridor?: string;
    toCorridor?: string;
    metadata?: string;
  }): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer not configured");
    }

    const paymentContract = new ethers.Contract(
      this.paymentContractAddress,
      [
        "function executeInstantPayment(address recipient, address token, uint256 amount, bytes32 fromCorridor, bytes32 toCorridor, string calldata metadata) external returns (bytes32)",
      ],
      this.signer
    );

    const fromCorridor = ethers.encodeBytes32String(params.fromCorridor || "US");
    const toCorridor = ethers.encodeBytes32String(params.toCorridor || "NG");

    const tx = await paymentContract.executeInstantPayment(
      params.to,
      this.tokenAddresses.USDC,
      params.value,
      fromCorridor,
      toCorridor,
      params.metadata || ""
    );

    const receipt = await tx.wait();
    logger.info("Payment executed directly (fallback)", { txHash: receipt.hash });
    return receipt.hash;
  }


  /**
   * Execute batch payments via x402
   */
  async executeBatchPayment(payments: PaymentParams[]): Promise<string[]> {
    logger.info("Executing batch x402 payments", { count: payments.length });

    const txHashes: string[] = [];

    // For now, execute sequentially
    // In production, use multicall or batch transaction
    for (const payment of payments) {
      const hash = await this.executePayment(payment);
      txHashes.push(hash);
    }

    return txHashes;
  }

  /**
   * Get payment status from blockchain
   */
  async getPaymentStatus(paymentId: string): Promise<{
    status: string;
    amount: string;
    timestamp: number;
  }> {
    const paymentContract = new ethers.Contract(
      this.paymentContractAddress,
      [
        "function getPayment(bytes32 paymentId) view returns (tuple(bytes32 paymentId, address sender, address recipient, address token, uint256 amount, uint256 fee, bytes32 fromCorridor, bytes32 toCorridor, uint8 status, uint8 paymentType, uint256 createdAt, uint256 completedAt, string metadata))",
      ],
      this.provider
    );

    const payment = await paymentContract.getPayment(paymentId);

    const statusMap: Record<number, string> = {
      0: "PENDING",
      1: "COMPLETED",
      2: "FAILED",
      3: "REFUNDED",
      4: "CANCELLED",
    };

    return {
      status: statusMap[payment.status] || "UNKNOWN",
      amount: ethers.formatUnits(payment.amount, 6),
      timestamp: Number(payment.createdAt),
    };
  }

  /**
   * Estimate gas for payment
   */
  async estimatePaymentGas(params: PaymentParams): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: string;
  }> {
    const gasPrice = await this.provider.getFeeData();

    // Estimate ~150k gas for payment
    const gasLimit = 150000n;
    const estimatedCost = gasLimit * (gasPrice.gasPrice || 0n);

    return {
      gasLimit,
      gasPrice: gasPrice.gasPrice || 0n,
      estimatedCost: ethers.formatEther(estimatedCost),
    };
  }

  /**
   * Verify if recipient address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get token balance for address
   */
  async getTokenBalance(address: string, token: string = "USDC"): Promise<string> {
    const tokenContract = new ethers.Contract(
      this.tokenAddresses[token],
      ["function balanceOf(address) view returns (uint256)"],
      this.provider
    );

    const balance = await tokenContract.balanceOf(address);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Check if address has sufficient allowance
   */
  async checkAllowance(
    owner: string,
    spender: string,
    token: string = "USDC"
  ): Promise<string> {
    const tokenContract = new ethers.Contract(
      this.tokenAddresses[token],
      ["function allowance(address owner, address spender) view returns (uint256)"],
      this.provider
    );

    const allowance = await tokenContract.allowance(owner, spender);
    return ethers.formatUnits(allowance, 6);
  }
}
