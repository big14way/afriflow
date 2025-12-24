import { ethers } from "ethers";
import { logger } from "../utils/logger";

interface CreateEscrowParams {
  sender: string;
  recipient: string;
  totalAmount: number;
  milestones: Array<{
    description: string;
    amount: number;
    releaseCondition?: string;
  }>;
  metadata?: string;
}

interface EscrowDetails {
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
}

interface MilestoneDetails {
  description: string;
  amount: string;
  releaseTime: number;
  status: string;
  completedAt?: Date;
}

// ABI fragments
const ESCROW_VAULT_ABI = [
  "function createEscrow(address recipient, address token, uint256 totalAmount, string[] calldata milestoneDescriptions, uint256[] calldata milestoneAmounts, uint256[] calldata milestoneReleaseTimes, string calldata metadata) external returns (uint256)",
  "function releaseMilestone(uint256 escrowId, uint256 milestoneIndex) external",
  "function releaseMilestones(uint256 escrowId, uint256[] calldata milestoneIndices) external",
  "function disputeMilestone(uint256 escrowId, uint256 milestoneIndex) external",
  "function cancelEscrow(uint256 escrowId) external",
  "function getEscrow(uint256 escrowId) view returns (tuple(uint256 escrowId, address sender, address recipient, address token, uint256 totalAmount, uint256 releasedAmount, uint256 fee, uint8 status, uint256 createdAt, uint256 completedAt, uint256 milestoneCount, string metadata))",
  "function getMilestone(uint256 escrowId, uint256 milestoneIndex) view returns (tuple(string description, uint256 amount, uint256 releaseTime, uint8 status, uint256 completedAt))",
  "function getAllMilestones(uint256 escrowId) view returns (tuple(string description, uint256 amount, uint256 releaseTime, uint8 status, uint256 completedAt)[])",
  "function getSenderEscrows(address user) view returns (uint256[])",
  "function getRecipientEscrows(address user) view returns (uint256[])",
  "event EscrowCreated(uint256 indexed escrowId, address indexed sender, address indexed recipient, address token, uint256 totalAmount, uint256 milestoneCount)",
  "event MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneIndex, uint256 amount, address recipient)",
  "event EscrowCompleted(uint256 indexed escrowId, uint256 totalReleased)",
];

const PAYMENT_ABI = [
  "function executeInstantPayment(address recipient, address token, uint256 amount, bytes32 fromCorridor, bytes32 toCorridor, string calldata metadata) external returns (bytes32)",
  "function getPayment(bytes32 paymentId) view returns (tuple(bytes32 paymentId, address sender, address recipient, address token, uint256 amount, uint256 fee, bytes32 fromCorridor, bytes32 toCorridor, uint8 status, uint8 paymentType, uint256 createdAt, uint256 completedAt, string metadata))",
  "function getUserPayments(address user) view returns (bytes32[])",
  "function calculateFee(uint256 amount) view returns (uint256)",
  "function isCorridorSupported(bytes32 fromCorridor, bytes32 toCorridor) view returns (bool)",
];

/**
 * ContractService
 * Handles all smart contract interactions for AfriFlow
 */
export class ContractService {
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private escrowVault: ethers.Contract;
  private paymentContract: ethers.Contract;
  private usdcAddress: string;

