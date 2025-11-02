"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, formatEther, formatUnits, parseEther, http } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";
import type { UserBalances } from "payce-musd-sdk";
import { useWalletClient, useAccount } from "wagmi";
import { formatBigInt, formatNumber } from "@/lib/utils";

export default function PursePanel() {
  const { sdk } = usePayceSDK();
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [purse, setPurse] = useState<UserBalances | null>(null);
  const [walletMusd, setWalletMusd] = useState<string>("");
  const [loadingWallet, setLoadingWallet] = useState(false);
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const ERC20_ABI = useMemo(
    () => [
      { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
      { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "decimals", type: "uint8" }] },
    ] as const,
    []
  );

  async function refresh() {
    if (!sdk) return;
    setLoading(true);
    setError(null);
    try {
      const status = await sdk.getUserStatus();
      setPurse(status.purse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshWallet() {
    if (!sdk || !address) return;
    setLoadingWallet(true);
    try {
      const { musdToken } = sdk.getContractAddresses();
      const rpc = sdk.getNetworkInfo().rpcUrl;
      const publicClient = createPublicClient({ transport: http(rpc) });
      const [decimals, raw] = await Promise.all([
        publicClient.readContract({ address: musdToken, abi: ERC20_ABI, functionName: "decimals" }),
        publicClient.readContract({ address: musdToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }),
      ]);
      const formatted = formatUnits(raw as bigint, Number(decimals as number));
      setWalletMusd(formatNumber(formatted, 2));
    } finally {
      setLoadingWallet(false);
    }
  }

  useEffect(() => {
    refresh();
    refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, address]);

  async function onWithdraw() {
    if (!sdk) return;
    setWithdrawing(true);
    setError(null);
    try {
      const res = await sdk.micropayments.withdrawUser(parseEther(withdrawAmount || "0"));
      if (!res.success) setError(res.error || "Withdraw failed");
      await refresh();
      await refreshWallet();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWithdrawing(false);
    }
  }

  async function onDeposit() {
    if (!sdk) return;
    setDepositing(true);
    setError(null);
    try {
      const res = await sdk.micropayments.deposit(parseEther(depositAmount || "0"));
      if (!res.success) setError(res.error || "Deposit failed");
      await refresh();
      await refreshWallet();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div className="p-8 md:p-10 border rounded space-y-6 max-w-2xl w-full mx-auto">
      <div className="font-semibold">Your Purse</div>
      {loading && (
        <div className="flex justify-center py-4"><span className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span></div>
      )}
      <div className="text-sm text-gray-700">
        <span className="font-medium">Wallet MUSD Balance: </span>
        {loadingWallet ? (
          <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading...</span>
        ) : (
          <span>{walletMusd || "0.00"} MUSD</span>
        )}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {purse && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Total</div>
            <div className="font-medium">{formatBigInt(purse.total, 2)} MUSD</div>
          </div>
          <div>
            <div className="text-gray-500">Reserved</div>
            <div className="font-medium">{formatBigInt(purse.reserved, 2)} MUSD</div>
          </div>
          <div>
            <div className="text-gray-500">Available</div>
            <div className="font-medium">{formatBigInt(purse.available, 2)} MUSD</div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 items-stretch">
        <input className="border px-3 py-2 rounded w-full" placeholder="Withdraw amount" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} />
        <button onClick={onWithdraw} disabled={!sdk || loading || depositing || withdrawing} className="bg-black text-white px-3 py-2 rounded w-full">{withdrawing ? "Withdrawing..." : "Withdraw"}</button>
        <input className="border px-3 py-2 rounded w-full" placeholder="Deposit amount" value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} />
        <button onClick={onDeposit} disabled={!sdk || loading || withdrawing || depositing} className="bg-black text-white px-3 py-2 rounded w-full">{depositing ? "Depositing..." : "Deposit"}</button>
        <button onClick={refresh} disabled={!sdk || loading || withdrawing || depositing} className="border px-3 py-2 rounded w-full">{loading ? "Refreshing..." : "Refresh"}</button>
      </div>
      <div className="text-xs text-gray-500">Note: Deposit may require MUSD approval; borrowing with deposit-to-purse fills the purse without approval.</div>
    </div>
  );
}


