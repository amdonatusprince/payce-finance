"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow">
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-xs underline">Dismiss</button>
      </div>
    </div>
  );
}

export default function WithdrawPanel() {
  const { sdk } = usePayceSDK();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [purseAvailable, setPurseAvailable] = useState<string>("");
  const [loadingPurse, setLoadingPurse] = useState(false);
  const disabled = !sdk || loading;
  
  async function refreshPurseAvailable() {
    if (!sdk) return;
    setLoadingPurse(true);
    try {
      const status = await sdk.getUserStatus();
      setPurseAvailable(Number(formatEther(status.purse.available)).toFixed(2));
    } finally {
      setLoadingPurse(false);
    }
  }

  useEffect(() => {
    refreshPurseAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  async function onWithdraw() {
    if (!sdk) return;
    setLoading(true);
    setToast("");
    try {
      const res = await sdk.micropayments.withdrawUser(parseEther(amount || "0"));
      setToast(res.success ? "Withdraw successful." : `Withdraw failed: ${res.error ?? "Unknown error"}`);
      if (res.success) {
        setAmount("");
      }
      if (res.success) await refreshPurseAvailable();
    } catch (e: unknown) {
      setToast(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 md:p-10 border rounded space-y-6 max-w-2xl w-full mx-auto">
      <div className="font-semibold text-lg">Withdraw from Purse</div>
      <p className="text-sm text-gray-600">Move MUSD from your purse back to your wallet to use outside Payce or transfer.</p>

      <div className="text-sm text-gray-700">
        <span className="font-medium">Purse Available: </span>
        {loadingPurse ? (
          <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading...</span>
        ) : (
          <span>{purseAvailable || "0.00"} MUSD</span>
        )}
      </div>

      <div className="flex flex-col gap-3 items-stretch">
        <label className="text-sm w-full">
          <div className="text-gray-600 mb-1">Amount (MUSD)</div>
          <input className="border px-3 py-2 rounded w-full" placeholder="e.g., 100" value={amount} onChange={e=>setAmount(e.target.value)} />
        </label>
        <button disabled={disabled} onClick={onWithdraw} className="bg-black text-white px-4 py-2 rounded w-full">
          {loading ? <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Withdrawing...</span> : "Withdraw"}
        </button>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}


