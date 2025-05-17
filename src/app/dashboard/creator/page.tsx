"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { creatorDashboardData } from "@/lib/mock-data"
import { formatEth } from "@/lib/utils"
import { useAccount } from "wagmi"
import { toast, Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function CreatorDashboard() {
  const { isConnected } = useAccount()
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const { address, subscriptionFee, platformShare, totalEarnings, subscribers } = creatorDashboardData

  useEffect(() => {
    // Check if wallet is connected when component mounts
    if (!isConnected) {
      toast.warning("Wallet required", {
        description: "Please connect your wallet to access the creator dashboard",
        duration: 5000,
      })
    }
  }, [isConnected])

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to withdraw funds",
        duration: 5000,
      })
   
      return
    }

    setIsWithdrawing(true)
    
    try {
      // Show a loading toast
      const toastId = toast.loading("Processing withdrawal...", {
        duration: 10000, // Longer duration for loading state
      })
      
      // Simulate API call to withdraw funds
      // In a real app, this would be a call to your smart contract
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Dismiss the loading toast and show success toast
      toast.dismiss(toastId)
      toast.success("Withdrawal successful!", {
        description: `${formatEth(totalEarnings)} ETH has been withdrawn to your wallet`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error withdrawing funds:", error)
      toast.error("Withdrawal failed", {
        description: "There was an error processing your withdrawal. Please try again.",
        duration: 5000,
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold mb-6">Creator Dashboard</h1>
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
      <h1 className="text-3xl font-bold mb-8">Creator Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Creator Info</CardTitle>
            <CardDescription>Your creator account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="font-mono text-sm">{address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subscription Fee</p>
              <p>{formatEth(subscriptionFee)} ETH</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform Share</p>
              <p>{platformShare}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
            <CardDescription>Your current earnings and withdrawal options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Earnings Available</p>
              <p className="text-3xl font-bold">{formatEth(totalEarnings)} ETH</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
              <p className="text-xl font-semibold">{subscribers}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleWithdraw} disabled={isWithdrawing || totalEarnings <= 0} className="w-full bg-black text-white">
              {isWithdrawing ? "Processing..." : "Withdraw Earnings"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriber Activity</CardTitle>
          <CardDescription>Recent subscription activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div>
                  <p className="font-mono text-sm">0x8f3...{i}e9a</p>
                  <p className="text-sm text-muted-foreground">
                    Subscribed {i} day{i > 1 ? "s" : ""} ago
                  </p>
                </div>
                <p className="font-medium">{formatEth(subscriptionFee)} ETH</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}