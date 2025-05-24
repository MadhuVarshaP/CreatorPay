// app/providers.tsx
'use client'

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  polygonAmoy,
  arbitrumSepolia
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';
import { ReactNode } from 'react';

const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: '8e000855fac35d6427f4c731b6089f97D', 
  chains: [mainnet, polygon, optimism, arbitrum, base, polygonAmoy, arbitrumSepolia],
  ssr: true, 
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}