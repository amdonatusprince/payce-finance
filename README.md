# Payce Finance

Payce is a micropayment infrastructure for credit systems that make borrowing and spending mUSD against bitcoin accessible to everyone.

Payce's micropayment infrastructure is ideal for any consumer application that requires both crypto collateral and instant, small payments. Imagine you’re buying 100 tiny items (like game moves, Pay-per-API call, Per-second content streaming, IoT data access, In-game or social tipping).


## What This Solves

### 1. **Borrow MUSD Against Bitcoin** 
Users deposit BTC and borrow MUSD stablecoins using the MUSD protocol's BorrowerOperations contract directly from the Payce interface.

### 2. **Micropayments with Vouchers**
Use borrowed (or owned) MUSD for instant, off-chain micropayments through EIP-712 signed vouchers with on-chain settlement.

### 3. **Seamless Wallet Integration**
Mezo Passport integration provides unified Bitcoin + EVM wallet management for the Mezo blockchain ecosystem.

### Official SDK

We provide a comprehensive TypeScript SDK for easy integration:

- **Full Type Safety**: Complete TypeScript support with comprehensive types
- **Error Handling**: Specific error types for better debugging
- **Factory Methods**: Easy setup for Mezo Testnet/Mainnet
- **Comprehensive API**: All contract functions with proper validation
- **Testing**: Extensive test coverage with Jest

```bash
npm install @payce-finance/sdk
```

### MUSD Borrowing Functions

| Function | Purpose |
|----------|---------|
| `openTroveAndBorrow()` | Deposit BTC, borrow MUSD, optionally deposit to purse |
| `repayLoan()` | Repay debt from purse or wallet (interest paid first) |
| `closeTrove()` | Fully repay debt and get all BTC back |
| `refinanceLoan()` | Update to new interest rate (cheaper than closing/reopening) |
| `addCollateral()` | Add more BTC to improve collateralization |
| `withdrawCollateral()` | Remove BTC (must keep ICR > 110%) |

### Loan Monitoring Functions

| Function | Returns |
|----------|---------|
| `getLoanDetails()` | Principal, interest, debt, collateral, ICR, rate, status |
| `getCurrentInterest()` | Current interest owed |
| `getCollateralizationRatioPercent()` | ICR as percentage (e.g., 150 = 150%) |
| `isAtLiquidationRisk()` | Boolean if ICR < 110% + current ICR |
| `getMinimumBorrowAmount()` | Min MUSD that can be borrowed (1,800 MUSD) |
| `calculateBorrowingFee()` | Fee for given borrow amount (0.1% default) |
| `getCurrentBTCPrice()` | Current BTC price from oracle |

### Micropayment Functions

| Function | Purpose |
|----------|---------|
| `deposit()` | Deposit MUSD to your purse |
| `withdrawUser()` | Withdraw unreserved MUSD |
| `reserveFunds()` | Lock MUSD for vouchers |
| `releaseReserved()` | Unlock reserved MUSD |
| `redeemVoucher()` | Merchant redeems single voucher |
| `redeemBatch()` | Merchant redeems multiple vouchers |
| `withdrawMerchant()` | Merchant withdraws earnings |

## Usage Example

