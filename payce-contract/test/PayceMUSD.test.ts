import { expect } from "chai"
import { describe, it } from "node:test"
import { network } from "hardhat"
import {
  setupTests,
  User,
  Contracts,
  setDefaultFees,
  setInterestRate,
} from "./helpers.js"
import { to1e18 } from "./utils.js"
import { type Address } from "viem"

describe("PayceMUSD Integration Tests", async () => {
  const { viem } = await network.connect()

  let payceMUSD: any
  let contracts: Contracts
  let alice: User
  let bob: User
  let carol: User
  let council: User
  let deployer: User

  async function setupTest() {
    // Setup MUSD contracts
    const setup = await setupTests()
    contracts = setup.contracts
    alice = setup.alice
    bob = setup.bob
    carol = setup.carol
    council = setup.council
    deployer = setup.deployer

    // Setup governance
    await contracts.pcv.write.startChangingRoles(
      [council.address, council.address],
      { account: deployer.wallet.account }
    )
    await contracts.pcv.write.finalizeChangingRoles({
      account: deployer.wallet.account
    })

    await setDefaultFees(contracts, council)
    await setInterestRate(contracts, council, 100) // 1% APR

    // Deploy PayceMUSD contract
    payceMUSD = await viem.deployContract("PayceMUSD", [
      contracts.musd.address,
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.priceFeed.address,
    ])

    return { payceMUSD, contracts, alice, bob, carol, council, deployer }
  }

  it("Should allow user to borrow MUSD with BTC and deposit to purse", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    const btcAmount = to1e18("1") // 1 BTC
    const musdAmount = to1e18("50000") // Borrow 50,000 MUSD

    // Alice opens a trove through PayceMUSD
    const hash = await payceMUSD.write.openTroveAndBorrow(
      [musdAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: btcAmount,
        account: alice.wallet.account,
      }
    )

    // Check Alice's purse balance
    const [total, reserved, available] = await payceMUSD.read.getUserBalances([alice.address])
    expect(total > musdAmount).to.be.true
    expect(reserved).to.equal(0n)
    expect(available).to.equal(total)
  })

  it("Should allow user to borrow MUSD without depositing to purse", async () => {
    const { payceMUSD, alice, contracts } = await setupTest()
    
    const btcAmount = to1e18("1")
    const musdAmount = to1e18("50000")

    const aliceMUSDBefore = await contracts.musd.read.balanceOf([alice.address])

    await payceMUSD.write.openTroveAndBorrow(
      [musdAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, false],
      {
        value: btcAmount,
        account: alice.wallet.account,
      }
    )

    // Alice should receive MUSD directly to wallet
    const aliceMUSDAfter = await contracts.musd.read.balanceOf([alice.address])
    expect(aliceMUSDAfter > aliceMUSDBefore).to.be.true

    // Purse should be empty
    const [total] = await payceMUSD.read.getUserBalances([alice.address])
    expect(total).to.equal(0n)
  })

  it("Should enforce minimum debt requirement", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    const btcAmount = to1e18("0.1")
    const musdAmount = to1e18("100") // Below minimum

    try {
      await payceMUSD.write.openTroveAndBorrow(
        [musdAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
        {
          value: btcAmount,
          account: alice.wallet.account,
        }
      )
      expect.fail("Should have reverted")
    } catch (error: any) {
      expect(error.message).to.include("below minimum debt")
    }
  })

  it("Should retrieve loan details correctly", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    const btcAmount = to1e18("1")
    const musdAmount = to1e18("50000")

    await payceMUSD.write.openTroveAndBorrow(
      [musdAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: btcAmount,
        account: alice.wallet.account,
      }
    )

    const loanInfo = await payceMUSD.read.getLoanDetails()

    expect(loanInfo[0] > musdAmount).to.be.true // principal
    expect(loanInfo[1]).to.equal(0n) // interest - No interest yet
    expect(loanInfo[3] > 0n).to.be.true // collateral
    expect(loanInfo[4] > to1e18("110")).to.be.true // icr > 110%
    expect(loanInfo[5]).to.equal(100) // interestRate 1%
    expect(loanInfo[6]).to.be.true // isActive
  })

  it("Should calculate ICR percentage correctly", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    const btcAmount = to1e18("1")
    const musdAmount = to1e18("50000")

    await payceMUSD.write.openTroveAndBorrow(
      [musdAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: btcAmount,
        account: alice.wallet.account,
      }
    )

    const icrPercent = await payceMUSD.read.getCollateralizationRatioPercent()
    expect(icrPercent > 110n).to.be.true
  })

  it("Should allow repayment from purse", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    // First open a trove
    await payceMUSD.write.openTroveAndBorrow(
      [to1e18("50000"), "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: to1e18("1"),
        account: alice.wallet.account,
      }
    )

    const repayAmount = to1e18("1000")
    const [totalBefore] = await payceMUSD.read.getUserBalances([alice.address])

    await payceMUSD.write.repayLoan(
      [repayAmount, "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      { account: alice.wallet.account }
    )

    const [totalAfter] = await payceMUSD.read.getUserBalances([alice.address])
    expect(totalAfter).to.equal(totalBefore - repayAmount)

    // Check loan was reduced
    const loanInfo = await payceMUSD.read.getLoanDetails()
    expect(loanInfo[0] < to1e18("50500")).to.be.true // principal
  })

  it("Should allow adding collateral", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    // First open a trove
    await payceMUSD.write.openTroveAndBorrow(
      [to1e18("50000"), "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: to1e18("1"),
        account: alice.wallet.account,
      }
    )

    const additionalBTC = to1e18("0.5")
    const loanBefore = await payceMUSD.read.getLoanDetails()

    await payceMUSD.write.addCollateral(
      ["0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address],
      {
        value: additionalBTC,
        account: alice.wallet.account,
      }
    )

    const loanAfter = await payceMUSD.read.getLoanDetails()
    expect(loanAfter[3]).to.equal(loanBefore[3] + additionalBTC) // collateral
    expect(loanAfter[4] > loanBefore[4]).to.be.true // icr
  })

  it("Should allow reserving and releasing funds", async () => {
    const { payceMUSD, alice } = await setupTest()
    
    // First open a trove
    await payceMUSD.write.openTroveAndBorrow(
      [to1e18("50000"), "0x0000000000000000000000000000000000000000" as Address, "0x0000000000000000000000000000000000000000" as Address, true],
      {
        value: to1e18("1"),
        account: alice.wallet.account,
      }
    )

    // Reserve funds
    await payceMUSD.write.reserveFunds([to1e18("10000")], {
      account: alice.wallet.account
    })

    const [, reservedAfter] = await payceMUSD.read.getUserBalances([alice.address])
    expect(reservedAfter).to.equal(to1e18("10000"))

    // Release some
    await payceMUSD.write.releaseReserved([to1e18("2000")], {
      account: alice.wallet.account
    })

    const [, reserved] = await payceMUSD.read.getUserBalances([alice.address])
    expect(reserved).to.equal(to1e18("8000"))
  })

  it("Should allow user to deposit and withdraw MUSD", async () => {
    const { payceMUSD, alice, contracts } = await setupTest()
    
    // Mint some MUSD to Alice
    await contracts.musd.write.mint([alice.address, to1e18("1000")])

    // Approve PayceMUSD
    await contracts.musd.write.approve([payceMUSD.address, to1e18("1000")], {
      account: alice.wallet.account
    })

    const [balanceBefore] = await payceMUSD.read.getUserBalances([alice.address])

    await payceMUSD.write.deposit([to1e18("1000")], {
      account: alice.wallet.account
    })

    const [balanceAfter] = await payceMUSD.read.getUserBalances([alice.address])
    expect(balanceAfter).to.equal(balanceBefore + to1e18("1000"))

    // Withdraw
    const aliceMUSDBefore = await contracts.musd.read.balanceOf([alice.address])
    
    await payceMUSD.write.withdrawUser([to1e18("500")], {
      account: alice.wallet.account
    })

    const aliceMUSDAfter = await contracts.musd.read.balanceOf([alice.address])
    expect(aliceMUSDAfter).to.equal(aliceMUSDBefore + to1e18("500"))
  })

  it("Should return helper function values correctly", async () => {
    const { payceMUSD } = await setupTest()
    
    const minBorrow = await payceMUSD.read.getMinimumBorrowAmount()
    expect(minBorrow).to.equal(to1e18("1800"))

    const borrowAmount = to1e18("10000")
    const fee = await payceMUSD.read.calculateBorrowingFee([borrowAmount])
    expect(fee).to.equal(borrowAmount / 1000n)

    const btcPrice = await payceMUSD.read.getCurrentBTCPrice()
    expect(btcPrice).to.equal(to1e18("100000"))
  })

  // Note: Voucher signing with EIP-712 in viem requires different approach
  // This would need wallet.signTypedData which works differently in viem
  // Skipping voucher tests for now - they can be added with viem's signTypedData approach
})
