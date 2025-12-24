// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IX402Facilitator.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

/**
 * @title MockX402Facilitator
 * @notice Mock x402 facilitator for testing
 */
contract MockX402Facilitator is IX402Facilitator {
    mapping(address => uint256) private nonces;
    mapping(bytes32 => bool) private processedPayments;
    uint256 private paymentCounter;

    function processPayment(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        bytes calldata /* data */
    ) external override returns (PaymentResponse memory response) {
        bytes32 paymentId = keccak256(
            abi.encodePacked(sender, recipient, token, amount, paymentCounter++)
        );
        
        processedPayments[paymentId] = true;

        // In mock, we just emit events and return success
        // Actual transfer is handled by the calling contract

        return PaymentResponse({
            paymentId: paymentId,
            success: true,
            timestamp: block.timestamp,
            data: ""
        });
    }

    function processBatchPayment(
        PaymentRequest[] calldata requests
    ) external override returns (PaymentResponse[] memory responses) {
        responses = new PaymentResponse[](requests.length);
        
        for (uint256 i = 0; i < requests.length; i++) {
            bytes32 paymentId = keccak256(
                abi.encodePacked(
                    requests[i].sender,
                    requests[i].recipient,
                    requests[i].token,
                    requests[i].amount,
                    paymentCounter++
                )
            );
            
            processedPayments[paymentId] = true;
            
            responses[i] = PaymentResponse({
                paymentId: paymentId,
                success: true,
                timestamp: block.timestamp,
                data: ""
            });
        }

        return responses;
    }

    function verifyPaymentSignature(
        PaymentRequest calldata /* request */
    ) external pure override returns (bool) {
        // Mock always returns true
        return true;
    }

    function getNonce(address account) external view override returns (uint256) {
        return nonces[account];
    }

    function paymentExists(bytes32 paymentId) external view override returns (bool) {
        return processedPayments[paymentId];
    }

    // Test helper to increment nonce
    function incrementNonce(address account) external {
        nonces[account]++;
    }
}
