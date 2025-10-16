// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PayceMUSD - Dual-purse micropayment contract with MUSD borrowing integration
/// @author
/// @notice This contract implements:
///  - Integration with MUSD protocol for BTC-backed borrowing
///  - User deposits & withdrawals (using borrowed or owned MUSD)
///  - Reservation of funds (one tx to reserve amounts for off-chain vouchers)
///  - EIP-712 voucher verification (single + batch)
///  - Merchant purse and merchant withdrawals
///  - Direct borrowing operations: open trove, repay, refinance, close trove
///  - Loan monitoring: view debt, interest, collateral, and collateralization ratio

/// Key economic model:
///  - Users can deposit BTC and borrow MUSD through the integrated BorrowerOperations contract.
///  - Borrowed MUSD can be directly deposited into the user's Payce purse.
///  - Users deposit MUSD token into their purse (userBalance).
///  - Users can reserve some of their balance (reservedBalance) using reserveFunds().
///    The reservation is intended to be called by the user (once per session) to lock
///    enough funds to cover off-chain-signed vouchers (so vouchers are redeemable later).
///  - Merchant redeems vouchers (single or batch). Redemption requires that the payer
///    has reserved funds >= voucher amount; redemption moves value from userBalance
///    (and reservedBalance) into merchantBalance inside the contract.
///  - Merchant can withdraw merchantBalance anytime.
///  - User can withdraw only unreserved funds (available = userBalance - reservedBalance).
///  - Users can repay loans, refinance to new rates, and close their trove when done.

