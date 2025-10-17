import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PayceMUSDSDK, PayceConfig, PayceAccount, BorrowOptions, RepayOptions, CollateralOptions, Voucher, TransactionOptions } from '../index';

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  parseEther: jest.fn((value: string) => BigInt(value) * 10n ** 18n),
  formatEther: jest.fn((value: bigint) => (Number(value) / 10 ** 18).toString()),
  encodeAbiParameters: jest.fn(),
  parseAbiParameters: jest.fn(),
  keccak256: jest.fn(),
  encodePacked: jest.fn(),
  getContract: jest.fn(),
  privateKeyToAccount: jest.fn(),
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
    mezoMainnet: {
      ...mockChain,
      id: 31610,
      name: 'Mezo Mainnet',
      rpcUrls: {
        default: { http: ['https://rpc.mainnet.mezo.org'] },
      },
    },
  };
});

describe('PayceMUSDSDK', () => {
  let config: PayceConfig;
  let account: PayceAccount;
  let sdk: PayceMUSDSDK;
  let mockContract: any;
  let mockWalletClient: any;

  beforeEach(() => {
    config = {
      contractAddress: '0x1234567890123456789012345678901234567890' as const,
      rpcUrl: 'https://rpc.test.mezo.org',
      chainId: 31611,
    };

    account = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const,
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
    };

    mockContract = {
      read: {
        getLoanDetails: (jest.fn() as any).mockResolvedValue([1000n, 100n, 1100n, 1n * 10n ** 17n, 150n, 100, true]),
        getMinimumBorrowAmount: (jest.fn() as any).mockResolvedValue(1800n * 10n ** 18n),
        getCurrentInterest: (jest.fn() as any).mockResolvedValue(150n),
        getCollateralizationRatioPercent: (jest.fn() as any).mockResolvedValue(150n),
        isAtLiquidationRisk: (jest.fn() as any).mockResolvedValue([false, 150n]),
        calculateBorrowingFee: (jest.fn() as any).mockResolvedValue(5n * 10n ** 18n),
        getCurrentBTCPrice: (jest.fn() as any).mockResolvedValue(50000n * 10n ** 18n),
        getUserBalances: (jest.fn() as any).mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]),
        getMerchantBalance: (jest.fn() as any).mockResolvedValue(1000n * 10n ** 18n),
        availableBalance: (jest.fn() as any).mockResolvedValue(1500n * 10n ** 18n),
        reservedBalance: (jest.fn() as any).mockResolvedValue(500n * 10n ** 18n),
        redeemed: (jest.fn() as any).mockResolvedValue(false),
      },
      write: {
        openTroveAndBorrow: (jest.fn() as any).mockResolvedValue('0x123'),
        repayLoan: (jest.fn() as any).mockResolvedValue('0x123'),
        closeTrove: (jest.fn() as any).mockResolvedValue('0x123'),
        refinanceLoan: (jest.fn() as any).mockResolvedValue('0x123'),
        addCollateral: (jest.fn() as any).mockResolvedValue('0x123'),
        withdrawCollateral: (jest.fn() as any).mockResolvedValue('0x123'),
        deposit: (jest.fn() as any).mockResolvedValue('0x123'),
        withdrawUser: (jest.fn() as any).mockResolvedValue('0x123'),
        reserveFunds: (jest.fn() as any).mockResolvedValue('0x123'),
        releaseReserved: (jest.fn() as any).mockResolvedValue('0x123'),
        redeemVoucher: (jest.fn() as any).mockResolvedValue('0x123'),
        redeemBatch: (jest.fn() as any).mockResolvedValue('0x123'),
        withdrawMerchant: (jest.fn() as any).mockResolvedValue('0x123'),
      },
    };

    mockWalletClient = {
      signTypedData: (jest.fn() as any).mockResolvedValue('0x1234567890abcdef'),
      account: { address: account.address },
    };

    // Mock the viem functions
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

    sdk = new PayceMUSDSDK(config, account);
  });

  describe('Constructor', () => {
    it('should create SDK instance with config and account', () => {
      expect(sdk).toBeInstanceOf(PayceMUSDSDK);
      expect(sdk.getContractAddress()).toBe(config.contractAddress);
      expect(sdk.getChainId()).toBe(config.chainId);
      expect(sdk.getAccountAddress()).toBe(account.address);
    });

    it('should create SDK instance without account', () => {
      const sdkWithoutAccount = new PayceMUSDSDK(config);
      expect(sdkWithoutAccount).toBeInstanceOf(PayceMUSDSDK);
      expect(() => sdkWithoutAccount.getAccountAddress()).toThrow();
    });
  });

  describe('Static Factory Methods', () => {
    it('should create Mezo Testnet instance', () => {
      const testnetSDK = PayceMUSDSDK.forMezoTestnet(account);
      expect(testnetSDK.getChainId()).toBe(31611);
      expect(testnetSDK.getContractAddress()).toBeDefined();
    });

    it('should create SDK with wallet connection', () => {
      const walletSDK = PayceMUSDSDK.withWalletConnection(config, mockWalletClient);
      expect(walletSDK).toBeInstanceOf(PayceMUSDSDK);
    });

    it('should create Mezo Testnet with wallet', () => {
      const testnetWalletSDK = PayceMUSDSDK.forMezoTestnetWithWallet(mockWalletClient);
      expect(testnetWalletSDK.getChainId()).toBe(31611);
    });
  });

  describe('Borrowing Functions', () => {
    const borrowOptions: BorrowOptions = {
      musdAmount: 5000n * 10n ** 18n,
      btcAmount: 1n * 10n ** 17n,
      depositToPurse: true,
    };

    const repayOptions: RepayOptions = {
      amount: 1000n * 10n ** 18n,
      fromPurse: true,
    };

    const collateralOptions: CollateralOptions = {
      amount: 1n * 10n ** 16n,
    };

    it('should open trove and borrow successfully', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);
      
      const result = await sdk.openTroveAndBorrow(borrowOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.openTroveAndBorrow).toHaveBeenCalled();
    });

    it('should validate minimum borrow amount', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);
      
      const invalidOptions = { ...borrowOptions, musdAmount: 1000n * 10n ** 18n };
      
      await expect(sdk.openTroveAndBorrow(invalidOptions)).rejects.toThrow('Minimum borrow amount');
    });

    it('should prevent opening trove when already active', async () => {
      await expect(sdk.openTroveAndBorrow(borrowOptions)).rejects.toThrow('Trove is already active');
    });

    it('should repay loan successfully', async () => {
      const result = await sdk.repayLoan(repayOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.repayLoan).toHaveBeenCalled();
    });

    it('should close trove successfully', async () => {
      const result = await sdk.closeTrove(true);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.closeTrove).toHaveBeenCalled();
    });

    it('should refinance loan successfully', async () => {
      const result = await sdk.refinanceLoan();
      
      expect(result.success).toBe(true);
      expect(mockContract.write.refinanceLoan).toHaveBeenCalled();
    });

    it('should add collateral successfully', async () => {
      const result = await sdk.addCollateral(collateralOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.addCollateral).toHaveBeenCalled();
    });

    it('should withdraw collateral successfully', async () => {
      const result = await sdk.withdrawCollateral(collateralOptions);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.withdrawCollateral).toHaveBeenCalled();
    });
  });

  describe('Borrowing Read Functions', () => {
    it('should get loan details', async () => {
      const result = await sdk.getLoanDetails();
      
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
      const result = await sdk.getCurrentInterest();
      expect(result).toBe(150n);
    });

    it('should get collateralization ratio', async () => {
      const result = await sdk.getCollateralizationRatioPercent();
      expect(result).toBe(150n);
    });

    it('should check liquidation risk', async () => {
      const result = await sdk.isAtLiquidationRisk();
      expect(result).toEqual({ atRisk: false, currentICR: 150n });
    });

    it('should get minimum borrow amount', async () => {
      const result = await sdk.getMinimumBorrowAmount();
      expect(result).toBe(1800n * 10n ** 18n);
    });

    it('should calculate borrowing fee', async () => {
      const result = await sdk.calculateBorrowingFee(5000n * 10n ** 18n);
      expect(result).toBe(5n * 10n ** 18n);
    });

    it('should get current BTC price', async () => {
      const result = await sdk.getCurrentBTCPrice();
      expect(result).toBe(50000n * 10n ** 18n);
    });
  });

  describe('Micropayment Functions', () => {
    it('should deposit MUSD successfully', async () => {
      const result = await sdk.micropayments.deposit(1000n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.deposit).toHaveBeenCalled();
    });

    it('should withdraw MUSD successfully', async () => {
      const result = await sdk.micropayments.withdrawUser(1000n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.withdrawUser).toHaveBeenCalled();
    });

    it('should reserve funds successfully', async () => {
      const result = await sdk.micropayments.reserveFunds(500n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.reserveFunds).toHaveBeenCalled();
    });

    it('should release reserved funds successfully', async () => {
      const result = await sdk.micropayments.releaseReserved(200n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.releaseReserved).toHaveBeenCalled();
    });

    it('should create voucher successfully', async () => {
      const result = await sdk.micropayments.createVoucher(
        '0x4567890123456789012345678901234567890123' as const,
        100n * 10n ** 18n,
        1n,
        3600
      );

      expect(result.voucher).toEqual({
        payer: account.address,
        merchant: '0x4567890123456789012345678901234567890123',
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: expect.any(BigInt),
      });
      expect(result.signature).toBe('0x1234567890abcdef');
    });

    it('should redeem voucher successfully', async () => {
      const voucher: Voucher = {
        payer: account.address,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      const result = await sdk.micropayments.redeemVoucher(voucher, '0x1234567890abcdef' as const);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.redeemVoucher).toHaveBeenCalled();
    });

    it('should redeem batch successfully', async () => {
      const vouchers: Voucher[] = [
        {
          payer: account.address,
          merchant: '0x4567890123456789012345678901234567890123' as const,
          amount: 100n * 10n ** 18n,
          nonce: 1n,
          expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
        },
        {
          payer: account.address,
          merchant: '0x4567890123456789012345678901234567890123' as const,
          amount: 200n * 10n ** 18n,
          nonce: 2n,
          expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
        },
      ];
      const signatures = ['0x1234567890abcdef', '0xabcdef1234567890'] as `0x${string}`[];

      const result = await sdk.micropayments.redeemBatch(vouchers, signatures);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.redeemBatch).toHaveBeenCalled();
    });

    it('should withdraw merchant earnings successfully', async () => {
      const result = await sdk.micropayments.withdrawMerchant(500n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.withdrawMerchant).toHaveBeenCalled();
    });
  });

  describe('Micropayment Read Functions', () => {
    it('should get user balances', async () => {
      const result = await sdk.micropayments.getUserBalances(account.address);
      
      expect(result).toEqual({
        total: 2000n * 10n ** 18n,
        reserved: 500n * 10n ** 18n,
        available: 1500n * 10n ** 18n,
      });
    });

    it('should get available balance', async () => {
      const result = await sdk.micropayments.getAvailableBalance(account.address);
      expect(result).toBe(1500n * 10n ** 18n);
    });

    it('should get merchant balance', async () => {
      const result = await sdk.micropayments.getMerchantBalance(account.address);
      expect(result).toBe(1000n * 10n ** 18n);
    });

    it('should get reserved balance', async () => {
      const result = await sdk.micropayments.getReservedBalance(account.address);
      expect(result).toBe(500n * 10n ** 18n);
    });

    it('should check if voucher is redeemed', async () => {
      const voucher: Voucher = {
        payer: account.address,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      const result = await sdk.micropayments.isVoucherRedeemed(voucher);
      expect(result).toBe(false);
    });

    it('should check if voucher hash is redeemed', async () => {
      const result = await sdk.micropayments.isVoucherHashRedeemed('0x1234567890abcdef' as const);
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when wallet client not initialized', async () => {
      const sdkWithoutAccount = new PayceMUSDSDK(config);
      
      await expect(sdkWithoutAccount.micropayments.deposit(100n)).rejects.toThrow('Wallet client not initialized');
    });

    it('should handle insufficient balance errors', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([100n, 50n, 50n]);

      await expect(sdk.micropayments.withdrawUser(1000n * 10n ** 18n)).rejects.toThrow('Insufficient balance');
    });

    it('should handle insufficient reserved funds', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([100n, 50n, 50n]);

      await expect(sdk.micropayments.releaseReserved(100n)).rejects.toThrow('Insufficient reserved funds');
    });

    it('should validate voucher amount', async () => {
      const invalidVoucher: Voucher = {
        payer: account.address,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 0n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      await expect(sdk.micropayments.redeemVoucher(invalidVoucher, '0x123' as const)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate voucher expiry', async () => {
      const expiredVoucher: Voucher = {
        payer: account.address,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) - 3600),
      };

      await expect(sdk.micropayments.redeemVoucher(expiredVoucher, '0x123' as const)).rejects.toThrow('Voucher has expired');
    });

    it('should validate batch redemption length mismatch', async () => {
      const vouchers: Voucher[] = [
        {
          payer: account.address,
          merchant: '0x4567890123456789012345678901234567890123' as const,
          amount: 100n * 10n ** 18n,
          nonce: 1n,
          expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
        },
      ];
      const signatures = ['0x123', '0x456'] as `0x${string}`[];

      await expect(sdk.micropayments.redeemBatch(vouchers, signatures)).rejects.toThrow('same length');
    });

    it('should validate empty batch', async () => {
      await expect(sdk.micropayments.redeemBatch([], [])).rejects.toThrow('At least one voucher is required');
    });
  });

  describe('Utility Functions', () => {
    it('should get user status', async () => {
      const status = await sdk.getUserStatus();
      
      expect(status).toHaveProperty('user');
      expect(status).toHaveProperty('loan');
      expect(status).toHaveProperty('purse');
      expect(status).toHaveProperty('merchantEarnings');
      expect(status).toHaveProperty('liquidationRisk');
    });

    it('should get contract addresses', () => {
      const addresses = sdk.getContractAddresses();
      expect(addresses).toHaveProperty('payceMUSD');
      expect(addresses).toHaveProperty('musdToken');
      expect(addresses).toHaveProperty('borrowerOperations');
      expect(addresses).toHaveProperty('troveManager');
      expect(addresses).toHaveProperty('priceFeed');
    });

    it('should get network info', () => {
      const network = sdk.getNetworkInfo();
      expect(network).toHaveProperty('name');
      expect(network).toHaveProperty('chainId');
      expect(network).toHaveProperty('rpcUrl');
      expect(network).toHaveProperty('explorerUrl');
    });

    it('should get account address', () => {
      const address = sdk.getAccountAddress();
      expect(address).toBe(account.address);
    });

    it('should get contract address', () => {
      const contractAddress = sdk.getContractAddress();
      expect(contractAddress).toBe(config.contractAddress);
    });

    it('should get chain ID', () => {
      const chainId = sdk.getChainId();
      expect(chainId).toBe(config.chainId);
    });
  });

  describe('Transaction Options', () => {
    it('should handle transaction options', async () => {
      const options: TransactionOptions = {
        gasLimit: 500000n,
        gasPrice: 20000000000n,
        maxFeePerGas: 30000000000n,
        maxPriorityFeePerGas: 2000000000n,
      };

      const result = await sdk.micropayments.deposit(1000n * 10n ** 18n, options);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amounts', async () => {
      await expect(sdk.micropayments.deposit(0n)).rejects.toThrow('Amount must be greater than 0');
      await expect(sdk.micropayments.withdrawUser(0n)).rejects.toThrow('Amount must be greater than 0');
      await expect(sdk.micropayments.reserveFunds(0n)).rejects.toThrow('Amount must be greater than 0');
      await expect(sdk.micropayments.releaseReserved(0n)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should handle trove not active errors', async () => {
      mockContract.read.getLoanDetails.mockResolvedValue([0n, 0n, 0n, 0n, 0n, 0, false]);

      const repayOptions: RepayOptions = {
        amount: 1000n * 10n ** 18n,
        fromPurse: true,
      };

      await expect(sdk.repayLoan(repayOptions)).rejects.toThrow('Trove is not active');
      await expect(sdk.closeTrove()).rejects.toThrow('Trove is not active');
    });
  });
});