```typescript
// 1. Deploy contract
const payceMUSD = await PayceMUSD.deploy(
  musdTokenAddress,
  borrowerOperationsAddress,
  troveManagerAddress,
  priceFeedAddress
);

// 2. User borrows MUSD with BTC
await payceMUSD.openTroveAndBorrow(
  ethers.parseEther("50000"),  // Borrow 50,000 MUSD
  ethers.ZeroAddress,
  ethers.ZeroAddress,
  true,                        // Deposit to purse
  { value: ethers.parseEther("1") }  // Send 1 BTC
);

// 3. Check loan details
const loan = await payceMUSD.getLoanDetails();
console.log(`Debt: ${loan.totalDebt}`);
console.log(`Collateral: ${loan.collateral} BTC`);
console.log(`ICR: ${loan.icr / 1e16}%`);

// 4. Reserve funds for payments
await payceMUSD.reserveFunds(ethers.parseEther("10000"));

// 5. Create signed voucher (off-chain)
const voucher = {
  payer: userAddress,
  merchant: merchantAddress,
  amount: ethers.parseEther("100"),
  nonce: Date.now(),
  expiry: Date.now() / 1000 + 86400
};
const signature = await signer.signTypedData(domain, types, voucher);

// 6. Merchant redeems voucher (on-chain)
await payceMUSD.connect(merchant).redeemVoucher(voucher, signature);

// 7. Repay loan from purse
await payceMUSD.repayLoan(
  ethers.parseEther("5000"),
  ethers.ZeroAddress,
  ethers.ZeroAddress,
  true  // from purse
);

// 8. Close trove when done
await payceMUSD.closeTrove(true);
```

## Project Structure

```
payce-finance/
├── payce-contract/          # Smart contracts and deployment
│   ├── contracts/           # Solidity contracts
│   ├── scripts/            # Deployment and test scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.ts   # Hardhat configuration
├── payce-frontend/         # Next.js frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── providers/     # Web3 providers
│   └── package.json
├── payce-sdk/             # Official TypeScript SDK
│   ├── src/
│   │   ├── types.ts       # TypeScript types
│   │   ├── core.ts        # Core SDK class
│   │   ├── borrowing.ts   # Borrowing functions
│   │   ├── micropayments.ts # Micropayment functions
│   │   └── index.ts       # Main exports
│   ├── src/__tests__/     # SDK tests
│   └── README.md          # SDK documentation
└── README.md              # This file
```

## Contract Architecture

```
┌───────────────────────────────────────┐
│         PayceMUSD Contract            │
├───────────────────────────────────────┤
│                                       │
│  ┌───────────────────────────────┐    │
│  │   MUSD Borrowing Module       │    │
│  │  - openTroveAndBorrow()       │    │
│  │  - repayLoan()                │    │
│  │  - closeTrove()               │    │
│  │  - refinanceLoan()            │    │
│  │  - getLoanDetails()           │    │
│  └───────────────────────────────┘    │
│              ↓ ↑                      │
│  ┌───────────────────────────────┐    │
│  │  Micropayment Module          │    │
│  │  - deposit() / withdraw()     │    │
│  │  - reserveFunds()             │    │
│  │  - redeemVoucher()            │    │
│  │  - redeemBatch()              │    │
│  └───────────────────────────────┘    │
│                                       │
└───────────────────────────────────────┘
         ↓              ↓           ↓
    ┌─────────┐   ┌──────────┐   ┌──────────┐
    │  MUSD   │   │Borrower  │   │  Trove   │
    │  Token  │   │Operations│   │ Manager  │
    └─────────┘   └──────────┘   └──────────┘
```

## Economic Model

### Borrowing Costs
- **Borrowing Fee**: 0.1% (one-time on opening)
- **Interest Rate**: 1% APR (simple interest, fixed at opening)
- **Gas Compensation**: 200 MUSD (one-time, refunded on closure)
- **Refinancing Fee**: 0.02% (20% of borrowing fee)

### Collateral Requirements
- **Minimum ICR**: 110% (normal mode)
- **Recovery Mode ICR**: 150%
- **Liquidation Threshold**: < 110% ICR

### Example Costs
Borrow 10,000 MUSD with 1 BTC:
- Borrowing fee: 10 MUSD (0.1%)
- Gas compensation: 200 MUSD
- **Total debt**: 10,210 MUSD
- **Interest after 1 year**: ~102 MUSD (1% of 10,210)

## Risk Warnings

### Liquidation Risk
- If ICR < 110%, your position can be liquidated
- You lose up to 10% of your collateral
- Monitor your ICR regularly

### Redemption Risk
- If you have the lowest ICR, others can redeem MUSD for your BTC
- Your debt is cancelled, but you lose BTC exposure
- Maintain a higher ICR to avoid being targeted

