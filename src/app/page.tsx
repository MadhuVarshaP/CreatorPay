"use client"

import { useEffect, useState } from "react"
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

interface CreatorRegisteredArgs {
  creator: string
  name: string
  fee: bigint
  platformShare: bigint
}

function deduplicateCreators(creators: Creator[]): Creator[] {
  const seen = new Set<string>()
  return creators.filter(c => {
    const lower = c.address.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })
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
    const useFallbackCreators = () => {
      const fallback = [
        { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Demo Creator 1" },
        { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", name: "Demo Creator 2" },
      ]
      setCreators(deduplicateCreators(fallback))
      setUsingFallbackCreators(true)
    }

    const loadCreatorsFromEvents = async () => {
      if (!contractVerified) return

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
              { indexed: false, name: "platformShare", type: "uint256" }
            ]
          },
          fromBlock: "earliest",
          toBlock: "latest"
        })

        const parsed = await Promise.all(events.map(async (event) => {
          try {
            const creatorAddress = event.topics[1] ? `0x${event.topics[1].slice(26)}` : null
            if (!creatorAddress) return null

            const decoded = decodeEventLog({
              abi: CONTRACT_ABI,
              data: event.data,
              topics: event.topics,
            })

            if (!decoded.args || !Array.isArray(decoded.args)) {
              return null
            }

            const args = decoded.args as unknown as CreatorRegisteredArgs
            const name = args.name || `Creator ${creatorAddress.slice(2, 6)}`
            return { address: creatorAddress, name }
          } catch {
            return null
          }
        }))

        const valid = parsed.filter(Boolean) as Creator[]

        if (valid.length > 0) {
          setCreators(deduplicateCreators(valid))
          setUsingFallbackCreators(false)
        } else {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useFallbackCreators()
        }
      } catch (err) {
        console.error("Error loading creators:", err)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useFallbackCreators()
      }
    }

    loadCreatorsFromEvents()
  }, [contractVerified])

  useEffect(() => {
    const getRegisteredCreators = async () => {
      if (!contractVerified || !usingFallbackCreators) return

      try {
        const addresses = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "getRegisteredCreators",
        }) as string[]

        if (addresses.length > 0) {
          const creatorsData = await Promise.all(addresses.map(async (addr) => {
            try {
              const name = await publicClient.readContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI,
                functionName: "getCreatorName",
                args: [addr as `0x${string}`],
              }) as string

              return { address: addr, name: name || `Creator ${addr.slice(2, 6)}` }
            } catch {
              return { address: addr, name: `Creator ${addr.slice(2, 6)}` }
            }
          }))

          setCreators(deduplicateCreators(creatorsData))
          setUsingFallbackCreators(false)
        }
      } catch (err) {
        console.warn("Failed to load creators by readContract:", err)
      }
    }

    getRegisteredCreators()
  }, [contractVerified, usingFallbackCreators])

  useEffect(() => {
    const checkIfUserIsCreator = async () => {
      if (!userAddress || !isConnected || !contractVerified) return

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
            ]
          },
          args: {
            creator: userAddress as `0x${string}`
          },
          fromBlock: "earliest",
          toBlock: "latest"
        })

        if (events.length > 0) {
          const decoded = decodeEventLog({
            abi: CONTRACT_ABI,
            data: events[events.length - 1].data,
            topics: events[events.length - 1].topics,
          })

          if (!decoded.args || !Array.isArray(decoded.args)) {
            return
          }

          const args = decoded.args as unknown as CreatorRegisteredArgs
          const name = args.name || `Creator ${userAddress.slice(2, 6)}`
          setCreators(prev => deduplicateCreators([...prev, { address: userAddress, name }]))
        }
      } catch (err) {
        console.error("Error checking if user is creator:", err)
      }
    }

    checkIfUserIsCreator()
  }, [userAddress, isConnected, contractVerified])

  return (
    <section className="py-12 container mx-auto px-4">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Contract Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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

      {isConnected && (
        <>
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
                <CreatorCard key={creator.address.toLowerCase()} creator={creator} />
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
        </>
      )}
    </section>
  )
}
