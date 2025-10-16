import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { default as ProtectedButton } from "@/components/protected-button"

const SimpleBorrowInterface = () => {
  const [btcAmount, setBtcAmount] = useState("")
  const [musdAmount, setMusdAmount] = useState("")

  // Example user stats
  const userCollateral = 0.5 // BTC
  const userDebt = 7800 // mUSD

  // Constants
  const interestRate = 4.3
  const maxLTV = 0.78
  const btcPrice = 20000 // Mock price

  const maxBorrow = Number(btcAmount) * btcPrice * maxLTV

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      {/* User's current position */}
      {(userCollateral > 0 || userDebt > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Your Collateral</div>
                <div className="text-xl font-medium">{userCollateral} BTC</div>
                <div className="text-sm text-gray-500">
                  ${(userCollateral * btcPrice).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Your Debt</div>
                <div className="text-xl font-medium">
                  ${userDebt.toLocaleString()} mUSD
                </div>
                <div className="text-sm text-gray-500">{interestRate}% APR</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Borrow form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Borrow mUSD</h2>
              <p className="text-gray-500">
                Deposit BTC as collateral to borrow mUSD stablecoins
              </p>
            </div>

            {/* Rate info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500">Interest Rate</div>
                <div className="text-lg font-medium">{interestRate}%</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500">Max LTV</div>
                <div className="text-lg font-medium">{maxLTV * 100}%</div>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Deposit BTC
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    placeholder="0.0"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <span className="text-gray-500">BTC</span>
                  </div>
                </div>
                {btcAmount && (
                  <div className="text-sm text-gray-500 mt-1">
                    ≈ ${(Number(btcAmount) * btcPrice).toLocaleString()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Borrow mUSD
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={musdAmount}
                    onChange={(e) => setMusdAmount(e.target.value)}
                    placeholder="0.0"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <span className="text-gray-500">mUSD</span>
                  </div>
                </div>
                {btcAmount && (
                  <div className="text-sm text-gray-500 mt-1">
                    Max available: ${maxBorrow.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Action button */}
            <ProtectedButton className="w-full">Borrow mUSD</ProtectedButton>

            {/* Link to advanced */}
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  /* Navigate to advanced borrow tab */
                }}
              >
                View advanced options →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick explanation */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-medium">How it works:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Deposit BTC as collateral
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Borrow up to 78% of your collateral value in mUSD
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Pay {interestRate}% APR on borrowed amount
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Repay anytime to get your BTC back
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SimpleBorrowInterface
