"use client";

import { useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";
import type { LoanDetails } from "payce-musd-sdk";
import { formatBigInt, formatNumber, formatPercent } from "@/lib/utils";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow">
      <div className="flex items-center gap-3">
        <span dangerouslySetInnerHTML={{ __html: message }} />
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
  const [btcPrice, setBtcPrice] = useState<bigint | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [loadingRepay, setLoadingRepay] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [purseAvailable, setPurseAvailable] = useState<bigint | null>(null);
  const [purseReserved, setPurseReserved] = useState<bigint | null>(null);
  const disabled = !sdk || loading;

  const fmt2 = (v: bigint) => formatBigInt(v, 2);

  async function loadBTCPrice() {
    if (!sdk) return;
    setLoadingPrice(true);
    try {
      const price = await sdk.getCurrentBTCPrice();
      setBtcPrice(price);
    } finally {
      setLoadingPrice(false);
    }
  }

  async function loadLoan() {
    if (!sdk) return;
    setLoadingInfo(true);
    try {
      const l = await sdk.getLoanDetails();
      setLoan(l);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function loadPurseBalance() {
    if (!sdk) return;
    try {
      const status = await sdk.getUserStatus();
      setPurseAvailable(status.purse.available);
      setPurseReserved(status.purse.reserved);
    } catch (e: unknown) {
      console.error("Failed to fetch purse balance:", e);
      setPurseAvailable(null);
      setPurseReserved(null);
    }
  }

  useEffect(() => {
    loadBTCPrice();
    loadLoan();
    loadPurseBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  const btcInMusd = btc && btcPrice && !isNaN(Number(btc)) ? (parseEther(btc) * btcPrice) / parseEther("1") : null;

  // Auto-populate MUSD field when BTC amount changes
  useEffect(() => {
    if (btc && btcPrice && !isNaN(Number(btc))) {
      const calculated = (parseEther(btc) * btcPrice) / parseEther("1");
      // Use plain number format for input field (parseEther doesn't accept commas)
      const musdValue = Number(formatEther(calculated)).toFixed(2);
      setMusd(musdValue);
    } else if (!btc) {
      // Clear MUSD when BTC is cleared
      setMusd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btc, btcPrice]);

  async function onBorrow() {
    if (!sdk) return;
    setLoading(true);
    setToast("");
    try {
      // Remove commas from input before parsing (formatBigInt adds commas)
      const cleanMusd = musd ? musd.replace(/,/g, "") : "0";
      const cleanBtc = btc ? btc.replace(/,/g, "") : "0";
      const res = await sdk.openTroveAndBorrow({
        musdAmount: parseEther(cleanMusd),
        btcAmount: parseEther(cleanBtc),
        depositToPurse: true,
      });
      if (res.success) {
        setToast("Borrow successful. Funds deposited to purse.");
        setBtc("");
        setMusd("");
        await loadLoan();
      } else {
        setToast(`Borrow failed: ${res.error ?? "Unknown error"}`);
      }
    } catch (e: unknown) {
      setToast(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepayLoan() {
    if (!sdk) return;
    setToast("");
    
    // Remove commas from input before parsing (formatBigInt adds commas)
    const cleanRepayAmount = repayAmount ? repayAmount.replace(/,/g, "") : "0";
    
    // Validate repay amount
    const repayAmountBigInt = parseEther(cleanRepayAmount);
    if (repayAmountBigInt === 0n) {
      setToast("Please enter an amount to repay");
      return;
    }
    
    // Check if amount exceeds available balance
    if (purseAvailable !== null && repayAmountBigInt > purseAvailable) {
      setToast(`Repay amount exceeds available balance. Available: ${fmt2(purseAvailable)} MUSD`);
      return;
    }
    
    // Check if amount exceeds debt
    if (loan && loan.isActive && repayAmountBigInt > loan.totalDebt) {
      setToast(`Repay amount exceeds total debt. Total debt: ${fmt2(loan.totalDebt)} MUSD`);
      return;
    }
    
    setLoadingRepay(true);
    try {
      const res = await sdk.repayLoan({
        amount: repayAmountBigInt,
        fromPurse: true,
      });
      if (res.success) {
        setToast(`Repay successful. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        setRepayAmount("");
        await loadLoan();
        await loadPurseBalance();
      } else {
        setToast(`Repay failed: ${res.error ?? "Unknown error"}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("insufficient purse balance")) {
        setToast(`Insufficient available balance. Available: ${purseAvailable !== null ? fmt2(purseAvailable) : "..."} MUSD${purseReserved !== null && purseReserved > 0n ? ` (${fmt2(purseReserved)} MUSD reserved)` : ""}`);
      } else {
        setToast(`Error: ${errorMessage}`);
      }
    } finally {
      setLoadingRepay(false);
    }
  }

  function handleSetMaxRepay() {
    if (!loan || !purseAvailable) return;
    // Use the smaller of available balance or total debt
    const maxAmount = purseAvailable < loan.totalDebt ? purseAvailable : loan.totalDebt;
    // Use plain number format for input field (parseEther doesn't accept commas)
    setRepayAmount(Number(formatEther(maxAmount)).toFixed(2));
  }

  async function handleCloseTrove() {
    if (!sdk) return;
    setToast("");
    setLoadingClose(true);
    try {
      const res = await sdk.closeTrove(true); // Close using purse balance
      if (res.success) {
        setToast(`Trove closed. BTC collateral returned. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        await loadLoan();
      } else {
        setToast(`Failed to close trove: ${res.error ?? "Unknown error"}`);
      }
    } catch (e: unknown) {
      setToast(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingClose(false);
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
          {btc && !isNaN(Number(btc)) && btcInMusd && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ {formatBigInt(btcInMusd, 2)} MUSD (at current BTC price)
            </div>
          )}
        </label>
        <label className="text-sm w-full">
          <div className="text-gray-600 mb-1">MUSD to Borrow</div>
          <input className="border px-3 py-2 rounded w-full" placeholder="e.g., 5000" value={musd} onChange={e=>setMusd(e.target.value)} />
        </label>
        <button disabled={disabled} onClick={onBorrow} className="bg-black text-white px-4 py-2 rounded w-full">
          {loading ? <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Borrowing...</span> : "Borrow & Deposit to Purse"}
        </button>
      </div>

      <div className="border-t pt-6 space-y-6">
        <div className="space-y-4">
          <div className="font-semibold text-lg">Repay Loan</div>
          <p className="text-sm text-gray-600">Make partial repayments to reduce your MUSD debt. You repay using MUSD from your purse (not BTC or USDC).</p>
          <div className="text-xs text-gray-700 space-y-1">
            {loadingInfo ? (
              <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading loan details...</span>
            ) : loan && loan.isActive ? (
              <>
                <div>Your Purse Available: <span className="font-medium">{purseAvailable !== null ? fmt2(purseAvailable) : "..."} MUSD</span></div>
                {purseReserved !== null && purseReserved > 0n && (
                  <div className="text-gray-500">Reserved: <span className="font-medium">{fmt2(purseReserved)} MUSD</span></div>
                )}
                <div>Debt to Repay: <span className="font-medium">{fmt2(loan.totalDebt)} MUSD</span></div>
                {purseAvailable !== null && purseAvailable < loan.totalDebt && (
                  <div className="text-yellow-600">⚠️ Your available balance is less than the total debt. You can repay up to {fmt2(purseAvailable)} MUSD.</div>
                )}
              </>
            ) : loan && !loan.isActive ? (
              <span className="text-gray-500">No active loan to repay</span>
            ) : (
              <span className="text-gray-500">No loan data</span>
            )}
          </div>
          <div className="flex flex-col gap-3 items-stretch">
            <label className="text-sm w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600">Amount to Repay (MUSD)</span>
                {loan?.isActive && purseAvailable !== null && (
                  <button type="button" onClick={handleSetMaxRepay} className="text-xs text-blue-600 underline">
                    Max: {fmt2(purseAvailable < (loan.totalDebt || 0n) ? purseAvailable : loan.totalDebt)}
                  </button>
                )}
              </div>
              <input className="border px-3 py-2 rounded w-full" placeholder="e.g., 1000" value={repayAmount} onChange={e=>setRepayAmount(e.target.value)} />
              {repayAmount && !isNaN(Number(repayAmount)) && purseAvailable !== null && parseEther(repayAmount.replace(/,/g, "")) > purseAvailable && (
                <div className="text-xs text-red-600 mt-1">
                  Amount exceeds available balance ({fmt2(purseAvailable)} MUSD)
                </div>
              )}
            </label>
            <button disabled={disabled || loadingRepay || !loan?.isActive} onClick={handleRepayLoan} className="bg-black text-white px-4 py-2 rounded w-full">
              {loadingRepay ? <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Repaying...</span> : "Repay Loan"}
            </button>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="font-semibold text-lg">Close Trove</div>
          <p className="text-sm text-gray-600">Repay all remaining MUSD debt to close your trove and recover your BTC collateral. You repay using MUSD from your purse (not BTC or USDC).</p>
          <div className="text-xs text-gray-700">
            {loadingInfo ? (
              <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading loan details...</span>
            ) : loan && loan.isActive ? (
              <div className="space-y-1">
                <div>Total Debt to Repay: <span className="font-medium">{fmt2(loan.totalDebt)} MUSD</span></div>
                <div>BTC Collateral to Recover: <span className="font-medium">{fmt2(loan.collateral)} BTC</span></div>
                <div className="text-yellow-600">⚠️ Note: You need enough MUSD in your purse to cover the total debt (minus gas compensation). Your BTC collateral will be returned to your wallet.</div>
              </div>
            ) : loan && !loan.isActive ? (
              <span className="text-gray-500">No active trove to close</span>
            ) : (
              <span className="text-gray-500">No loan data</span>
            )}
          </div>
          <div className="flex flex-col gap-3 items-stretch">
            <button disabled={disabled || loadingClose || !loan?.isActive} onClick={handleCloseTrove} className="bg-red-600 text-white px-4 py-2 rounded w-full">
              {loadingClose ? <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Closing...</span> : "Close Trove & Recover BTC"}
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}


