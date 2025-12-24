// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAfriFlowPayment
 * @notice Interface for AfriFlow payment contract
 */
interface IAfriFlowPayment {
    enum PaymentStatus {
        PENDING,
        COMPLETED,
        FAILED,
        REFUNDED,
        CANCELLED
    }

    enum PaymentType {
        INSTANT,
        ESCROW,
        BATCH,
        RECURRING,
        X402_TRIGGERED
    }

    function executeInstantPayment(
        address recipient,
        address token,
        uint256 amount,
        bytes32 fromCorridor,
        bytes32 toCorridor,
        string calldata metadata
    ) external returns (bytes32 paymentId);

    function executeX402Payment(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        bytes32 fromCorridor,
        bytes32 toCorridor,
        string calldata metadata,
        bytes calldata x402Data
    ) external returns (bytes32 paymentId);

    function executeBatchPayment(
        address[] calldata recipients,
        address token,
        uint256[] calldata amounts,
        bytes32 fromCorridor,
        bytes32[] calldata toCorridors
    ) external returns (bytes32[] memory paymentIds);

    function calculateFee(uint256 amount) external view returns (uint256);
    
    function isCorridorSupported(bytes32 fromCorridor, bytes32 toCorridor) external view returns (bool);
}
