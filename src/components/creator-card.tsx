"use client"

import React, { useState, useEffect } from "react"
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { formatEth } from "@/lib/utils"
import { getCreatorName, hasCreatorName } from "@/lib/creatorStorage"
import type { Creator } from "@/lib/types"

interface CreatorCardProps {
  creator: Pick<Creator, "address" | "name">
}

// Return type of the Creator struct
type CreatorStruct = readonly [bigint, bigint, bigint, bigint]

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)
  
  // Initialize displayName with the stored name immediately (synchronously)
  const [displayName, setDisplayName] = useState<string>(() => {
    // Get the stored name immediately on initialization
    return getCreatorName(creator.address)
  })

  // Update display name when component mounts and when storage changes
  useEffect(() => {
    const updateDisplayName = () => {
      const storedName = getCreatorName(creator.address)
      setDisplayName(storedName)
      
      // Debug logging
      console.log(`🔍 CreatorCard for ${creator.address}:`, {
        hasStoredName: hasCreatorName(creator.address),
        storedName,
        fallbackName: creator.name
      })
    }

    // Update name immediately
    updateDisplayName()

    // Listen for custom events when creator names are updated
    const handleCreatorNameUpdate = (event: CustomEvent) => {
      if (event.detail.address === creator.address) {
        console.log(`📝 Creator name updated for ${creator.address}:`, event.detail.name)
        updateDisplayName()
      }
    }

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'creatorNames') {
        console.log(`💾 Storage changed for creatorNames`)
        updateDisplayName()
      }
    }

    window.addEventListener('creatorNameUpdated', handleCreatorNameUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('creatorNameUpdated', handleCreatorNameUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [creator.address])

  // Fetch on-chain creator details (subscriptionFee, platformShare, balances)
  const { data: onchainData, isLoading, error } = useReadContract<
    typeof CONTRACT_ABI,
    "creators",
    CreatorStruct
  >({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: "creators",
    args: [creator.address],
  })

  // Prepare write hook
  const { writeContractAsync, data: hash } = useWriteContract()

  // Wait for transaction
  const { isLoading: txLoading } = useWaitForTransactionReceipt({ hash })

  // Extract values from onchainData
  const subscriptionFee = onchainData?.[0]
  const platformShare = onchainData?.[1] ? Number(onchainData[1]) : undefined
  const creatorBalance = onchainData?.[2]
  const platformBalance = onchainData?.[3]

  const handleSubscribe = async () => {
    if (!subscriptionFee) return alert("Loading subscription fee...")

    setIsSubscribing(true)
    try {
      await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "subscribe",
        args: [creator.address],
        value: subscriptionFee,
      })
      alert("Subscription successful!")
    } catch (err) {
      console.error("Subscription failed:", err)
      alert("Subscription failed. See console.")
    } finally {
      setIsSubscribing(false)
    }
  }

  // Get the actual display name (this will show "John" instead of the address)
  const actualDisplayName = hasCreatorName(creator.address) 
    ? displayName 
    : displayName

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">{actualDisplayName}</span>
          {hasCreatorName(creator.address) && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Named
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Subscription Fee</p>
            <p className="text-xl font-bold">
              {subscriptionFee !== undefined ? `${formatEth(subscriptionFee)} ETH` : "Loading..."}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Platform Share</p>
            <p>{platformShare !== undefined ? `${platformShare}%` : "Loading..."}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-black text-white"
          onClick={handleSubscribe}
          disabled={isSubscribing || txLoading || subscriptionFee === undefined}
        >
          {isSubscribing || txLoading ? "Processing..." : `Subscribe to ${actualDisplayName}`}
        </Button>
      </CardFooter>
    </Card>
  )
}