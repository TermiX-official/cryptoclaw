import { formatEther, hexToNumber, numberToHex, parseEther } from "viem";

/** Format a bigint value to string */
export function formatBigInt(value: bigint): string {
  return value.toString();
}

/** JSON stringify with bigint handling */
export function formatJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

/** Format number with locale separators */
export function formatNumber(value: number | bigint): string {
  return Number(value).toLocaleString();
}

export { formatEther, parseEther, hexToNumber, numberToHex };
