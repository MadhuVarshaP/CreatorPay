"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { creators } from "@/lib/mock-data"
import { formatEth } from "@/lib/utils"

export default function UserDashboard() {
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({
    "0x1234567890123456789012345678901234567890": true,
    "0x2345678901234567890123456789012345678901": true,
  })
  const [processing, setProcessing] = useState<string | null>(null)

  const handleSubscribe = async (creatorAddress: string) => {
    setProcessing(creatorAddress)

    try {
      // Simulate API call to subscribe
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSubscriptions((prev) => ({
        ...prev,
        [creatorAddress]: true,
      }))
    } catch (error) {
      console.error("Error subscribing:", error)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>Manage your creator subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creators.map((creator) => {
              const isSubscribed = subscriptions[creator.address] || false
              const isProcessing = processing === creator.address

              return (
                <div key={creator.address} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{creator.name}</p>
                      {isSubscribed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Subscribed ✅
                        </Badge>
                      )}
                      {!isSubscribed && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Not Subscribed ❌
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{creator.address}</p>
                    <p className="text-sm mt-1">{formatEth(creator.subscriptionFee)} ETH per month</p>
                    {isSubscribed && (
                      <p className="text-sm text-muted-foreground">
                        Expires in {Math.floor(Math.random() * 30) + 1} days
                      </p>
                    )}
                  </div>
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={() => handleSubscribe(creator.address)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : isSubscribed ? "Renew" : "Subscribe"}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