### Interest Accumulation
- Interest accrues continuously (every second)
- Check `getCurrentInterest()` regularly
- Repay interest before it compounds your effective rate

## Use Cases

### 1. Content Creators
- Borrow MUSD against BTC holdings
- Accept micropayments for articles, videos, music
- Viewers pay small amounts with signed vouchers
- Creator batches redemptions to save gas

### 2. API Services
- Borrow MUSD to provide liquidity
- Charge per API call with vouchers
- Instant settlement without blockchain delays
- Users reserve funds, make unlimited off-chain calls

### 3. Gaming Platforms
- Players borrow MUSD to fund in-game purchases
- Instant microtransactions for items, power-ups
- Merchants (game developers) batch settle
- No per-transaction gas fees

### 4. Subscription Services
- Users borrow MUSD, reserve for monthly payments
- Service signs vouchers for each billing period
- Redeem on-chain monthly or quarterly
- Lower overhead than traditional recurring payments

The PayceMUSD contract integrates with:

1. **MUSD Token (IERC20)** - Stablecoin transfers and balance queries
2. **BorrowerOperations** - Open, repay, refinance, close troves
3. **TroveManager** - Query trove state (debt, collateral, ICR)
4. **PriceFeed** - Get real-time BTC price for ICR calculations

All interfaces are defined in the contract for easy integration.

### SDK Integration

### Using the PayceMUSD SDK

For easier integration, use our official TypeScript SDK:

```bash
npm install @payce-finance/sdk
```

```typescript
import { PayceMUSDSDK, parseEther, formatEther } from '@payce-finance/sdk';

// Create SDK instance
const sdk = PayceMUSDSDK.forMezoTestnet({
  address: '0xYourAddress',
  privateKey: '0xYourPrivateKey',
});

// Borrow MUSD with BTC
const result = await sdk.openTroveAndBorrow({
  musdAmount: parseEther('5000'),
  btcAmount: parseEther('0.1'),
  depositToPurse: true,
});

// Check loan status
const loan = await sdk.getLoanDetails();
console.log('Debt:', formatEther(loan.totalDebt));
console.log('ICR:', Number(loan.icr), '%');

// Create micropayment vouchers
const voucher = await sdk.micropayments.createVoucher(
  '0xMerchantAddress',
  parseEther('100'),
  1n
);

// Redeem voucher (merchant)
await sdk.micropayments.redeemVoucher(voucher.voucher, voucher.signature);
```

### React Hooks (Alternative)

For React applications, you can still use custom hooks:

```typescript
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import PayceMUSDABI from "@/abis/PayceMUSD.json";

const PAYCE_ADDRESS = process.env.NEXT_PUBLIC_PAYCE_CONTRACT_ADDRESS as `0x${string}`;

export function usePayceMUSD() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read Functions
  const useUserBalances = (address?: `0x${string}`) => {
    return useReadContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "getUserBalances",
      args: [address],
    });
  };

  const useLoanDetails = () => {
    return useReadContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "getLoanDetails",
    });
  };

  const useCurrentInterest = () => {
    return useReadContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "getCurrentInterest",
    });
  };

  const useIsAtLiquidationRisk = () => {
    return useReadContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "isAtLiquidationRisk",
    });
  };

  // Write Functions
  const openTroveAndBorrow = (
    musdAmount: string,
    depositToPurse: boolean,
    btcAmount: string
  ) => {
    writeContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "openTroveAndBorrow",
      args: [
        parseEther(musdAmount),
        "0x0000000000000000000000000000000000000000", // upperHint
        "0x0000000000000000000000000000000000000000", // lowerHint
        depositToPurse,
      ],
      value: parseEther(btcAmount),
    });
  };

  const deposit = (amount: string) => {
    writeContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "deposit",
      args: [parseEther(amount)],
    });
  };

  const reserveFunds = (amount: string) => {
    writeContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "reserveFunds",
      args: [parseEther(amount)],
    });
  };

  const repayLoan = (amount: string, fromPurse: boolean) => {
    writeContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "repayLoan",
      args: [
        parseEther(amount),
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        fromPurse,
      ],
    });
  };

  const closeTrove = (fromPurse: boolean) => {
    writeContract({
      address: PAYCE_ADDRESS,
      abi: PayceMUSDABI,
      functionName: "closeTrove",
      args: [fromPurse],
    });
  };

  return {
    // Read hooks
    useUserBalances,
    useLoanDetails,
    useCurrentInterest,
    useIsAtLiquidationRisk,
    // Write functions
    openTroveAndBorrow,
    deposit,
    reserveFunds,
    repayLoan,
    closeTrove,
    // Transaction state
    isLoading,
    isSuccess,
    hash,
  };
}
```

