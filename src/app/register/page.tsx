"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { useAccount } from "wagmi"
import { toast, Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function RegisterPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [fee, setFee] = useState<string>("0.01")
  const [platformShare, setPlatformShare] = useState<number>(10)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    // Check if wallet is connected when component mounts
    if (!isConnected) {
      toast.warning("Wallet required", {
        description: "Please connect your wallet to register as a creator",
        duration: 5000,
      })
    }
  }, [isConnected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to complete registration",
        duration: 5000,
      })
    
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Show a loading toast
      const toastId = toast.loading("Registering as creator...", {
        duration: 10000, // Longer duration for loading state
      })
      
      // Simulate API call to register creator
      // In a real app, this would be a call to your smart contract
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Dismiss the loading toast and show success toast
      toast.dismiss(toastId)
      toast.success("Registration successful!", {
        description: "You have been registered as a creator",
        duration: 5000,
      })
      
      router.push("/dashboard/creator")
    } catch (error) {
      console.error("Error registering creator:", error)
      toast.error("Registration failed", {
        description: "There was an error during registration. Please try again.",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Toaster position="bottom-right" closeButton richColors />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl ">Register as Creator</CardTitle>
            <CardDescription>Connect your wallet to register</CardDescription>
          </CardHeader>
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
    <div className="container max-w-md mx-auto px-4 py-16">
      <Toaster position="bottom-right" closeButton richColors />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Register as Creator</CardTitle>
          <CardDescription>Set your subscription fee and platform share percentage</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fee">Subscription Fee (ETH)</Label>
              <Input
                id="fee"
                type="number"
                step="0.001"
                min="0.001"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.01"
                required
              />
              <p className="text-sm text-muted-foreground">
                This is the amount users will pay to subscribe to your content
              </p>
            </div>
            
            <div className="space-y-2">
  <div className="flex justify-between">
    <Label htmlFor="platformShare">Platform Share (%)</Label>
    <span className="text-sm font-medium">{platformShare}%</span>
  </div>
  <Slider
    id="platformShare"
    min={1}
    max={30}
    step={1}
    value={[platformShare]}
    onValueChange={(value) => setPlatformShare(value[0])}
    className="my-4 rounded-full" 
  />
  <p className="text-sm text-muted-foreground">
    Percentage of subscription fee that goes to the platform (max 30%)
  </p>
</div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-black text-white" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register as Creator"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}