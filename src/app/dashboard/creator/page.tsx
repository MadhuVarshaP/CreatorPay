"use client"

import { useEffect, useState } from "react"
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatEth } from "@/lib/utils"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"

export default function CreatorDashboard() {
  const { address: userAddress, isConnected } = useAccount()
  const publicClient = usePublicClient()

  const {
    data: creatorData,
    isLoading: isCreatorLoading,
    refetch: refetchCreatorData,
  } = userAddress && isConnected
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "creators",
        args: [userAddress],
      })
    : { data: undefined, isLoading: false, refetch: () => {} }

  const {
    data: subscribersData,
    isLoading: isSubscribersLoading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refetch: refetchSubscribers,
  } = userAddress && isConnected
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getSubscribers",
        args: [userAddress],
      })
    : { data: undefined, isLoading: false, refetch: () => {} }

  const {
    data: withdrawHash,
    writeContract: withdraw,
    isPending: isWithdrawLoading,
    error: withdrawError,
  } = useWriteContract()

  const { data: receipt, isLoading: isTxLoading } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  const [creatorDetails, setCreatorDetails] = useState({
    name: "",
    subscriptionFee: BigInt(0),
    platformShare: 0,
    totalEarnings: BigInt(0),
    subscribers: 0,
    isRegistered: false,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscriptionActivities, setSubscriptionActivities] = useState<any[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    if (Array.isArray(creatorData)) {
      const [name, subscriptionFee, platformShare, creatorBalance] = creatorData
      const isRegistered = subscriptionFee > 0n

      setCreatorDetails((prev) => ({
        ...prev,
        name: name || "Unnamed Creator",
        subscriptionFee,
        platformShare: Number(platformShare),
        totalEarnings: creatorBalance,
        isRegistered,
      }))
    }
  }, [creatorData])

  useEffect(() => {
    if (subscribersData) {
      setCreatorDetails((prev) => ({
        ...prev,
        subscribers: subscribersData.length,
      }))
    }
  }, [subscribersData])

  const fetchSubscriptionActivities = async () => {
    if (!publicClient || !userAddress || !creatorDetails.isRegistered) return

    setIsLoadingActivities(true)
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: {
          type: "event",
          name: "Subscribed",
          inputs: [
            { type: "address", indexed: true, name: "user" },
            { type: "address", indexed: true, name: "creator" },
            { type: "uint256", indexed: false, name: "expiresAt" },
          ],
        },
        args: {
          creator: userAddress,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      })

      const activities = await Promise.all(
        logs.map(async (log) => {
          const block = await publicClient.getBlock({ blockHash: log.blockHash })
          const transaction = await publicClient.getTransaction({ hash: log.transactionHash })

          return {
            subscriber: log.args.user,
            creator: log.args.creator,
            expiresAt: log.args.expiresAt,
            timestamp: Number(block.timestamp),
            blockNumber: Number(log.blockNumber),
            transactionHash: log.transactionHash,
            amount: transaction.value,
            gasUsed: transaction.gas,
          }
        })
      )

      const sorted = activities.sort((a, b) => b.timestamp - a.timestamp)
      setSubscriptionActivities(sorted)
    } catch (err) {
      console.error("Failed to fetch activities", err)
      toast.error("Failed to load subscription history")
    } finally {
      setIsLoadingActivities(false)
    }
  }

  useEffect(() => {
    if (creatorDetails.isRegistered && userAddress && publicClient) {
      fetchSubscriptionActivities()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorDetails.isRegistered, userAddress, publicClient])

  useEffect(() => {
    if (receipt) {
      if (receipt.status === "success") {
        toast.success("Withdrawal successful", {
          description: `${formatEth(creatorDetails.totalEarnings)} ETH withdrawn`,
        })
        setCreatorDetails((prev) => ({ ...prev, totalEarnings: BigInt(0) }))
        refetchCreatorData()
      } else {
        toast.error("Transaction failed", {
          description: "Please check your wallet or network status.",
        })
      }
      setIsWithdrawing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt])

  useEffect(() => {
    if (withdrawError) {
      toast.error("Withdrawal failed", {
        description: withdrawError.message,
      })
      setIsWithdrawing(false)
    }
  }, [withdrawError])

  const handleWithdraw = () => {
    if (!isConnected) {
      toast.error("Connect wallet to withdraw")
      return
    }

    if (creatorDetails.totalEarnings <= 0n) {
      toast.error("No funds available")
      return
    }

    setIsWithdrawing(true)
    withdraw({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdrawCreatorEarnings",
    })
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatTimestamp = (timestamp: number) =>
    formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true })

  const isLoading = isCreatorLoading || isSubscribersLoading

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-3xl font-bold">Creator Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Your current creator stats</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                <p className="text-xl font-semibold">{formatEth(creatorDetails.totalEarnings)} ETH</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Subscribers</p>
                <p className="text-xl font-semibold">{creatorDetails.subscribers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Platform Share</p>
                <p className="text-xl font-semibold">{creatorDetails.platformShare}%</p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            disabled={isWithdrawLoading || isWithdrawing || creatorDetails.totalEarnings === 0n}
            onClick={handleWithdraw}
          >
            {isWithdrawLoading || isTxLoading || isWithdrawing ? "Withdrawing..." : "Withdraw Earnings"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription History</CardTitle>
          <CardDescription>Latest subscriptions to your content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingActivities ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : subscriptionActivities.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subscriptions found</p>
          ) : (
            subscriptionActivities.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium">{formatAddress(sub.subscriber)}</p>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(sub.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatEth(sub.amount)} ETH</p>
                  <p className="text-xs text-muted-foreground">
                    Expires: {formatTimestamp(Number(sub.expiresAt))}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
