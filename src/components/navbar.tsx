"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-xl">
          CreatorSub
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive("/") ? "text-primary" : "text-muted-foreground",
            )}
          >
            Home
          </Link>
          <Link
            href="/register"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive("/register") ? "text-primary" : "text-muted-foreground",
            )}
          >
            Register
          </Link>
          <Link
            href="/dashboard/creator"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive("/dashboard/creator") ? "text-primary" : "text-muted-foreground",
            )}
          >
            Creator Dashboard
          </Link>
          <Link
            href="/dashboard/user"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive("/dashboard/user") ? "text-primary" : "text-muted-foreground",
            )}
          >
            User Dashboard
          </Link>
          <Link
            href="/dashboard/admin"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive("/dashboard/admin") ? "text-primary" : "text-muted-foreground",
            )}
          >
            Admin
          </Link>
        </nav>

        <Button variant="outline" size="sm">
          Connect Wallet
        </Button>
      </div>
    </header>
  )
}
