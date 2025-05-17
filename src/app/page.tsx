'use client'

import { useAccount } from 'wagmi';
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CreatorCard from "../components/creator-card"
import { creators } from "@/lib/mock-data"

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">Support your favorite creators</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Subscribe to creators you love and help them continue making amazing content with direct support through
          crypto payments.
        </p>
        
        <div className="flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="font-semibold bg-black text-white">
              Register as Creator
            </Button>
          </Link>
          
          {isConnected && (
            <Button size="lg" variant="outline" className="font-semibold">
              My Subscriptions
            </Button>
          )}
        </div>
      </section>

    

      {/* Creators Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Featured Creators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <CreatorCard 
              key={creator.address} 
              creator={creator} 
              isConnected={isConnected}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

// 'use client'

// import { useAccount, useReadContract, useWriteContract } from 'wagmi';
// import CustomConnectButton from '../components/ConnectButton';
// import { useState } from 'react';

// export default function Home() {
//   const { address, isConnected } = useAccount();
//   const [amount, setAmount] = useState('');

//   // Example: Read from a contract
//   const { data: balance } = useReadContract({
//     address: '0x...', // Your contract address
//     abi: [], // Your contract ABI
//     functionName: 'balanceOf',
//     args: [address],
//   });

//   // Example: Write to a contract
//   const { writeContract } = useWriteContract();

//   const handleMint = () => {
//     writeContract({
//       address: '0x...', // Your contract address
//       abi: [], // Your contract ABI
//       functionName: 'mint',
//       args: [amount],
//     });
//   };

//   return (
//     <main className="min-h-screen p-8">
//       <CustomConnectButton />
      
//       <div className="mt-8 max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
//         <h1 className="text-2xl font-bold mb-4">Wallet Connection</h1>
        
//         {isConnected ? (
//           <div className="space-y-4">
//             <p className="text-gray-700">
//               Connected to: <span className="font-mono break-all">{address}</span>
//             </p>
            
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-gray-700">
//                 Amount to mint
//               </label>
//               <input
//                 type="text"
//                 value={amount}
//                 onChange={(e) => setAmount(e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md"
//               />
//               <button
//                 onClick={handleMint}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//               >
//                 Mint Tokens
//               </button>
//             </div>
//           </div>
//         ) : (
//           <p className="text-gray-700">Please connect your wallet to continue</p>
//         )}
//       </div>
//     </main>
//   );
// }