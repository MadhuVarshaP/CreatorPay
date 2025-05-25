"use client"

import { useEffect, useState } from "react"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Toaster, toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatEth } from "@/lib/utils"
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract"

interface CreatorData {
  address: string
  name: string
  fee: bigint
  platformShare: bigint
  expiry: number
}

interface CreatorStruct {
  0: string
  1: bigint
  2: bigint
}

export default function UserDashboard() {
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [registeredCreators, setRegisteredCreators] = useState<string[]>([])
  const [creatorData, setCreatorData] = useState<CreatorData[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!isConnected) {
      toast.warning("Wallet required", {
        description: "Please connect your wallet to access the user dashboard",
        duration: 5000,
      })
    }
  }, [isConnected])

  const fetchCreatorDetails = async () => {
    if (!isConnected || !address || !publicClient) return

    try {
      const addresses = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getRegisteredCreators",
      })

      setRegisteredCreators(addresses as string[])

      const details = await Promise.all(
        (addresses as string[]).map(async (creatorAddress) => {
          const [creatorStruct, expiry] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "creators",
              args: [creatorAddress],
            }) as Promise<CreatorStruct>,
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "subscriptions",
              args: [address, creatorAddress],
            }) as Promise<bigint>,
          ])

          return {
            address: creatorAddress,
            name: creatorStruct[0],
            fee: creatorStruct[1],
            platformShare: creatorStruct[2],
            expiry: Number(expiry),
          }
        })
      )

      setCreatorData(details)
    } catch (err) {
      console.error("Error fetching creator details:", err)
      toast.error("Failed to fetch creator data")
    }
  }

  useEffect(() => {
    fetchCreatorDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, publicClient])

  const handleSubscribe = async (creatorAddress: string, isSubscribed: boolean, fee: bigint) => {
    if (!isConnected || !walletClient || !address || !publicClient) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to manage subscriptions",
      })
      return
    }

    setProcessing(creatorAddress)

    try {
      const toastId = toast.loading(`${isSubscribed ? "Renewing" : "Subscribing"}...`)

      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "subscribe",
        args: [creatorAddress],
        value: fee,
        account: address,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      toast.dismiss(toastId)
      toast.success("Subscription successful!")

      await fetchCreatorDetails()
    } catch (err) {
      console.error("Subscription failed:", err)
      toast.error("Transaction failed")
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
            {creatorData.map((creator) => {
              const isSubscribed = creator.expiry > Date.now() / 1000
              const isProcessing = processing === creator.address
              const daysLeft = Math.max(
                0,
                Math.floor((creator.expiry - Date.now() / 1000) / 86400)
              )

              return (
                <div
                  key={creator.address}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{creator.name}</p>
                      {isSubscribed ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Subscribed ✅
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Not Subscribed ❌
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{creator.address}</p>
                    <p className="text-sm mt-1">{formatEth(creator.fee)} ETH / month</p>
                    {isSubscribed && (
                      <p className="text-sm text-muted-foreground">Renews in {daysLeft} days</p>
                    )}
                  </div>
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={() => handleSubscribe(creator.address, isSubscribed, creator.fee)}
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