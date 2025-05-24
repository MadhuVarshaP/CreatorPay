"use client"

import React, { useState } from "react"
import {
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

// Return type of the Creator struct from contract
// struct Creator { string name, uint256 subscriptionFee, uint256 platformShare, uint256 creatorBalance, uint256 platformBalance }
type CreatorStruct = readonly [string, bigint, bigint, bigint, bigint]

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Fetch on-chain creator details
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

  // Prepare write hook for subscription
  const { writeContractAsync, data: hash, error: writeError } = useWriteContract()

  // Wait for transaction
  const { isLoading: txLoading, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: () => {
      // Refetch creator data after successful subscription
      refetch()
    }
  })

  // Extract values from onchainData
  const creatorName = onchainData?.[0] || ""
  const subscriptionFee = onchainData?.[1]
  const platformShare = onchainData?.[2] ? Number(onchainData[2]) : undefined
  const creatorBalance = onchainData?.[3]
  const platformBalance = onchainData?.[4]

  // Determine display name with proper fallbacks
  const getDisplayName = () => {
    // First priority: On-chain name from contract
    if (creatorName && creatorName.trim().length > 0) {
      return creatorName.trim()
    }
    
    // Second priority: Name passed via props (fallback)
    if (creator.name && creator.name.trim().length > 0) {
      return creator.name.trim()
    }
    
    // Final fallback: Truncated address
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
      
      // Success is handled by the transaction receipt hook
    } catch (err: any) {
      console.error("Subscription failed:", err)
      
      let errorMessage = "Subscription failed"
      if (err.shortMessage) {
        errorMessage += `: ${err.shortMessage}`
      } else if (err.message) {
        errorMessage += `: ${err.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsSubscribing(false)
    }
  }

  // Show loading state
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
          <Button className="w-full" disabled>
            Loading...
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Show error state
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

  // Show success state after subscription
  if (isSuccess) {
    return (
      <Card className="overflow-hidden border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center justify-between text-green-700">
            <span className="text-lg font-semibold">{displayName}</span>
            <Badge className="bg-green-100 text-green-800">Subscribed!</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">
              Successfully subscribed to {displayName}!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your subscription is now active.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant="outline" disabled>
            Subscribed ✓
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Show normal creator card
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center justify-between ">
          <span className="text-2xl font-bold flex items-center gap-2">
            {displayName}
          </span>
          <div className="flex gap-2">
            {hasValidName && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Verified
              </Badge>
            )}
            <Badge variant="outline">
              Creator
            </Badge>
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
              {/* <span className="text-sm text-muted-foreground ml-2">
                (You get {platformShare !== undefined ? 100 - platformShare : "..."}%)
              </span> */}
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
            subscriptionFee === undefined || 
            subscriptionFee <= 0n
          }
        >
          {isSubscribing || txLoading ? (
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