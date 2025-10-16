// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPriceFeed
 * @notice Mock price feed for testing
 */
contract MockPriceFeed {
    uint256 private price = 100000e18; // $100,000 BTC
    
    function fetchPrice() external view returns (uint256) {
        return price;
    }
    
    function setPrice(uint256 _price) external {
        price = _price;
    }
}

