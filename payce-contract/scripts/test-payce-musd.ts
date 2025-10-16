import hre from 'hardhat';
import { http, createPublicClient, createWalletClient, parseEther, formatEther, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mezoTestnet as mezoChain } from '@mezo-org/chains';

// Minimal ERC20 ABI for balance/approve/allowance/transferFrom
const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'transferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
];

async function main() {
  console.log('🚦 Starting end-to-end PayceMUSD test on Mezo Testnet...\n');

  // Read keys and setup two actors: payer and merchant
  const payerPkRaw = (process.env.MEZO_PRIVATE_KEY || '').trim();
  const merchantPkRaw = (process.env.MERCHANT_PRIVATE_KEY || '').trim();
  if (!payerPkRaw) throw new Error('PAYER_PRIVATE_KEY or MEZO_PRIVATE_KEY not set');
  if (!merchantPkRaw) throw new Error('MERCHANT_PRIVATE_KEY not set');
  const payerPk = (payerPkRaw.startsWith('0x') ? payerPkRaw : `0x${payerPkRaw}`) as `0x${string}`;
  const merchantPk = (merchantPkRaw.startsWith('0x') ? merchantPkRaw : `0x${merchantPkRaw}`) as `0x${string}`;

  const payer = privateKeyToAccount(payerPk);
  const merchant = privateKeyToAccount(merchantPk);

  const transport = http('https://rpc.test.mezo.org');
  const publicClient = createPublicClient({ chain: mezoChain, transport });
  const payerClient = createWalletClient({ chain: mezoChain, transport, account: payer });
  const merchantClient = createWalletClient({ chain: mezoChain, transport, account: merchant });

  // Addresses (from your deployment)
  const CONTRACT = ('0x04c8d6936a29dca974645e7c15fbe6b5793cb0de') as `0x${string}`;
  const MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as const;

  // Load artifact to interact with contract
  const artifact = await hre.artifacts.readArtifact('PayceMUSD');

  // Helper readers
  const payceRead = async <T>(functionName: string, args?: readonly unknown[]): Promise<T> => {
    return (await publicClient.readContract({ address: CONTRACT, abi: artifact.abi, functionName: functionName as any, args: args as any })) as T;
  };

  const printUser = async (label: string, userAddr: `0x${string}`) => {
    const [total, reserved, available] = await payceRead<[bigint, bigint, bigint]>('getUserBalances', [userAddr]);
    console.log(`${label} purse -> total: ${formatEther(total)} MUSD, reserved: ${formatEther(reserved)}, available: ${formatEther(available)}`);
  };

  // 0) Balances
  const payerNative = await publicClient.getBalance({ address: payer.address });
  const merchantNative = await publicClient.getBalance({ address: merchant.address });
  console.log('🧾 Payer:', payer.address, 'native:', formatEther(payerNative));
  console.log('🧾 Merchant:', merchant.address, 'native:', formatEther(merchantNative));

  // 1) Open trove: borrow MUSD with BTC and deposit to purse (skip if already active)
  console.log('\n1) Borrow MUSD with BTC and deposit to purse');
  const loanBefore = await payceRead<[bigint, bigint, bigint, bigint, bigint, number, boolean]>('getLoanDetails');
  const isActive = loanBefore[6];
  if (!isActive) {
    const musdBorrow = parseEther('5000');
    const btcCollateral = parseEther('0.1');
    const openHash = await payerClient.writeContract({
      address: CONTRACT,
      abi: artifact.abi,
      functionName: 'openTroveAndBorrow',
      args: [musdBorrow, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', true],
      value: btcCollateral,
    });
    await publicClient.waitForTransactionReceipt({ hash: openHash });
    await printUser('After borrow (payer)', payer.address);
  } else {
    console.log('Trove already active; skipping openTroveAndBorrow');
  }

  // 2) Optional: deposit owned MUSD (only if payer already has MUSD)
  console.log('\n2) Deposit owned MUSD (optional)');
  const ownedMusd = await publicClient.readContract({ address: MUSD, abi: erc20Abi, functionName: 'balanceOf', args: [payer.address] }) as bigint;
  if (ownedMusd > 0n) {
    const approveHash = await payerClient.writeContract({ address: MUSD, abi: erc20Abi, functionName: 'approve', args: [CONTRACT, ownedMusd] });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const depHash = await payerClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'deposit', args: [ownedMusd] });
    await publicClient.waitForTransactionReceipt({ hash: depHash });
    console.log('Deposited owned MUSD:', formatEther(ownedMusd));
  } else {
    console.log('No owned MUSD detected; skipping direct deposit test');
  }
  await printUser('After optional deposit (payer)', payer.address);

  // 3) Reserve funds
  console.log('\n3) Reserve funds');
  const reserveAmt = parseEther('100');
  const reserveHash = await payerClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'reserveFunds', args: [reserveAmt] });
  await publicClient.waitForTransactionReceipt({ hash: reserveHash });
  await printUser('After reserve (payer)', payer.address);

  // 4) Sign EIP-712 voucher and redeem by merchant
  console.log('\n4) Sign voucher and redeem (single)');
  const chainId = 31611;
  const domain = { name: 'PayceMUSD', version: '1', chainId, verifyingContract: CONTRACT } as const;
  const types = {
    Voucher: [
      { name: 'payer', type: 'address' },
      { name: 'merchant', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
    ],
  } as const;

  const voucher1 = {
    payer: payer.address,
    merchant: merchant.address,
    amount: reserveAmt,
    nonce: 1n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
  } as const;

  const sig1 = await payerClient.signTypedData({ domain, types, primaryType: 'Voucher', message: voucher1 });
  const redeemHash1 = await merchantClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'redeemVoucher', args: [voucher1, sig1] });
  await publicClient.waitForTransactionReceipt({ hash: redeemHash1 });
  console.log('Redeemed single voucher of', formatEther(voucher1.amount), 'MUSD');

  // Top up reserved funds for the upcoming batch (5 + 7 = 12 MUSD)
  const additionalReserve = parseEther('12');
  const reserveMoreHash = await payerClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'reserveFunds', args: [additionalReserve] });
  await publicClient.waitForTransactionReceipt({ hash: reserveMoreHash });
  await printUser('After topping up reserve for batch (payer)', payer.address);

  // 5) Batch vouchers
  console.log('\n5) Batch vouchers');
  const v2 = { payer: payer.address, merchant: merchant.address, amount: parseEther('5'), nonce: 2n, expiry: BigInt(Math.floor(Date.now() / 1000) + 3600) } as const;
  const v3 = { payer: payer.address, merchant: merchant.address, amount: parseEther('7'), nonce: 3n, expiry: BigInt(Math.floor(Date.now() / 1000) + 3600) } as const;
  const s2 = await payerClient.signTypedData({ domain, types, primaryType: 'Voucher', message: v2 });
  const s3 = await payerClient.signTypedData({ domain, types, primaryType: 'Voucher', message: v3 });
  const redeemBatchHash = await merchantClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'redeemBatch', args: [[v2, v3], [s2, s3]] });
  await publicClient.waitForTransactionReceipt({ hash: redeemBatchHash });
  console.log('Redeemed batch vouchers totalling', formatEther(v2.amount + v3.amount), 'MUSD');

  // 6) Merchant withdraw
  console.log('\n6) Merchant withdraw');
  const merchantBal = await payceRead<bigint>('getMerchantBalance', [merchant.address]);
  if (merchantBal > 0n) {
    const wHash = await merchantClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'withdrawMerchant', args: [merchantBal] });
    await publicClient.waitForTransactionReceipt({ hash: wHash });
    console.log('Merchant withdrew', formatEther(merchantBal), 'MUSD');
  } else {
    console.log('Merchant balance is 0; skipping withdraw');
  }

  // 7) Repay some loan from purse
  console.log('\n7) Repay from purse');
  const repayAmt = parseEther('50');
  const repayHash = await payerClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'repayLoan', args: [repayAmt, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', true] });
  await publicClient.waitForTransactionReceipt({ hash: repayHash });
  console.log('Repaid', formatEther(repayAmt), 'MUSD from purse');

  // 8) Add collateral
  console.log('\n8) Add collateral');
  const extraBtc = parseEther('0.01');
  const addCollHash = await payerClient.writeContract({ address: CONTRACT, abi: artifact.abi, functionName: 'addCollateral', args: ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'], value: extraBtc });
  await publicClient.waitForTransactionReceipt({ hash: addCollHash });
  console.log('Added collateral:', formatEther(extraBtc), 'BTC');

  // 9) Show final balances
  console.log('\n9) Final balances');
  await printUser('Final (payer)', payer.address);
  const loan = await payceRead<[bigint, bigint, bigint, bigint, bigint, number, boolean]>('getLoanDetails');
  console.log('Loan -> principal:', formatEther(loan[0]), 'interest:', formatEther(loan[1]), 'collateral:', formatEther(loan[3]));

  console.log('\n✅ End-to-end tests finished');
}

main().catch((e) => {
  console.error('❌ Test script failed:', e);
  process.exit(1);
});


