# PayceMUSD SDK

SDK for interacting with PayceMUSD - a micropayment infrastructure to borrow and spend MUSD against your Bitcoin for instant, off-chain micropayments with on-chain settlement.

## Features

- **MUSD Borrowing**: Borrow MUSD against Bitcoin collateral
- **Micropayments**: Instant off-chain payments with on-chain settlement
- **EIP-712 Vouchers**: Secure signed payment vouchers
- **Real-time Data**: Live loan status, balances, and risk monitoring
- **Type Safety**: Full TypeScript support with comprehensive types
- **Tested**: Extensive test coverage with Jest

## Installation

```bash
npm install payce-musd-sdk
```

## Quick Start

```typescript
import { PayceMUSDSDK } from 'payce-musd-sdk';
import { useWalletClient } from 'wagmi';

// Create SDK instance for Mezo Testnet
const sdk = PayceMUSDSDK.forMezoTestnet({
  address: '0xYourAddress',
  privateKey: '0xYourPrivateKey',
});

// Create SDK instance with wallet client for Mezo Testnet
const sdk = PayceMUSDSDK.forMezoTestnetWithWallet(walletClient);


// Check user status
const status = await sdk.getUserStatus();
console.log('Loan:', status.loan);
console.log('Purse:', status.purse);
console.log('Merchant Earnings:', status.merchantEarnings);
```

## Core Concepts

### Dual-Purse System

PayceMUSD uses a dual-purse system:
- **Total Balance**: All MUSD in your purse
- **Reserved Balance**: MUSD locked for voucher payments
- **Available Balance**: MUSD available for withdrawal

### Voucher System

Micropayments use EIP-712 signed vouchers:
1. User reserves MUSD for payments
2. User signs vouchers off-chain
3. Merchant redeems vouchers on-chain
4. Reserved MUSD is transferred to merchant

## API Reference

### SDK Initialization

```typescript
// Using factory methods with private key (recommended for server-side)
const sdk = PayceMUSDSDK.forMezoTestnet({
  address: '0xYourAddress',
  privateKey: '0xYourPrivateKey',
});

// Using constructor with private key
const sdk = new PayceMUSDSDK(config, {
  address: '0xYourAddress',
  privateKey: '0xYourPrivateKey',
});

// Using wallet connections (for MetaMask, WalletConnect, etc.)
const sdk = PayceMUSDSDK.forMezoTestnetWithWallet(walletClient);
const sdk = PayceMUSDSDK.withWalletConnection(config, walletClient);
```

### Borrowing Functions

#### Open Trove and Borrow

```typescript
const result = await sdk.openTroveAndBorrow({
  musdAmount: parseEther('5000'), // 5000 MUSD
  btcAmount: parseEther('0.1'),    // 0.1 BTC collateral
  depositToPurse: true,           // Deposit borrowed MUSD to purse
});

console.log('Transaction hash:', result.hash);
console.log('Success:', result.success);
```

#### Repay Loan

```typescript
const result = await sdk.repayLoan({
  amount: parseEther('1000'), // 1000 MUSD
  fromPurse: true,           // Use purse balance
});
```

#### Close Trove

```typescript
const result = await sdk.closeTrove(true); // Close using purse balance
```

#### Add Collateral

```typescript
const result = await sdk.addCollateral({
  amount: parseEther('0.01'), // 0.01 BTC
});
```

#### Withdraw BTC Collateral

```typescript
const result = await sdk.withdrawCollateral({
  amount: parseEther('0.01'), // 0.01 BTC
});
```

#### Refinance Loan

```typescript
const result = await sdk.refinanceLoan();
```

### Micropayment Functions

#### Deposit MUSD

```typescript
const result = await sdk.micropayments.deposit(parseEther('1000'));
```

#### Reserve Funds for Vouchers

```typescript
const result = await sdk.micropayments.reserveFunds(parseEther('500'));
```

#### Create and Sign Voucher

```typescript
const voucherSignature = await sdk.micropayments.createVoucher(
  '0xMerchantAddress',
  parseEther('100'), // 100 MUSD
  1n,                // Nonce
  3600               // Expiry in seconds
);

console.log('Voucher:', voucherSignature.voucher);
console.log('Signature:', voucherSignature.signature);
```

