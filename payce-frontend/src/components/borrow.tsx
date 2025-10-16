import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { AlertCircle } from "lucide-react"
import { default as ProtectedButton } from "@/components/protected-button"

// Mock data
const supplyData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  supply: Math.floor(80000000 + Math.random() * 20000000),
}))

const mockLoans = [
  {
    id: 1,
    collateral: 10,
    debt: 156000,
    interestRate: 4.3,
    openedAt: "2023-12-01",
    health: 85,
  },
  {
    id: 2,
    collateral: 5,
    debt: 58000,
    interestRate: 4.1,
    openedAt: "2023-12-15",
    health: 55,
  },
  {
    id: 3,
    collateral: 3,
    debt: 42000,
    interestRate: 4.2,
    openedAt: "2024-01-01",
    health: 35,
  },
]

const getHealthColor = (health: number) => {
  if (health >= 60) return "text-green-500"
  if (health >= 40) return "text-yellow-500"
  return "text-red-500"
}

const LoanHealth = ({ health }: { health: number }) => (
  <div className={`flex items-center gap-2 ${getHealthColor(health)}`}>
    {health < 40 && <AlertCircle className="h-4 w-4" />}
    {health}%
  </div>
)

const NewLoanForm = () => {
  const [btcAmount, setBtcAmount] = useState("")
  const [musdAmount, setMusdAmount] = useState("")
  const maxLTV = 0.78
  const interestRate = 4.3

  const maxBorrow = Number(btcAmount) * 20000 * maxLTV // Using $20k as BTC price

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Interest Rate</div>
          <div className="text-lg font-medium">{interestRate}%</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Maximum LTV</div>
          <div className="text-lg font-medium">{maxLTV * 100}%</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            BTC Collateral
          </label>
          <Input
            type="number"
            value={btcAmount}
            onChange={(e) => setBtcAmount(e.target.value)}
            placeholder="0.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            mUSD to Borrow
          </label>
          <Input
            type="number"
            value={musdAmount}
            onChange={(e) => setMusdAmount(e.target.value)}
            placeholder="0.0"
          />
          {btcAmount && (
            <div className="text-sm text-gray-500 mt-1">
              Max available: ${maxBorrow.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <ProtectedButton className="w-full">Create Loan</ProtectedButton>
    </div>
  )
}

const BorrowInterface = () => {
  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Collateral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,000 BTC</div>
            <p className="text-sm text-gray-500">
              ${(2000 * 20000).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$100M</div>
            <p className="text-sm text-gray-500">mUSD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Interest Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.3%</div>
            <p className="text-sm text-gray-500">Current APR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Collateralization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">50%</div>
            <p className="text-sm text-gray-500">System Ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Total mUSD Supply</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={supplyData}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => value.split("-").slice(1).join("/")}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="supply"
                  stroke="#FF004D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Active Loans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Active Loans</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button>New Loan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
              </DialogHeader>
              <NewLoanForm />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">Collateral</th>
                  <th className="pb-2">Debt</th>
                  <th className="pb-2">Interest Rate</th>
                  <th className="pb-2">Opened</th>
                  <th className="pb-2">Health</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {mockLoans.map((loan) => (
                  <tr key={loan.id} className="border-b">
                    <td className="py-3">{loan.collateral} BTC</td>
                    <td className="py-3">${loan.debt.toLocaleString()} mUSD</td>
                    <td className="py-3">{loan.interestRate}%</td>
                    <td className="py-3">{loan.openedAt}</td>
                    <td className="py-3">
                      <LoanHealth health={loan.health} />
                    </td>
                    <td className="py-3">
                      <ProtectedButton size="sm">Repay</ProtectedButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BorrowInterface
