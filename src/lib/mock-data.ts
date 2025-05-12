import type { Creator, CreatorDashboard } from "./types"

export const creators: Creator[] = [
  {
    address: "0x1234567890123456789012345678901234567890",
    name: "Digital Artist",
    subscriptionFee: 0.05,
    platformShare: 10,
  },
  {
    address: "0x2345678901234567890123456789012345678901",
    name: "Music Producer",
    subscriptionFee: 0.08,
    platformShare: 15,
  },
  {
    address: "0x3456789012345678901234567890123456789012",
    name: "Game Developer",
    subscriptionFee: 0.1,
    platformShare: 12,
  },
  {
    address: "0x4567890123456789012345678901234567890123",
    name: "Tech Writer",
    subscriptionFee: 0.03,
    platformShare: 8,
  },
  {
    address: "0x5678901234567890123456789012345678901234",
    name: "Fitness Coach",
    subscriptionFee: 0.07,
    platformShare: 10,
  },
  {
    address: "0x6789012345678901234567890123456789012345",
    name: "Crypto Analyst",
    subscriptionFee: 0.15,
    platformShare: 20,
  },
]

export const creatorDashboardData: CreatorDashboard = {
  address: "0x1234567890123456789012345678901234567890",
  subscriptionFee: 0.05,
  platformShare: 10,
  totalEarnings: 1.25,
  subscribers: 28,
}