#### Redeem Voucher (Merchant)

```typescript
const result = await sdk.micropayments.redeemVoucher(
  voucher,
  signature
);
```

#### Batch Redeem Vouchers

```typescript
const result = await sdk.micropayments.redeemBatch(
  [voucher1, voucher2],
  [signature1, signature2]
);
```

#### Withdraw Merchant Earnings

```typescript
const result = await sdk.micropayments.withdrawMerchant(parseEther('1000'));
```

#### Release Reserved Funds

```typescript
const result = await sdk.micropayments.releaseReserved(parseEther('500'));
```

#### Withdraw User Funds

```typescript
const result = await sdk.micropayments.withdrawUser(parseEther('1000'));
```

### Read Functions

#### Get Loan Details

```typescript
const loan = await sdk.getLoanDetails();
console.log('Principal:', formatEther(loan.principal));
console.log('Interest:', formatEther(loan.interest));
console.log('Total Debt:', formatEther(loan.totalDebt));
console.log('Collateral:', formatEther(loan.collateral));
console.log('ICR:', Number(loan.icr), '%');
console.log('Active:', loan.isActive);
```

#### Get User Balances

```typescript
const balances = await sdk.micropayments.getUserBalances(userAddress);
console.log('Total:', formatEther(balances.total));
console.log('Reserved:', formatEther(balances.reserved));
console.log('Available:', formatEther(balances.available));
```

#### Check Available Balance

```typescript
const available = await sdk.micropayments.getAvailableBalance(userAddress);
console.log('Available:', formatEther(available), 'MUSD');
```

#### Check Reserved Balance

```typescript
const reserved = await sdk.micropayments.getReservedBalance(userAddress);
console.log('Reserved:', formatEther(reserved), 'MUSD');
```

#### Check if Voucher Redeemed

```typescript
const isRedeemed = await sdk.micropayments.isVoucherRedeemed(voucher);
console.log('Redeemed:', isRedeemed);
```

#### Check Liquidation Risk

```typescript
const risk = await sdk.isAtLiquidationRisk();
console.log('At Risk:', risk.atRisk);
console.log('Current ICR:', Number(risk.currentICR), '%');
```

#### Get Current BTC Price

```typescript
const price = await sdk.getCurrentBTCPrice();
console.log('BTC Price:', formatEther(price), 'USD');
```

#### Get Current Interest

```typescript
const interest = await sdk.getCurrentInterest();
console.log('Current Interest:', formatEther(interest), 'MUSD');
```

#### Get Collateralization Ratio

```typescript
const icr = await sdk.getCollateralizationRatioPercent();
console.log('ICR:', Number(icr), '%');
```

#### Calculate Borrowing Fee

```typescript
const fee = await sdk.calculateBorrowingFee(parseEther('1000'));
console.log('Borrowing Fee:', formatEther(fee), 'MUSD');
```

#### Get Minimum Borrow Amount

```typescript
const minBorrow = await sdk.getMinimumBorrowAmount();
console.log('Min Borrow:', formatEther(minBorrow), 'MUSD');
```

### Utility Functions

#### Get User Status

```typescript
const status = await sdk.getUserStatus();
console.log('User:', status.user);
console.log('Loan:', status.loan);
console.log('Purse:', status.purse);
console.log('Merchant Earnings:', status.merchantEarnings);
console.log('Liquidation Risk:', status.liquidationRisk);
```

#### Get Contract Addresses

```typescript
const addresses = sdk.getContractAddresses();
console.log('PayceMUSD:', addresses.payceMUSD);
console.log('MUSD Token:', addresses.musdToken);
console.log('BorrowerOperations:', addresses.borrowerOperations);
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import { 
  PayceError,
  InsufficientBalanceError,
  InsufficientReservedError,
  InvalidVoucherError,
  TroveNotActiveError,
  TroveAlreadyActiveError
} from '@payce-finance/sdk';

try {
  await sdk.openTroveAndBorrow(options);
} catch (error) {
  if (error instanceof TroveAlreadyActiveError) {
    console.log('Trove is already active');
  } else if (error instanceof PayceError) {
    console.log('Payce error:', error.message);
  }
}
```

