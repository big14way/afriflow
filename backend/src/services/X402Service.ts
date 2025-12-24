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
  nonce: bigint;
  deadline: bigint;
  signature?: string;
}

/**
 * X402Service
 * Handles integration with Cronos x402 Facilitator for programmable payments
 */
export class X402Service {
  private provider: ethers.JsonRpcProvider;
  private facilitatorAddress: string;
  private signer?: ethers.Wallet;
  private paymentContractAddress: string;

  // Stablecoin addresses on Cronos
  private tokenAddresses: Record<string, string> = {
    USDC: process.env.USDC_ADDRESS || "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
    USDT: process.env.USDT_ADDRESS || "0x66e428c3f67a68878562e79A0234c1F83c208770",
  };

  constructor(config: {
    rpcUrl: string;
    facilitatorAddress: string;
    paymentContractAddress: string;
    privateKey?: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.facilitatorAddress = config.facilitatorAddress;
    this.paymentContractAddress = config.paymentContractAddress;

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Execute an instant payment via x402 rails
   */
  async executePayment(params: PaymentParams): Promise<string> {
    logger.info("Executing x402 payment", { params });

    try {
      // Convert amount to token decimals (USDC has 6 decimals)
      const amount = ethers.parseUnits(params.amount.toString(), 6);

      // Get payment contract
      const paymentContract = new ethers.Contract(
        this.paymentContractAddress,
        [
          "function executeInstantPayment(address recipient, address token, uint256 amount, bytes32 fromCorridor, bytes32 toCorridor, string calldata metadata) external returns (bytes32)",
          "function executeX402Payment(address sender, address recipient, address token, uint256 amount, bytes32 fromCorridor, bytes32 toCorridor, string calldata metadata, bytes calldata x402Data) external returns (bytes32)",
        ],
        this.signer
      );

      // Encode corridor bytes32
      const fromCorridor = ethers.encodeBytes32String(params.fromCorridor);
      const toCorridor = ethers.encodeBytes32String(params.toCorridor);

      // Build x402 payment data
      const x402Data = await this.buildX402PaymentData({
        sender: params.sender,
        recipient: params.recipient,
        token: this.tokenAddresses.USDC,
        amount,
        nonce: 0n, // Will be fetched from facilitator
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
      });

      // Execute via x402 (agent-triggered)
      const tx = await paymentContract.executeX402Payment(
        params.sender,
        params.recipient,
        this.tokenAddresses.USDC,
        amount,
        fromCorridor,
        toCorridor,
        params.metadata || "",
        x402Data
      );

      const receipt = await tx.wait();
      logger.info("Payment executed successfully", { txHash: receipt.hash });

      return receipt.hash;
    } catch (error: any) {
      logger.error("Payment execution failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Build x402 payment data for facilitator
   */
  private async buildX402PaymentData(request: X402PaymentRequest): Promise<string> {
    // Get nonce from facilitator
    const facilitatorContract = new ethers.Contract(
      this.facilitatorAddress,
      ["function getNonce(address account) view returns (uint256)"],
      this.provider
    );

    let nonce = request.nonce;
    try {
      nonce = await facilitatorContract.getNonce(request.sender);
    } catch {
      logger.warn("Could not fetch nonce from facilitator, using 0");
    }

    // Encode the x402 payment request
    const abiCoder = new ethers.AbiCoder();
    const encodedData = abiCoder.encode(
      ["address", "address", "address", "uint256", "uint256", "uint256"],
      [
        request.sender,
        request.recipient,
        request.token,
        request.amount,
        nonce,
        request.deadline,
      ]
    );

    return encodedData;
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
