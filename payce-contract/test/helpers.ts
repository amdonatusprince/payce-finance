export interface User {
  address: `0x${string}`
  wallet: any
}

export interface Contracts {
  musd: any
  borrowerOperations: any
  troveManager: any
  priceFeed: any
  pcv: any
  [key: string]: any
}

export interface SetupResult {
  contracts: Contracts
  alice: User
  bob: User
  carol: User
  council: User
  deployer: User
}

/**
 * Mock setup for MUSD protocol contracts
 * In production, this would connect to actual MUSD protocol
 */
export async function setupTests(): Promise<SetupResult> {
  const { network } = await import("hardhat")
  const { viem } = await network.connect()
  
  const [deployerWallet, aliceWallet, bobWallet, carolWallet, councilWallet] = await viem.getWalletClients()

  // Deploy contracts using viem
  const musd = await viem.deployContract("MockERC20", ["MUSD Stablecoin", "MUSD"])
  const borrowerOperations = await viem.deployContract("contracts/mocks/MockBorrowerOperations.sol:MockBorrowerOperations", [musd.address])
  const troveManager = await viem.deployContract("contracts/mocks/MockTroveManager.sol:MockTroveManager")
  const priceFeed = await viem.deployContract("contracts/mocks/MockPriceFeed.sol:MockPriceFeed")
  const pcv = await viem.deployContract("contracts/mocks/MockPCV.sol:MockPCV")

  // Link BorrowerOperations to TroveManager
  await borrowerOperations.write.setTroveManager([troveManager.address])

  const contracts: Contracts = {
    musd,
    borrowerOperations,
    troveManager,
    priceFeed,
    pcv,
  }

  return {
    contracts,
    deployer: { address: deployerWallet.account.address, wallet: deployerWallet },
    alice: { address: aliceWallet.account.address, wallet: aliceWallet },
    bob: { address: bobWallet.account.address, wallet: bobWallet },
    carol: { address: carolWallet.account.address, wallet: carolWallet },
    council: { address: councilWallet.account.address, wallet: councilWallet },
  }
}

/**
 * Set default fees on the borrower operations
 */
export async function setDefaultFees(contracts: Contracts, council: User) {
  // Mock implementation - in real setup would configure actual protocol
  if (contracts.borrowerOperations.write?.setFees) {
    await contracts.borrowerOperations.write.setFees()
  }
}

/**
 * Set interest rate
 */
export async function setInterestRate(
  contracts: Contracts,
  council: User,
  rateBps: number,
) {
  // Mock implementation
  if (contracts.borrowerOperations.write?.setInterestRate) {
    await contracts.borrowerOperations.write.setInterestRate([rateBps])
  }
}

