"use client";

import { useState } from "react";
import { parseEther } from "viem";
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

export default function BorrowPanel() {
  const { sdk } = usePayceSDK();
  const [btc, setBtc] = useState("");
  const [musd, setMusd] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const disabled = !sdk || loading;

  async function onBorrow() {
    if (!sdk) return;
    setLoading(true);
    setToast("");
    try {
      const res = await sdk.openTroveAndBorrow({
        musdAmount: parseEther(musd || "0"),
        btcAmount: parseEther(btc || "0"),
        depositToPurse: true,
      });
      setToast(res.success ? "Borrow successful. Funds deposited to purse." : `Borrow failed: ${res.error ?? "Unknown error"}`);
    } catch (e: unknown) {
      setToast(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 md:p-10 border rounded space-y-6 max-w-2xl w-full mx-auto">
      <div className="space-y-1">
        <div className="font-semibold text-lg">Borrow MUSD against BTC</div>
        <p className="text-sm text-gray-600">Open a trove by locking BTC as collateral and borrow MUSD directly to your purse for spending.</p>
        <ul className="text-xs text-gray-500 list-disc ml-5">
          <li>Your BTC stays as collateral; you keep upside exposure.</li>
          <li>With &quot;Deposit to purse&quot; enabled, borrowed MUSD is instantly available for payments.</li>
          <li>Minimum borrow and fees can be viewed in the Status tab.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 items-stretch">
        <label className="text-sm w-full">
          <div className="text-gray-600 mb-1">BTC Collateral</div>
          <input className="border px-3 py-2 rounded w-full" placeholder="e.g., 0.10" value={btc} onChange={e=>setBtc(e.target.value)} />
        </label>
        <label className="text-sm w-full">
          <div className="text-gray-600 mb-1">MUSD to Borrow</div>
          <input className="border px-3 py-2 rounded w-full" placeholder="e.g., 5000" value={musd} onChange={e=>setMusd(e.target.value)} />
        </label>
        <button disabled={disabled} onClick={onBorrow} className="bg-black text-white px-4 py-2 rounded w-full">
          {loading ? <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Borrowing...</span> : "Borrow & Deposit to Purse"}
        </button>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}


