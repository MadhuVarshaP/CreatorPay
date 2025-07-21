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
      http: ["https://base-sepolia.drpc.org"],
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

// Utility to fetch logs in paginated block ranges (to avoid 10,000 block limit)
export async function getLogsPaginated({ fromBlock = 'earliest', toBlock = 'latest', step = 9000, ...params }) {
  // Get block numbers
  let startBlock: bigint;
  if (fromBlock === 'earliest') {
    startBlock = 0n;
  } else {
    startBlock = typeof fromBlock === 'bigint' ? fromBlock : BigInt(fromBlock);
  }

  let endBlock: bigint;
  if (toBlock === 'latest') {
    endBlock = await publicClient.getBlockNumber();
  } else {
    endBlock = typeof toBlock === 'bigint' ? toBlock : BigInt(toBlock);
  }

  const allLogs = [];
  for (let current = startBlock; current <= endBlock; current += BigInt(step) + 1n) {
    const rangeFrom = current;
    const rangeTo = current + BigInt(step) < endBlock ? current + BigInt(step) : endBlock;
    const logs = await publicClient.getLogs({
      ...params,
      fromBlock: rangeFrom,
      toBlock: rangeTo,
    });
    allLogs.push(...logs);
  }
  return allLogs;
}
