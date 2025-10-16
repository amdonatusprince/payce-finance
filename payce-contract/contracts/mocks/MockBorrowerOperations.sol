// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/mocks/MockERC20.sol";

interface IMockTroveManager {
    function setTrove(
        address _borrower,
        uint256 _collateral,
        uint256 _debt,
        uint256 _interestOwed,
        uint256 _status,
        uint16 _interestRate
    ) external;
}

/**
 * @title MockBorrowerOperations
 * @notice Mock implementation of MUSD BorrowerOperations for testing
 */
contract MockBorrowerOperations {
    MockERC20 public musdToken;
    IMockTroveManager public troveManager;
    uint256 public minNetDebt = 1800e18; // 1800 MUSD
    uint256 public borrowingFeeFloor = 10; // 0.1% in basis points
    uint256 public interestRate = 100; // 1% in basis points
    
    mapping(address => TroveData) public troves;
    
    struct TroveData {
        uint256 collateral;
        uint256 debt;
        uint256 status; // 0 = nonExistent, 1 = active
        uint256 interestRate;
    }
    
    event TroveOpened(address indexed borrower, uint256 collateral, uint256 debt);
    event TroveRepaid(address indexed borrower, uint256 amount);
    event TroveClosed(address indexed borrower);
    event TroveRefinanced(address indexed borrower);
    event CollateralAdded(address indexed borrower, uint256 amount);
    event CollateralWithdrawn(address indexed borrower, uint256 amount);
    
    constructor(address _musdToken) {
        musdToken = MockERC20(_musdToken);
    }

    function setTroveManager(address _troveManager) external {
        troveManager = IMockTroveManager(_troveManager);
    }
    
    function openTrove(
        uint256 _debtAmount,
        address /* _upperHint */,
        address /* _lowerHint */
    ) external payable {
        require(msg.value > 0, "need collateral");
        require(_debtAmount >= minNetDebt, "below min debt");
        
        // Calculate fee
        uint256 fee = getBorrowingFee(_debtAmount);
        uint256 totalDebt = _debtAmount + fee;
        
        // Store trove data
        troves[msg.sender] = TroveData({
            collateral: msg.value,
            debt: totalDebt,
            status: 1,
            interestRate: interestRate
        });
        
        // Sync with TroveManager if set
        if (address(troveManager) != address(0)) {
            troveManager.setTrove(
                msg.sender,
                msg.value,
                totalDebt,
                0, // no interest yet
                1, // active
                uint16(interestRate)
            );
        }
        
        // Mint MUSD to caller
        musdToken.mint(msg.sender, totalDebt);
        
        emit TroveOpened(msg.sender, msg.value, totalDebt);
    }
    
    function repayMUSD(
        uint256 _amount,
        address /* _upperHint */,
        address /* _lowerHint */
    ) external {
        require(troves[msg.sender].status == 1, "no active trove");
        require(_amount > 0, "amount must be > 0");
        
        // Transfer MUSD from caller
        require(
            musdToken.transferFrom(msg.sender, address(this), _amount),
            "transfer failed"
        );
        
        // Reduce debt
        troves[msg.sender].debt -= _amount;
        
        // Sync with TroveManager
        if (address(troveManager) != address(0)) {
            TroveData memory trove = troves[msg.sender];
            troveManager.setTrove(
                msg.sender,
                trove.collateral,
                trove.debt,
                0,
                trove.status,
                uint16(trove.interestRate)
            );
        }
        
        // Burn MUSD
        musdToken.burn(address(this), _amount);
        
        emit TroveRepaid(msg.sender, _amount);
    }
    
    function closeTrove() external {
        TroveData storage trove = troves[msg.sender];
        require(trove.status == 1, "no active trove");
        
        uint256 debt = trove.debt;
        uint256 collateral = trove.collateral;
        
        // Subtract gas compensation (200 MUSD)
        uint256 gasCompensation = 200e18;
        uint256 musdNeeded = debt - gasCompensation;
        
        // Transfer MUSD from caller
        require(
            musdToken.transferFrom(msg.sender, address(this), musdNeeded),
            "transfer failed"
        );
        
        // Burn MUSD
        musdToken.burn(address(this), musdNeeded);
        
        // Close trove
        trove.status = 2; // closed
        trove.debt = 0;
        trove.collateral = 0;
        
        // Sync with TroveManager
        if (address(troveManager) != address(0)) {
            troveManager.setTrove(msg.sender, 0, 0, 0, 2, 0);
        }
        
        // Return collateral
        (bool sent, ) = payable(msg.sender).call{value: collateral}("");
        require(sent, "failed to send BTC");
        
        emit TroveClosed(msg.sender);
    }
    
    function refinance(
        address /* _upperHint */,
        address /* _lowerHint */
    ) external {
        require(troves[msg.sender].status == 1, "no active trove");
        
        // Update to current global rate
        troves[msg.sender].interestRate = interestRate;
        
        // Sync with TroveManager
        if (address(troveManager) != address(0)) {
            TroveData memory trove = troves[msg.sender];
            troveManager.setTrove(
                msg.sender,
                trove.collateral,
                trove.debt,
                0,
                trove.status,
                uint16(interestRate)
            );
        }
        
        emit TroveRefinanced(msg.sender);
    }
    
    function addColl(
        address /* _upperHint */,
        address /* _lowerHint */
    ) external payable {
        require(troves[msg.sender].status == 1, "no active trove");
        require(msg.value > 0, "amount must be > 0");
        
        troves[msg.sender].collateral += msg.value;
        
        // Sync with TroveManager
        if (address(troveManager) != address(0)) {
            TroveData memory trove = troves[msg.sender];
            troveManager.setTrove(
                msg.sender,
                trove.collateral,
                trove.debt,
                0,
                trove.status,
                uint16(trove.interestRate)
            );
        }
        
        emit CollateralAdded(msg.sender, msg.value);
    }
    
    function withdrawColl(
        uint256 _amount,
        address /* _upperHint */,
        address /* _lowerHint */
    ) external {
        require(troves[msg.sender].status == 1, "no active trove");
        require(_amount > 0, "amount must be > 0");
        require(troves[msg.sender].collateral >= _amount, "insufficient collateral");
        
        troves[msg.sender].collateral -= _amount;
        
        // Sync with TroveManager
        if (address(troveManager) != address(0)) {
            TroveData memory trove = troves[msg.sender];
            troveManager.setTrove(
                msg.sender,
                trove.collateral,
                trove.debt,
                0,
                trove.status,
                uint16(trove.interestRate)
            );
        }
        
        // Send collateral
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "failed to send BTC");
        
        emit CollateralWithdrawn(msg.sender, _amount);
    }
    
    function getBorrowingFee(uint256 _debt) public view returns (uint256) {
        // 0.1% fee
        return (_debt * borrowingFeeFloor) / 10000;
    }
    
    function setInterestRate(uint256 _rate) external {
        interestRate = _rate;
    }
    
    function setFees() external {
        // Mock function for setup
    }
    
    receive() external payable {}
}

