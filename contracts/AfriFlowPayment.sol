// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IX402Facilitator.sol";
import "./interfaces/IAfriFlowPayment.sol";

/**
 * @title AfriFlowPayment
 * @author AfriFlow Team
 * @notice Main payment contract for AI-powered cross-border payments on Cronos
 * @dev Integrates with x402 facilitator for programmable payment flows
 */
contract AfriFlowPayment is IAfriFlowPayment, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS & ROLES
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    uint256 public constant MAX_FEE_BPS = 100; // 1% maximum fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_PAYMENT_AMOUNT = 1e6; // Minimum 1 USDC (6 decimals)

    // ═══════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice x402 Facilitator contract address
    IX402Facilitator public x402Facilitator;

    /// @notice Fee in basis points (default 10 = 0.1%)
    uint256 public feeBps;

    /// @notice Treasury address for collected fees
    address public treasury;

    /// @notice Supported stablecoins for payments
    mapping(address => bool) public supportedTokens;

    /// @notice Payment nonce per user for unique payment IDs
    mapping(address => uint256) public userNonce;

    /// @notice Payment records
    mapping(bytes32 => Payment) public payments;

    /// @notice User payment history
    mapping(address => bytes32[]) public userPayments;

    /// @notice Whitelisted corridors (fromCountry => toCountry => enabled)
    mapping(bytes32 => mapping(bytes32 => bool)) public corridors;

    /// @notice Total volume processed per corridor
    mapping(bytes32 => uint256) public corridorVolume;

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════

    struct Payment {
        bytes32 paymentId;
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 fee;
        bytes32 fromCorridor;
        bytes32 toCorridor;
        PaymentStatus status;
        PaymentType paymentType;
        uint256 createdAt;
        uint256 completedAt;
        string metadata; // JSON metadata for AI agent context
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 fee,
        PaymentType paymentType
    );

    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event PaymentFailed(
        bytes32 indexed paymentId,
        string reason
    );

    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 amount
    );

    event CorridorUpdated(
        bytes32 indexed fromCorridor,
        bytes32 indexed toCorridor,
        bool enabled
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event TokenUpdated(address token, bool supported);
    event X402FacilitatorUpdated(address oldFacilitator, address newFacilitator);

    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidRecipient();
    error UnsupportedToken();
    error UnsupportedCorridor();
    error PaymentNotFound();
    error PaymentAlreadyProcessed();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidFee();
    error InvalidAddress();

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    constructor(
        address _x402Facilitator,
        address _treasury,
        uint256 _feeBps,
        address[] memory _supportedTokens
    ) {
        if (_treasury == address(0)) revert InvalidAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();

        x402Facilitator = IX402Facilitator(_x402Facilitator);
        treasury = _treasury;
        feeBps = _feeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(AGENT_ROLE, msg.sender);

        // Initialize supported tokens
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
            emit TokenUpdated(_supportedTokens[i], true);
        }

        // Initialize African corridors
        _initializeCorridors();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Execute an instant payment
     * @param recipient Recipient address
     * @param token Token address (stablecoin)
     * @param amount Payment amount
     * @param fromCorridor Source corridor code (e.g., "NG" for Nigeria)
     * @param toCorridor Destination corridor code
     * @param metadata JSON metadata for AI agent tracking
     * @return paymentId Unique payment identifier
     */
    function executeInstantPayment(
        address recipient,
        address token,
        uint256 amount,
        bytes32 fromCorridor,
        bytes32 toCorridor,
        string calldata metadata
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        // Validations
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount < MIN_PAYMENT_AMOUNT) revert InvalidAmount();
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (!corridors[fromCorridor][toCorridor]) revert UnsupportedCorridor();

        // Calculate fee
        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        // Generate unique payment ID
        paymentId = _generatePaymentId(msg.sender);

        // Create payment record
        payments[paymentId] = Payment({
            paymentId: paymentId,
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            fee: fee,
            fromCorridor: fromCorridor,
            toCorridor: toCorridor,
            status: PaymentStatus.PENDING,
            paymentType: PaymentType.INSTANT,
            createdAt: block.timestamp,
            completedAt: 0,
            metadata: metadata
        });

        userPayments[msg.sender].push(paymentId);

        emit PaymentInitiated(
            paymentId,
            msg.sender,
            recipient,
            token,
            amount,
            fee,
            PaymentType.INSTANT
        );

        // Execute transfer via x402 if available, otherwise direct
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Send net amount to recipient
        IERC20(token).safeTransfer(recipient, netAmount);
        
        // Send fee to treasury
        if (fee > 0) {
            IERC20(token).safeTransfer(treasury, fee);
        }

        // Update payment status
        payments[paymentId].status = PaymentStatus.COMPLETED;
        payments[paymentId].completedAt = block.timestamp;

        // Update corridor volume
        corridorVolume[keccak256(abi.encodePacked(fromCorridor, toCorridor))] += amount;

        emit PaymentCompleted(paymentId, msg.sender, recipient, netAmount, block.timestamp);

        return paymentId;
    }

    /**
     * @notice Execute a payment via x402 facilitator (agent-triggered)
     * @dev Only callable by addresses with AGENT_ROLE
     * @param sender Original sender address
     * @param recipient Recipient address
     * @param token Token address
     * @param amount Payment amount
     * @param fromCorridor Source corridor
     * @param toCorridor Destination corridor
     * @param metadata AI agent metadata
     * @param x402Data Encoded x402 facilitator data
     * @return paymentId Payment identifier
     */
    function executeX402Payment(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        bytes32 fromCorridor,
        bytes32 toCorridor,
        string calldata metadata,
        bytes calldata x402Data
    ) external nonReentrant whenNotPaused onlyRole(AGENT_ROLE) returns (bytes32 paymentId) {
        // Validations
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount < MIN_PAYMENT_AMOUNT) revert InvalidAmount();
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (!corridors[fromCorridor][toCorridor]) revert UnsupportedCorridor();

        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        paymentId = _generatePaymentId(sender);

        payments[paymentId] = Payment({
            paymentId: paymentId,
            sender: sender,
            recipient: recipient,
            token: token,
            amount: amount,
            fee: fee,
            fromCorridor: fromCorridor,
            toCorridor: toCorridor,
            status: PaymentStatus.PENDING,
            paymentType: PaymentType.X402_TRIGGERED,
            createdAt: block.timestamp,
            completedAt: 0,
            metadata: metadata
        });

        userPayments[sender].push(paymentId);

        emit PaymentInitiated(
            paymentId,
            sender,
            recipient,
            token,
            amount,
            fee,
            PaymentType.X402_TRIGGERED
        );

        // Execute via x402 facilitator
        if (address(x402Facilitator) != address(0) && x402Data.length > 0) {
            // Call x402 facilitator for enhanced payment flow
            x402Facilitator.processPayment(
                sender,
                recipient,
                token,
                netAmount,
                x402Data
            );
        } else {
            // Fallback to direct transfer
            IERC20(token).safeTransferFrom(sender, recipient, netAmount);
        }

        // Transfer fee
        if (fee > 0) {
            IERC20(token).safeTransferFrom(sender, treasury, fee);
        }

        payments[paymentId].status = PaymentStatus.COMPLETED;
        payments[paymentId].completedAt = block.timestamp;

        corridorVolume[keccak256(abi.encodePacked(fromCorridor, toCorridor))] += amount;

        emit PaymentCompleted(paymentId, sender, recipient, netAmount, block.timestamp);

        return paymentId;
    }

    /**
     * @notice Batch payment execution for multiple recipients
     * @param recipients Array of recipient addresses
     * @param token Token address
     * @param amounts Array of amounts
     * @param fromCorridor Source corridor
     * @param toCorridors Array of destination corridors
     * @return paymentIds Array of payment identifiers
     */
    function executeBatchPayment(
        address[] calldata recipients,
        address token,
        uint256[] calldata amounts,
        bytes32 fromCorridor,
        bytes32[] calldata toCorridors
    ) external nonReentrant whenNotPaused returns (bytes32[] memory paymentIds) {
        require(
            recipients.length == amounts.length && 
            recipients.length == toCorridors.length,
            "Array length mismatch"
        );
        require(recipients.length <= 50, "Batch too large");

        paymentIds = new bytes32[](recipients.length);

        uint256 totalAmount = 0;
        uint256 totalFee = 0;

        // Calculate totals and validate
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert InvalidRecipient();
            if (amounts[i] < MIN_PAYMENT_AMOUNT) revert InvalidAmount();
            if (!corridors[fromCorridor][toCorridors[i]]) revert UnsupportedCorridor();
            
            totalAmount += amounts[i];
            totalFee += (amounts[i] * feeBps) / BPS_DENOMINATOR;
        }

        if (!supportedTokens[token]) revert UnsupportedToken();

        // Transfer total from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        // Process individual payments
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 fee = (amounts[i] * feeBps) / BPS_DENOMINATOR;
            uint256 netAmount = amounts[i] - fee;

            bytes32 paymentId = _generatePaymentId(msg.sender);
            paymentIds[i] = paymentId;

            payments[paymentId] = Payment({
                paymentId: paymentId,
                sender: msg.sender,
                recipient: recipients[i],
                token: token,
                amount: amounts[i],
                fee: fee,
                fromCorridor: fromCorridor,
                toCorridor: toCorridors[i],
                status: PaymentStatus.COMPLETED,
                paymentType: PaymentType.BATCH,
                createdAt: block.timestamp,
                completedAt: block.timestamp,
                metadata: ""
            });

            userPayments[msg.sender].push(paymentId);

            IERC20(token).safeTransfer(recipients[i], netAmount);

            emit PaymentInitiated(paymentId, msg.sender, recipients[i], token, amounts[i], fee, PaymentType.BATCH);
            emit PaymentCompleted(paymentId, msg.sender, recipients[i], netAmount, block.timestamp);
        }

        // Transfer total fees to treasury
        if (totalFee > 0) {
            IERC20(token).safeTransfer(treasury, totalFee);
        }

        return paymentIds;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get payment details by ID
     * @param paymentId Payment identifier
     * @return Payment struct
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Get user's payment history
     * @param user User address
     * @return Array of payment IDs
     */
    function getUserPayments(address user) external view returns (bytes32[] memory) {
        return userPayments[user];
    }

    /**
     * @notice Get user's payment count
     * @param user User address
     * @return count Number of payments
     */
    function getUserPaymentCount(address user) external view returns (uint256) {
        return userPayments[user].length;
    }

    /**
     * @notice Check if a corridor is supported
     * @param fromCorridor Source corridor
     * @param toCorridor Destination corridor
     * @return supported Boolean indicating support
     */
    function isCorridorSupported(bytes32 fromCorridor, bytes32 toCorridor) external view returns (bool) {
        return corridors[fromCorridor][toCorridor];
    }

    /**
     * @notice Calculate fee for a given amount
     * @param amount Payment amount
     * @return fee Calculated fee
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * feeBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Get corridor statistics
     * @param fromCorridor Source corridor
     * @param toCorridor Destination corridor
     * @return volume Total volume processed
     */
    function getCorridorVolume(bytes32 fromCorridor, bytes32 toCorridor) external view returns (uint256) {
        return corridorVolume[keccak256(abi.encodePacked(fromCorridor, toCorridor))];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Update fee basis points
     * @param _feeBps New fee in basis points
     */
    function setFeeBps(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Update x402 facilitator address
     * @param _x402Facilitator New facilitator address
     */
    function setX402Facilitator(address _x402Facilitator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit X402FacilitatorUpdated(address(x402Facilitator), _x402Facilitator);
        x402Facilitator = IX402Facilitator(_x402Facilitator);
    }

    /**
     * @notice Add or remove supported token
     * @param token Token address
     * @param supported Whether token is supported
     */
    function setTokenSupport(address token, bool supported) external onlyRole(OPERATOR_ROLE) {
        supportedTokens[token] = supported;
        emit TokenUpdated(token, supported);
    }

    /**
     * @notice Enable or disable a corridor
     * @param fromCorridor Source corridor
     * @param toCorridor Destination corridor
     * @param enabled Whether corridor is enabled
     */
    function setCorridor(
        bytes32 fromCorridor,
        bytes32 toCorridor,
        bool enabled
    ) external onlyRole(OPERATOR_ROLE) {
        corridors[fromCorridor][toCorridor] = enabled;
        emit CorridorUpdated(fromCorridor, toCorridor, enabled);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency token withdrawal
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(treasury, amount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @dev Generate unique payment ID
     * @param user User address
     * @return paymentId Unique identifier
     */
    function _generatePaymentId(address user) internal returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                user,
                userNonce[user]++,
                block.timestamp,
                block.prevrandao
            )
        );
    }

    /**
     * @dev Initialize African payment corridors
     */
    function _initializeCorridors() internal {
        // African corridors
        bytes32[10] memory africanCountries = [
            bytes32("NG"), // Nigeria
            bytes32("KE"), // Kenya
            bytes32("ZA"), // South Africa
            bytes32("GH"), // Ghana
            bytes32("TZ"), // Tanzania
            bytes32("UG"), // Uganda
            bytes32("ZW"), // Zimbabwe
            bytes32("EG"), // Egypt
            bytes32("MA"), // Morocco
            bytes32("SN")  // Senegal
        ];

        // International corridors
        bytes32[5] memory internationalCountries = [
            bytes32("US"), // United States
            bytes32("GB"), // United Kingdom
            bytes32("EU"), // European Union
            bytes32("AE"), // UAE
            bytes32("CN")  // China
        ];

        // Enable all African intra-continental corridors
        for (uint256 i = 0; i < africanCountries.length; i++) {
            for (uint256 j = 0; j < africanCountries.length; j++) {
                if (i != j) {
                    corridors[africanCountries[i]][africanCountries[j]] = true;
                }
            }
        }

        // Enable international to Africa corridors
        for (uint256 i = 0; i < internationalCountries.length; i++) {
            for (uint256 j = 0; j < africanCountries.length; j++) {
                corridors[internationalCountries[i]][africanCountries[j]] = true;
                corridors[africanCountries[j]][internationalCountries[i]] = true;
            }
        }
    }
}
