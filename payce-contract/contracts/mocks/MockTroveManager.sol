// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockTroveManager
 * @notice Mock implementation of MUSD TroveManager for testing
 */
contract MockTroveManager {
    struct TroveData {
        uint256 collateral;
        uint256 debt;
        uint256 interestOwed;
        uint256 stake;
        uint256 status;
        uint16 interestRate;
        uint256 lastInterestUpdateTime;
        uint256 maxBorrowingCapacity;
        uint256 arrayIndex;
    }
    
    mapping(address => TroveData) public Troves;
    
    function getEntireDebtAndColl(address _borrower)
        external
        view
        returns (
            uint256 principal,
            uint256 interest,
            uint256 coll
        )
    {
        TroveData memory trove = Troves[_borrower];
        principal = trove.debt;
        interest = trove.interestOwed;
        coll = trove.collateral;
    }
    
    function getCurrentICR(address _borrower, uint256 _price)
        external
        view
        returns (uint256)
    {
        TroveData memory trove = Troves[_borrower];
        if (trove.debt == 0) return 0;
        
        // ICR = (collateral * price) / debt
        // Return as ratio scaled by 1e18
        uint256 collateralValue = (trove.collateral * _price) / 1e18;
        return (collateralValue * 1e18) / trove.debt;
    }
    
    // Mock setter for testing
    function setTrove(
        address _borrower,
        uint256 _collateral,
        uint256 _debt,
        uint256 _interestOwed,
        uint256 _status,
        uint16 _interestRate
    ) external {
        Troves[_borrower] = TroveData({
            collateral: _collateral,
            debt: _debt,
            interestOwed: _interestOwed,
            stake: 0,
            status: _status,
            interestRate: _interestRate,
            lastInterestUpdateTime: block.timestamp,
            maxBorrowingCapacity: 0,
            arrayIndex: 0
        });
    }
}

