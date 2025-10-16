import hre from 'hardhat';
import { http, createPublicClient, createWalletClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mezoTestnet as mezoChain } from '@mezo-org/chains';

async function main() {
  console.log('🚀 Starting PayceMUSD deployment on Mezo Testnet...\n');
  const account = privateKeyToAccount(process.env.MEZO_PRIVATE_KEY as `0x${string}`);
  const transport = http('https://rpc.test.mezo.org');
  const publicClient = createPublicClient({ chain: mezoChain, transport });
  const walletClient = createWalletClient({ chain: mezoChain, transport, account });
  const deployerAddress = account.address;
  console.log('📝 Deployer address:', deployerAddress);

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: deployerAddress });
  console.log('💰 Deployer balance:', formatEther(balance), 'BTC');

  if (balance < parseEther('0.01')) {
    throw new Error('❌ Insufficient balance for deployment. Please fund your account.');
  }

  // Contract addresses on Mezo Testnet
  const MUSD_TOKEN = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
  const BORROWER_OPERATIONS = '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5'; 
  const TROVE_MANAGER = '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0';
  const PRICE_FEED = '0x86bCF0841622a5dAC14A313a15f96A95421b9366'; 

  console.log('📋 Contract addresses:');
  console.log('  MUSD Token:', MUSD_TOKEN);
  console.log('  BorrowerOperations:', BORROWER_OPERATIONS);
  console.log('  TroveManager:', TROVE_MANAGER);
  console.log('  PriceFeed:', PRICE_FEED);
  console.log('');

  // Deploy PayceMUSD contract
  console.log('🔨 Deploying PayceMUSD contract...');
  const artifact = await hre.artifacts.readArtifact('PayceMUSD');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [MUSD_TOKEN, BORROWER_OPERATIONS, TROVE_MANAGER, PRICE_FEED],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress as string;

  console.log('✅ PayceMUSD deployed successfully!');
  console.log('📍 Contract address:', contractAddress);
  console.log('');

  // Verify deployment
  console.log('🔍 Verifying deployment...');
  
  try {
    // Test basic view functions
    const contract = {
      read: {
        musdToken: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'musdToken',
            args: [],
          })) as string;
        },
        borrowerOperations: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'borrowerOperations',
            args: [],
          })) as string;
        },
        troveManager: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'troveManager',
            args: [],
          })) as string;
        },
        priceFeed: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'priceFeed',
            args: [],
          })) as string;
        },
        getMinimumBorrowAmount: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'getMinimumBorrowAmount',
            args: [],
          })) as bigint;
        },
        getCurrentBTCPrice: async () => {
          return (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: artifact.abi,
            functionName: 'getCurrentBTCPrice',
            args: [],
          })) as bigint;
        },
      },
    };
    
    const musdTokenAddr = await contract.read.musdToken();
    const borrowerOpsAddr = await contract.read.borrowerOperations();
    const troveManagerAddr = await contract.read.troveManager();
    const priceFeedAddr = await contract.read.priceFeed();

    console.log('✅ Contract verification successful!');
    console.log('📋 Stored addresses:');
    console.log('  MUSD Token:', musdTokenAddr);
    console.log('  BorrowerOperations:', borrowerOpsAddr);
    console.log('  TroveManager:', troveManagerAddr);
    console.log('  PriceFeed:', priceFeedAddr);
    console.log('');

    // Test additional view functions
    console.log('🧪 Testing additional functions...');
    
    try {
      const minBorrowAmount = await contract.read.getMinimumBorrowAmount();
      console.log('  ✅ Min borrow amount:', formatEther(minBorrowAmount), 'MUSD');
    } catch (error: unknown) {
      console.log('  ⚠️  Could not get min borrow amount:', (error as Error).message);
    }

    try {
      const btcPrice = await contract.read.getCurrentBTCPrice();
      console.log('  ✅ Current BTC price:', formatEther(btcPrice), 'USD');
    } catch (error: unknown) {
      console.log('  ⚠️  Could not get BTC price:', (error as Error).message);
    }

  } catch (error: unknown) {
    console.log('❌ Contract verification failed:', (error as Error).message);
  }

  console.log('\n🎉 Deployment completed!');
  console.log('📝 Next steps:');
  console.log('  1. Fund the contract with some MUSD for testing');
  console.log('  2. Test deposit/withdraw functions');
  console.log('  3. Test borrowing functions (if you have BTC)');
  console.log('  4. Test voucher redemption');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
