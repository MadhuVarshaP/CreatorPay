"use client"

import React from "react"
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
import { parseEther, formatEther } from "viem"
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from "wagmi"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info, User } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()

  const [fee, setFee] = useState<string>("0.01")
  const [platformShare, setPlatformShare] = useState<number>(10)
  const [creatorName, setCreatorName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [contractExists, setContractExists] = useState<boolean | null>(null)
  const [contractError, setContractError] = useState<string | null>(null)
  const [detailedError, setDetailedError] = useState<string | null>(null)
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState<boolean>(false)

  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "registerCreator",
    args: fee && creatorName.trim() ? [creatorName.trim(), parseEther(fee), BigInt(platformShare)] : undefined,
    query: {
      enabled: isConnected && !!fee && !!creatorName.trim() && contractExists === true && !isAlreadyRegistered,
    },
  })

  const { writeContractAsync, data: hash, error: writeError } = useWriteContract()
  const { isLoading: txLoading, isSuccess, error: txError } = useWaitForTransactionReceipt({ 
    hash,
  })

  const handleRegistrationSuccess = async () => {
    if (!address) return

    const trimmedName = creatorName.trim()

    toast.success("Registration Successful!", {
      description: `Welcome ${trimmedName}! Your creator profile has been set up.`,
      duration: 4000,
    })

    setTimeout(() => {
      router.push("/dashboard/creator")
    }, 2000)
  }

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      handleRegistrationSuccess()
    }
  }, [isSuccess, hash, address])

  // Handle transaction error
  useEffect(() => {
    if (txError) {
      toast.error("Transaction failed", {
        description: txError?.message || "There was an error processing your transaction",
      })
    }
  }, [txError])

  useEffect(() => {
    const checkRegistration = async () => {
      if (!isConnected || !publicClient || !address) return

      try {
        const creatorData = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "creators",
          args: [address],
        }) as [string, bigint, bigint, bigint, bigint]

        const isRegistered = Boolean(creatorData[0] && creatorData[0].length > 0)
        setIsAlreadyRegistered(isRegistered)

        if (isRegistered) {
          toast.warning("Already registered", {
            description: `You are already registered as creator "${creatorData[0]}"`,
            duration: 5000,
          })
        }
      } catch (err) {
        console.error("Error checking registration status:", err)
        setIsAlreadyRegistered(false)
      }
    }

    checkRegistration()
  }, [isConnected, publicClient, address])

  useEffect(() => {
    const verifyContract = async () => {
      if (!isConnected || !publicClient) return

      try {
        setContractError(null)

        const code = await publicClient.getBytecode({ address: CONTRACT_ADDRESS as `0x${string}` })

        if (!code || code === "0x") {
          setContractExists(false)
          setContractError(`No contract found at ${CONTRACT_ADDRESS} on network ID ${chainId}`)
          return
        }

        setContractExists(true)

        try {
          const owner = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "owner",
          })

          const subscriptionDuration = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "subscriptionDuration",
          })

          const totalPlatformFees = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "totalPlatformFees",
          })

          // Debug info for development
          console.log({
            contractOwner: owner,
            subscriptionDuration: Number(subscriptionDuration),
            totalPlatformFees: formatEther(totalPlatformFees as bigint),
            chainId,
            userAddress: address
          })

        } catch (err) {
          console.error("Error calling contract view function:", err)
          setContractError(`Contract exists but may not be compatible. Error: ${(err as Error).message}`)
        }
      } catch (err) {
        console.error("Error verifying contract:", err)
        setContractError(`Error verifying contract: ${(err as Error).message}`)
        setContractExists(false)
      }
    }

    verifyContract()
  }, [isConnected, chainId, publicClient, address])

  useEffect(() => {
    const estimateGas = async () => {
      if (!isConnected || !publicClient || !fee || !creatorName.trim() || contractExists !== true || isAlreadyRegistered || !address) return

      try {
        const gas = await publicClient.estimateContractGas({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "registerCreator",
          args: [creatorName.trim(), parseEther(fee), BigInt(platformShare)],
          account: address as `0x${string}`,
        })

        setGasEstimate(gas)
      } catch (err) {
        console.error("Gas estimation failed:", err)
      }
    }

    estimateGas()
  }, [isConnected, publicClient, fee, platformShare, creatorName, contractExists, address, isAlreadyRegistered])

  useEffect(() => {
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
      })
      return
    }

    if (isAlreadyRegistered) {
      toast.error("Already registered", {
        description: "You are already registered as a creator",
      })
      return
    }

    if (contractError || contractExists === false) {
      toast.error("Contract issue", {
        description: contractError || "Contract not found on this network",
      })
      return
    }

    const trimmedName = creatorName.trim()
    if (!trimmedName) {
      toast.error("Creator name required", {
        description: "Please enter a creator name to continue",
      })
      return
    }

    if (trimmedName.length < 2) {
      toast.error("Name too short", {
        description: "Creator name must be at least 2 characters long",
      })
      return
    }

    if (simulateError) {
      toast.error("Transaction would fail", {
        description: `Simulation failed: ${simulateError.message}`,
        duration: 8000,
      })
      return
    }

    setIsSubmitting(true)
    setDetailedError(null)

    try {
      const toastId = toast.loading(`Registering ${trimmedName} as creator...`)

      const feeInWei = parseEther(fee)

      let txHash: `0x${string}`

      if (simulateData?.request) {
        // Use the simulated request if available
        txHash = await writeContractAsync(simulateData.request)
      } else {
        // Fallback to manual contract write
        txHash = await writeContractAsync({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "registerCreator",
          args: [trimmedName, feeInWei, BigInt(platformShare)],
          ...(gasEstimate && { gas: gasEstimate + (gasEstimate / 10n) }),
        })
      }
      
      toast.success("Transaction submitted", {
        description: (
          <span>
            View on{" "}
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              Arbiscan
            </a>
          </span>
        ),
        duration: 7000,
      })

      toast.dismiss(toastId)

    } catch (err) {
      console.error("Registration failed:", err)

      let errorMsg = "Registration failed. "

      const error = err as Error & { 
        cause?: { reason?: string }
        shortMessage?: string
        message?: string
      }

      if (error.cause?.reason) {
        errorMsg += error.cause.reason
      } else if (error.shortMessage) {
        errorMsg += error.shortMessage
      } else if (error.message) {
        errorMsg += error.message
      }

      if (errorMsg.toLowerCase().includes("already registered")) {
        errorMsg = "You are already registered as a creator."
        setIsAlreadyRegistered(true)
      } else if (errorMsg.toLowerCase().includes("user rejected")) {
        setIsSubmitting(false)
        return
      }

      setDetailedError(errorMsg)
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 8000,
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
            <CardTitle className="text-2xl">Register as Creator</CardTitle>
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

      {isAlreadyRegistered && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Already Registered</AlertTitle>
          <AlertDescription>You are already registered as a creator on this network.</AlertDescription>
        </Alert>
      )}

      {simulateError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transaction Simulation Failed</AlertTitle>
          <AlertDescription>{simulateError.message}</AlertDescription>
        </Alert>
      )}
      
      {(writeError || detailedError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transaction Error</AlertTitle>
          <AlertDescription>{detailedError || writeError?.message}</AlertDescription>
        </Alert>
      )}
      
      {isSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            Registration successful! Your creator profile has been set up. Redirecting...
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6" />
            Register as Creator
          </CardTitle>
          <CardDescription>
            Create your creator profile with a custom name and subscription settings
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="creator" className="text-base font-medium">
                Creator Name *
              </Label>
              <Input 
                type="text" 
                id="creator" 
                placeholder="Enter your creator name (e.g., John Doe, Artist123, etc.)" 
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required 
                minLength={2}
                maxLength={50}
                className="text-lg"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>This name will be displayed to subscribers</span>
                <span>{creatorName.length}/50</span>
              </div>
              {creatorName.trim() && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Preview: Your profile will show as &quot;<strong>{creatorName.trim()}</strong>&quot;
                  </p>
                </div>
              )}
            </div>
            
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
                Amount users will pay to subscribe to your content
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
                max={100}
                step={1}
                value={[platformShare]}
                onValueChange={(value) => setPlatformShare(value[0])}
                className="my-4 rounded-full" 
              />
              <p className="text-sm text-muted-foreground">
                Platform fee percentage (you keep {100 - platformShare}%)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-black text-white text-base my-3" 
              disabled={
                isSubmitting || 
                txLoading || 
                contractExists === false || 
                isAlreadyRegistered ||
                !!simulateError ||
                !creatorName.trim() ||
                creatorName.trim().length < 2
              }
            >
              {isSubmitting || txLoading ? (
                <>Processing Registration...</>
              ) : isAlreadyRegistered ? (
                "Already Registered"
              ) : simulateError ? (
                "Transaction Would Fail"
              ) : !creatorName.trim() ? (
                "Enter Creator Name"
              ) : (
                `Register as "${creatorName.trim()}"`
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}