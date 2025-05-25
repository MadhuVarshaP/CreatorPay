import { createPublicClient, http, decodeEventLog } from "viem"

export { decodeEventLog };

import { defineChain } from "viem"

const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  },
})

export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
})
