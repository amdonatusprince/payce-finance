import { parseEther, formatEther } from 'viem';
import { PayceMUSDSDK } from '../src';

/**
 * Example usage of PayceMUSD SDK
 */
async function example() {
  console.log('🚀 PayceMUSD SDK Example\n');

  // Create SDK instance for Mezo Testnet
  const sdk = PayceMUSDSDK.forMezoTestnet({
    address: '0x1234567890123456789012345678901234567890' as const,
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
  });

  try {
    // 1. Check user status
    console.log('📊 Getting user status...');
    const status = await sdk.getUserStatus();
    console.log('User:', status.user);
    console.log('Loan Active:', status.loan.isActive);
    console.log('Total Purse:', formatEther(status.purse.total), 'MUSD');
    console.log('Available:', formatEther(status.purse.available), 'MUSD');
    console.log('Reserved:', formatEther(status.purse.reserved), 'MUSD');
    console.log('Merchant Earnings:', formatEther(status.merchantEarnings), 'MUSD');
    console.log('Liquidation Risk:', status.liquidationRisk.atRisk ? '⚠️ YES' : '✅ NO');
    console.log('Current ICR:', Number(status.liquidationRisk.currentICR), '%\n');

    // 2. If no active loan, open one
    if (!status.loan.isActive) {
      console.log('🏦 Opening trove and borrowing MUSD...');
      const result = await sdk.openTroveAndBorrow({
        musdAmount: parseEther('5000'), // 5000 MUSD
        btcAmount: parseEther('0.1'),   // 0.1 BTC collateral
        depositToPurse: true,          // Deposit borrowed MUSD to purse
      });

      if (result.success) {
        console.log('✅ Trove opened successfully!');
        console.log('Transaction hash:', result.hash);
      } else {
        console.log('❌ Failed to open trove:', result.error);
        return;
      }
    }

    // 3. Check loan details
    console.log('\n📋 Loan Details:');
    const loan = await sdk.getLoanDetails();
    console.log('Principal:', formatEther(loan.principal), 'MUSD');
    console.log('Interest:', formatEther(loan.interest), 'MUSD');
    console.log('Total Debt:', formatEther(loan.totalDebt), 'MUSD');
    console.log('Collateral:', formatEther(loan.collateral), 'BTC');
    console.log('ICR:', Number(loan.icr), '%');
    console.log('Interest Rate:', loan.interestRate / 100, '%');
    console.log('Active:', loan.isActive);

    // 4. Deposit additional MUSD to purse
    console.log('\n💰 Depositing MUSD to purse...');
    const depositResult = await sdk.micropayments.deposit(parseEther('1000'));
    if (depositResult.success) {
      console.log('✅ Deposited 1000 MUSD to purse');
    }

    // 5. Reserve funds for vouchers
    console.log('\n🔒 Reserving funds for vouchers...');
    const reserveResult = await sdk.micropayments.reserveFunds(parseEther('500'));
    if (reserveResult.success) {
      console.log('✅ Reserved 500 MUSD for vouchers');
    }

    // 6. Create vouchers
    console.log('\n🎫 Creating vouchers...');
    const merchantAddress = '0x4567890123456789012345678901234567890123' as const;
    
    const voucher1 = await sdk.micropayments.createVoucher(
      merchantAddress,
      parseEther('100'), // 100 MUSD
      1n,                // Nonce
      3600               // Expiry in 1 hour
    );

    const voucher2 = await sdk.micropayments.createVoucher(
      merchantAddress,
      parseEther('200'), // 200 MUSD
      2n,                // Nonce
      3600               // Expiry in 1 hour
    );

    console.log('✅ Created 2 vouchers');
    console.log('Voucher 1:', formatEther(voucher1.voucher.amount), 'MUSD');
    console.log('Voucher 2:', formatEther(voucher2.voucher.amount), 'MUSD');

    // 7. Simulate merchant redeeming vouchers
    console.log('\n🛒 Simulating merchant voucher redemption...');
    
    // Single voucher redemption
    const redeemResult1 = await sdk.micropayments.redeemVoucher(
      voucher1.voucher,
      voucher1.signature
    );
    
    if (redeemResult1.success) {
      console.log('✅ Redeemed single voucher');
    }

    // Batch voucher redemption
    const batchResult = await sdk.micropayments.redeemBatch(
      [voucher1.voucher, voucher2.voucher],
      [voucher1.signature, voucher2.signature]
    );
    
    if (batchResult.success) {
      console.log('✅ Redeemed batch vouchers');
    }

    // 8. Check merchant balance
    console.log('\n💼 Checking merchant balance...');
    const merchantBalance = await sdk.micropayments.getMerchantBalance(merchantAddress);
    console.log('Merchant Balance:', formatEther(merchantBalance), 'MUSD');

    // 9. Repay some loan
    console.log('\n💸 Repaying loan...');
    const repayResult = await sdk.repayLoan({
      amount: parseEther('1000'), // 1000 MUSD
      fromPurse: true,          // Use purse balance
    });
    
    if (repayResult.success) {
      console.log('✅ Repaid 1000 MUSD from purse');
    }

    // 10. Final status
    console.log('\n📊 Final Status:');
    const finalStatus = await sdk.getUserStatus();
    console.log('Total Purse:', formatEther(finalStatus.purse.total), 'MUSD');
    console.log('Available:', formatEther(finalStatus.purse.available), 'MUSD');
    console.log('Reserved:', formatEther(finalStatus.purse.reserved), 'MUSD');
    console.log('Total Debt:', formatEther(finalStatus.loan.totalDebt), 'MUSD');
    console.log('ICR:', Number(finalStatus.liquidationRisk.currentICR), '%');

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run example if this file is executed directly
if (import.meta.url === new URL(import.meta.url).pathname) {
  example().catch(console.error);
}

export { example };
