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
import { toast, Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { getLogsPaginated, decodeEventLog } from '@/lib/viem'

interface CreatorDetails {
  name: string
  subscriptionFee: bigint
  platformShare: number
  totalEarnings: bigint
  subscribers: number
  isRegistered: boolean
}

interface SubscriptionActivity {
  subscriber: string
  creator: string
  expiresAt: bigint
  timestamp: number
  blockNumber: number
  transactionHash: string
  amount: bigint
  gasUsed: bigint
}

export default function CreatorDashboard() {
  const { address: userAddress, isConnected } = useAccount()
  const publicClient = usePublicClient()

  // Read creator details
  const { 
    data: creatorData, 
    isLoading: isCreatorLoading, 
    refetch: refetchCreatorData 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "creators",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: isConnected && !!userAddress,
    }
  })
  // Read subscribers list
  const { 
    data: subscribersData, 
    isLoading: isSubscribersLoading, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refetch: refetchSubscribers 
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getSubscribers",
    args: userAddress ? [userAddress] : undefined,
   query: {
    enabled: isConnected && !!userAddress,
   }
  })

  // Withdraw creator earnings write hook
  const {
    data: withdrawHash,
    writeContract: withdraw,
    isPending: isWithdrawLoading,
    error: withdrawError,
  } = useWriteContract()

  // Wait for transaction receipt
  const { 
    data: receipt, 
    isLoading: isTxLoading 
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  const [creatorDetails, setCreatorDetails] = useState<CreatorDetails>({
    name: "",
    subscriptionFee: BigInt(0),
    platformShare: 0,
    totalEarnings: BigInt(0),
    subscribers: 0,
    isRegistered: false,
  })

  const [subscriptionActivities, setSubscriptionActivities] = useState<SubscriptionActivity[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  // Update creator details when data changes
  useEffect(() => {
    if (creatorData) {
      const [name, subscriptionFee, platformShare, creatorBalance] = creatorData as [string, bigint, number, bigint]
      const isRegistered = subscriptionFee > BigInt(0)
      setCreatorDetails(prev => ({
        ...prev,
        name: name || "Unnamed Creator",
        subscriptionFee,
        platformShare: Number(platformShare),
        totalEarnings: creatorBalance,
        isRegistered,
      }))
    }
  }, [creatorData])

  // Update subscriber count when data changes
  useEffect(() => {
    if (subscribersData) {
      const subscribers = subscribersData as string[]
      setCreatorDetails(prev => ({
        ...prev,
        subscribers: subscribers.length,
      }))
    }
  }, [subscribersData])

  // Fetch subscription activities from blockchain events
  const fetchSubscriptionActivities = async () => {
    if (!publicClient || !userAddress || !creatorDetails.isRegistered) return
    
    setIsLoadingActivities(true)
    try {
      // Get subscription events for this creator
      const logs = await getLogsPaginated({
        address: CONTRACT_ADDRESS,
        event: {
          type: 'event',
          name: 'Subscribed',
          inputs: [
            { type: 'address', indexed: true, name: 'user' },
            { type: 'address', indexed: true, name: 'creator' },
            { type: 'uint256', indexed: false, name: 'expiresAt' }
          ]
        },
        args: {
          creator: userAddress
        },
        fromBlock: 'earliest',
        toBlock: 'latest'
      })

      // Process logs to get subscription activities
      const activities = await Promise.all(
        logs.map(async (log) => {
          // Decode the log to get args
          const decoded = decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });
          let args: { user: string; creator: string; expiresAt: bigint };
          if (Array.isArray(decoded.args)) {
            // fallback: [user, creator, expiresAt]
            const [user, creator, expiresAt] = decoded.args as unknown as [string, string, bigint];
            args = { user, creator, expiresAt };
          } else if (decoded.args) {
            args = decoded.args as unknown as { user: string; creator: string; expiresAt: bigint };
          } else {
            return null;
          }

          // Get block details for timestamp
          const block = await publicClient.getBlock({
            blockHash: log.blockHash
          })
          // Get transaction details for amount paid
          const transaction = await publicClient.getTransaction({
            hash: log.transactionHash
          })

          return {
            subscriber: args.user,
            creator: args.creator,
            expiresAt: args.expiresAt,
            timestamp: Number(block.timestamp),
            blockNumber: Number(log.blockNumber),
            transactionHash: log.transactionHash,
            amount: transaction.value, // Amount paid in the transaction
            gasUsed: transaction.gas,
          }
        })
      )

      // Sort by timestamp (most recent first)
      const validActivities = activities.filter(Boolean) as SubscriptionActivity[];
      const sortedActivities = validActivities.sort((a, b) => b.timestamp - a.timestamp)
      setSubscriptionActivities(sortedActivities)
    } catch (error) {
      console.error('Error fetching subscription activities:', error)
      toast.error("Failed to load subscription activities", {
        description: "There was an error fetching blockchain data"
      })
    } finally {
      setIsLoadingActivities(false)
    }
  }

  // Fetch activities when creator is registered and connected
  useEffect(() => {
    if (creatorDetails.isRegistered && userAddress && publicClient) {
      fetchSubscriptionActivities()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorDetails.isRegistered, userAddress, publicClient])

  // Handle transaction receipt status and toast notifications
  useEffect(() => {
    if (receipt) {
      if (receipt.status === 'success') {
        toast.success("Withdrawal successful!", {
          description: `${formatEth(creatorDetails.totalEarnings)} ETH withdrawn`,
        })
        setCreatorDetails((prev) => ({ ...prev, totalEarnings: BigInt(0) }))
        // Refetch data after successful withdrawal
        refetchCreatorData()
      } else {
        toast.error("Withdrawal failed", {
          description: "Transaction processed but failed. Please check your wallet.",
        })
      }
      setIsWithdrawing(false)
    }
  }, [receipt, creatorDetails.totalEarnings, refetchCreatorData])

  // Handle withdraw errors
  useEffect(() => {
    if (withdrawError) {
      toast.error("Withdrawal failed", {
        description: withdrawError.message || "An error occurred during withdrawal",
      })
      setIsWithdrawing(false)
    }
  }, [withdrawError])

  const handleWithdraw = () => {
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to withdraw funds",
      })
      return
    }

    if (creatorDetails.totalEarnings <= BigInt(0)) {
      toast.error("No funds to withdraw", {
        description: "You don't have any earnings to withdraw at this time",
      })
      return
    }

    setIsWithdrawing(true)
    withdraw({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdrawCreatorEarnings",
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold mb-6">Creator Dashboard</h1>
        <Card>
          <CardContent className="py-10 flex flex-col items-center justify-center">
            <p className="mb-6">Please connect your wallet to access the creator dashboard</p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!creatorDetails.isRegistered && !isCreatorLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold mb-6">Creator Dashboard</h1>
        <Card>
          <CardContent className="py-10 flex flex-col items-center justify-center">
            <p className="mb-6">You are not registered as a creator. Please register first to access the dashboard.</p>
            <Button asChild className="bg-black text-white text-base">
              <a href="/register">Register as Creator</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLoading = isCreatorLoading || isSubscribersLoading

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="bottom-right" closeButton richColors />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        <Button 
          onClick={fetchSubscriptionActivities}
          variant="outline"
          disabled={isLoadingActivities}
        >
          {isLoadingActivities ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Creator Info</CardTitle>
            <CardDescription>Your creator account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="font-mono text-md">{userAddress ? formatAddress(userAddress) : ''}</p>
            </div>
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="font-semibold text-lg">{creatorDetails.name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription Fee</p>
                  <p className="text-lg font-semibold">{formatEth(creatorDetails.subscriptionFee)} ETH</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform Share</p>
                  <p className="font-semibold text-lg">{creatorDetails.platformShare}%</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
            <CardDescription>Your current earnings and withdrawal options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-6 w-1/2" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatEth(creatorDetails.totalEarnings)} ETH
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                  <p className="text-xl font-semibold">{creatorDetails.subscribers}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-xl font-semibold">{subscriptionActivities.length}</p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleWithdraw}
              disabled={
                isLoading || 
                isWithdrawing || 
                isWithdrawLoading || 
                isTxLoading || 
                creatorDetails.totalEarnings <= BigInt(0)
              }
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {isWithdrawing || isWithdrawLoading || isTxLoading
                ? "Processing..."
                : `Withdraw ${formatEth(creatorDetails.totalEarnings)} ETH`}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriber Activity</CardTitle>
          <CardDescription>
            Real-time subscription transactions from the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptionActivities.length > 0 ? (
                subscriptionActivities.map((activity, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {formatAddress(activity.subscriber)}
                        </p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Subscribed
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Tx: {formatAddress(activity.transactionHash)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Block: {activity.blockNumber.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-lg text-green-600">
                        +{formatEth(activity.amount)} ETH
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatTimestamp(Number(activity.expiresAt))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No subscription activity found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Subscription transactions will appear here once users subscribe to your content.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        {subscriptionActivities.length > 0 && (
          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground w-full">
              Showing {subscriptionActivities.length} subscription transaction{subscriptionActivities.length !== 1 ? 's' : ''}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}