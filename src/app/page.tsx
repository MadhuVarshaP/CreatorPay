
"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import CreatorCard from "../components/creator-card"
import { publicClient } from "../lib/viem"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  const { address: userAddress, isConnected } = useAccount()
  const [creatorAddresses, setCreatorAddresses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contractVerified, setContractVerified] = useState(false)

  // First, verify the contract exists
  useEffect(() => {
    const verifyContract = async () => {
      try {
        // Check if contract exists by getting its code
        const code = await publicClient.getBytecode({ 
          address: CONTRACT_ADDRESS as `0x${string}` 
        })
        
        if (!code || code === "0x") {
          setError(`No contract found at ${CONTRACT_ADDRESS}. Make sure you're on the correct network.`)
          setContractVerified(false)
        } else {
          setContractVerified(true)
          // Try to get the owner to verify the ABI
          try {
            await publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: CONTRACT_ABI,
              functionName: "owner",
            })
          } catch (err) {
            console.warn("Could not verify owner function, but contract exists", err)
            // Continue anyway since the contract exists
          }
        }
      } catch (err) {
        console.error("Error verifying contract:", err)
        setError(`Error verifying contract. Make sure you're connected to the correct network.`)
      } finally {
        setIsLoading(false)
      }
    }

    verifyContract()
  }, [])

  // Load creators from events instead of direct contract calls
  useEffect(() => {
    const loadCreatorsFromEvents = async () => {
      if (!contractVerified) return
      
      try {
        // Try to get CreatorRegistered events
        const events = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'CreatorRegistered',
            inputs: [
              { indexed: true, name: 'creator', type: 'address' },
              { indexed: false, name: 'fee', type: 'uint256' },
              { indexed: false, name: 'platformShare', type: 'uint256' }
            ]
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })

        if (events.length > 0) {
          // Extract creator addresses from events
          const creators = events.map(event => {
            // Extract the creator address from the topics
            const creatorAddress = event.topics[1]?.substring(26) // Remove 0x000...
            return creatorAddress ? `0x${creatorAddress}` : null
          }).filter(Boolean) as string[]
          
          if (creators.length > 0) {
            setCreatorAddresses(prev => {
              const allCreators = [...prev, ...creators]
              return [...new Set(allCreators)] // Remove duplicates
            })
          }
        } else {
          console.log("No creator events found, using fallback creators")
          // Fallback to hardcoded creators for testing
          setCreatorAddresses([
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Example address
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Example address
          ])
        }
      } catch (err) {
        console.error("Error loading creators from events:", err)
        // Fallback to hardcoded creators if event loading fails
        setCreatorAddresses([
          "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Example address
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Example address
        ])
      }
    }

    loadCreatorsFromEvents()
  }, [contractVerified])

  // Alternative approach: Try to check if current user is a creator
  // This avoids using the problematic "creators" function
  useEffect(() => {
    const checkUserCreatorStatus = async () => {
      if (!userAddress || !isConnected || !contractVerified) return
      
      try {
        // Check if the user has any CreatorRegistered events
        const events = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'CreatorRegistered',
            inputs: [
              { indexed: true, name: 'creator', type: 'address' },
              { indexed: false, name: 'fee', type: 'uint256' },
              { indexed: false, name: 'platformShare', type: 'uint256' }
            ]
          },
          args: {
            creator: userAddress as `0x${string}`
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })

        if (events.length > 0 && !creatorAddresses.includes(userAddress)) {
          setCreatorAddresses(prev => [...prev, userAddress])
        }
      } catch (err) {
        console.error("Error checking user creator status:", err)
      }
    }

    checkUserCreatorStatus()
  }, [userAddress, isConnected, contractVerified, creatorAddresses])

  return (
    <section className="py-12 container mx-auto px-4">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Contract Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isConnected && (
        <section className="py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">Support your favorite creators</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Subscribe to creators you love and help them continue making amazing content with direct support through
          crypto payments.
        </p>
        <Link href="/register">
            <Button className="bg-black text-white hover:bg-gray-800">
              Register as Creator
            </Button>
          </Link>
      </section>

      )}

      <h2 className="text-3xl font-bold mb-8 text-center">Featured Creators</h2>
      
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading creators...</p>
        </div>
      ) : creatorAddresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatorAddresses.map((address) => (
            <CreatorCard
              key={address}
              creator={{ address, name: `Creator ${address.slice(2, 6)}` }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Alert className="max-w-md mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle>No creators found</AlertTitle>
            <AlertDescription>
              Be the first to register as a creator on our platform!
            </AlertDescription>
          </Alert>
        </div>
      )}
    </section>
  )
}