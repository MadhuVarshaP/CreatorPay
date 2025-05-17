"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { creators } from "@/lib/mock-data"
import { formatEth } from "@/lib/utils"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function AdminDashboard() {
  const { isConnected } = useAccount()
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet is connected when component mounts
    if (!isConnected) {
      toast.warning("Wallet required", {
        description: "Please connect your wallet to access the admin dashboard",
        duration: 5000,
      })
    }
  }, [isConnected])

  // Calculate platform earnings for each creator (mock data)
  const creatorEarnings = creators.map((creator) => {
    const platformShare = creator.platformShare
    const totalEarnings = Math.random() * 2 // Random earnings between 0 and 2 ETH
    const platformEarnings = totalEarnings * (platformShare / 100)

    return {
      ...creator,
      totalEarnings,
      platformEarnings,
    }
  })

  const totalPlatformEarnings = creatorEarnings.reduce((sum, creator) => sum + creator.platformEarnings, 0)

  const handleWithdraw = async (creatorAddress: string) => {
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to withdraw funds",
        duration: 5000,
      })
      
      return
    }

    setWithdrawing(creatorAddress)

    try {
      // Show a loading toast
      const toastId = toast.loading("Processing withdrawal...", {
        duration: 10000, // Longer duration for loading state
      })

      // Simulate API call to withdraw funds
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const creator = creators.find((c) => c.address === creatorAddress)
      
      // Dismiss the loading toast and show success toast
      toast.dismiss(toastId)
      toast.success("Withdrawal successful", {
        description: `Platform share from ${creator?.name || "the creator"} has been withdrawn`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error withdrawing funds:", error)
      toast.error("Withdrawal failed", {
        description: "There was an error processing your withdrawal",
        duration: 5000,
      })
    } finally {
      setWithdrawing(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
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

      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>Monitor your platform earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Total Creators</p>
              <p className="text-2xl font-bold">{creators.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Total Platform Earnings</p>
              <p className="text-2xl font-bold">{formatEth(totalPlatformEarnings)} ETH</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Average Platform Share</p>
              <p className="text-2xl font-bold">
                {(creators.reduce((sum, c) => sum + c.platformShare, 0) / creators.length).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creator Earnings</CardTitle>
          <CardDescription>Platform share from each creator</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Platform Share</TableHead>
                <TableHead>Available to Withdraw</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatorEarnings.map((creator) => (
                <TableRow key={creator.address}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{creator.address}</p>
                    </div>
                  </TableCell>
                  <TableCell>{creator.platformShare}%</TableCell>
                  <TableCell>{formatEth(creator.platformEarnings)} ETH</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdraw(creator.address)}
                      disabled={withdrawing === creator.address || creator.platformEarnings <= 0}
                    >
                      {withdrawing === creator.address ? "Processing..." : "Withdraw"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}