  constructor(config: {
    rpcUrl: string;
    escrowVaultAddress: string;
    paymentContractAddress: string;
    usdcAddress: string;
    privateKey?: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.usdcAddress = config.usdcAddress;

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    const signerOrProvider = this.signer || this.provider;

    this.escrowVault = new ethers.Contract(
      config.escrowVaultAddress,
      ESCROW_VAULT_ABI,
      signerOrProvider
    );

    this.paymentContract = new ethers.Contract(
      config.paymentContractAddress,
      PAYMENT_ABI,
      signerOrProvider
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESCROW OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new escrow with milestones
   */
  async createEscrow(params: CreateEscrowParams): Promise<number> {
    logger.info("Creating escrow", {
      recipient: params.recipient,
      totalAmount: params.totalAmount,
      milestones: params.milestones.length,
    });

    try {
      const totalAmount = ethers.parseUnits(params.totalAmount.toString(), 6);

      const descriptions = params.milestones.map((m) => m.description);
      const amounts = params.milestones.map((m) =>
        ethers.parseUnits(m.amount.toString(), 6)
      );
      const releaseTimes = params.milestones.map(() => 0); // Manual release by default

      const tx = await this.escrowVault.createEscrow(
        params.recipient,
        this.usdcAddress,
        totalAmount,
        descriptions,
        amounts,
        releaseTimes,
        params.metadata || ""
      );

      const receipt = await tx.wait();

      // Parse EscrowCreated event to get escrow ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.escrowVault.interface.parseLog(log);
          return parsed?.name === "EscrowCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.escrowVault.interface.parseLog(event);
        return Number(parsed!.args.escrowId);
      }

      throw new Error("Escrow creation event not found");
    } catch (error: any) {
      logger.error("Failed to create escrow", { error: error.message });
      throw error;
    }
  }

  /**
   * Release a milestone
   */
  async releaseMilestone(escrowId: number, milestoneIndex: number): Promise<string> {
    logger.info("Releasing milestone", { escrowId, milestoneIndex });

    const tx = await this.escrowVault.releaseMilestone(escrowId, milestoneIndex);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Release multiple milestones at once
   */
  async releaseMilestones(escrowId: number, milestoneIndices: number[]): Promise<string> {
    logger.info("Releasing milestones", { escrowId, milestoneIndices });

    const tx = await this.escrowVault.releaseMilestones(escrowId, milestoneIndices);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Dispute a milestone
   */
  async disputeMilestone(escrowId: number, milestoneIndex: number): Promise<string> {
    logger.info("Disputing milestone", { escrowId, milestoneIndex });

    const tx = await this.escrowVault.disputeMilestone(escrowId, milestoneIndex);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Cancel an escrow
   */
  async cancelEscrow(escrowId: number): Promise<string> {
    logger.info("Cancelling escrow", { escrowId });

    const tx = await this.escrowVault.cancelEscrow(escrowId);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Get escrow details
   */
  async getEscrow(escrowId: number): Promise<EscrowDetails> {
    const escrow = await this.escrowVault.getEscrow(escrowId);

    const statusMap: Record<number, string> = {
      0: "ACTIVE",
      1: "COMPLETED",
      2: "CANCELLED",
      3: "DISPUTED",
    };

    return {
      escrowId: Number(escrow.escrowId),
      sender: escrow.sender,
      recipient: escrow.recipient,
      token: escrow.token,
      totalAmount: ethers.formatUnits(escrow.totalAmount, 6),
      releasedAmount: ethers.formatUnits(escrow.releasedAmount, 6),
      fee: ethers.formatUnits(escrow.fee, 6),
      status: statusMap[escrow.status] || "UNKNOWN",
      createdAt: new Date(Number(escrow.createdAt) * 1000),
      completedAt: escrow.completedAt > 0
        ? new Date(Number(escrow.completedAt) * 1000)
        : undefined,
      milestoneCount: Number(escrow.milestoneCount),
      metadata: escrow.metadata,
    };
  }

  /**
   * Get all milestones for an escrow
   */
  async getMilestones(escrowId: number): Promise<MilestoneDetails[]> {
    const milestones = await this.escrowVault.getAllMilestones(escrowId);

    const statusMap: Record<number, string> = {
      0: "PENDING",
      1: "RELEASED",
      2: "DISPUTED",
      3: "REFUNDED",
    };

    return milestones.map((m: any) => ({
      description: m.description,
      amount: ethers.formatUnits(m.amount, 6),
      releaseTime: Number(m.releaseTime),
      status: statusMap[m.status] || "UNKNOWN",
      completedAt: m.completedAt > 0 ? new Date(Number(m.completedAt) * 1000) : undefined,
    }));
  }

  /**
   * Get user's escrows (as sender)
   */
  async getSenderEscrows(address: string): Promise<number[]> {
    const escrowIds = await this.escrowVault.getSenderEscrows(address);
    return escrowIds.map((id: bigint) => Number(id));
  }

  /**
   * Get user's escrows (as recipient)
   */
  async getRecipientEscrows(address: string): Promise<number[]> {
    const escrowIds = await this.escrowVault.getRecipientEscrows(address);
    return escrowIds.map((id: bigint) => Number(id));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get user's payment history
   */
  async getUserPayments(address: string): Promise<any[]> {
    const paymentIds = await this.paymentContract.getUserPayments(address);

    const payments = await Promise.all(
      paymentIds.map(async (id: string) => {
        const payment = await this.paymentContract.getPayment(id);
        return {
          paymentId: payment.paymentId,
          sender: payment.sender,
          recipient: payment.recipient,
          amount: ethers.formatUnits(payment.amount, 6),
          fee: ethers.formatUnits(payment.fee, 6),
          status: ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"][
            payment.status
          ],
          createdAt: new Date(Number(payment.createdAt) * 1000),
        };
      })
    );

    return payments;
  }

  /**
   * Calculate fee for amount
   */
  async calculateFee(amount: number): Promise<string> {
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const fee = await this.paymentContract.calculateFee(amountWei);
    return ethers.formatUnits(fee, 6);
  }

  /**
   * Check if corridor is supported
   */
  async isCorridorSupported(from: string, to: string): Promise<boolean> {
    const fromBytes = ethers.encodeBytes32String(from);
    const toBytes = ethers.encodeBytes32String(to);
    return this.paymentContract.isCorridorSupported(fromBytes, toBytes);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * Listen for escrow events
   */
  onEscrowCreated(
    callback: (escrowId: number, sender: string, recipient: string) => void
  ): void {
    this.escrowVault.on("EscrowCreated", (escrowId, sender, recipient) => {
      callback(Number(escrowId), sender, recipient);
    });
  }

  onMilestoneReleased(
    callback: (escrowId: number, milestoneIndex: number, amount: string) => void
  ): void {
    this.escrowVault.on("MilestoneReleased", (escrowId, milestoneIndex, amount) => {
      callback(Number(escrowId), Number(milestoneIndex), ethers.formatUnits(amount, 6));
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.escrowVault.removeAllListeners();
    this.paymentContract.removeAllListeners();
  }
}
