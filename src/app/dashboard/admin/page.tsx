'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast, Toaster } from 'sonner'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract'

interface CreatorData {
  address: string
  name: string
  platformShare: number
  platformEarnings: bigint
  subscriptionFee: bigint
  creatorBalance: bigint
}

export default function AdminDashboard() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [isOwner, setIsOwner] = useState(false)
  const [platformData, setPlatformData] = useState<CreatorData[]>([])
  const [totalPlatformFees, setTotalPlatformFees] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  // Helper function to safely convert BigInt to number for percentages
  const bigIntToNumber = (value: bigint): number => {
    return Number(value)
  }

  // Calculate total platform earnings from individual creator balances
  const calculateTotalPlatformEarnings = (creators: CreatorData[]): bigint => {
    return creators.reduce((total, creator) => total + creator.platformEarnings, BigInt(0))
  }

  // Calculate average platform share
  const calculateAveragePlatformShare = (creators: CreatorData[]): number => {
    if (creators.length === 0) return 0
    const totalShare = creators.reduce((sum, creator) => sum + creator.platformShare, 0)
    return totalShare / creators.length
  }

  useEffect(() => {
    const fetchOwnerAndData = async () => {
      try {
        if (!isConnected || !address || !publicClient) {
          setLoading(false)
          return
        }

        // Check if current user is the owner
        const owner = await publicClient.readContract({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'owner',
        }) as string

        if (owner.toLowerCase() !== address.toLowerCase()) {
          setIsOwner(false)
          toast.error('Access Denied', {
            description: 'You are not authorized to access this dashboard',
          })
          setLoading(false)
          return
        }

        setIsOwner(true)

        // Fetch total platform fees from contract
        const totalFees = await publicClient.readContract({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'totalPlatformFees',
        }) as bigint

        setTotalPlatformFees(totalFees)

        // Fetch all registered creators
        const creatorAddresses = await publicClient.readContract({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'getRegisteredCreators',
        }) as string[]

        // Fetch detailed information for each creator
        const creatorDetails: CreatorData[] = []

        for (const creatorAddr of creatorAddresses) {
          try {
            const creator = await publicClient.readContract({
              abi: CONTRACT_ABI,
              address: CONTRACT_ADDRESS,
              functionName: 'creators',
              args: [creatorAddr],
            }) as [string, bigint, bigint, bigint, bigint] // [name, subscriptionFee, platformShare, creatorBalance, platformBalance]

            const [name, subscriptionFee, platformShare, creatorBalance, platformBalance] = creator

            creatorDetails.push({
              address: creatorAddr,
              name: name,
              platformShare: bigIntToNumber(platformShare),
              platformEarnings: platformBalance,
              subscriptionFee: subscriptionFee,
              creatorBalance: creatorBalance,
            })
          } catch (err) {
            console.error(`Error fetching creator ${creatorAddr}:`, err)
            // Continue with other creators even if one fails
          }
        }

        setPlatformData(creatorDetails)

      } catch (err) {
        console.error('Error fetching admin data:', err)
        toast.error('Failed to load admin data', {
          description: 'Please check your connection and try again'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOwnerAndData()
  }, [isConnected, address, publicClient])

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Wallet not connected')
      return
    }

    if (totalPlatformFees === BigInt(0)) {
      toast.error('No funds available to withdraw')
      return
    }

    const toastId = toast.loading('Processing withdrawal...')
    setWithdrawing(true)

    try {
      await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'withdrawPlatformCut',
      })

      toast.success('Withdrawal successful', {
        description: `Successfully withdrew ${formatEther(totalPlatformFees)} ETH`
      })

      // Refresh data after successful withdrawal
      setTotalPlatformFees(BigInt(0))
      // You might want to refresh all data here
      
    } catch (err: any) {
      console.error('Withdrawal error:', err)
      toast.error('Withdrawal failed', {
        description: err.shortMessage || err.message || 'Transaction failed'
      })
    } finally {
      toast.dismiss(toastId)
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <div className="animate-pulse">
          <h1 className="text-3xl font-bold mb-4">Loading Admin Dashboard...</h1>
          <p className="text-muted-foreground">Fetching contract data...</p>
        </div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="mt-4 text-muted-foreground">You are not the owner of this contract.</p>
      </div>
    )
  }

  const totalPlatformEarnings = calculateTotalPlatformEarnings(platformData)
  const averagePlatformShare = calculateAveragePlatformShare(platformData)

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="bottom-right" closeButton richColors />
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>Monitor your platform earnings and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Creators</p>
              <p className="text-2xl font-bold">{platformData.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Available to Withdraw</p>
              <p className="text-2xl font-bold">{formatEther(totalPlatformFees)} ETH</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Platform Earnings</p>
              <p className="text-2xl font-bold">{formatEther(totalPlatformEarnings)} ETH</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average Platform Share</p>
              <p className="text-2xl font-bold">{averagePlatformShare.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            <Button
              disabled={withdrawing || totalPlatformFees === BigInt(0)}
              onClick={handleWithdraw}
              className="flex-1 md:flex-none bg-black text-white text-base"
            >
              {withdrawing ? 'Processing...' : `Withdraw ${formatEther(totalPlatformFees)} ETH`}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1 md:flex-none"
            >
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creator Platform Shares</CardTitle>
          <CardDescription>Breakdown of platform earnings from each creator</CardDescription>
        </CardHeader>
        <CardContent>
          {platformData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No creators registered yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Subscription Fee</TableHead>
                  <TableHead>Platform Share</TableHead>
                  <TableHead>Platform Earnings</TableHead>
                  <TableHead>Creator Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformData.map((creator) => (
                  <TableRow key={creator.address}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{creator.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {`${creator.address.slice(0, 6)}...${creator.address.slice(-4)}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatEther(creator.subscriptionFee)} ETH</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {creator.platformShare}%
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatEther(creator.platformEarnings)} ETH
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatEther(creator.creatorBalance)} ETH
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}