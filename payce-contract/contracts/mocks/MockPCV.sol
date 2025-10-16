// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPCV
 * @notice Mock governance contract for testing
 */
contract MockPCV {
    address public pendingGovernor;
    address public pendingGuardian;
    
    function startChangingRoles(
        address _governor,
        address _guardian
    ) external {
        pendingGovernor = _governor;
        pendingGuardian = _guardian;
    }
    
    function finalizeChangingRoles() external {
        // Mock finalization
    }
}