### Example Component: Borrow MUSD

Create `payce-frontend/src/components/BorrowMUSD.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePayceMUSD } from "@/hooks/usePayceMUSD";

export function BorrowMUSD() {
  const { address } = useAccount();
  const { openTroveAndBorrow, isLoading, isSuccess } = usePayceMUSD();
  
  const [btcAmount, setBtcAmount] = useState("");
  const [musdAmount, setMusdAmount] = useState("");
  const [depositToPurse, setDepositToPurse] = useState(true);

  const handleBorrow = () => {
    if (!btcAmount || !musdAmount) return;
    openTroveAndBorrow(musdAmount, depositToPurse, btcAmount);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Borrow MUSD</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            BTC Collateral
          </label>
          <input
            type="number"
            step="0.001"
            value={btcAmount}
            onChange={(e) => setBtcAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            MUSD to Borrow
          </label>
          <input
            type="number"
            step="100"
            value={musdAmount}
            onChange={(e) => setMusdAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="25000"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="depositToPurse"
            checked={depositToPurse}
            onChange={(e) => setDepositToPurse(e.target.checked)}
          />
          <label htmlFor="depositToPurse" className="text-sm">
            Deposit to Payce purse automatically
          </label>
        </div>

        <button
          onClick={handleBorrow}
          disabled={isLoading || !address}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Borrowing..." : "Borrow MUSD"}
        </button>

        {isSuccess && (
          <div className="p-4 bg-green-100 text-green-800 rounded-lg">
            ✅ Successfully borrowed MUSD!
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example Component: View Loan Status

Create `payce-frontend/src/components/LoanStatus.tsx`:

```typescript
"use client";

import { usePayceMUSD } from "@/hooks/usePayceMUSD";
import { formatEther } from "viem";

export function LoanStatus() {
  const { useLoanDetails, useCurrentInterest, useIsAtLiquidationRisk } = usePayceMUSD();
  
  const { data: loan } = useLoanDetails();
  const { data: interest } = useCurrentInterest();
  const { data: riskData } = useIsAtLiquidationRisk();

  if (!loan) return <div>No active loan</div>;

  const [atRisk, currentICR] = riskData || [false, 0n];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Loan Status</h2>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Principal:</span>
          <span className="font-semibold">
            {formatEther(loan.principal)} MUSD
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Interest Owed:</span>
          <span className="font-semibold">
            {formatEther(loan.interest)} MUSD
          </span>
        </div>

        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-600">Total Debt:</span>
          <span className="font-bold text-lg">
            {formatEther(loan.totalDebt)} MUSD
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Collateral:</span>
          <span className="font-semibold">
            {formatEther(loan.collateral)} BTC
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">ICR:</span>
          <span className={`font-semibold ${atRisk ? 'text-red-600' : 'text-green-600'}`}>
            {Number(currentICR)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Interest Rate:</span>
          <span className="font-semibold">
            {Number(loan.interestRate) / 100}%
          </span>
        </div>

        {atRisk && (
          <div className="p-4 bg-red-100 text-red-800 rounded-lg">
            ⚠️ Warning: Your ICR is below 110%. Add collateral to avoid liquidation!
          </div>
        )}
      </div>
    </div>
  );
}
```



