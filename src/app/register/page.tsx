
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { useAccount, useChainId, usePublicClient } from "wagmi"
import { toast, Toaster } from "sonner"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { parseEther } from "viem"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  
  const [fee, setFee] = useState<string>("0.01")
  const [platformShare, setPlatformShare] = useState<number>(10)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [contractExists, setContractExists] = useState<boolean | null>(null)
  const [contractError, setContractError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const { writeContractAsync, data: hash, error: writeError } = useWriteContract()
  const { isLoading: txLoading, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: () => {
      toast.success("Successfully registered as creator!")
      setTimeout(() => router.push("/dashboard/creator"), 2000)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: { message: any }) => {
      toast.error("Transaction failed", {
        description: error?.message || "There was an error processing your transaction",
      })
    }
  })

  // Verify contract exists and has the expected functions
  useEffect(() => {
    const verifyContract = async () => {
      if (!isConnected || !publicClient) return
      
      try {
        setContractError(null)
        
        // Check if contract exists by getting its code
        const code = await publicClient.getBytecode({ address: CONTRACT_ADDRESS as `0x${string}` })
        
        if (!code || code === "0x") {
          setContractExists(false)
          setContractError(`No contract found at ${CONTRACT_ADDRESS} on network ID ${chainId}`)
          return
        }
        
        setContractExists(true)
        
        // Try to call a view function to verify ABI matches
        try {
          // Get contract owner as a simple test
          const owner = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "owner",
          })
          
          setDebugInfo({ contractOwner: owner })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          console.error("Error calling contract view function:", err)
          setContractError(`Contract exists but ABI may not match. Error: ${err.message}`)
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error verifying contract:", err)
        setContractError(`Error verifying contract: ${err.message}`)
      }
    }
    
    verifyContract()
  }, [isConnected, chainId, publicClient])

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
    
    if (contractError || contractExists === false) {
      toast.error("Contract issue", {
        description: contractError || "Contract not found on this network",
        duration: 5000,
      })
      return
    }
  
    setIsSubmitting(true)
  
    try {
      const toastId = toast.loading("Registering on-chain...")
      
      const feeInWei = parseEther(fee)
      console.log("Debug - Registration params:", {
        address: CONTRACT_ADDRESS,
        fee: feeInWei.toString(),
        platformShare: platformShare
      })
  
      await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "registerCreator",
        args: [feeInWei, BigInt(platformShare)],
      })
  
      toast.dismiss(toastId)
      // Success toast will be shown by the transaction receipt hook
    } catch (err: any) {
      console.error("Error registering creator:", err)
      toast.error("Registration failed", {
        description: err.message || "There was an error during registration. Please try again.",
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
            <ConnectButton />
          </CardContent>     
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Toaster position="bottom-right" closeButton richColors />
      
      {contractError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Contract Error</AlertTitle>
          <AlertDescription>{contractError}</AlertDescription>
        </Alert>
      )}
      
      {writeError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transaction Error</AlertTitle>
          <AlertDescription>{writeError.message}</AlertDescription>
        </Alert>
      )}
      
      {isSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            You've successfully registered as a creator. Redirecting to dashboard...
          </AlertDescription>
        </Alert>
      )}
      
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
            
            {/* <div className="text-xs text-muted-foreground">
              <p>Network ID: {chainId}</p>
              <p>Contract: {CONTRACT_ADDRESS}</p>
              <p>Wallet: {address}</p>
            </div> */}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-black text-white" 
              disabled={isSubmitting || txLoading || contractExists === false}
            >
              {isSubmitting || txLoading ? "Processing..." : "Register as Creator"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
