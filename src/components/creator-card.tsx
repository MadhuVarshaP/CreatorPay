"use client"

import React, { useState } from "react"
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { formatEth } from "@/lib/utils"
import type { Creator } from "@/lib/types"

interface CreatorCardProps {
  creator: Pick<Creator, "address" | "name">
}

// Return type of the Creator struct
type CreatorStruct = readonly [bigint, bigint, bigint, bigint]

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle>{creator.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Creator Address</p>
            <p className="font-mono text-sm truncate">{creator.address}</p>
          </div>

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

          {/* <div>
            <p className="text-sm font-medium text-muted-foreground">Creator Balance</p>
            <p>{creatorBalance !== undefined ? `${formatEth(creatorBalance)} ETH` : "Loading..."}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Platform Balance</p>
            <p>{platformBalance !== undefined ? `${formatEth(platformBalance)} ETH` : "Loading..."}</p>
          </div> */}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-black text-white"
          onClick={handleSubscribe}
          disabled={isSubscribing || txLoading || subscriptionFee === undefined}
        >
          {isSubscribing || txLoading ? "Processing..." : "Subscribe"}
        </Button>
      </CardFooter>
    </Card>
  )
}
