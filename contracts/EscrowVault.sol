// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EscrowVault
 * @author AfriFlow Team
 * @notice Milestone-based escrow for B2B cross-border payments
 * @dev Supports multi-milestone releases with AI agent automation
 */
contract EscrowVault is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS & ROLES
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    uint256 public constant MAX_MILESTONES = 10;
    uint256 public constant MIN_ESCROW_AMOUNT = 1e6; // 1 USDC
    uint256 public constant DISPUTE_WINDOW = 7 days;

    // ═══════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Escrow counter for unique IDs
    uint256 public escrowCounter;

    /// @notice Fee basis points (default 15 = 0.15%)
    uint256 public feeBps;

    /// @notice Treasury address
    address public treasury;

    /// @notice Escrow records
    mapping(uint256 => Escrow) public escrows;

    /// @notice User escrows (as sender)
    mapping(address => uint256[]) public senderEscrows;

    /// @notice User escrows (as recipient)
    mapping(address => uint256[]) public recipientEscrows;

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════

    struct Milestone {
        string description;
        uint256 amount;
        uint256 releaseTime; // 0 if manual release
        MilestoneStatus status;
        uint256 completedAt;
    }

    enum MilestoneStatus {
        PENDING,
        RELEASED,
        DISPUTED,
        REFUNDED
    }

    enum EscrowStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED,
        DISPUTED
    }

    struct Escrow {
        uint256 escrowId;
        address sender;
        address recipient;
        address token;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 fee;
        EscrowStatus status;
        uint256 createdAt;
        uint256 completedAt;
        uint256 milestoneCount;
        string metadata;
    }

    /// @notice Milestone storage (escrowId => milestoneIndex => Milestone)
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        address recipient
    );

    event MilestoneDisputed(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        address disputedBy
    );

    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        bool releasedToRecipient,
        uint256 amount
    );

    event EscrowCompleted(
        uint256 indexed escrowId,
        uint256 totalReleased
    );

    event EscrowCancelled(
        uint256 indexed escrowId,
        uint256 refundedAmount
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        uint256 milestoneIndex,
        uint256 amount
    );

    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidRecipient();
    error InvalidMilestones();
    error EscrowNotFound();
    error EscrowNotActive();
    error MilestoneNotPending();
    error MilestoneNotReleasable();
    error NotAuthorized();
    error DisputeWindowExpired();
    error NoDisputeActive();

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    constructor(address _treasury, uint256 _feeBps) {
        treasury = _treasury;
        feeBps = _feeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(AGENT_ROLE, msg.sender);
        _grantRole(ARBITER_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new escrow with milestones
     * @param recipient Recipient address
     * @param token Token address
     * @param totalAmount Total escrow amount
     * @param milestoneDescriptions Array of milestone descriptions
     * @param milestoneAmounts Array of milestone amounts
     * @param milestoneReleaseTimes Array of release times (0 for manual)
     * @param metadata JSON metadata
     * @return escrowId New escrow identifier
     */
    function createEscrow(
        address recipient,
        address token,
        uint256 totalAmount,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts,
        uint256[] calldata milestoneReleaseTimes,
        string calldata metadata
    ) external nonReentrant whenNotPaused returns (uint256 escrowId) {
        // Validations
        if (recipient == address(0)) revert InvalidRecipient();
        if (totalAmount < MIN_ESCROW_AMOUNT) revert InvalidAmount();
        if (
            milestoneDescriptions.length == 0 ||
            milestoneDescriptions.length > MAX_MILESTONES ||
            milestoneDescriptions.length != milestoneAmounts.length ||
            milestoneDescriptions.length != milestoneReleaseTimes.length
        ) revert InvalidMilestones();

        // Verify milestone amounts sum to total
        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            sum += milestoneAmounts[i];
        }
        if (sum != totalAmount) revert InvalidAmount();

        // Calculate fee
        uint256 fee = (totalAmount * feeBps) / 10000;

        // Generate escrow ID
        escrowId = ++escrowCounter;

        // Create escrow
        escrows[escrowId] = Escrow({
            escrowId: escrowId,
            sender: msg.sender,
            recipient: recipient,
            token: token,
            totalAmount: totalAmount,
            releasedAmount: 0,
            fee: fee,
            status: EscrowStatus.ACTIVE,
            createdAt: block.timestamp,
            completedAt: 0,
            milestoneCount: milestoneDescriptions.length,
            metadata: metadata
        });

        // Create milestones
        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            milestones[escrowId][i] = Milestone({
                description: milestoneDescriptions[i],
                amount: milestoneAmounts[i],
                releaseTime: milestoneReleaseTimes[i],
                status: MilestoneStatus.PENDING,
                completedAt: 0
            });
        }

        // Track escrows
        senderEscrows[msg.sender].push(escrowId);
        recipientEscrows[recipient].push(escrowId);

        // Transfer funds to escrow
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit EscrowCreated(
            escrowId,
            msg.sender,
            recipient,
            token,
            totalAmount,
            milestoneDescriptions.length
        );

        return escrowId;
    }

    /**
     * @notice Release a milestone (sender or agent triggered)
     * @param escrowId Escrow identifier
     * @param milestoneIndex Milestone index
     */
    function releaseMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        if (escrow.escrowId == 0) revert EscrowNotFound();
        if (escrow.status != EscrowStatus.ACTIVE) revert EscrowNotActive();
        if (milestone.status != MilestoneStatus.PENDING) revert MilestoneNotPending();

        // Authorization: sender, agent, or time-based auto-release
        bool authorized = msg.sender == escrow.sender ||
            hasRole(AGENT_ROLE, msg.sender) ||
            (milestone.releaseTime > 0 && block.timestamp >= milestone.releaseTime);

        if (!authorized) revert NotAuthorized();

        // Calculate proportional fee
        uint256 milestoneFee = (milestone.amount * feeBps) / 10000;
        uint256 netAmount = milestone.amount - milestoneFee;

        // Update state
        milestone.status = MilestoneStatus.RELEASED;
        milestone.completedAt = block.timestamp;
        escrow.releasedAmount += milestone.amount;

        // Transfer to recipient
        IERC20(escrow.token).safeTransfer(escrow.recipient, netAmount);

        // Transfer fee
        if (milestoneFee > 0) {
            IERC20(escrow.token).safeTransfer(treasury, milestoneFee);
        }

        emit MilestoneReleased(escrowId, milestoneIndex, netAmount, escrow.recipient);

        // Check if escrow is complete
        if (escrow.releasedAmount == escrow.totalAmount) {
            escrow.status = EscrowStatus.COMPLETED;
            escrow.completedAt = block.timestamp;
            emit EscrowCompleted(escrowId, escrow.releasedAmount);
        }
    }

    /**
     * @notice Release multiple milestones at once
     * @param escrowId Escrow identifier
     * @param milestoneIndices Array of milestone indices
     */
    function releaseMilestones(
        uint256 escrowId,
        uint256[] calldata milestoneIndices
    ) external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < milestoneIndices.length; i++) {
            _releaseMilestoneInternal(escrowId, milestoneIndices[i]);
        }
    }

    /**
     * @notice AI Agent triggered milestone release
     * @param escrowId Escrow identifier
     * @param milestoneIndex Milestone index
     * @param agentSignature Off-chain verification signature
     */
    function agentReleaseMilestone(
        uint256 escrowId,
        uint256 milestoneIndex,
        bytes calldata agentSignature
    ) external nonReentrant whenNotPaused onlyRole(AGENT_ROLE) {
        // Agent can release milestones programmatically
        // In production, verify agentSignature against oracle/AI confirmation
        _releaseMilestoneInternal(escrowId, milestoneIndex);
    }

    /**
     * @notice Dispute a milestone (recipient only, within window)
     * @param escrowId Escrow identifier
     * @param milestoneIndex Milestone index
     */
    function disputeMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        if (escrow.escrowId == 0) revert EscrowNotFound();
        if (escrow.status != EscrowStatus.ACTIVE) revert EscrowNotActive();
        if (msg.sender != escrow.recipient) revert NotAuthorized();
        if (milestone.status != MilestoneStatus.PENDING) revert MilestoneNotPending();

        // Check if auto-release time has passed + dispute window
        if (
            milestone.releaseTime > 0 &&
            block.timestamp > milestone.releaseTime + DISPUTE_WINDOW
        ) revert DisputeWindowExpired();

        milestone.status = MilestoneStatus.DISPUTED;
        escrow.status = EscrowStatus.DISPUTED;

        emit MilestoneDisputed(escrowId, milestoneIndex, msg.sender);
    }

    /**
     * @notice Resolve a dispute (arbiter only)
     * @param escrowId Escrow identifier
     * @param milestoneIndex Milestone index
     * @param releaseToRecipient True to release to recipient, false to refund sender
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneIndex,
        bool releaseToRecipient
    ) external nonReentrant onlyRole(ARBITER_ROLE) {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        if (escrow.escrowId == 0) revert EscrowNotFound();
        if (milestone.status != MilestoneStatus.DISPUTED) revert NoDisputeActive();

        if (releaseToRecipient) {
            uint256 milestoneFee = (milestone.amount * feeBps) / 10000;
            uint256 netAmount = milestone.amount - milestoneFee;

            milestone.status = MilestoneStatus.RELEASED;
            escrow.releasedAmount += milestone.amount;

            IERC20(escrow.token).safeTransfer(escrow.recipient, netAmount);
            if (milestoneFee > 0) {
                IERC20(escrow.token).safeTransfer(treasury, milestoneFee);
            }
        } else {
            milestone.status = MilestoneStatus.REFUNDED;
            IERC20(escrow.token).safeTransfer(escrow.sender, milestone.amount);
        }

        milestone.completedAt = block.timestamp;

        // Check escrow completion
        uint256 processedAmount = 0;
        bool allProcessed = true;
        for (uint256 i = 0; i < escrow.milestoneCount; i++) {
            if (
                milestones[escrowId][i].status == MilestoneStatus.PENDING ||
                milestones[escrowId][i].status == MilestoneStatus.DISPUTED
            ) {
                allProcessed = false;
            } else {
                processedAmount += milestones[escrowId][i].amount;
            }
        }

        if (allProcessed) {
            escrow.status = EscrowStatus.COMPLETED;
            escrow.completedAt = block.timestamp;
        } else {
            escrow.status = EscrowStatus.ACTIVE;
        }

        emit DisputeResolved(escrowId, milestoneIndex, releaseToRecipient, milestone.amount);
    }

    /**
     * @notice Cancel escrow and refund remaining (sender only, if no releases)
     * @param escrowId Escrow identifier
     */
    function cancelEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.escrowId == 0) revert EscrowNotFound();
        if (msg.sender != escrow.sender) revert NotAuthorized();
        if (escrow.status != EscrowStatus.ACTIVE) revert EscrowNotActive();
        if (escrow.releasedAmount > 0) revert NotAuthorized(); // Can't cancel after partial release

        uint256 refundAmount = escrow.totalAmount;
        escrow.status = EscrowStatus.CANCELLED;
        escrow.completedAt = block.timestamp;

        IERC20(escrow.token).safeTransfer(escrow.sender, refundAmount);

        emit EscrowCancelled(escrowId, refundAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get escrow details
     * @param escrowId Escrow identifier
     * @return Escrow struct
     */
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    /**
     * @notice Get milestone details
     * @param escrowId Escrow identifier
     * @param milestoneIndex Milestone index
     * @return Milestone struct
     */
    function getMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external view returns (Milestone memory) {
        return milestones[escrowId][milestoneIndex];
    }

    /**
     * @notice Get all milestones for an escrow
     * @param escrowId Escrow identifier
     * @return Array of milestones
     */
    function getAllMilestones(uint256 escrowId) external view returns (Milestone[] memory) {
        Escrow storage escrow = escrows[escrowId];
        Milestone[] memory result = new Milestone[](escrow.milestoneCount);
        for (uint256 i = 0; i < escrow.milestoneCount; i++) {
            result[i] = milestones[escrowId][i];
        }
        return result;
    }

    /**
     * @notice Get user's sent escrows
     * @param user User address
     * @return Array of escrow IDs
     */
    function getSenderEscrows(address user) external view returns (uint256[] memory) {
        return senderEscrows[user];
    }

    /**
     * @notice Get user's received escrows
     * @param user User address
     * @return Array of escrow IDs
     */
    function getRecipientEscrows(address user) external view returns (uint256[] memory) {
        return recipientEscrows[user];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function setFeeBps(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeBps <= 100, "Fee too high"); // Max 1%
        feeBps = _feeBps;
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function _releaseMilestoneInternal(uint256 escrowId, uint256 milestoneIndex) internal {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        if (escrow.escrowId == 0) revert EscrowNotFound();
        if (escrow.status != EscrowStatus.ACTIVE) revert EscrowNotActive();
        if (milestone.status != MilestoneStatus.PENDING) revert MilestoneNotPending();

        uint256 milestoneFee = (milestone.amount * feeBps) / 10000;
        uint256 netAmount = milestone.amount - milestoneFee;

        milestone.status = MilestoneStatus.RELEASED;
        milestone.completedAt = block.timestamp;
        escrow.releasedAmount += milestone.amount;

        IERC20(escrow.token).safeTransfer(escrow.recipient, netAmount);

        if (milestoneFee > 0) {
            IERC20(escrow.token).safeTransfer(treasury, milestoneFee);
        }

        emit MilestoneReleased(escrowId, milestoneIndex, netAmount, escrow.recipient);

        if (escrow.releasedAmount == escrow.totalAmount) {
            escrow.status = EscrowStatus.COMPLETED;
            escrow.completedAt = block.timestamp;
            emit EscrowCompleted(escrowId, escrow.releasedAmount);
        }
    }
}
