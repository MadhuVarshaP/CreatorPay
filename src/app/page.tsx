import Link from "next/link"
import { Button } from "@/components/ui/button"
import CreatorCard from "../components/creator-card"
import { creators } from "@/lib/mock-data"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">Support your favorite creators</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Subscribe to creators you love and help them continue making amazing content with direct support through
          crypto payments.
        </p>
        <Link href="/register">
          <Button size="lg" className="font-semibold">
            Register as Creator
          </Button>
        </Link>
      </section>

      {/* Creators Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Featured Creators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <CreatorCard key={creator.address} creator={creator} />
          ))}
        </div>
      </section>
    </main>
  )
}
