import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatEther } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with thousands separators
 * @param value - Number or string to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas (e.g., 1000 -> "1,000.00")
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.00";
  
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a bigint (wei) value as ether with thousands separators
 * @param value - BigInt value in wei
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., 1000000000000000000n -> "1,000.00")
 */
export function formatBigInt(value: bigint, decimals: number = 2): string {
  const etherValue = Number(formatEther(value));
  return formatNumber(etherValue, decimals);
}

/**
 * Format a percentage value with thousands separators if needed
 * @param value - Number value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., 110.5 -> "110.50", 1100.5 -> "1,100.50")
 */
export function formatPercent(value: number | bigint, decimals: number = 2): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  if (isNaN(num)) return "0.00";
  
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
