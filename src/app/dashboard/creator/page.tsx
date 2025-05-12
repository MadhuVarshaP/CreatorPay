"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { creatorDashboardData } from "@/lib/mock-data"
import { formatEth } from "@/lib/utils"

export default function CreatorDashboard() {
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const { address, subscriptionFee, platformShare, totalEarnings, subscribers } = creatorDashboardData

  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    // Simulate API call to withdraw funds
    try {
      // In a real app, this would be a call to your smart contract
      await new Promise((resolve) => setTimeout(resolve, 1500))
      alert("Withdrawal successful!")
    } catch (error) {
      console.error("Error withdrawing funds:", error)
      alert("Withdrawal failed. Please try again.")
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
            <Button onClick={handleWithdraw} disabled={isWithdrawing || totalEarnings <= 0} className="w-full">
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