/// The contract uses EIP-712 to verify structured signed vouchers (off-chain signatures).
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal interface for MUSD BorrowerOperations contract
interface IBorrowerOperations {
    /// @notice Open a new trove (borrow MUSD against BTC)
    /// @param _debtAmount Amount of MUSD to borrow
    /// @param _upperHint Address hint for sorted trove list insertion
    /// @param _lowerHint Address hint for sorted trove list insertion
    function openTrove(
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /// @notice Repay MUSD to reduce your trove debt
    /// @param _amount Amount of MUSD to repay
    /// @param _upperHint Address hint for sorted trove list repositioning
    /// @param _lowerHint Address hint for sorted trove list repositioning
    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Close your trove completely (repay all debt, get back all collateral)
    function closeTrove() external;

    /// @notice Refinance to the current global interest rate
    /// @param _upperHint Address hint for sorted trove list repositioning
    /// @param _lowerHint Address hint for sorted trove list repositioning
    function refinance(address _upperHint, address _lowerHint) external;

    /// @notice Add more BTC collateral to your trove
    /// @param _upperHint Address hint for sorted trove list repositioning
    /// @param _lowerHint Address hint for sorted trove list repositioning
    function addColl(address _upperHint, address _lowerHint) external payable;

    /// @notice Withdraw BTC collateral from your trove
    /// @param _amount Amount of BTC to withdraw
    /// @param _upperHint Address hint for sorted trove list repositioning
    /// @param _lowerHint Address hint for sorted trove list repositioning
    function withdrawColl(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Get the borrowing fee for a given debt amount
    function getBorrowingFee(uint256 _debt) external view returns (uint256);

    /// @notice Get the minimum net debt allowed
    function minNetDebt() external view returns (uint256);
}

/// @notice Minimal interface for MUSD TroveManager contract
interface ITroveManager {
    /// @notice Get the entire debt and collateral for a borrower's trove
    /// @param _borrower Address of the trove owner
    /// @return principal The principal debt (without interest)
    /// @return interest The accumulated interest owed
    /// @return coll The collateral amount in BTC
    function getEntireDebtAndColl(address _borrower)
        external
        view
        returns (
            uint256 principal,
            uint256 interest,
            uint256 coll
        );

    /// @notice Get the current Individual Collateralization Ratio for a trove
    /// @param _borrower Address of the trove owner
    /// @param _price Current BTC price
    /// @return ICR as a ratio scaled by 1e18 (e.g., 1.5e18 = 150%)
    function getCurrentICR(address _borrower, uint256 _price)
        external
        view
        returns (uint256);

    /// @notice Get trove details
    /// @param _borrower Address of the trove owner
    /// @return collateral Collateral in the trove
    /// @return debt Total debt (principal)
    /// @return interestOwed Interest owed
    /// @return stake Stake in the system
    /// @return status Trove status (0=nonExistent, 1=active, 2=closedByOwner, etc.)
    /// @return interestRate Interest rate in basis points
    /// @return lastInterestUpdateTime Timestamp of last interest update
    /// @return maxBorrowingCapacity Maximum borrowing capacity
    /// @return arrayIndex Index in the trove owners array
    function Troves(address _borrower)
        external
        view
        returns (
            uint256 collateral,
            uint256 debt,
            uint256 interestOwed,
            uint256 stake,
            uint256 status,
            uint16 interestRate,
            uint256 lastInterestUpdateTime,
            uint256 maxBorrowingCapacity,
            uint256 arrayIndex
        );
}

/// @notice Minimal interface for MUSD PriceFeed contract
interface IPriceFeed {
    /// @notice Fetch the current BTC price from the oracle
    /// @return The current price scaled by 1e18
    function fetchPrice() external view returns (uint256);
}

contract PayceMUSD is EIP712 {
    using ECDSA for bytes32;

    // =============================
    // State Variables
    // =============================

    /// @notice The MUSD ERC-20 token contract
    IERC20 public immutable musdToken;

    /// @notice The BorrowerOperations contract for opening/managing troves
    IBorrowerOperations public immutable borrowerOperations;

    /// @notice The TroveManager contract for querying trove state
    ITroveManager public immutable troveManager;

    /// @notice The PriceFeed contract for getting BTC price
    IPriceFeed public immutable priceFeed;

    // User balances (purses) - these hold MUSD
    /// @notice Total MUSD deposited by user and not withdrawn
    mapping(address => uint256) public userBalance;

    /// @notice Portion of user balance reserved for vouchers
    mapping(address => uint256) public reservedBalance;

    // Merchant balances (earnings)
    /// @notice MUSD earned by merchants from redeemed vouchers
    mapping(address => uint256) public merchantBalance;

    // Track redeemed vouchers (prevents replay)
    /// @notice Mapping to track which voucher hashes have been redeemed
    mapping(bytes32 => bool) public redeemed;

    // EIP-712 typehash for our Voucher struct
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address payer,address merchant,uint256 amount,uint256 nonce,uint256 expiry)");

    // =============================
    // Events
    // =============================

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Reserved(address indexed user, uint256 amount);
    event Released(address indexed user, uint256 amount);
    event Redeemed(address indexed payer, address indexed merchant, uint256 amount, bytes32 voucherHash);
    event MerchantWithdrawn(address indexed merchant, uint256 amount);

    // MUSD Borrowing Events
    event TroveOpened(address indexed user, uint256 btcCollateral, uint256 musdBorrowed);
    event LoanRepaid(address indexed user, uint256 musdAmount);
    event TroveClosed(address indexed user);
    event TroveRefinanced(address indexed user);
    event CollateralAdded(address indexed user, uint256 btcAmount);
    event CollateralWithdrawn(address indexed user, uint256 btcAmount);

    // =============================
    // Constructor
    // =============================

    /// @notice Initialize the PayceMUSD contract
    /// @param _musdToken The MUSD ERC-20 token address
    /// @param _borrowerOperations The BorrowerOperations contract address
    /// @param _troveManager The TroveManager contract address
    /// @param _priceFeed The PriceFeed contract address
    constructor(
        address _musdToken,
        address _borrowerOperations,
        address _troveManager,
        address _priceFeed
    ) EIP712("PayceMUSD", "1") {
        require(_musdToken != address(0), "invalid musd token");
        require(_borrowerOperations != address(0), "invalid borrower ops");
        require(_troveManager != address(0), "invalid trove manager");
        require(_priceFeed != address(0), "invalid price feed");

        musdToken = IERC20(_musdToken);
        borrowerOperations = IBorrowerOperations(_borrowerOperations);
        troveManager = ITroveManager(_troveManager);
        priceFeed = IPriceFeed(_priceFeed);
    }

    // =============================
    // MUSD Borrowing Functions
    // =============================

    /// @notice Open a trove by depositing BTC and borrowing MUSD
    /// @dev The borrowed MUSD is automatically deposited into your Payce purse.
    ///      You must send BTC as msg.value. The contract will:
    ///      1. Open a trove on your behalf via BorrowerOperations
    ///      2. Receive the minted MUSD
    ///      3. Add it to your userBalance in this contract
    /// @param _musdAmount Amount of MUSD you want to borrow
    /// @param _upperHint Hint for sorted trove list (use address(0) if unsure)
    /// @param _lowerHint Hint for sorted trove list (use address(0) if unsure)
    /// @param _depositToPurse If true, deposits borrowed MUSD into your Payce purse automatically
    function openTroveAndBorrow(
        uint256 _musdAmount,
        address _upperHint,
        address _lowerHint,
        bool _depositToPurse
    ) external payable {
        require(msg.value > 0, "must send BTC collateral");
        require(_musdAmount > 0, "must borrow >0 MUSD");

        // Check minimum debt requirement
        uint256 minDebt = borrowerOperations.minNetDebt();
        require(_musdAmount >= minDebt, "below minimum debt");

        // Get MUSD balance before opening trove
        uint256 musdBefore = musdToken.balanceOf(address(this));

        // Open trove on behalf of this contract (BTC sent along with the call)
        // Note: The trove will be owned by this contract, not the user directly
        // This allows us to manage the loan on behalf of users
        borrowerOperations.openTrove{value: msg.value}(
            _musdAmount,
            _upperHint,
            _lowerHint
        );

        // Get MUSD balance after - the difference is what we borrowed
        uint256 musdAfter = musdToken.balanceOf(address(this));
        uint256 musdReceived = musdAfter - musdBefore;

        require(musdReceived >= _musdAmount, "didnt receive expected MUSD");

        if (_depositToPurse) {
            // Automatically add borrowed MUSD to user's purse
            userBalance[msg.sender] += musdReceived;
            emit Deposited(msg.sender, musdReceived);
        } else {
            // Transfer MUSD directly to user's wallet
            bool ok = musdToken.transfer(msg.sender, musdReceived);
            require(ok, "transfer failed");
        }

        emit TroveOpened(msg.sender, msg.value, musdReceived);
    }

    /// @notice Repay MUSD to reduce your loan debt
    /// @dev Repays interest first, then principal. MUSD is taken from your Payce purse.
    ///      If you don't have enough in your purse, you'll need to deposit first.
    /// @param _amount Amount of MUSD to repay
    /// @param _upperHint Hint for sorted trove list repositioning
    /// @param _lowerHint Hint for sorted trove list repositioning
    /// @param _fromPurse If true, uses MUSD from your Payce purse; if false, uses your wallet balance
    function repayLoan(
        uint256 _amount,
        address _upperHint,
        address _lowerHint,
        bool _fromPurse
    ) external {
        require(_amount > 0, "amount must be >0");

        if (_fromPurse) {
            // Use MUSD from user's purse (must have available balance)
            uint256 available = availableBalance(msg.sender);
            require(_amount <= available, "insufficient purse balance");

            // Reduce user's purse balance
            userBalance[msg.sender] -= _amount;
        } else {
            // Pull MUSD from user's wallet (must have approved this contract)
            bool ok = musdToken.transferFrom(msg.sender, address(this), _amount);
            require(ok, "transferFrom failed");
        }

        // Approve BorrowerOperations to spend MUSD for repayment
        musdToken.approve(address(borrowerOperations), _amount);

        // Repay the loan through BorrowerOperations
        borrowerOperations.repayMUSD(_amount, _upperHint, _lowerHint);

        emit LoanRepaid(msg.sender, _amount);
    }

    /// @notice Close your trove completely by repaying all debt
    /// @dev This repays your entire debt and returns all your BTC collateral.
    ///      You need enough MUSD to cover: (principal + interest - 200 gas compensation)
    ///      The 200 MUSD gas compensation is automatically handled by the protocol.
    /// @param _fromPurse If true, uses MUSD from your purse; if false, uses your wallet
    function closeTrove(bool _fromPurse) external {
        // Get current debt to know how much MUSD is needed
        (uint256 principal, uint256 interest, uint256 coll) = 
            troveManager.getEntireDebtAndColl(address(this));

        // Total debt minus the 200 MUSD gas compensation (which comes from GasPool)
        uint256 totalDebt = principal + interest;
        uint256 gasCompensation = 200e18; // 200 MUSD
        uint256 musdNeeded = totalDebt - gasCompensation;

        require(musdNeeded > 0, "no debt to repay");

        if (_fromPurse) {
            uint256 available = availableBalance(msg.sender);
            require(musdNeeded <= available, "insufficient purse balance");
            userBalance[msg.sender] -= musdNeeded;
        } else {
            bool ok = musdToken.transferFrom(msg.sender, address(this), musdNeeded);
            require(ok, "transferFrom failed");
        }

        // Approve BorrowerOperations to spend MUSD
        musdToken.approve(address(borrowerOperations), musdNeeded);

        // Close the trove (this repays debt and returns BTC)
        uint256 btcBefore = address(this).balance;
        borrowerOperations.closeTrove();
        uint256 btcAfter = address(this).balance;

        // Return BTC collateral to user
        uint256 btcReturned = btcAfter - btcBefore;
        if (btcReturned > 0) {
            (bool sent, ) = payable(msg.sender).call{value: btcReturned}("");
            require(sent, "BTC transfer failed");
        }

        emit TroveClosed(msg.sender);
    }

    /// @notice Refinance your loan to the current global interest rate
    /// @dev This updates your trove's interest rate to match the current global rate.
    ///      A refinancing fee (typically 20% of the borrowing fee) will be charged.
    ///      This is cheaper than closing and reopening your trove.
    /// @param _upperHint Hint for sorted trove list repositioning
    /// @param _lowerHint Hint for sorted trove list repositioning
    function refinanceLoan(address _upperHint, address _lowerHint) external {
        borrowerOperations.refinance(_upperHint, _lowerHint);
        emit TroveRefinanced(msg.sender);
    }

    /// @notice Add more BTC collateral to your trove to improve your collateralization ratio
    /// @dev Send BTC as msg.value to add to your collateral
    /// @param _upperHint Hint for sorted trove list repositioning
    /// @param _lowerHint Hint for sorted trove list repositioning
    function addCollateral(address _upperHint, address _lowerHint) external payable {
        require(msg.value > 0, "must send BTC");
        borrowerOperations.addColl{value: msg.value}(_upperHint, _lowerHint);
        emit CollateralAdded(msg.sender, msg.value);
    }

    /// @notice Withdraw BTC collateral from your trove
    /// @dev Your ICR must remain above 110% after withdrawal
    /// @param _amount Amount of BTC to withdraw
    /// @param _upperHint Hint for sorted trove list repositioning
    /// @param _lowerHint Hint for sorted trove list repositioning
    function withdrawCollateral(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        require(_amount > 0, "amount must be >0");

        uint256 btcBefore = address(this).balance;
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
        uint256 btcAfter = address(this).balance;

        uint256 btcReceived = btcAfter - btcBefore;
        require(btcReceived > 0, "no BTC received");

        // Transfer BTC to user
        (bool sent, ) = payable(msg.sender).call{value: btcReceived}("");
        require(sent, "BTC transfer failed");

        emit CollateralWithdrawn(msg.sender, btcReceived);
    }

    // =============================
    // View Functions for Loan Info
    // =============================

    /// @notice Get comprehensive information about your trove
    /// @return principal The principal debt (amount originally borrowed)
    /// @return interest The accumulated interest owed
    /// @return totalDebt Total debt (principal + interest)
    /// @return collateral BTC collateral in your trove
    /// @return icr Individual Collateralization Ratio (e.g., 1.5e18 = 150%)
    /// @return interestRate Your current interest rate in basis points (e.g., 100 = 1%)
    /// @return isActive Whether your trove is currently active
    function getLoanDetails()
        external
        view
        returns (
            uint256 principal,
            uint256 interest,
            uint256 totalDebt,
            uint256 collateral,
            uint256 icr,
            uint16 interestRate,
            bool isActive
        )
    {
        // Get debt and collateral
        (principal, interest, collateral) = 
            troveManager.getEntireDebtAndColl(address(this));

        totalDebt = principal + interest;

        // Get current BTC price for ICR calculation
        uint256 price = priceFeed.fetchPrice();
        icr = troveManager.getCurrentICR(address(this), price);

        // Get trove details for interest rate and status
        (
            ,
            ,
            ,
            ,
            uint256 status,
            uint16 rate,
            ,
            ,

        ) = troveManager.Troves(address(this));

        interestRate = rate;
        isActive = (status == 1); // 1 = active trove
    }

    /// @notice Calculate current interest owed on your loan
    /// @return The amount of interest currently owed
    function getCurrentInterest() external view returns (uint256) {
        (, uint256 interest, ) = troveManager.getEntireDebtAndColl(address(this));
        return interest;
    }

    /// @notice Get your current collateralization ratio as a percentage
    /// @return ICR as a percentage (e.g., 150 = 150%)
    function getCollateralizationRatioPercent() external view returns (uint256) {
        uint256 price = priceFeed.fetchPrice();
        uint256 icr = troveManager.getCurrentICR(address(this), price);
        // ICR is in 1e18 format, convert to percentage: ICR * 100 / 1e18
        return (icr * 100) / 1e18;
    }

    /// @notice Check if your trove is at risk of liquidation
    /// @dev Returns true if ICR < 110% (liquidation threshold)
    /// @return atRisk True if at risk of liquidation
    /// @return currentICR Your current ICR as a percentage
    function isAtLiquidationRisk() external view returns (bool atRisk, uint256 currentICR) {
        uint256 price = priceFeed.fetchPrice();
        uint256 icr = troveManager.getCurrentICR(address(this), price);
        currentICR = (icr * 100) / 1e18;
        atRisk = currentICR < 110; // 110% is the MCR (Minimum Collateral Ratio)
    }

    // =============================
    // Original Payce Functions
    // =============================

    /// @notice Deposit MUSD tokens into your Payce purse
    /// @dev User must have `approve`-ed this contract to spend the specified `amount` beforehand.
    ///      This can be MUSD you already own or MUSD borrowed through this contract.
    /// @param amount Amount of MUSD to deposit
    function deposit(uint256 amount) external {
        require(amount > 0, "amount>0");
        // Pull MUSD tokens from user
        bool ok = musdToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");
        userBalance[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw unreserved MUSD from your purse
    /// @dev Allowed only up to `userBalance - reservedBalance`.
    /// @param amount Amount of MUSD to withdraw
    function withdrawUser(uint256 amount) external {
        require(amount > 0, "amount>0");
        uint256 available = availableBalance(msg.sender);
        require(amount <= available, "insufficient available funds");
        userBalance[msg.sender] -= amount;
        bool ok = musdToken.transfer(msg.sender, amount);
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Reserve funds in your purse to back off-chain vouchers
    /// @dev Call this once to reserve a sum that equals the total of vouchers you plan to sign.
    ///      Reserving is on-chain and costs gas, but it ensures merchants can later redeem vouchers.
    /// @param amount Amount of MUSD to reserve
    function reserveFunds(uint256 amount) external {
        require(amount > 0, "amount>0");
        uint256 available = availableBalance(msg.sender);
        require(amount <= available, "not enough available to reserve");
        reservedBalance[msg.sender] += amount;
        emit Reserved(msg.sender, amount);
    }

    /// @notice Release previously reserved funds
    /// @dev Use this if you want to cancel unsigned vouchers or free up reserved balance
    /// @param amount Amount of MUSD to release from reservation
    function releaseReserved(uint256 amount) external {
        require(amount > 0, "amount>0");
        require(reservedBalance[msg.sender] >= amount, "not reserved that much");
        reservedBalance[msg.sender] -= amount;
        emit Released(msg.sender, amount);
    }

    // =============================
    // Voucher / Redemption
    // =============================

    /// @dev Voucher struct (used for EIP-712 typed data signing off-chain)
    struct Voucher {
        address payer;
        address merchant;
        uint256 amount;
        uint256 nonce;
        uint256 expiry; // unix timestamp
    }

    /// @notice Redeem a single voucher
    /// @dev Merchant calls this with the voucher and signature.
    ///      The voucher must be signed by the payer (EIP-712). The payer must have reserved funds
    ///      (reservedBalance) covering the redemption amount.
    /// @param voucher The voucher struct containing payment details
    /// @param signature The EIP-712 signature from the payer
    function redeemVoucher(
        Voucher calldata voucher,
        bytes calldata signature
    ) external {
        // Only the merchant specified in voucher can call redeem on its behalf
        require(msg.sender == voucher.merchant, "only merchant can call");

        // Validate expiry
        require(block.timestamp <= voucher.expiry, "voucher expired");

        // Compute EIP-712 digest
        bytes32 digest = _hashVoucher(voucher);

        // Prevent replay
        require(!redeemed[digest], "voucher already redeemed");

        // Recover signer
        address signer = ECDSA.recover(digest, signature);
        require(signer == voucher.payer, "invalid signature");

        // Check payer balances
        require(userBalance[voucher.payer] >= voucher.amount, "payer insufficient balance");
        require(reservedBalance[voucher.payer] >= voucher.amount, "not enough reserved funds");

        // Mark redeemed & move balances
        redeemed[digest] = true;
        userBalance[voucher.payer] -= voucher.amount;
        reservedBalance[voucher.payer] -= voucher.amount;
        merchantBalance[voucher.merchant] += voucher.amount;

        emit Redeemed(voucher.payer, voucher.merchant, voucher.amount, digest);
    }

    /// @notice Redeem many vouchers in a single transaction
    /// @dev Useful to batch settlements and save gas.
    ///      All vouchers must be signed by their respective payers and the caller must be the merchant for each.
    /// @param vouchers Array of voucher structs
    /// @param signatures Array of corresponding EIP-712 signatures
    function redeemBatch(
        Voucher[] calldata vouchers,
        bytes[] calldata signatures
    ) external {
        require(vouchers.length == signatures.length, "length mismatch");
        for (uint256 i = 0; i < vouchers.length; i++) {
            Voucher calldata v = vouchers[i];
            bytes calldata sig = signatures[i];

            // Merchant must be the caller
            require(msg.sender == v.merchant, "caller not merchant");

            // Expiry check
            require(block.timestamp <= v.expiry, "voucher expired");

            bytes32 digest = _hashVoucher(v);
            if (redeemed[digest]) {
                continue; // Skip already redeemed vouchers in the batch
            }

            address signer = ECDSA.recover(digest, sig);
            if (signer != v.payer) {
                continue; // Skip invalid signature
            }

            // Require balances & reserved -- if insufficient, revert to avoid partial state
            // We choose to revert if any voucher fails balance checks to keep atomicity.
            require(userBalance[v.payer] >= v.amount, "payer insufficient balance in batch");
            require(reservedBalance[v.payer] >= v.amount, "not enough reserved funds in batch");

            // Commit
            redeemed[digest] = true;
            userBalance[v.payer] -= v.amount;
            reservedBalance[v.payer] -= v.amount;
            merchantBalance[v.merchant] += v.amount;

            emit Redeemed(v.payer, v.merchant, v.amount, digest);
        }
    }

    /// @notice Merchant withdraws their earned balance to their wallet
    /// @param amount Amount of MUSD to withdraw
    function withdrawMerchant(uint256 amount) external {
        require(amount > 0, "amount>0");
        uint256 bal = merchantBalance[msg.sender];
        require(bal >= amount, "insufficient merchant balance");
        merchantBalance[msg.sender] = bal - amount;
        bool ok = musdToken.transfer(msg.sender, amount);
        require(ok, "transfer failed");
        emit MerchantWithdrawn(msg.sender, amount);
    }

    // =============================
    // View Helpers
    // =============================

    /// @notice Returns available (withdrawable) balance for a user (total - reserved)
    /// @param user Address of the user
    /// @return Available MUSD balance
    function availableBalance(address user) public view returns (uint256) {
        uint256 total = userBalance[user];
        uint256 reserved = reservedBalance[user];
        if (total <= reserved) return 0;
        return total - reserved;
    }

    /// @notice Helper to compute EIP-712 digest for a voucher
    /// @param v The voucher struct
    /// @return The EIP-712 compliant hash
    function _hashVoucher(Voucher calldata v) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                VOUCHER_TYPEHASH,
                v.payer,
                v.merchant,
                v.amount,
                v.nonce,
                v.expiry
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /// @notice Get all balance information for a user
    /// @param user Address of the user
    /// @return total Total MUSD balance in purse
    /// @return reserved Reserved MUSD for vouchers
    /// @return available Available MUSD for withdrawal
    function getUserBalances(address user)
        external
        view
        returns (
            uint256 total,
            uint256 reserved,
            uint256 available
        )
    {
        total = userBalance[user];
        reserved = reservedBalance[user];
        available = availableBalance(user);
    }

    /// @notice Get merchant's earned balance
    /// @param merchant Address of the merchant
    /// @return Merchant's MUSD balance
    function getMerchantBalance(address merchant) external view returns (uint256) {
        return merchantBalance[merchant];
    }

    /// @notice Get the minimum MUSD amount that can be borrowed
    /// @return Minimum net debt in MUSD
    function getMinimumBorrowAmount() external view returns (uint256) {
        return borrowerOperations.minNetDebt();
    }

    /// @notice Calculate the borrowing fee for a given MUSD amount
    /// @param _musdAmount Amount of MUSD to borrow
    /// @return The borrowing fee in MUSD
    function calculateBorrowingFee(uint256 _musdAmount) external view returns (uint256) {
        return borrowerOperations.getBorrowingFee(_musdAmount);
    }

    /// @notice Get the current BTC price from the oracle
    /// @return BTC price scaled by 1e18 (e.g., 100000e18 = $100,000)
    function getCurrentBTCPrice() external view returns (uint256) {
        return priceFeed.fetchPrice();
    }

    // =============================
    // Receive BTC
    // =============================

    /// @notice Allow contract to receive BTC (for collateral returns, etc.)
    receive() external payable {}

    /// @notice Fallback function
    fallback() external payable {}
}

