import { Address } from 'viem';
import { PayceBorrowing } from './borrowing';
import { PayceMicropayments } from './micropayments';
import { PayceConfig, PayceAccount, NETWORKS, CONTRACT_ADDRESSES } from './types';

/**
 * Main PayceMUSD SDK class that combines all functionality
 */
export class PayceMUSDSDK extends PayceBorrowing {
  public micropayments: PayceMicropayments;

  constructor(config: PayceConfig, account?: PayceAccount) {
    super(config, account);
    this.micropayments = new PayceMicropayments(config, account);
  }

  /**
   * Create SDK instance for Mezo Testnet
   */
  static forMezoTestnet(account?: PayceAccount): PayceMUSDSDK {
    const network = NETWORKS.mezoTestnet;
    const addresses = CONTRACT_ADDRESSES.mezoTestnet;
    
    return new PayceMUSDSDK({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, account);
  }

  /**
   * Create SDK instance for Mezo Mainnet
   */
  static forMezoMainnet(account?: PayceAccount): PayceMUSDSDK {
    const network = NETWORKS.mezoMainnet;
    const addresses = CONTRACT_ADDRESSES.mezoMainnet;
    
    return new PayceMUSDSDK({
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
    walletClient: any
  ): PayceMUSDSDK {
    const sdk = new PayceMUSDSDK(config);
    (sdk as any).walletClient = walletClient;
    (sdk.micropayments as any).walletClient = walletClient;
    return sdk;
  }

  /**
   * Create SDK instance for Mezo Testnet with wallet connection
   */
  static forMezoTestnetWithWallet(walletClient: any): PayceMUSDSDK {
    const network = NETWORKS.mezoTestnet;
    const addresses = CONTRACT_ADDRESSES.mezoTestnet;
    
    return PayceMUSDSDK.withWalletConnection({
      contractAddress: addresses.payceMUSD,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId,
    }, walletClient);
  }

  /**
   * Get comprehensive user status including loan and purse balances
   */
  async getUserStatus(user?: Address) {
    const userAddress = user || this.getAccountAddress();
    
    const [loanDetails, userBalances, merchantBalance, liquidationRisk] = await Promise.all([
      this.getLoanDetails(),
      this.micropayments.getUserBalances(userAddress),
      this.micropayments.getMerchantBalance(userAddress),
      this.isAtLiquidationRisk(),
    ]);

    return {
      user: userAddress,
      loan: loanDetails,
      purse: userBalances,
      merchantEarnings: merchantBalance,
      liquidationRisk,
    };
  }

  /**
   * Get contract addresses for the current network
   */
  getContractAddresses() {
    const chainId = this.getChainId();
    
    if (chainId === NETWORKS.mezoTestnet.chainId) {
      return CONTRACT_ADDRESSES.mezoTestnet;
    } else if (chainId === NETWORKS.mezoMainnet.chainId) {
      return CONTRACT_ADDRESSES.mezoMainnet;
    }
    
    throw new Error(`Unknown chain ID: ${chainId}`);
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    const chainId = this.getChainId();
    
    if (chainId === NETWORKS.mezoTestnet.chainId) {
      return NETWORKS.mezoTestnet;
    } else if (chainId === NETWORKS.mezoMainnet.chainId) {
      return NETWORKS.mezoMainnet;
    }
    
    throw new Error(`Unknown chain ID: ${chainId}`);
  }
}

// Re-export all types and classes for convenience
export * from './types';
export * from './core';
export * from './borrowing';
export * from './micropayments';
export * from './abi';

// Default export
export default PayceMUSDSDK;
