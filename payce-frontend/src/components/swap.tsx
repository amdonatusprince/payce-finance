import React, { useState } from "react"
import { Cog, ArrowDown } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent } from "./ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { default as ProtectedButton } from "./protected-button"
import { TokenOption } from "./labels"
import { Token } from "@/types"

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0]

const SwapSettings = ({
  slippage,
  setSlippage,
}: {
  slippage: number
  setSlippage: (value: number) => void
}) => {
  const [customSlippage, setCustomSlippage] = useState("")

  const handleCustomSlippage = (value: string) => {
    setCustomSlippage(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
      setSlippage(numValue)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Slippage Tolerance
        </label>
        <div className="flex gap-2 mb-2">
          {SLIPPAGE_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={slippage === preset ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                setSlippage(preset)
                setCustomSlippage("")
              }}
            >
              {preset}%
            </Button>
          ))}
        </div>
        <div className="relative">
          <Input
            type="number"
            placeholder="Custom"
            value={customSlippage}
            onChange={(e) => handleCustomSlippage(e.target.value)}
            className="pr-8"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <span className="text-gray-500">%</span>
          </div>
        </div>
      </div>

      {slippage >= 5 && (
        <div className="text-orange-500 text-sm">
          High slippage increases the likelihood of your transaction failing
        </div>
      )}
      {slippage <= 0.1 && (
        <div className="text-orange-500 text-sm">
          Low slippage increases the likelihood of your transaction failing
        </div>
      )}
    </div>
  )
}

const SwapInterface = ({ tokens }: { tokens: Token[] }) => {
  const [fromToken, setFromToken] = useState<Token>(tokens[0])
  const [toToken, setToToken] = useState<Token>(tokens[1])
  const [fromAmount, setFromAmount] = useState("")
  const [slippage, setSlippage] = useState(0.5)

  const handleSwitch = () => {
    const tempToken = fromToken
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount("")
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="pt-6">
        <div className="relative">
          {/* Settings button - absolutely positioned */}
          <div className="absolute -top-2 -right-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Cog className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Swap Settings</DialogTitle>
                </DialogHeader>
                <SwapSettings slippage={slippage} setSlippage={setSlippage} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Main swap form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">From</label>
              <div className="flex gap-2">
                <Select
                  value={fromToken.address}
                  onValueChange={(value) =>
                    setFromToken(
                      tokens.find((t) => t.address === value) || tokens[0],
                    )
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue>
                      <TokenOption token={fromToken} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem
                        key={token.address}
                        value={token.address}
                        className="py-2"
                      >
                        <TokenOption token={token} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwitch}
                className="hover:bg-gray-100 transition-colors"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">To</label>
              <div className="flex gap-2">
                <Select
                  value={toToken.address}
                  onValueChange={(value) =>
                    setToToken(
                      tokens.find((t) => t.address === value) || tokens[1],
                    )
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue>
                      <TokenOption token={toToken} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem
                        key={token.address}
                        value={token.address}
                        className="py-2"
                      >
                        <TokenOption token={token} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1 p-2 bg-gray-100 rounded-md text-sm flex items-center">
                  {fromAmount
                    ? `≈ ${(Number(fromAmount) * 20000).toFixed(2)}`
                    : "0.0"}{" "}
                  {toToken.symbol}
                </div>
              </div>
            </div>

            <div className="pt-2 text-sm text-gray-500">
              Slippage Tolerance: {slippage}%
            </div>

            <ProtectedButton className="w-full">Swap</ProtectedButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SwapInterface
