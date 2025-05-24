"use client"

import { useEffect, useState, useRef } from "react"
import { useAccount } from "wagmi"
import CreatorCard from "../components/creator-card"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { publicClient, decodeEventLog } from "@/lib/viem"

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
  const [usingFallbackCreators, setUsingFallbackCreators] = useState(false)

  useEffect(() => {
    const verifyContract = async () => {
      try {
        const code = await publicClient.getBytecode({
          address: CONTRACT_ADDRESS as `0x${string}`
        })

        if (!code || code === "0x") {
          setError(`No contract found at ${CONTRACT_ADDRESS}. Make sure you're on the correct network.`)
          setContractVerified(false)
        } else {
          setContractVerified(true)
          try {
            await publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: CONTRACT_ABI,
              functionName: "owner",
            })
          } catch (err) {
            console.warn("Could not verify owner function, but contract exists", err)
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

  useEffect(() => {
    const loadCreatorsWithNames = async () => {
      if (!contractVerified) return

      try {
        const events = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'CreatorRegistered',
            inputs: [
              { indexed: true, name: 'creator', type: 'address' },
              { indexed: false, name: 'name', type: 'string' },
              { indexed: false, name: 'fee', type: 'uint256' },
              { indexed: false, name: 'platformShare', type: 'uint256' }
            ]
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        })

        if (events.length > 0) {
          const creatorsList = await Promise.all(events.map(async (event) => {
            try {
              const creatorAddress = event.topics[1] ?
                `0x${event.topics[1].slice(26)}` :
                null

              if (!creatorAddress) return null

              const decodedData = decodeEventLog({
                abi: CONTRACT_ABI,
                data: event.data,
                topics: event.topics,
              })

              const name = decodedData.args.name || `Creator ${creatorAddress.slice(2, 6)}`

              return {
                address: creatorAddress,
                name
              }
            } catch (err) {
              console.error("Error processing creator event:", err)
              return null
            }
          }))

          const validCreators = creatorsList.filter(Boolean) as Creator[]

          if (validCreators.length > 0) {
            setCreators(validCreators)
            setUsingFallbackCreators(false)
          } else {
            useFallbackCreators()
          }
        } else {
          useFallbackCreators()
        }
      } catch (err) {
        console.error("Error loading creators from events:", err)
        useFallbackCreators()
      }
    }

    const useFallbackCreators = () => {
      setCreators([
        { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Demo Creator 1" },
        { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", name: "Demo Creator 2" },
      ])
      setUsingFallbackCreators(true)
    }

    loadCreatorsWithNames()
  }, [contractVerified])

  const creatorsRef = useRef<Creator[]>(creators);

useEffect(() => {
  creatorsRef.current = creators;
}, [creators]);

useEffect(() => {
  const checkUserCreatorStatus = async () => {
    if (!userAddress || !isConnected || !contractVerified) return;

    try {
      const events = await publicClient.getLogs({
        address: CONTRACT_ADDRESS as `0x${string}`,
        event: {
          type: "event",
          name: "CreatorRegistered",
          inputs: [
            { indexed: true, name: "creator", type: "address" },
            { indexed: false, name: "name", type: "string" },
            { indexed: false, name: "fee", type: "uint256" },
            { indexed: false, name: "platformShare", type: "uint256" },
          ],
        },
        args: {
          creator: userAddress as `0x${string}`,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      });

      if (
        events.length > 0 &&
        !creatorsRef.current.some(
          (c) => c.address.toLowerCase() === userAddress.toLowerCase()
        )
      ) {
        const decodedData = decodeEventLog({
          abi: CONTRACT_ABI,
          data: events[events.length - 1].data,
          topics: events[events.length - 1].topics,
        });

        const name = decodedData.args.name || `Creator ${userAddress.slice(2, 6)}`;

        setCreators((prev) => [...prev, { address: userAddress, name }]);
      }
    } catch (err) {
      console.error("Error checking user creator status:", err);
    }
  };

  checkUserCreatorStatus();
}, [userAddress, isConnected, contractVerified]);


  useEffect(() => {
    const getRegisteredCreators = async () => {
      if (!contractVerified || !usingFallbackCreators) return

      try {
        const registeredAddresses = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "getRegisteredCreators",
        }) as string[]

        if (registeredAddresses && registeredAddresses.length > 0) {
          const creatorsData = await Promise.all(registeredAddresses.map(async (address) => {
            try {
              const name = await publicClient.readContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI,
                functionName: "getCreatorName",
                args: [address as `0x${string}`]
              }) as string

              return {
                address,
                name: name || `Creator ${address.slice(2, 6)}`
              }
            } catch (err) {
              return {
                address,
                name: `Creator ${address.slice(2, 6)}`
              }
            }
          }))

          setCreators(creatorsData)
          setUsingFallbackCreators(false)
        }
      } catch (err) {
        console.warn("Failed to get registered creators via function call:", err)
      }
    }

    getRegisteredCreators()
  }, [contractVerified, usingFallbackCreators])

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
          {usingFallbackCreators && (
            <Alert className="col-span-full mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Demo Mode</AlertTitle>
              <AlertDescription>
                Showing demo creators. No registered creators were found on the blockchain.
              </AlertDescription>
            </Alert>
          )}
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
