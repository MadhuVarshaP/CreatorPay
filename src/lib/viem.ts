import { createPublicClient, http, decodeEventLog } from "viem"

export { decodeEventLog };

import { defineChain } from "viem"

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  },
})

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})
