import { parseEther, formatEther } from 'viem';
import { PayceMUSDSDK } from '../src';

/**
 * Advanced example showing risk management and monitoring
 */
async function advancedExample() {
  console.log('🚀 PayceMUSD Advanced Example\n');

  const sdk = PayceMUSDSDK.forMezoTestnet({
    address: '0x1234567890123456789012345678901234567890' as const,
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
  });

  try {
    // 1. Monitor loan health
    console.log('🔍 Monitoring loan health...');
    const loan = await sdk.getLoanDetails();
    const liquidationRisk = await sdk.isAtLiquidationRisk();
    const btcPrice = await sdk.getCurrentBTCPrice();
    const currentInterest = await sdk.getCurrentInterest();

    console.log('📊 Loan Health Report:');
    console.log('Total Debt:', formatEther(loan.totalDebt), 'MUSD');
    console.log('Collateral:', formatEther(loan.collateral), 'BTC');
    console.log('Current ICR:', Number(liquidationRisk.currentICR), '%');
    console.log('Liquidation Risk:', liquidationRisk.atRisk ? '⚠️ HIGH' : '✅ LOW');
    console.log('BTC Price:', formatEther(btcPrice), 'USD');
    console.log('Current Interest:', formatEther(currentInterest), 'MUSD');

    // 2. Risk management
    if (liquidationRisk.atRisk) {
      console.log('\n⚠️ LIQUIDATION RISK DETECTED!');
      console.log('Recommended actions:');
      
      // Calculate how much collateral to add
      const minICR = 110n; // 110%
      const currentICR = liquidationRisk.currentICR;
      const requiredICR = minICR + 20n; // Add buffer
      
      if (currentICR < requiredICR) {
        const debt = loan.totalDebt;
        const requiredCollateral = (debt * requiredICR) / btcPrice;
        const currentCollateral = loan.collateral;
        const additionalCollateral = requiredCollateral - currentCollateral;
        
        console.log(`Add ${formatEther(additionalCollateral)} BTC collateral`);
        
        // Add collateral
        const addCollateralResult = await sdk.addCollateral({
          amount: additionalCollateral,
        });
        
        if (addCollateralResult.success) {
          console.log('✅ Added collateral to reduce risk');
        }
      }
    }

    // 3. Interest management
    console.log('\n💰 Interest Management:');
    const interestRate = loan.interestRate;
    const dailyInterest = (loan.totalDebt * BigInt(interestRate)) / (100n * 365n);
    
    console.log('Interest Rate:', interestRate / 100, '% APR');
    console.log('Daily Interest:', formatEther(dailyInterest), 'MUSD');
    console.log('Monthly Interest:', formatEther(dailyInterest * 30n), 'MUSD');

    // 4. Optimize purse management
    console.log('\n🎯 Purse Optimization:');
    const balances = await sdk.micropayments.getUserBalances(sdk.getAccountAddress());
    
    console.log('Current Purse:');
    console.log('Total:', formatEther(balances.total), 'MUSD');
    console.log('Reserved:', formatEther(balances.reserved), 'MUSD');
    console.log('Available:', formatEther(balances.available), 'MUSD');

    // Optimize reserved funds
    const optimalReserve = loan.totalDebt / 10n; // Reserve 10% of debt
    if (balances.reserved < optimalReserve) {
      const toReserve = optimalReserve - balances.reserved;
      console.log(`Reserving additional ${formatEther(toReserve)} MUSD for vouchers`);
      
      await sdk.micropayments.reserveFunds(toReserve);
    } else if (balances.reserved > optimalReserve * 2n) {
      const toRelease = balances.reserved - optimalReserve;
      console.log(`Releasing ${formatEther(toRelease)} MUSD from reserved funds`);
      
      await sdk.micropayments.releaseReserved(toRelease);
    }

    // 5. Create optimized voucher system
    console.log('\n🎫 Optimized Voucher System:');
    
    // Create multiple vouchers for different merchants
    const merchants = [
      '0x4567890123456789012345678901234567890123',
      '0x7890123456789012345678901234567890123456',
      '0x0123456789012345678901234567890123456789',
    ] as const;

    const vouchers: any[] = [];
    for (let i = 0; i < merchants.length; i++) {
      const voucher = await sdk.micropayments.createVoucher(
        merchants[i],
        parseEther('50'), // 50 MUSD per voucher
        BigInt(i + 1),
        7200 // 2 hour expiry
      );
      vouchers.push(voucher);
    }

    console.log(`✅ Created ${vouchers.length} vouchers for different merchants`);

    // 6. Batch operations for efficiency
    console.log('\n⚡ Batch Operations:');
    
    // Batch redeem vouchers
    const batchVouchers = vouchers.map(v => v.voucher);
    const batchSignatures = vouchers.map(v => v.signature);
    
    const batchResult = await sdk.micropayments.redeemBatch(
      batchVouchers,
      batchSignatures
    );
    
    if (batchResult.success) {
      console.log('✅ Batch redeemed all vouchers');
    }

    // 7. Advanced loan management
    console.log('\n🏦 Advanced Loan Management:');
    
    // Check if refinancing is beneficial
    const currentRate = loan.interestRate;
    const newRate = 50; // Assume new rate is 0.5% (example)
    
    if (newRate < currentRate) {
      console.log('Refinancing opportunity detected!');
      console.log(`Current rate: ${currentRate / 100}%`);
      console.log(`New rate: ${newRate / 100}%`);
      console.log(`Savings: ${(currentRate - newRate) / 100}%`);
      
      const refinanceResult = await sdk.refinanceLoan();
      if (refinanceResult.success) {
        console.log('✅ Refinanced loan to lower rate');
      }
    }

    // 8. Final optimization report
    console.log('\n📈 Final Optimization Report:');
    const finalStatus = await sdk.getUserStatus();
    
    console.log('Loan Status:');
    console.log('Total Debt:', formatEther(finalStatus.loan.totalDebt), 'MUSD');
    console.log('Interest Rate:', finalStatus.loan.interestRate / 100, '%');
    console.log('ICR:', Number(finalStatus.liquidationRisk.currentICR), '%');
    console.log('Risk Level:', finalStatus.liquidationRisk.atRisk ? '⚠️ HIGH' : '✅ LOW');
    
    console.log('\nPurse Status:');
    console.log('Total:', formatEther(finalStatus.purse.total), 'MUSD');
    console.log('Reserved:', formatEther(finalStatus.purse.reserved), 'MUSD');
    console.log('Available:', formatEther(finalStatus.purse.available), 'MUSD');
    
    console.log('\nMerchant Earnings:');
    console.log('Total:', formatEther(finalStatus.merchantEarnings), 'MUSD');

    // 9. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (finalStatus.liquidationRisk.currentICR < 150n) {
      console.log('• Consider adding more collateral to improve ICR');
    }
    
    if (finalStatus.purse.available > parseEther('1000')) {
      console.log('• Consider repaying some debt to reduce interest');
    }
    
    if (finalStatus.merchantEarnings > parseEther('100')) {
      console.log('• Withdraw merchant earnings to avoid idle funds');
    }

    console.log('\n🎉 Advanced example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  advancedExample().catch(console.error);
}

export { advancedExample };
