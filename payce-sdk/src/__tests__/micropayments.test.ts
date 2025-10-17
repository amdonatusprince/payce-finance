import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PayceMicropayments } from '../micropayments';
import { Voucher } from '../types';

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  getContract: jest.fn(),
  privateKeyToAccount: jest.fn(),
  encodeAbiParameters: jest.fn(),
  parseAbiParameters: jest.fn(),
  keccak256: jest.fn(),
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

describe('PayceMicropayments', () => {
  let micropayments: PayceMicropayments;
  let mockContract: any;
  let mockWalletClient: any;

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

    micropayments = new PayceMicropayments(config, account);

    mockContract = {
      read: {
        getUserBalances: jest.fn(),
        availableBalance: jest.fn(),
        getMerchantBalance: jest.fn(),
        reservedBalance: jest.fn(),
        redeemed: jest.fn(),
      },
      write: {
        deposit: jest.fn(),
        withdrawUser: jest.fn(),
        reserveFunds: jest.fn(),
        releaseReserved: jest.fn(),
        redeemVoucher: jest.fn(),
        redeemBatch: jest.fn(),
        withdrawMerchant: jest.fn(),
      },
    };

    mockWalletClient = {
      signTypedData: jest.fn(),
      account: { address: account.address },
    };

    ((jest.requireMock('viem') as any).getContract as jest.Mock).mockReturnValue(mockContract);
    ((jest.requireMock('viem') as any).createWalletClient as jest.Mock).mockReturnValue(mockWalletClient);
  });

  describe('deposit', () => {
    it('should deposit MUSD successfully', async () => {
      mockContract.write.deposit.mockResolvedValue('0x123');

      const result = await micropayments.deposit(1000n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.deposit).toHaveBeenCalledWith([1000n * 10n ** 18n], expect.any(Object));
    });

    it('should throw error for zero amount', async () => {
      await expect(micropayments.deposit(0n)).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('withdrawUser', () => {
    it('should withdraw MUSD successfully', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]);
      mockContract.write.withdrawUser.mockResolvedValue('0x123');

      const result = await micropayments.withdrawUser(1000n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.withdrawUser).toHaveBeenCalledWith([1000n * 10n ** 18n], expect.any(Object));
    });

    it('should throw error for insufficient balance', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([500n * 10n ** 18n, 200n * 10n ** 18n, 300n * 10n ** 18n]);

      await expect(micropayments.withdrawUser(1000n * 10n ** 18n)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('reserveFunds', () => {
    it('should reserve funds successfully', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]);
      mockContract.write.reserveFunds.mockResolvedValue('0x123');

      const result = await micropayments.reserveFunds(1000n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.reserveFunds).toHaveBeenCalledWith([1000n * 10n ** 18n], expect.any(Object));
    });

    it('should throw error for insufficient available balance', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([500n * 10n ** 18n, 200n * 10n ** 18n, 300n * 10n ** 18n]);

      await expect(micropayments.reserveFunds(1000n * 10n ** 18n)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('releaseReserved', () => {
    it('should release reserved funds successfully', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 1000n * 10n ** 18n, 1000n * 10n ** 18n]);
      mockContract.write.releaseReserved.mockResolvedValue('0x123');

      const result = await micropayments.releaseReserved(500n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.releaseReserved).toHaveBeenCalledWith([500n * 10n ** 18n], expect.any(Object));
    });

    it('should throw error for insufficient reserved balance', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([500n * 10n ** 18n, 200n * 10n ** 18n, 300n * 10n ** 18n]);

      await expect(micropayments.releaseReserved(500n * 10n ** 18n)).rejects.toThrow('Insufficient reserved funds');
    });
  });

  describe('createVoucher', () => {
    it('should create and sign voucher successfully', async () => {
      mockWalletClient.signTypedData.mockResolvedValue('0x1234567890abcdef');

      const result = await micropayments.createVoucher(
        '0x4567890123456789012345678901234567890123' as const,
        100n * 10n ** 18n,
        1n,
        3600
      );

      expect(result.voucher).toEqual({
        payer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        merchant: '0x4567890123456789012345678901234567890123',
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: expect.any(BigInt),
      });
      expect(result.signature).toBe('0x1234567890abcdef');
      expect(mockWalletClient.signTypedData).toHaveBeenCalled();
    });
  });

  describe('redeemVoucher', () => {
    const validVoucher: Voucher = {
      payer: '0x1234567890123456789012345678901234567890' as const,
      merchant: '0x4567890123456789012345678901234567890123' as const,
      amount: 100n * 10n ** 18n,
      nonce: 1n,
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    };

    it('should redeem voucher successfully', async () => {
      mockContract.write.redeemVoucher.mockResolvedValue('0x123');

      const result = await micropayments.redeemVoucher(validVoucher, '0x1234567890abcdef');
      
      expect(result.success).toBe(true);
      expect(mockContract.write.redeemVoucher).toHaveBeenCalledWith([validVoucher, '0x1234567890abcdef'], expect.any(Object));
    });

    it('should throw error for invalid voucher amount', async () => {
      const invalidVoucher = { ...validVoucher, amount: 0n };

      await expect(micropayments.redeemVoucher(invalidVoucher, '0x123')).rejects.toThrow('Amount must be greater than 0');
    });

    it('should throw error for expired voucher', async () => {
      const expiredVoucher = { ...validVoucher, expiry: BigInt(Math.floor(Date.now() / 1000) - 3600) };

      await expect(micropayments.redeemVoucher(expiredVoucher, '0x123')).rejects.toThrow('Voucher has expired');
    });
  });

  describe('redeemBatch', () => {
    const vouchers: Voucher[] = [
      {
        payer: '0x1234567890123456789012345678901234567890' as const,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      },
      {
        payer: '0x1234567890123456789012345678901234567890' as const,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 200n * 10n ** 18n,
        nonce: 2n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      },
    ];

    it('should redeem batch successfully', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n]);
      mockContract.write.redeemBatch.mockResolvedValue('0x123');

      const signatures = ['0x123', '0x456'] as `0x${string}`[];
      const result = await micropayments.redeemBatch(vouchers, signatures);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.redeemBatch).toHaveBeenCalledWith([vouchers, signatures], expect.any(Object));
    });

    it('should throw error for mismatched arrays', async () => {
      const signatures = ['0x123'] as `0x${string}`[]; // Only one signature for two vouchers

      await expect(micropayments.redeemBatch(vouchers, signatures)).rejects.toThrow('same length');
    });

    it('should throw error for empty batch', async () => {
      await expect(micropayments.redeemBatch([], [])).rejects.toThrow('At least one voucher is required');
    });

    it('should throw error for insufficient reserved funds', async () => {
      mockContract.read.getUserBalances.mockResolvedValue([500n * 10n ** 18n, 200n * 10n ** 18n, 300n * 10n ** 18n]);

      const signatures = ['0x123', '0x456'] as `0x${string}`[];
      await expect(micropayments.redeemBatch(vouchers, signatures)).rejects.toThrow('Insufficient reserved funds');
    });
  });

  describe('withdrawMerchant', () => {
    it('should withdraw merchant earnings successfully', async () => {
      mockContract.read.getMerchantBalance.mockResolvedValue(1000n * 10n ** 18n);
      mockContract.write.withdrawMerchant.mockResolvedValue('0x123');

      const result = await micropayments.withdrawMerchant(500n * 10n ** 18n);
      
      expect(result.success).toBe(true);
      expect(mockContract.write.withdrawMerchant).toHaveBeenCalledWith([500n * 10n ** 18n], expect.any(Object));
    });

    it('should throw error for insufficient merchant balance', async () => {
      mockContract.read.getMerchantBalance.mockResolvedValue(200n * 10n ** 18n);

      await expect(micropayments.withdrawMerchant(500n * 10n ** 18n)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Read Functions', () => {
    it('should get user balances', async () => {
      const mockBalances = [2000n * 10n ** 18n, 500n * 10n ** 18n, 1500n * 10n ** 18n];
      mockContract.read.getUserBalances.mockResolvedValue(mockBalances);

      const result = await micropayments.getUserBalances('0x1234567890123456789012345678901234567890');
      
      expect(result).toEqual({
        total: 2000n * 10n ** 18n,
        reserved: 500n * 10n ** 18n,
        available: 1500n * 10n ** 18n,
      });
    });

    it('should get available balance', async () => {
      mockContract.read.availableBalance.mockResolvedValue(1500n * 10n ** 18n);

      const result = await micropayments.getAvailableBalance('0x1234567890123456789012345678901234567890');
      expect(result).toBe(1500n * 10n ** 18n);
    });

    it('should get merchant balance', async () => {
      mockContract.read.getMerchantBalance.mockResolvedValue(1000n * 10n ** 18n);

      const result = await micropayments.getMerchantBalance('0x4567890123456789012345678901234567890123');
      expect(result).toBe(1000n * 10n ** 18n);
    });

    it('should get reserved balance', async () => {
      mockContract.read.reservedBalance.mockResolvedValue(500n * 10n ** 18n);

      const result = await micropayments.getReservedBalance('0x1234567890123456789012345678901234567890');
      expect(result).toBe(500n * 10n ** 18n);
    });

    it('should check if voucher is redeemed', async () => {
      mockContract.read.redeemed.mockResolvedValue(true);

      const voucher: Voucher = {
        payer: '0x1234567890123456789012345678901234567890' as const,
        merchant: '0x4567890123456789012345678901234567890123' as const,
        amount: 100n * 10n ** 18n,
        nonce: 1n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      };

      const result = await micropayments.isVoucherRedeemed(voucher);
      expect(result).toBe(true);
    });
  });
});
