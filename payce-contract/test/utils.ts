import { parseUnits, formatUnits } from "viem"

/**
 * Convert a string/number to 18 decimal wei
 */
export function to1e18(value: string | number): bigint {
  return parseUnits(value.toString(), 18)
}

/**
 * Convert wei to readable string
 */
export function from1e18(value: bigint): string {
  return formatUnits(value, 18)
}

/**
 * Get current timestamp
 */
export function now(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Increase time in blockchain
 */
export async function increaseTime(seconds: number): Promise<void> {
  const { network } = await import("hardhat")
  const { viem } = await network.connect()
  const testClient = await viem.getTestClient()
  await testClient.increaseTime({ seconds })
  await testClient.mine({ blocks: 1 })
}

/**
 * Mine blocks
 */
export async function mineBlocks(count: number): Promise<void> {
  const { network } = await import("hardhat")
  const { viem } = await network.connect()
  const testClient = await viem.getTestClient()
  await testClient.mine({ blocks: count })
}

