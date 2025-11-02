"use client";

import { useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
import { usePayceSDK } from "@/hooks/usePayceSDK";
import type { Address } from "viem";
import { formatBigInt, formatNumber } from "@/lib/utils";

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

interface PaymentOption {
  id: string;
  title: string;
  description: string;
  amount: string;
  icon: string;
  merchantAddress: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: "game",
    title: "In-Game Purchase",
    description: "Unlock Premium Skin - Mythic Legendary",
    amount: "25.00",
    icon: "🎮",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
  {
    id: "creator",
    title: "Creator Tip",
    description: "Support @CryptoArtist - Exclusive Content",
    amount: "10.00",
    icon: "🎨",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
  {
    id: "commerce",
    title: "Social Commerce",
    description: "Buy Digital Product - NFT Art Collection",
    amount: "50.00",
    icon: "🛒",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
  {
    id: "subscription",
    title: "Micro-Subscription",
    description: "Premium Feature - Pro Access (1 month)",
    amount: "5.00",
    icon: "⭐",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
  {
    id: "article",
    title: "Pay-Per-Article",
    description: "Premium Article - Bitcoin Technical Analysis",
    amount: "2.50",
    icon: "📰",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
  {
    id: "service",
    title: "Cloud Computing",
    description: "Pay-per-minute - GPU Rendering Service",
    amount: "15.00",
    icon: "☁️",
    merchantAddress: "0x30bd8513116211cf62f599c3556107341a56a975",
  },
];

export default function PayPanel() {
  const { sdk } = usePayceSDK();
  const [purseAvailable, setPurseAvailable] = useState<bigint | null>(null);
  const [loadingPurse, setLoadingPurse] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [voucherNonce, setVoucherNonce] = useState(1);

  const fmt2 = (v: bigint) => formatBigInt(v, 2);

  async function loadPurseBalance() {
    if (!sdk) return;
    setLoadingPurse(true);
    try {
      const status = await sdk.getUserStatus();
      setPurseAvailable(status.purse.available);
    } catch (e: unknown) {
      console.error("Failed to fetch purse balance:", e);
      setPurseAvailable(null);
    } finally {
      setLoadingPurse(false);
    }
  }

  useEffect(() => {
    loadPurseBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  async function handlePayment(option: PaymentOption) {
    if (!sdk) {
      setToast("Please connect your wallet");
      return;
    }

    const amount = parseEther(option.amount);
    
    // Validate available balance
    if (purseAvailable !== null && amount > purseAvailable) {
      setToast(`Insufficient balance. Available: ${fmt2(purseAvailable)} MUSD`);
      return;
    }

    setProcessing(option.id);
    setToast("");

    try {
      // Step 1: Reserve funds for the voucher
      const reserveResult = await sdk.micropayments.reserveFunds(amount);
      if (!reserveResult.success) {
        setToast(`Failed to reserve funds: ${reserveResult.error ?? "Unknown error"}`);
        setProcessing(null);
        return;
      }

      // Step 2: Create and sign voucher
      const voucherResult = await sdk.micropayments.createVoucher(
        option.merchantAddress as Address,
        amount,
        BigInt(voucherNonce),
        3600 // 1 hour expiry
      );

      // Step 3: Voucher created and ready for merchant redemption
      // In production, the merchant would call redeemVoucher() to receive the payment
      // The voucher is now reserved and signed - merchant can redeem anytime before expiry
      
      setToast(
        `✅ Payment voucher created for ${option.title}!<br/>` +
        `💰 ${option.amount} MUSD reserved and voucher signed.<br/>` +
        `📝 Voucher ready for merchant redemption.<br/>` +
        `🔗 <a class='underline' href='https://explorer.test.mezo.org/tx/${reserveResult.hash}' target='_blank' rel='noreferrer'>View transaction</a><br/>`
      );

      // Update nonce for next payment
      setVoucherNonce(voucherNonce + 1);
      
      // Refresh balance (funds are now reserved)
      await loadPurseBalance();

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("insufficient")) {
        setToast(`Insufficient available balance. Available: ${purseAvailable !== null ? fmt2(purseAvailable) : "..."} MUSD`);
      } else {
        setToast(`Payment failed: ${errorMessage}`);
      }
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="p-8 md:p-10 border rounded space-y-6 max-w-4xl w-full mx-auto">
      <div className="space-y-1">
        <div className="font-semibold text-lg">Pay with Payce Purse</div>
        <p className="text-sm text-gray-600">
          Use your MUSD from your Payce purse to pay for anything - no need to swap or offramp your BTC.
          Your BTC stays as collateral while you spend MUSD instantly.
        </p>
        <div className="text-xs text-gray-500 mt-2">
          💡 <strong>How it works:</strong> Reserve funds → Create signed voucher → Merchant redeems → Payment complete
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 font-semibold">Your Purse Balance</span>
          {loadingPurse && (
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          )}
        </div>
        <div className="text-2xl font-bold text-blue-700">
          {purseAvailable !== null ? `${formatBigInt(purseAvailable, 2)} MUSD` : "..."}
        </div>
        {purseAvailable !== null && purseAvailable === 0n && (
          <div className="text-xs text-blue-600 mt-2">
            💡 Borrow MUSD against your BTC to fill your purse, then use it to pay!
          </div>
        )}
        {purseAvailable !== null && purseAvailable > 0n && (
          <div className="text-xs text-gray-600 mt-2">
            💰 Available for payments. You can pay for items directly from this balance.
          </div>
        )}
      </div>

      {purseAvailable !== null && purseAvailable === 0n && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="flex-1">
              <div className="font-semibold text-yellow-800 mb-1">Insufficient Balance</div>
              <div className="text-sm text-yellow-700">
                Your purse is empty. To make payments, you need MUSD in your purse.
              </div>
              <div className="text-xs text-yellow-600 mt-2">
                <strong>To get started:</strong> Go to the <strong>Borrow</strong> tab and borrow MUSD against your BTC. 
                The borrowed MUSD will be deposited directly to your purse and ready for payments.
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="font-semibold mb-4">Choose a Payment</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentOptions.map((option) => {
            const isProcessing = processing === option.id;
            const amount = parseEther(option.amount);
            const canPay = purseAvailable !== null && amount <= purseAvailable;

            return (
              <div
                key={option.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div>
                      <div className="font-semibold">{option.title}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{option.amount} MUSD</div>
                    {!canPay && purseAvailable !== null && (
                      <div className="text-xs text-red-600 font-medium">Insufficient Balance</div>
                    )}
                  </div>
                </div>
                {!canPay && purseAvailable !== null && (
                  <div className="text-xs text-red-600 mb-2 px-2 py-1 bg-red-50 rounded">
                    Need {formatBigInt(amount - purseAvailable, 2)} more MUSD
                  </div>
                )}
                <button
                  onClick={() => handlePayment(option)}
                  disabled={!sdk || isProcessing || !canPay}
                  className="w-full bg-black text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="inline-flex items-center">
                      <span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </span>
                  ) : (
                    `Pay ${option.amount} MUSD`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 border rounded p-4 text-xs text-gray-600">
        <div className="font-semibold mb-2">📋 How Payce Payments Work:</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>You reserve MUSD from your purse for the payment amount</li>
          <li>A signed voucher is created (EIP-712) authorizing the payment</li>
          <li>The merchant redeems the voucher to receive the MUSD</li>
          <li>Payment is complete - no gas fees for you after reservation!</li>
        </ol>
        <div className="mt-3 text-yellow-600">
          ⚠️ <strong>Demo Note:</strong> In this demo, vouchers are automatically redeemed. In production, only the merchant can redeem vouchers you create.
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

