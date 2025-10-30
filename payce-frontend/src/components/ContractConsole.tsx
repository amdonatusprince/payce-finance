"use client";

import { useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
// import type { Address } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";
import type { LoanDetails } from "payce-musd-sdk";

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

export default function ContractConsole() {
  const { sdk } = usePayceSDK();

  const [btcAmount, setBtcAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [reserveAmount, setReserveAmount] = useState("");
  const [releaseAmount, setReleaseAmount] = useState("");
  const [status, setStatus] = useState<string>("");
  const [toast, setToast] = useState("");
  const [loadingRepay, setLoadingRepay] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loan, setLoan] = useState<LoanDetails | null>(null);

  const disabled = !sdk;

  const fmt2 = (v: bigint) => Number(formatEther(v)).toFixed(2);

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

  useEffect(() => {
    loadLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  async function handleRepay() {
    if (!sdk) return;
    setStatus("Sending repayLoan...");
    setToast("");
    setLoadingRepay(true);
    try {
      const res = await sdk.repayLoan({
        amount: parseEther(repayAmount || "0"),
        fromPurse: true,
      });
      if (res.success) {
        setToast(`Repay successful. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        setRepayAmount("");
        await loadLoan();
      }
      setStatus(res.success ? `Success: ${res.hash}` : `Failed: ${res.error}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingRepay(false);
    }
  }

  async function handleAddCollateral() {
    if (!sdk) return;
    setStatus("Sending addCollateral...");
    setToast("");
    setLoadingAdd(true);
    try {
      const res = await sdk.addCollateral({ amount: parseEther(btcAmount || "0") });
      if (res.success) {
        setToast(`Collateral added. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        setBtcAmount("");
        await loadLoan();
      }
      setStatus(res.success ? `Success: ${res.hash}` : `Failed: ${res.error}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingAdd(false);
    }
  }

  async function handleReserve() {
    if (!sdk) return;
    setStatus("Sending reserveFunds...");
    setToast("");
    setLoadingReserve(true);
    try {
      const res = await sdk.micropayments.reserveFunds(parseEther(reserveAmount || "0"));
      if (res.success) {
        setToast(`Reserved funds. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        setReserveAmount("");
        await loadLoan();
      }
      setStatus(res.success ? `Success: ${res.hash}` : `Failed: ${res.error}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingReserve(false);
    }
  }

  async function handleRelease() {
    if (!sdk) return;
    setStatus("Sending releaseReserved...");
    setToast("");
    setLoadingRelease(true);
    try {
      const res = await sdk.micropayments.releaseReserved(parseEther(releaseAmount || "0"));
      if (res.success) {
        setToast(`Released funds. <a class='underline' href='https://explorer.test.mezo.org/tx/${res.hash}' target='_blank' rel='noreferrer'>View transaction</a>`);
        setReleaseAmount("");
        await loadLoan();
      }
      setStatus(res.success ? `Success: ${res.hash}` : `Failed: ${res.error}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingRelease(false);
    }
  }

  // async function handleCreateVoucher() {
  //   if (!sdk) return;
  //   setStatus("Creating voucher...");
  //   try {
  //     const v = await sdk.micropayments.createVoucher(merchant as Address, parseEther(musdAmount || "0"), 1n, 3600);
  //     setStatus(`Voucher created (sig ${v.signature.substring(0, 10)}...)`);
  //   } catch (e: unknown) {
  //     setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
  //   }
  // }

  // reads and purse/borrow/deposit/withdraw moved to dedicated tabs

  return (
    <div className="space-y-8 py-8 max-w-2xl w-full mx-auto">
      <div className="text-sm text-gray-600">{disabled ? "Connect wallet to interact" : status}</div>

      {/* Purse moved to its own tab */}

      {/* Borrow moved to Borrow tab */}

      <section className="p-4 border rounded">
        <div className="font-semibold mb-2">Repay Loan (from purse)</div>
        <p className="text-xs text-gray-600 mb-2">Use MUSD from your purse to reduce outstanding debt.</p>
        <div className="text-xs text-gray-700 mb-3">
          {loadingInfo ? (
            <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading loan details...</span>
          ) : loan ? (
            <div className="grid grid-cols-2 gap-2">
              <div>Borrowed (Principal): <span className="font-medium">{fmt2(loan.principal)} MUSD</span></div>
              <div>Remaining (Total Debt): <span className="font-medium">{fmt2(loan.totalDebt)} MUSD</span></div>
            </div>
          ) : (
            <span className="text-gray-500">No loan data</span>
          )}
        </div>
        <div className="flex flex-col gap-3 items-stretch">
          <input className="border px-3 py-2 rounded w-full" placeholder="Amount (MUSD)" value={repayAmount} onChange={e=>setRepayAmount(e.target.value)} />
          <button disabled={disabled || loadingRepay} onClick={handleRepay} className="bg-black text-white px-3 py-2 rounded w-full">{loadingRepay ? "Repaying..." : "Repay"}</button>
        </div>
      </section>

      <section className="p-4 border rounded">
        <div className="font-semibold mb-2">Add Collateral</div>
        <p className="text-xs text-gray-600 mb-2">Increase BTC collateral to improve ICR and reduce liquidation risk.</p>
        <div className="text-xs text-gray-700 mb-3">
          {loadingInfo ? (
            <span className="inline-flex items-center"><span className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading collateral...</span>
          ) : loan ? (
            <div className="grid grid-cols-2 gap-2">
              <div>Current Collateral: <span className="font-medium">{fmt2(loan.collateral)} BTC</span></div>
              <div>ICR: <span className="font-medium">{Number(loan.icr).toFixed(2)}%</span></div>
            </div>
          ) : (
            <span className="text-gray-500">No collateral data</span>
          )}
        </div>
        <div className="flex flex-col gap-3 items-stretch">
          <input className="border px-3 py-2 rounded w-full" placeholder="BTC amount" value={btcAmount} onChange={e=>setBtcAmount(e.target.value)} />
          <button disabled={disabled || loadingAdd} onClick={handleAddCollateral} className="bg-black text-white px-3 py-2 rounded w-full">{loadingAdd ? "Adding..." : "Add"}</button>
        </div>
      </section>

      <section className="p-4 border rounded">
        <div className="font-semibold mb-2">Reserve / Release Funds</div>
        <p className="text-xs text-gray-600 mb-2">Reserve funds for vouchers or release them back to your available purse balance.</p>
        <div className="flex flex-col gap-3 items-stretch">
          <input className="border px-3 py-2 rounded w-full" placeholder="Reserve MUSD" value={reserveAmount} onChange={e=>setReserveAmount(e.target.value)} />
          <button disabled={disabled || loadingReserve} onClick={handleReserve} className="bg-black text-white px-3 py-2 rounded w-full">{loadingReserve ? "Reserving..." : "Reserve"}</button>
          <input className="border px-3 py-2 rounded w-full" placeholder="Release MUSD" value={releaseAmount} onChange={e=>setReleaseAmount(e.target.value)} />
          <button disabled={disabled || loadingRelease} onClick={handleRelease} className="bg-black text-white px-3 py-2 rounded w-full">{loadingRelease ? "Releasing..." : "Release"}</button>
        </div>
      </section>

      {/* Deposit/Withdraw split into Purse & Withdraw tabs */}

      {/* Read panels moved to Status tab */}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}


