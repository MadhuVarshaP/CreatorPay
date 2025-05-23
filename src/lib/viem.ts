import { createPublicClient, http } from "viem"
import { defineChain } from "viem"

const polygonAmoy = defineChain({
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: {
      name: "Polygonscan",
      url: "https://www.oklink.com/amoy",
    },
  },
})

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
})
