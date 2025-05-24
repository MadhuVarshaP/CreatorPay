'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
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
import { formatEth } from '@/lib/utils'

export default function AdminDashboard() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [isOwner, setIsOwner] = useState(false)
  const [platformData, setPlatformData] = useState<any[]>([])
  const [totalEarnings, setTotalEarnings] = useState<number>(0)
  const [averageShare, setAverageShare] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    const fetchOwnerAndData = async () => {
      try {
        if (!isConnected || !address) return

        const owner: string = await publicClient.readContract({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'owner',
        })

        if (owner.toLowerCase() !== address.toLowerCase()) {
          setIsOwner(false)
          toast.error('Access Denied', {
            description: 'You are not authorized to access this dashboard',
          })
          setLoading(false)
          return
        }

        setIsOwner(true)

        const creatorAddresses: string[] = await publicClient.readContract({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'getRegisteredCreators',
        })

        let totalPlatform = 0
        let totalShare = 0
        const details = []

        for (const creatorAddr of creatorAddresses) {
          try {
            const creator: any = await publicClient.readContract({
              abi: CONTRACT_ABI,
              address: CONTRACT_ADDRESS,
              functionName: 'creators',
              args: [creatorAddr],
            })

            const earnings = Number(creator.platformBalance)
            const share = Number(creator.platformShare)

            totalPlatform += earnings
            totalShare += share

            details.push({
              address: creatorAddr,
              name: creator.name,
              platformShare: share,
              platformEarnings: earnings,
            })
          } catch (err) {
            console.error(`Error fetching creator ${creatorAddr}`, err)
          }
        }

        setPlatformData(details)
        setTotalEarnings(totalPlatform)
        setAverageShare(details.length ? totalShare / details.length : 0)
      } catch (err) {
        console.error('Error fetching admin data', err)
        toast.error('Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }

    fetchOwnerAndData()
  }, [isConnected, address])

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Wallet not connected')
      return
    }

    const toastId = toast.loading('Processing withdrawal...')
    setWithdrawing('true')

    try {
      await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'withdrawPlatformCut',
      })

      toast.success('Withdrawal successful')
    } catch (err: any) {
      toast.error('Withdrawal failed', {
        description: err.message || 'Something went wrong',
      })
    } finally {
      toast.dismiss(toastId)
      setWithdrawing(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold">Loading admin dashboard...</h1>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Toaster position="bottom-right" closeButton richColors />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-4">You are not the owner of this contract.</p>
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
              <p className="text-sm text-muted-foreground">Total Creators</p>
              <p className="text-2xl font-bold">{platformData.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Platform Earnings</p>
              <p className="text-2xl font-bold">{formatEth(totalEarnings)} ETH</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average Platform Share</p>
              <p className="text-2xl font-bold">{averageShare.toFixed(2)}%</p>
            </div>
          </div>
          <Button
            className="mt-6"
            disabled={withdrawing !== null}
            onClick={handleWithdraw}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw Platform Earnings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Share History</CardTitle>
          <CardDescription>On-chain share from each creator</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Platform Share</TableHead>
                <TableHead>Available to Withdraw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platformData.map((creator) => (
                <TableRow key={creator.address}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {creator.address}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{creator.platformShare}%</TableCell>
                  <TableCell>{formatEth(creator.platformEarnings)} ETH</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
