import { Address, Hash } from 'viem';
import { PayceMUSD } from './core';
import { PayceMicropayments } from './micropayments';
import { PayceConfig, PayceAccount, BorrowOptions, RepayOptions, CollateralOptions, LoanDetails, TransactionResult, TransactionOptions, TroveNotActiveError, TroveAlreadyActiveError } from './types';

/**
 * Borrowing functions for PayceMUSD SDK
 */
export class PayceBorrowing extends PayceMUSD {
  public micropayments: PayceMicropayments;

  constructor(config: PayceConfig, account?: PayceAccount) {
    super(config, account);
    this.micropayments = new PayceMicropayments(config, account);
  }
  /**
   * Open a trove and borrow MUSD with BTC collateral
   */
  async openTroveAndBorrow(options: BorrowOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is already active
    const loanDetails = await this.getLoanDetails();
    if (loanDetails.isActive) {
      throw new TroveAlreadyActiveError();
    }

    // Validate minimum borrow amount
    const minBorrow = await this.getMinimumBorrowAmount();
    if (options.musdAmount < minBorrow) {
      throw new Error(`Minimum borrow amount is ${minBorrow} MUSD`);
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.openTroveAndBorrow([
        options.musdAmount,
        options.upperHint || '0x0000000000000000000000000000000000000000',
        options.lowerHint || '0x0000000000000000000000000000000000000000',
        options.depositToPurse,
      ], {
        value: options.btcAmount,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Repay loan debt
   */
  async repayLoan(options: RepayOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is active
    const loanDetails = await this.getLoanDetails();
    if (!loanDetails.isActive) {
      throw new TroveNotActiveError();
    }

    // If repaying from purse, check available balance
    if (options.fromPurse) {
      const balances = await this.micropayments.getUserBalances(this.getAccountAddress());
      if (balances.available < options.amount) {
        throw new Error(`Insufficient purse balance: ${balances.available} < ${options.amount}`);
      }
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.repayLoan([
        options.amount,
        options.upperHint || '0x0000000000000000000000000000000000000000',
        options.lowerHint || '0x0000000000000000000000000000000000000000',
        options.fromPurse,
      ], {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Close trove completely (repay all debt and withdraw all collateral)
   */
  async closeTrove(fromPurse: boolean = true, options?: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is active
    const loanDetails = await this.getLoanDetails();
    if (!loanDetails.isActive) {
      throw new TroveNotActiveError();
    }

    // If closing from purse, check available balance
    if (fromPurse) {
      const balances = await this.micropayments.getUserBalances(this.getAccountAddress());
      if (balances.available < loanDetails.totalDebt) {
        throw new Error(`Insufficient purse balance to close trove: ${balances.available} < ${loanDetails.totalDebt}`);
      }
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.closeTrove([fromPurse], {
        gasLimit: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Refinance loan to current interest rate
   */
  async refinanceLoan(
    upperHint?: Address,
    lowerHint?: Address,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is active
    const loanDetails = await this.getLoanDetails();
    if (!loanDetails.isActive) {
      throw new TroveNotActiveError();
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.refinanceLoan([
        upperHint || '0x0000000000000000000000000000000000000000',
        lowerHint || '0x0000000000000000000000000000000000000000',
      ], {
        gasLimit: options?.gasLimit,
        gasPrice: options?.gasPrice,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Add BTC collateral to existing trove
   */
  async addCollateral(options: CollateralOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is active
    const loanDetails = await this.getLoanDetails();
    if (!loanDetails.isActive) {
      throw new TroveNotActiveError();
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.addCollateral([
        options.upperHint || '0x0000000000000000000000000000000000000000',
        options.lowerHint || '0x0000000000000000000000000000000000000000',
      ], {
        value: options.amount,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Withdraw BTC collateral from trove
   */
  async withdrawCollateral(options: CollateralOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    // Check if trove is active
    const loanDetails = await this.getLoanDetails();
    if (!loanDetails.isActive) {
      throw new TroveNotActiveError();
    }

    // Check if withdrawal would maintain minimum ICR
    const currentICR = await this.getCollateralizationRatioPercent();
    const minICR = 110n; // 110%
    
    // This is a simplified check - in practice, you'd need to calculate the new ICR
    if (currentICR <= minICR) {
      throw new Error('Cannot withdraw collateral: would violate minimum ICR requirement');
    }

    return this.executeWrite(async () => {
      const contract = this.getContract();
      return await contract.write.withdrawCollateral([
        options.amount,
        options.upperHint || '0x0000000000000000000000000000000000000000',
        options.lowerHint || '0x0000000000000000000000000000000000000000',
      ], {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        maxFeePerGas: options.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas,
      });
    });
  }

  /**
   * Get loan details
   */
  async getLoanDetails(): Promise<LoanDetails> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      const result = await contract.read.getLoanDetails();
      
      return {
        principal: result[0],
        interest: result[1],
        totalDebt: result[2],
        collateral: result[3],
        icr: result[4],
        interestRate: result[5],
        isActive: result[6],
      };
    });
  }

  /**
   * Get current interest owed
   */
  async getCurrentInterest(): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.getCurrentInterest();
    });
  }

  /**
   * Get collateralization ratio as percentage
   */
  async getCollateralizationRatioPercent(): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.getCollateralizationRatioPercent();
    });
  }

  /**
   * Check if trove is at liquidation risk
   */
  async isAtLiquidationRisk(): Promise<{ atRisk: boolean; currentICR: bigint }> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      const result = await contract.read.isAtLiquidationRisk();
      
      return {
        atRisk: result[0],
        currentICR: result[1],
      };
    });
  }

  /**
   * Get minimum borrow amount
   */
  async getMinimumBorrowAmount(): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.getMinimumBorrowAmount();
    });
  }

  /**
   * Calculate borrowing fee for given amount
   */
  async calculateBorrowingFee(musdAmount: bigint): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.calculateBorrowingFee([musdAmount]);
    });
  }

  /**
   * Get current BTC price from oracle
   */
  async getCurrentBTCPrice(): Promise<bigint> {
    return this.executeRead(async () => {
      const contract = this.getContract();
      return await contract.read.getCurrentBTCPrice();
    });
  }
}
