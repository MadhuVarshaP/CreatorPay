
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

// Define a type for creator data
interface Creator {
  address: string
  name: string
}

export default function HomePage() {
  const { address: userAddress, isConnected } = useAccount()
  const [creators, setCreators] = useState<Creator[]>([])
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

  // Load creators from events and fetch their names
  useEffect(() => {
    const loadCreatorsWithNames = async () => {
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
          const creatorAddresses = events.map(event => {
            // Extract the creator address from the topics
            const creatorAddress = event.topics[1]?.substring(26) // Remove 0x000...
            return creatorAddress ? `0x${creatorAddress}` : null
          }).filter(Boolean) as string[]
          
          if (creatorAddresses.length > 0) {
            // For each creator address, try to fetch their name
            const creatorsWithNames = await Promise.all(
              creatorAddresses.map(async (address) => {
                try {
                  // Look for CreatorNameUpdated events for this address
                  const nameEvents = await publicClient.getLogs({
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    event: {
                      type: 'event',
                      name: 'CreatorNameUpdated',
                      inputs: [
                        { indexed: true, name: 'creator', type: 'address' },
                        { indexed: false, name: 'name', type: 'string' }
                      ]
                    },
                    args: {
                      creator: address as `0x${string}`
                    },
                    fromBlock: 'earliest',
                    toBlock: 'latest'
                  })
                  
                  // If we found name events, use the most recent one
                  if (nameEvents.length > 0) {
                    const latestEvent = nameEvents[nameEvents.length - 1]
                    // Parse the name from the event data
                    const nameData = latestEvent.data
                    
                    // Decode the event data to get the name
                    const decodedName = await publicClient.decodeEventLog({
                      abi: CONTRACT_ABI,
                      data: nameData,
                      topics: latestEvent.topics,
                    })
                    
                    return {
                      address,
                      name: decodedName.args.name || `Creator ${address.slice(2, 6)}`
                    }
                  }
                  
                  // If no name events, try to call a getCreatorName function if it exists
                  try {
                    const creatorName = await publicClient.readContract({
                      address: CONTRACT_ADDRESS as `0x${string}`,
                      abi: CONTRACT_ABI,
                      functionName: "getCreatorName",
                      args: [address as `0x${string}`]
                    })
                    
                    if (creatorName && typeof creatorName === 'string') {
                      return {
                        address,
                        name: creatorName
                      }
                    }
                  } catch (err) {
                    console.warn(`No getCreatorName function available for ${address}:`, err)
                  }
                  
                  // Fallback to address-based name
                  return { 
                    address, 
                    name: `Creator ${address.slice(2, 6)}` 
                  }
                } catch (err) {
                  console.warn(`Error fetching name for creator ${address}:`, err)
                  return { 
                    address, 
                    name: `Creator ${address.slice(2, 6)}` 
                  }
                }
              })
            )
            
            setCreators(prev => {
              // Combine with existing creators and remove duplicates
              const allCreators = [...prev, ...creatorsWithNames]
              const uniqueCreators = allCreators.filter((creator, index, self) => 
                index === self.findIndex(c => c.address === creator.address)
              )
              return uniqueCreators
            })
          }
        } else {
          console.log("No creator events found, using fallback creators")
          // Fallback to hardcoded creators for testing
          setCreators([
            { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Demo Creator 1" },
            { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", name: "Demo Creator 2" },
          ])
        }
      } catch (err) {
        console.error("Error loading creators from events:", err)
        // Fallback to hardcoded creators if event loading fails
        setCreators([
          { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Demo Creator 1" },
          { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", name: "Demo Creator 2" },
        ])
      }
    }

    loadCreatorsWithNames()
  }, [contractVerified])

  // Alternative approach: Try to check if current user is a creator
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

        if (events.length > 0 && !creators.some(c => c.address === userAddress)) {
          // Try to get the user's name
          try {
            // Look for CreatorNameUpdated events for this address
            const nameEvents = await publicClient.getLogs({
              address: CONTRACT_ADDRESS as `0x${string}`,
              event: {
                type: 'event',
                name: 'CreatorNameUpdated',
                inputs: [
                  { indexed: true, name: 'creator', type: 'address' },
                  { indexed: false, name: 'name', type: 'string' }
                ]
              },
              args: {
                creator: userAddress as `0x${string}`
              },
              fromBlock: 'earliest',
              toBlock: 'latest'
            })
            
            let creatorName = `Creator ${userAddress.slice(2, 6)}`
            
            // If we found name events, use the most recent one
            if (nameEvents.length > 0) {
              const latestEvent = nameEvents[nameEvents.length - 1]
              // Decode the event data to get the name
              const decodedName = await publicClient.decodeEventLog({
                abi: CONTRACT_ABI,
                data: latestEvent.data,
                topics: latestEvent.topics,
              })
              
              if (decodedName.args.name) {
                creatorName = decodedName.args.name
              }
            } else {
              // Try to call a getCreatorName function if it exists
              try {
                const name = await publicClient.readContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "getCreatorName",
                  args: [userAddress as `0x${string}`]
                })
                
                if (name && typeof name === 'string') {
                  creatorName = name
                }
              } catch (err) {
                console.warn(`No getCreatorName function available for ${userAddress}:`, err)
              }
            }
            
            setCreators(prev => [...prev, { address: userAddress, name: creatorName }])
          } catch (err) {
            console.warn("Error getting creator name:", err)
            setCreators(prev => [...prev, { address: userAddress, name: `Creator ${userAddress.slice(2, 6)}` }])
          }
        }
      } catch (err) {
        console.error("Error checking user creator status:", err)
      }
    }

    checkUserCreatorStatus()
  }, [userAddress, isConnected, contractVerified, creators])

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
      ) : creators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <CreatorCard
              key={creator.address}
              creator={creator}
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
