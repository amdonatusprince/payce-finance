import { Address, Hash, Hex } from 'viem';

// =============================
// Core Types
// =============================

export interface PayceConfig {
  /** PayceMUSD contract address */
  contractAddress: Address;
  /** RPC URL for the network */
  rpcUrl: string;
  /** Chain ID */
  chainId: number;
  /** Optional custom transport */
  transport?: any;
}

export interface PayceAccount {
  /** Account address */
  address: Address;
  /** Private key (for signing) */
  privateKey?: Hex;
  /** Account object for viem */
  account?: any;
}

// =============================
// Contract Types
// =============================

export interface Voucher {
  /** Address of the payer */
  payer: Address;
  /** Address of the merchant */
  merchant: Address;
  /** Amount in MUSD (wei) */
  amount: bigint;
  /** Nonce for uniqueness */
  nonce: bigint;
  /** Expiry timestamp */
  expiry: bigint;
}

export interface LoanDetails {
  /** Principal debt amount */
  principal: bigint;
  /** Accumulated interest */
  interest: bigint;
  /** Total debt (principal + interest) */
  totalDebt: bigint;
  /** BTC collateral amount */
  collateral: bigint;
  /** Individual Collateralization Ratio (scaled by 1e18) */
  icr: bigint;
  /** Interest rate in basis points */
  interestRate: number;
  /** Whether trove is active */
  isActive: boolean;
}

export interface UserBalances {
  /** Total MUSD balance in purse */
  total: bigint;
  /** Reserved MUSD for vouchers */
  reserved: bigint;
  /** Available MUSD for withdrawal */
  available: bigint;
}

export interface LiquidationRisk {
  /** Whether at risk of liquidation */
  atRisk: boolean;
  /** Current ICR as percentage */
  currentICR: bigint;
}

// =============================
// Transaction Options
// =============================

export interface TransactionOptions {
  /** Gas limit */
  gasLimit?: bigint;
  /** Gas price */
  gasPrice?: bigint;
  /** Max fee per gas */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas */
  maxPriorityFeePerGas?: bigint;
  /** Value in wei (for BTC transactions) */
  value?: bigint;
}

export interface BorrowOptions extends TransactionOptions {
  /** Amount of MUSD to borrow */
  musdAmount: bigint;
  /** Amount of BTC collateral */
  btcAmount: bigint;
  /** Whether to deposit borrowed MUSD to purse */
  depositToPurse: boolean;
  /** Upper hint for trove insertion */
  upperHint?: Address;
  /** Lower hint for trove insertion */
  lowerHint?: Address;
}

export interface RepayOptions extends TransactionOptions {
  /** Amount of MUSD to repay */
  amount: bigint;
  /** Whether to use purse balance */
  fromPurse: boolean;
  /** Upper hint for trove repositioning */
  upperHint?: Address;
  /** Lower hint for trove repositioning */
  lowerHint?: Address;
}

export interface CollateralOptions extends TransactionOptions {
  /** Amount of BTC to add/withdraw */
  amount: bigint;
  /** Upper hint for trove repositioning */
  upperHint?: Address;
  /** Lower hint for trove repositioning */
  lowerHint?: Address;
}

// =============================
// Error Types
// =============================

export class PayceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PayceError';
  }
}

export class InsufficientBalanceError extends PayceError {
  constructor(required: bigint, available: bigint) {
    super(`Insufficient balance: required ${required}, available ${available}`, 'INSUFFICIENT_BALANCE');
  }
}

export class InsufficientReservedError extends PayceError {
  constructor(required: bigint, reserved: bigint) {
    super(`Insufficient reserved funds: required ${required}, reserved ${reserved}`, 'INSUFFICIENT_RESERVED');
  }
}

export class InvalidVoucherError extends PayceError {
  constructor(message: string) {
    super(`Invalid voucher: ${message}`, 'INVALID_VOUCHER');
  }
}

export class TroveNotActiveError extends PayceError {
  constructor() {
    super('Trove is not active', 'TROVE_NOT_ACTIVE');
  }
}

export class TroveAlreadyActiveError extends PayceError {
  constructor() {
    super('Trove is already active', 'TROVE_ALREADY_ACTIVE');
  }
}

// =============================
// SDK Response Types
// =============================

export interface TransactionResult {
  /** Transaction hash */
  hash: Hash;
  /** Transaction receipt */
  receipt?: any;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface VoucherSignature {
  /** The voucher data */
  voucher: Voucher;
  /** EIP-712 signature */
  signature: Hex;
  /** Domain separator */
  domain: any;
  /** Type definitions */
  types: any;
}

// =============================
// Network Configuration
// =============================

export interface NetworkConfig {
  /** Network name */
  name: string;
  /** Chain ID */
  chainId: number;
  /** RPC URL */
  rpcUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Native currency */
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mezoTestnet: {
    name: 'Mezo Testnet',
    chainId: 31611,
    rpcUrl: 'https://rpc.test.mezo.org',
    explorerUrl: 'https://explorer.test.mezo.org',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18,
    },
  },
  mezoMainnet: {
    name: 'Mezo Mainnet',
    chainId: 31610,
    rpcUrl: 'https://rpc.mezo.org',
    explorerUrl: 'https://explorer.mezo.org',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18,
    },
  },
};

// =============================
// Contract Addresses
// =============================

export interface ContractAddresses {
  /** PayceMUSD contract */
  payceMUSD: Address;
  /** MUSD token contract */
  musdToken: Address;
  /** BorrowerOperations contract */
  borrowerOperations: Address;
  /** TroveManager contract */
  troveManager: Address;
  /** PriceFeed contract */
  priceFeed: Address;
}

export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
  mezoTestnet: {
    payceMUSD: '0x04c8d6936a29dca974645e7c15fbe6b5793cb0de',
    musdToken: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
    borrowerOperations: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
    troveManager: '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0',
    priceFeed: '0x86bCF0841622a5dAC14A313a15f96A95421b9366',
  },
  mezoMainnet: {
    payceMUSD: '0x04c8d6936a29dca974645e7c15fbe6b5793cb0de', // TODO: Update with mainnet address
    musdToken: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503', // TODO: Update with mainnet address
    borrowerOperations: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5', // TODO: Update with mainnet address
    troveManager: '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0', // TODO: Update with mainnet address
    priceFeed: '0x86bCF0841622a5dAC14A313a15f96A95421b9366', // TODO: Update with mainnet address
  },
};
