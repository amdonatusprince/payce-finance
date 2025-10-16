import React, { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent } from "./ui/card"
import { default as ProtectedButton } from "@/components/protected-button"

const StakeInterface = () => {
  const [amount, setAmount] = useState("")
  const [duration, setDuration] = useState<"1" | "2" | "3" | "4">("1")

  // Calculate estimated APY based on duration
  const getEstimatedAPY = (years: string) => {
    const baseAPY = 15
    const boost = Number(years) / 4 // Full boost at 4 years
    return baseAPY * (1 + boost)
  }

  // Calculate voting power based on amount and duration
  const getVotingPower = (btcAmount: string, years: string) => {
    if (!btcAmount) return "0"
    const multiplier = Number(years) / 4 // Full power at 4 years
    return (Number(btcAmount) * multiplier).toFixed(2)
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      {/* Simple explanation */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold">Stake BTC for veBTC</h2>
            <p className="text-gray-500">
              Lock your BTC to receive veBTC and earn protocol rewards. The
              longer you lock, the more voting power you receive.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main staking form */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Amount input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Amount to Lock</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <span className="text-gray-500">BTC</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              You will receive: {getVotingPower(amount, duration)} veBTC
            </div>
          </div>

          {/* Duration selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Lock Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "1", label: "1 Year" },
                { value: "2", label: "2 Years" },
                { value: "3", label: "3 Years" },
                { value: "4", label: "4 Years" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={duration === option.value ? "default" : "outline"}
                  onClick={() =>
                    setDuration(option.value as "1" | "2" | "3" | "4")
                  }
                  className="w-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              Estimated APY: {getEstimatedAPY(duration).toFixed(1)}%
            </div>
          </div>

          {/* Benefits display */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium">You will receive:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Voting power in Tigris governance
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Protocol fee sharing
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Boosted rewards in pools
              </li>
            </ul>
          </div>

          {/* Action button */}
          <ProtectedButton className="w-full">
            Lock BTC for {duration} Year{duration !== "1" ? "s" : ""}
          </ProtectedButton>

          {/* Advanced link */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                /* Navigate to Lock tab */
              }}
            >
              Advanced options →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StakeInterface
