import { Address, Hash, Hex, encodeAbiParameters, parseAbiParameters, keccak256 } from 'viem';
import { PayceMUSD } from './core';
import { 
  Voucher, 
  UserBalances, 
  TransactionResult, 
  VoucherSignature,
  TransactionOptions,
  InsufficientBalanceError,
  InsufficientReservedError,
} from './types';

/**
 * Micropayment functions for PayceMUSD SDK
 */
export class PayceMicropayments extends PayceMUSD {
  /**
   * Deposit MUSD to user's purse
   */
  async deposit(amount: bigint, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.deposit([amount], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Withdraw MUSD from user's purse
   */
  async withdrawUser(amount: bigint, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Check available balance
    const balances = await this.getUserBalances(this.getAccountAddress());
    if (balances.available < amount) {
      throw new InsufficientBalanceError(amount, balances.available);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.withdrawUser([amount], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Reserve MUSD for voucher payments
   */
  async reserveFunds(amount: bigint, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Check available balance
    const balances = await this.getUserBalances(this.getAccountAddress());
    if (balances.available < amount) {
      throw new InsufficientBalanceError(amount, balances.available);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.reserveFunds([amount], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Release reserved MUSD back to available balance
   */
  async releaseReserved(amount: bigint, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Check reserved balance
    const balances = await this.getUserBalances(this.getAccountAddress());
    if (balances.reserved < amount) {
      throw new InsufficientReservedError(amount, balances.reserved);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.releaseReserved([amount], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Create and sign a voucher for micropayment
   */
  async createVoucher(
    merchant: Address,
    amount: bigint,
    nonce: bigint,
    expirySeconds: number = 3600
  ): Promise<VoucherSignature> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const payer = this.getAccountAddress();
    const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds);

    const voucher: Voucher = {
      payer,
      merchant,
      amount,
      nonce,
      expiry,
    };

    this.validateVoucher(voucher);

    const domain = this.createEIP712Domain();
    const types = this.createEIP712Types();

    if (!this.walletClient.account) {
      throw new Error('Wallet account not initialized');
    }

    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain,
      types,
      primaryType: 'Voucher',
      message: voucher,
    });

    return {
      voucher,
      signature,
      domain,
      types,
    };
  }

  /**
   * Redeem a single voucher (called by merchant)
   */
  async redeemVoucher(voucher: Voucher, signature: Hex, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    this.validateVoucher(voucher);

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.redeemVoucher([voucher, signature], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Redeem multiple vouchers in a batch (called by merchant)
   */
  async redeemBatch(
    vouchers: Voucher[],
    signatures: Hex[],
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (vouchers.length !== signatures.length) {
      throw new Error('Vouchers and signatures arrays must have the same length');
    }

    if (vouchers.length === 0) {
      throw new Error('At least one voucher is required');
    }

    // Validate all vouchers
    for (const voucher of vouchers) {
      this.validateVoucher(voucher);
    }

    // Check if payer has enough reserved funds for all vouchers
    const totalAmount = vouchers.reduce((sum, v) => sum + v.amount, 0n);
    const payerBalances = await this.getUserBalances(vouchers[0].payer);
    if (payerBalances.reserved < totalAmount) {
      throw new InsufficientReservedError(totalAmount, payerBalances.reserved);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.redeemBatch([vouchers, signatures], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Withdraw merchant earnings
   */
  async withdrawMerchant(amount: bigint, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Check merchant balance
    const merchantBalance = await this.getMerchantBalance(this.getAccountAddress());
    if (merchantBalance < amount) {
      throw new InsufficientBalanceError(amount, merchantBalance);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.withdrawMerchant([amount], {
        gas: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      } as any);
    });
  }

  /**
   * Get user balances (total, reserved, available)
   */
  async getUserBalances(user: Address): Promise<UserBalances> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      const result = await contract.read.getUserBalances([user]);
      
      return {
        total: result[0],
        reserved: result[1],
        available: result[2],
      };
    });
  }

  /**
   * Get available balance for user
   */
  async getAvailableBalance(user: Address): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.availableBalance([user]);
    });
  }

  /**
   * Get merchant balance
   */
  async getMerchantBalance(merchant: Address): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.getMerchantBalance([merchant]);
    });
  }

  /**
   * Get reserved balance for user
   */
  async getReservedBalance(user: Address): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.reservedBalance([user]);
    });
  }

  /**
   * Check if voucher has been redeemed
   */
  async isVoucherRedeemed(voucher: Voucher): Promise<boolean> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      const voucherHash = this.getVoucherHash(voucher);
      return await contract.read.redeemed([voucherHash]);
    });
  }

  /**
   * Check if a specific voucher hash has been redeemed
   */
  async isVoucherHashRedeemed(voucherHash: Hex): Promise<boolean> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.redeemed([voucherHash]);
    });
  }

  /**
   * Calculate voucher hash for checking redemption status
   */
  private getVoucherHash(voucher: Voucher): Hex {
    // This is a simplified hash calculation
    // In practice, you'd use the same EIP-712 hashing as the contract
    const encoded = encodeAbiParameters(
      parseAbiParameters('address,address,uint256,uint256,uint256'),
      [voucher.payer, voucher.merchant, voucher.amount, voucher.nonce, voucher.expiry]
    );
    
    return keccak256(encoded);
  }
}
