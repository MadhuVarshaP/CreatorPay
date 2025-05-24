import { createPublicClient, http, decodeEventLog } from "viem"

// Export decodeEventLog as a standalone function
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

// import { createPublicClient, http } from "viem"
// import { defineChain } from "viem"

// const polygonAmoy = defineChain({
//   id: 80002,
//   name: "Polygon Amoy",
//   nativeCurrency: {
//     name: "MATIC",
//     symbol: "MATIC",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://rpc-amoy.polygon.technology"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Polygonscan",
//       url: "https://www.oklink.com/amoy",
//     },
//   },
// })

// export const publicClient = createPublicClient({
//   chain: polygonAmoy,
//   transport: http(),
// })
