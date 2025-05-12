"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

export default function RegisterPage() {
  const router = useRouter()
  const [fee, setFee] = useState<string>("0.01")
  const [platformShare, setPlatformShare] = useState<number>(10)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call to register creator
    try {
      // In a real app, this would be a call to your smart contract
      await new Promise((resolve) => setTimeout(resolve, 1500))
      router.push("/dashboard/creator")
    } catch (error) {
      console.error("Error registering creator:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
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
              />
              <p className="text-sm text-muted-foreground">
                Percentage of subscription fee that goes to the platform (max 30%)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register as Creator"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
