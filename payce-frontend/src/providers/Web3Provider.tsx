"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
// import { getConfig } from "@mezo-org/passport";
import { mezoTestnet } from "@mezo-org/chains";
import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// const config = getConfig({ appName: "Payce Finance" });
const config = getDefaultConfig({
  appName: "Payce Finance",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [mezoTestnet],
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={mezoTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

