"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { creators } from "@/lib/mock-data"
import { formatEth } from "@/lib/utils"
import { useAccount } from "wagmi"
import { toast, Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function UserDashboard() {
  const { isConnected } = useAccount()
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({
    "0x1234567890123456789012345678901234567890": true,
    "0x2345678901234567890123456789012345678901": true,
  })
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet is connected when component mounts
    if (!isConnected) {
      toast.warning("Wallet required", {
        description: "Please connect your wallet to access the user dashboard",
        duration: 5000,
      })
    }
  }, [isConnected])

  const handleSubscribe = async (creatorAddress: string, isSubscribed: boolean) => {
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to manage subscriptions",
        duration: 5000,
      })

      return
    }

    setProcessing(creatorAddress)
    
    try {
      // Show a loading toast
      const toastId = toast.loading(`${isSubscribed ? "Renewing" : "Processing"} subscription...`, {
        duration: 10000, // Longer duration for loading state
      })
      
      // Simulate API call to subscribe
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Update subscriptions state
      setSubscriptions((prev) => ({
        ...prev,
        [creatorAddress]: true,
      }))
      
      // Find creator name for the toast message
      const creator = creators.find(c => c.address === creatorAddress)
      
      // Dismiss the loading toast and show success toast
      toast.dismiss(toastId)
      toast.success(`Successfully ${isSubscribed ? "renewed" : "subscribed"}!`, {
        description: `You are now subscribed to ${creator?.name || "the creator"}`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error subscribing:", error)
      toast.error("Subscription failed", {
        description: "There was an error processing your subscription. Please try again.",
        duration: 5000,
      })
    } finally {
      setProcessing(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
        <Card>
           <CardContent className="py-10 flex flex-col items-center justify-center">
                      <p className="mb-6">Please connect your wallet to access the creator dashboard</p>
                      {/* <Button onClick={() => openConnectModal?.()}>Connect Wallet</Button> */}
                      <ConnectButton />
                    </CardContent>     
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="bottom-right" closeButton richColors />
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
                    onClick={() => handleSubscribe(creator.address, isSubscribed)}
                    disabled={isProcessing}
                    className="bg-black text-white"
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