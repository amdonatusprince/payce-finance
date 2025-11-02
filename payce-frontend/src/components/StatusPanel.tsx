"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";
import type { LoanDetails, UserBalances } from "payce-musd-sdk";
import { formatBigInt, formatPercent, formatNumber } from "@/lib/utils";

export default function StatusPanel() {
  const { sdk } = usePayceSDK();
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [purse, setPurse] = useState<UserBalances | null>(null);
  const [risk, setRisk] = useState<{ atRisk: boolean; currentICR: bigint } | null>(null);
  const [helpers, setHelpers] = useState<{ minBorrow: bigint; fee: bigint; price: bigint; interest: bigint; icr: bigint } | null>(null);
  const [feeInput] = useState("1000");
  const [loading, setLoading] = useState(false);

  const fmt2 = (v: bigint) => formatBigInt(v, 2);

  async function refresh() {
    if (!sdk) return;
    setLoading(true);
    try {
      const [l, status] = await Promise.all([
        sdk.getLoanDetails(),
        sdk.getUserStatus(),
      ]);
      setLoan(l);
      setPurse(status.purse);
      setRisk(status.liquidationRisk);
    } finally {
      setLoading(false);
    }
  }

  async function readHelpers() {
    if (!sdk) return;
    setLoading(true);
    try {
      const [minBorrow, fee, price, interest, icr] = await Promise.all([
        sdk.getMinimumBorrowAmount(),
        sdk.calculateBorrowingFee(parseEther(feeInput || "1000")),
        sdk.getCurrentBTCPrice(),
        sdk.getCurrentInterest(),
        sdk.getCollateralizationRatioPercent(),
      ]);
      setHelpers({ minBorrow, fee, price, interest, icr });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    readHelpers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  return (
    <div className="p-8 md:p-10 border rounded space-y-8 max-w-4xl w-full mx-auto">
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500">Current loan, purse, and risk auto-refresh when you open this tab.</div>
        {loading && <span className="inline-flex items-center text-xs text-gray-600"><span className="w-3 h-3 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>Loading...</span>}
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <div className="p-3 border rounded">
          <div className="font-semibold mb-2">Loan</div>
          {loan ? (
            <div className="space-y-1">
              <div>Principal: {fmt2(loan.principal)} MUSD</div>
              <div>Interest: {fmt2(loan.interest)} MUSD</div>
              <div>Total Debt: {fmt2(loan.totalDebt)} MUSD</div>
              <div>Collateral: {fmt2(loan.collateral)} BTC</div>
              {/* <div>ICR: {Number(loan.icr).toFixed(2)}%</div> */}
              <div>Rate: {formatNumber(loan.interestRate / 100, 2)}%</div>
              <div>Active: {loan.isActive ? "Yes" : "No"}</div>
            </div>
          ) : (
            <div className="text-gray-500">No data yet</div>
          )}
        </div>

        <div className="p-3 border rounded">
          <div className="font-semibold mb-2">Purse</div>
          {purse ? (
            <div className="space-y-1">
              <div>Total: {formatBigInt(purse.total, 2)} MUSD</div>
              <div>Reserved: {formatBigInt(purse.reserved, 2)} MUSD</div>
              <div>Available: {formatBigInt(purse.available, 2)} MUSD</div>
            </div>
          ) : (
            <div className="text-gray-500">No data yet</div>
          )}
        </div>

        <div className="p-3 border rounded">
          <div className="font-semibold mb-2">Risk</div>
          {risk ? (
            <div className="space-y-1">
              <div>At Risk: {risk.atRisk ? "Yes" : "No"}</div>
              <div>Current ICR: {formatPercent(risk.currentICR, 2)}%</div>
            </div>
          ) : (
            <div className="text-gray-500">No data yet</div>
          )}
        </div>
      </div>

      <div className="p-3 border rounded text-sm">
        <div className="font-semibold mb-2">Helper Values</div>
        {helpers ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4">Min Borrow</td>
                  <td className="py-2">{fmt2(helpers.minBorrow)} MUSD</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Borrow Fee (for {feeInput} MUSD)</td>
                  <td className="py-2">{fmt2(helpers.fee)} MUSD</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">BTC Price</td>
                  <td className="py-2">{fmt2(helpers.price)} USD</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Current Interest</td>
                  <td className="py-2">{fmt2(helpers.interest)} MUSD</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">ICR%</td>
                  <td className="py-2">{formatPercent(helpers.icr, 2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">Loading...</div>
        )}
      </div>
    </div>
  );
}


