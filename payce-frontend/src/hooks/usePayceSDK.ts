"use client";

import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import { PayceMUSDSDK } from "payce-musd-sdk";
import type { WalletClient } from "viem";

export function usePayceSDK() {
  const { data: walletClient } = useWalletClient();
  const [sdk, setSdk] = useState<PayceMUSDSDK | null>(null);

  useEffect(() => {
    if (!walletClient) {
      setSdk(null);
      return;
    }
    try {
      const instance = PayceMUSDSDK.forMezoTestnetWithWallet(walletClient as unknown as WalletClient);
      setSdk(instance);
    } catch {
      setSdk(null);
    }
  }, [walletClient]);

  return { sdk };
}


