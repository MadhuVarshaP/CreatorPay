
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatEth = (value: number | bigint): string => {
  const eth = typeof value === 'bigint' ? Number(value) / 1e18 : value / 1e18
  return eth.toFixed(4)
}
