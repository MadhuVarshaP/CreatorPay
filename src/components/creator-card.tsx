"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatEth } from "@/lib/utils"
import type { Creator } from "@/lib/types"

interface CreatorCardProps {
  creator: Creator
}

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [isSubscribing, setIsSubscribing] = useState(false)

  const handleSubscribe = async () => {
    setIsSubscribing(true)

    try {
      // Simulate API call to subscribe
      await new Promise((resolve) => setTimeout(resolve, 1500))
      alert(`Successfully subscribed to ${creator.name}`)
    } catch (error) {
      console.error("Error subscribing:", error)
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
            <p className="text-xl font-bold">{formatEth(creator.subscriptionFee)} ETH</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Platform Share</p>
            <p>{creator.platformShare}%</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSubscribe} disabled={isSubscribing}>
          {isSubscribing ? "Processing..." : "Subscribe"}
        </Button>
      </CardFooter>
    </Card>
  )
}