## Configuration

### Network Configuration

```typescript
import { NETWORKS, CONTRACT_ADDRESSES } from '@payce-finance/sdk';

// Available networks
console.log(NETWORKS.mezoTestnet);
console.log(NETWORKS.mezoMainnet);

// Contract addresses
console.log(CONTRACT_ADDRESSES.mezoTestnet);
console.log(CONTRACT_ADDRESSES.mezoMainnet);
```

### Custom Configuration

```typescript
const config = {
  contractAddress: '0x...',
  rpcUrl: 'https://rpc.test.mezo.org',
  chainId: 31611,
};

const sdk = new PayceMUSDSDK(config, account);
```

## Transaction Options

All write functions accept optional transaction parameters:

```typescript
const options = {
  gasLimit: 500000n,
  gasPrice: 20000000000n,
  maxFeePerGas: 30000000000n,
  maxPriorityFeePerGas: 2000000000n,
};

await sdk.deposit(parseEther('1000'), options);
```

## Examples

### Complete Borrowing Flow

```typescript
import { parseEther, formatEther } from 'viem';
import { PayceMUSDSDK } from 'payce-musd-sdk';

async function borrowingExample() {
  const sdk = PayceMUSDSDK.forMezoTestnet({
    address: '0xYourAddress',
    privateKey: '0xYourPrivateKey',
  });

  // 1. Check minimum borrow amount
  const minBorrow = await sdk.getMinimumBorrowAmount();
  console.log('Min borrow:', formatEther(minBorrow));

  // 2. Open trove and borrow
  const result = await sdk.openTroveAndBorrow({
    musdAmount: parseEther('5000'),
    btcAmount: parseEther('0.1'),
    depositToPurse: true,
  });

  if (result.success) {
    console.log('Borrow successful:', result.hash);
  }

  // 3. Check loan status
  const loan = await sdk.getLoanDetails();
  console.log('Debt:', formatEther(loan.totalDebt));
  console.log('Collateral:', formatEther(loan.collateral));
  console.log('ICR:', Number(loan.icr), '%');

  // 4. Repay some debt
  await sdk.repayLoan({
    amount: parseEther('1000'),
    fromPurse: true,
  });
}
```

### Complete Micropayment Flow

```typescript
async function micropaymentExample() {
  const sdk = PayceMUSDSDK.forMezoTestnet({
    address: '0xYourAddress',
    privateKey: '0xYourPrivateKey',
  });

  const merchantAddress = '0xMerchantAddress';

  // 1. Deposit MUSD to purse
  await sdk.micropayments.deposit(parseEther('1000'));

  // 2. Reserve funds for vouchers
  await sdk.micropayments.reserveFunds(parseEther('500'));

  // 3. Create vouchers
  const voucher1 = await sdk.micropayments.createVoucher(
    merchantAddress,
    parseEther('100'),
    1n
  );

  const voucher2 = await sdk.micropayments.createVoucher(
    merchantAddress,
    parseEther('200'),
    2n
  );

  // 4. Merchant redeems vouchers
  const merchantSDK = PayceMUSDSDK.forMezoTestnet({
    address: merchantAddress,
    privateKey: '0xMerchantPrivateKey',
  });

  // Single voucher redemption
  await merchantSDK.micropayments.redeemVoucher(
    voucher1.voucher,
    voucher1.signature
  );

  // Batch voucher redemption
  await merchantSDK.micropayments.redeemBatch(
    [voucher1.voucher, voucher2.voucher],
    [voucher1.signature, voucher2.signature]
  );

  // 5. Merchant withdraws earnings
  const merchantBalance = await merchantSDK.micropayments.getMerchantBalance(merchantAddress);
  if (merchantBalance > 0n) {
    await merchantSDK.micropayments.withdrawMerchant(merchantBalance);
  }
}
```

## Testing

The SDK includes comprehensive tests. Run tests with:

```bash
npm test
```

## License

MIT License - see LICENSE file for details.
