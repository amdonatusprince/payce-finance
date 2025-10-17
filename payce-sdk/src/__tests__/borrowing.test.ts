import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PayceBorrowing } from '../borrowing';
import { BorrowOptions, RepayOptions } from '../types';

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  getContract: jest.fn(),
  privateKeyToAccount: jest.fn(),
  defineChain: jest.fn(),
}));

// Mock @mezo-org/chains
jest.mock('@mezo-org/chains', () => {
  const mockChain = {
    id: 31611,
    name: 'Mezo Testnet',
    rpcUrls: {
      default: { http: ['https://rpc.test.mezo.org'] },
    },
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18,
    },
  };
  
  return {
    mezoTestnet: mockChain,
  };
});

describe('PayceBorrowing', () => {
  let borrowing: PayceBorrowing;
  let mockContract: any;

  beforeEach(() => {
    const config = {
      contractAddress: '0x1234567890123456789012345678901234567890' as const,
      rpcUrl: 'https://rpc.test.mezo.org',
      chainId: 31611,
    };

    const account = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const,
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
    };

    borrowing = new PayceBorrowing(config, account);

    mockContract = {
      read: {
        getLoanDetails: jest.fn(),
        getMinimumBorrowAmount: jest.fn(),
        getCurrentInterest: jest.fn(),
        getCollateralizationRatioPercent: jest.fn(),
        isAtLiquidationRisk: jest.fn(),
        calculateBorrowingFee: jest.fn(),
        getCurrentBTCPrice: jest.fn(),
        getUserBalances: jest.fn(),
      },
      write: {
        openTroveAndBorrow: jest.fn(),
        repayLoan: jest.fn(),
        closeTrove: jest.fn(),
        refinanceLoan: jest.fn(),
        addCollateral: jest.fn(),
        withdrawCollateral: jest.fn(),
      },
    };

    // Mock wallet client
    const mockWalletClient = {
      account: { address: account.address },
    };

    ((jest.requireMock('viem') as any).getContract as jest.Mock).mockReturnValue(mockContract);
    ((jest.requireMock('viem') as any).createWalletClient as jest.Mock).mockReturnValue(mockWalletClient);

    // Mock public client waitForTransactionReceipt
    const mockPublicClient = {
      waitForTransactionReceipt: (jest.fn() as any).mockResolvedValue({
        status: 'success',
        transactionHash: '0x123',
        blockNumber: 12345n,
      }),
    };
    ((jest.requireMock('viem') as any).createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

    borrowing = new PayceBorrowing(config, account);
    
    // Manually assign wallet client to the instance
    (borrowing as any).walletClient = mockWalletClient;
  });

  describe('openTroveAndBorrow', () => {
    const borrowOptions: BorrowOptions = {
      musdAmount: 5000n * 10n ** 18n,
      btcAmount: 1n * 10n ** 17n,
      depositToPurse: true,
    };

    it('should open trove successfully', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);
      mockContract.read.getMinimumBorrowAmount.mockResolvedValue(1800n * 10n ** 18n);
      mockContract.write.openTroveAndBorrow.mockResolvedValue('0x123');

      const result = await borrowing.openTroveAndBorrow(borrowOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.openTroveAndBorrow).toHaveBeenCalledWith([
        borrowOptions.musdAmount,
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        borrowOptions.depositToPurse,
      ], expect.any(Object));
    });

    it('should throw error when trove already active', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]);

      await expect(borrowing.openTroveAndBorrow(borrowOptions)).rejects.toThrow('Trove is already active');
    });

    it('should throw error when amount below minimum', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);
      mockContract.read.getMinimumBorrowAmount.mockResolvedValue(1800n * 10n ** 18n);

      const invalidOptions = { ...borrowOptions, musdAmount: 1000n * 10n ** 18n };
      
      await expect(borrowing.openTroveAndBorrow(invalidOptions)).rejects.toThrow('Minimum borrow amount');
    });
  });

  describe('repayLoan', () => {
    const repayOptions: RepayOptions = {
      amount: 1000n * 10n ** 18n,
      fromPurse: true,
    };

    it('should repay loan successfully', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]);
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]);
      mockContract.write.repayLoan.mockResolvedValue('0x123');

      const result = await borrowing.repayLoan(repayOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.repayLoan).toHaveBeenCalledWith([
        repayOptions.amount,
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        repayOptions.fromPurse,
      ], expect.any(Object));
    });

    it('should throw error when trove not active', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);

      await expect(borrowing.repayLoan(repayOptions)).rejects.toThrow('Trove is not active');
    });

    it('should throw error when insufficient purse balance', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]);
      mockContract.read.getUserBalances.mockResolvedValue([500n * 10n ** 18n, 200n * 10n ** 18n, 300n * 10n ** 18n]);

      await expect(borrowing.repayLoan(repayOptions)).rejects.toThrow('Insufficient purse balance');
    });
  });

  describe('closeTrove', () => {
    it('should close trove successfully', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]);
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]);
      mockContract.write.closeTrove.mockResolvedValue('0x123');

      const result = await borrowing.closeTrove(true);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.closeTrove).toHaveBeenCalledWith([true], expect.any(Object));
    });

    it('should throw error when trove not active', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);

      await expect(borrowing.closeTrove()).rejects.toThrow('Trove is not active');
    });
  });

  describe('addCollateral', () => {
    const collateralOptions = {
      amount: 1n * 10n ** 16n, // 0.01 BTC
    };

    it('should add collateral successfully', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]);
      mockContract.write.addCollateral.mockResolvedValue('0x123');

      const result = await borrowing.addCollateral(collateralOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.addCollateral).toHaveBeenCalledWith([
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
      ], expect.objectContaining({ value: collateralOptions.amount }));
    });

    it('should throw error when trove not active', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);

      await expect(borrowing.addCollateral(collateralOptions)).rejects.toThrow('Trove is not active');
    });
  });

  describe('Read Functions', () => {
    it('should get loan details', async () => {
      const mockLoanDetails = [1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true];
      mockContract.read.getLoanDetails.mockResolvedValue(mockLoanDetails);

      const result = await borrowing.getLoanDetails();
      
      expect(result).toEqual({
        principal: 1000n,
        interest: 100n,
        totalDebt: 1100n,
        collateral: 1n * 10n ** 17n,
        icr: 150n,
        interestRate: 100,
        isActive: true,
      });
    });

    it('should get current interest', async () => {
      mockContract.read.getCurrentInterest.mockResolvedValue(150n);

      const result = await borrowing.getCurrentInterest();
      expect(result).toBe(150n);
    });

    it('should get collateralization ratio', async () => {
      mockContract.read.getCollateralizationRatioPercent.mockResolvedValue(150n);

      const result = await borrowing.getCollateralizationRatioPercent();
      expect(result).toBe(150n);
    });

    it('should check liquidation risk', async () => {
      mockContract.read.isAtLiquidationRisk.mockResolvedValue([false, 150n]);

      const result = await borrowing.isAtLiquidationRisk();
      expect(result).toEqual({ atRisk: false, currentICR: 150n });
    });

    it('should get minimum borrow amount', async () => {
      mockContract.read.getMinimumBorrowAmount.mockResolvedValue(1800n * 10n ** 18n);

      const result = await borrowing.getMinimumBorrowAmount();
      expect(result).toBe(1800n * 10n ** 18n);
    });

    it('should calculate borrowing fee', async () => {
      mockContract.read.calculateBorrowingFee.mockResolvedValue(5n * 10n ** 18n);

      const result = await borrowing.calculateBorrowingFee(5000n * 10n ** 18n);
      expect(result).toBe(5n * 10n ** 18n);
    });

    it('should get current BTC price', async () => {
      mockContract.read.getCurrentBTCPrice.mockResolvedValue(50000n * 10n ** 18n);

      const result = await borrowing.getCurrentBTCPrice();
      expect(result).toBe(50000n * 10n ** 18n);
    });
  });
});
