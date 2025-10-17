import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  Address, 
  Hash, 
  getContract,
  PublicClient,
  WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mezoTestnet as mezoChain } from '@mezo-org/chains';
import { PAYCE_MUSD_ABI } from './abi';
import {
  PayceConfig,
  PayceAccount,
  Voucher,
  TransactionOptions,
  TransactionResult,
  PayceError,
  InvalidVoucherError,
  NETWORKS,
  CONTRACT_ADDRESSES
} from './types';

/**
 * PayceMUSD SDK - Main class for interacting with PayceMUSD contract
 */
export class PayceMUSD {
  private publicClient: PublicClient;
  protected walletClient?: WalletClient;
  private contractAddress: Address;
  private chainId: number;

  constructor(config: PayceConfig, account?: PayceAccount) {
    this.contractAddress = config.contractAddress;
    this.chainId = config.chainId;

    // Create public client
    const transport = config.transport || http(config.rpcUrl);
    this.publicClient = createPublicClient({
      chain: { ...mezoChain, id: config.chainId },
      transport,
    });

    // Create wallet client if account provided
    if (account) {
      const accountObj = account.account || privateKeyToAccount(account.privateKey!);
      this.walletClient = createWalletClient({
        chain: { ...mezoChain, id: config.chainId },
        transport,
        account: accountObj,
      });
    }
  }

  /**
   * Create SDK instance for Mezo Testnet
   */
  static forMezoTestnet(account?: PayceAccount): PayceMUSD {
    const network = NETWORKS.mezoTestnet;
    const addresses = CONTRACT_ADDRESSES.mezoTestnet;
    
    return new PayceMUSD({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, account);
  }

  /**
   * Create SDK instance for Mezo Mainnet
   */
  static forMezoMainnet(account?: PayceAccount): PayceMUSD {
    const network = NETWORKS.mezoMainnet;
    const addresses = CONTRACT_ADDRESSES.mezoMainnet;
    
    return new PayceMUSD({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, account);
  }

  /**
   * Create SDK instance with wallet connection (MetaMask, Trust Wallet, etc.)
   */
  static withWalletConnection(
    config: PayceConfig, 
    walletClient: WalletClient
  ): PayceMUSD {
    const sdk = new PayceMUSD(config);
    sdk.walletClient = walletClient;
    return sdk;
  }

  /**
   * Create SDK instance for Mezo Testnet with wallet connection
   */
  static forMezoTestnetWithWallet(walletClient: WalletClient): PayceMUSD {
    const network = NETWORKS.mezoTestnet;
    const addresses = CONTRACT_ADDRESSES.mezoTestnet;
    
    return PayceMUSD.withWalletConnection({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, walletClient);
  }

  /**
   * Create SDK instance for Mezo Mainnet with wallet connection
   */
  static forMezoMainnetWithWallet(walletClient: WalletClient): PayceMUSD {
    const network = NETWORKS.mezoMainnet;
    const addresses = CONTRACT_ADDRESSES.mezoMainnet;
    
    return PayceMUSD.withWalletConnection({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, walletClient);
  }

  /**
   * Get contract instance
   */
  protected getContract(): any {
    if (!this.walletClient) {
      throw new PayceError('Wallet client not initialized. Provide account when creating SDK instance.');
    }
    return getContract({
      address: this.contractAddress,
      abi: PAYCE_MUSD_ABI,
      client: {
        public: this.publicClient,
        wallet: this.walletClient,
      },
    });
  }

  /**
   * Execute a contract write operation
   */
  protected async executeWrite<T>(
    operation: () => Promise<Hash>,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    try {
      if (!this.walletClient) {
        throw new PayceError('Wallet client not initialized');
      }

      const hash = await operation();
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        hash,
        receipt,
        success: receipt.status === 'success',
        error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    } catch (error) {
      return {
        hash: '0x' as Hash,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a contract read operation
   */
  protected async executeRead<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw new PayceError(
        error instanceof Error ? error.message : 'Read operation failed'
      );
    }
  }

  /**
   * Validate voucher data
   */
  protected validateVoucher(voucher: Voucher): void {
    if (!voucher.payer || !voucher.merchant) {
      throw new InvalidVoucherError('Payer and merchant addresses are required');
    }
    if (voucher.amount <= 0n) {
      throw new InvalidVoucherError('Amount must be greater than 0');
    }
    if (voucher.nonce <= 0n) {
      throw new InvalidVoucherError('Nonce must be greater than 0');
    }
    if (voucher.expiry <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new InvalidVoucherError('Voucher has expired');
    }
  }

  /**
   * Create EIP-712 domain for voucher signing
   */
  protected createEIP712Domain() {
    return {
      name: 'PayceMUSD',
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.contractAddress,
    } as const;
  }

  /**
   * Create EIP-712 types for voucher signing
   */
  protected createEIP712Types() {
    return {
      Voucher: [
        { name: 'payer', type: 'address' },
        { name: 'merchant', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    } as const;
  }

  /**
   * Get current account address
   */
  getAccountAddress(): Address {
    if (!this.walletClient || !this.walletClient.account) {
      throw new PayceError('Wallet client not initialized');
    }
    return this.walletClient.account.address;
  }

  /**
   * Get contract address
   */
  getContractAddress(): Address {
    return this.contractAddress;
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainId;
  }
}
