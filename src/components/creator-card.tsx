"use client"

import React, { useState } from "react"
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { formatEth } from "@/lib/utils"
import type { Creator } from "@/lib/types"
import { AlertCircle } from "lucide-react"

interface CreatorCardProps {
  creator: Pick<Creator, "address" | "name">
}

type CreatorStruct = readonly [string, bigint, bigint, bigint, bigint]

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)
  const { address: userAddress } = useAccount()

  const { 
    data: onchainData, 
    isLoading, 
    error: readError,
    refetch 
  } = useReadContract<typeof CONTRACT_ABI, "creators", CreatorStruct>({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "creators",
    args: [creator.address],
  })

  const {
    data: isSubscribed,
    refetch: refetchSubscription,
    isLoading: isCheckingSub,
  } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "isSubscribed",
    args: [userAddress, creator.address],
  })

  const { writeContractAsync, data: hash, error: writeError } = useWriteContract()

  const { isLoading: txLoading, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: () => {
      refetch()
      refetchSubscription()
    }
  })

  const creatorName = onchainData?.[0] || ""
  const subscriptionFee = onchainData?.[1]
  const platformShare = onchainData?.[2] ? Number(onchainData[2]) : undefined
  const creatorBalance = onchainData?.[3]
  const platformBalance = onchainData?.[4]

  const getDisplayName = () => {
    if (creatorName && creatorName.trim().length > 0) return creatorName.trim()
    if (creator.name && creator.name.trim().length > 0) return creator.name.trim()
    return `${creator.address.slice(0, 6)}...${creator.address.slice(-4)}`
  }

  const displayName = getDisplayName()
  const hasValidName = creatorName && creatorName.trim().length > 0
  const isRegistered = subscriptionFee !== undefined && subscriptionFee > 0n

  const handleSubscribe = async () => {
    if (!subscriptionFee) {
      alert("Unable to get subscription fee. Please try again.")
      return
    }

    setIsSubscribing(true)
    try {
      await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "subscribe",
        args: [creator.address],
        value: subscriptionFee,
        gasLimit: 100000,
      })
    } catch (err: any) {
      console.error("Subscription failed:", err)
      let errorMessage = "Subscription failed"
      if (err.shortMessage) errorMessage += `: ${err.shortMessage}`
      else if (err.message) errorMessage += `: ${err.message}`
      alert(errorMessage)
    } finally {
      setIsSubscribing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold">Loading...</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subscription Fee</p>
              <p className="text-xl font-bold">Loading...</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform Share</p>
              <p>Loading...</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled>Loading...</Button>
        </CardFooter>
      </Card>
    )
  }

  if (readError || !isRegistered) {
    return (
      <Card className="overflow-hidden border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center justify-between text-red-700">
            <span className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {displayName}
            </span>
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-red-600 font-medium">
              {readError ? "Failed to load creator data" : "Creator not registered"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {readError ? readError.message : "This creator hasn't registered on the platform yet."}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center justify-between ">
          <span className="text-2xl font-bold flex items-center gap-2">
            {displayName}
          </span>
          <div className="flex gap-2">
            {isSubscribed && (
              <Badge className="bg-green-100 text-green-800">
                Subscribed
              </Badge>
            )}
            {hasValidName && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Verified
              </Badge>
            )}
            <Badge variant="outline">Creator</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-md font-medium text-muted-foreground">Subscription Fee</p>
            <p className="text-xl font-bold">
              {subscriptionFee !== undefined ? `${formatEth(subscriptionFee)} ETH` : "Loading..."}
            </p>
          </div>
          <div>
            <p className="text-md font-medium text-muted-foreground">Platform Share</p>
            <p className="text-lg font-bold">
              {platformShare !== undefined ? `${platformShare}%` : "Loading..."}
            </p>
          </div>
          {creatorBalance !== undefined && creatorBalance > 0n && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Creator Earnings</p>
              <p className="text-lg font-semibold text-green-600">
                {formatEth(creatorBalance)} ETH
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={handleSubscribe}
          disabled={
            isSubscribing || 
            txLoading || 
            isSubscribed || 
            subscriptionFee === undefined || 
            subscriptionFee <= 0n
          }
        >
          {isSubscribed ? (
            "Already Subscribed ✓"
          ) : isSubscribing || txLoading ? (
            "Processing..."
          ) : subscriptionFee === undefined ? (
            "Loading..."
          ) : (
            `Subscribe for ${formatEth(subscriptionFee)} ETH`
          )}
        </Button>
      </CardFooter>

      {writeError && (
        <CardFooter className="pt-2">
          <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              <strong>Transaction Error:</strong> {writeError.message}
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
