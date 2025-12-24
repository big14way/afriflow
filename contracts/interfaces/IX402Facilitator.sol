// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IX402Facilitator
 * @notice Interface for Cronos x402 Facilitator
 * @dev Implements programmable payment flows for AI agents
 */
interface IX402Facilitator {
    struct PaymentRequest {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    struct PaymentResponse {
        bytes32 paymentId;
        bool success;
        uint256 timestamp;
        bytes data;
    }

    /**
     * @notice Process a payment through x402 rails
     * @param sender Sender address
     * @param recipient Recipient address
     * @param token Token address
     * @param amount Payment amount
     * @param data Additional payment data
     * @return response Payment response
     */
    function processPayment(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (PaymentResponse memory response);

    /**
     * @notice Process a batch of payments
     * @param requests Array of payment requests
     * @return responses Array of payment responses
     */
    function processBatchPayment(
        PaymentRequest[] calldata requests
    ) external returns (PaymentResponse[] memory responses);

    /**
     * @notice Verify a payment signature
     * @param request Payment request to verify
     * @return valid Whether signature is valid
     */
    function verifyPaymentSignature(
        PaymentRequest calldata request
    ) external view returns (bool valid);

    /**
     * @notice Get current nonce for an address
     * @param account Account address
     * @return nonce Current nonce
     */
    function getNonce(address account) external view returns (uint256);

    /**
     * @notice Check if a payment ID exists
     * @param paymentId Payment identifier
     * @return exists Whether payment exists
     */
    function paymentExists(bytes32 paymentId) external view returns (bool);
}
