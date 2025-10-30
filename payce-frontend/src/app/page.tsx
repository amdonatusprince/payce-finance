"use client"

// import SwapInterface from "@/components/swap"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ConnectButton } from "@rainbow-me/rainbowkit"
// import { default as StakeInterface } from "@/components/stake"
// import { default as SimpleBorrowInterface } from "@/components/simple-borrow"
import { default as DepositInterface } from "@/components/deposit"
// import { mockTokens } from "@/mocks"
import ContractConsole from "@/components/ContractConsole"
import BorrowPanel from "@/components/BorrowPanel"
import PursePanel from "@/components/PursePanel"
import WithdrawPanel from "@/components/WithdrawPanel"
import StatusPanel from "@/components/StatusPanel"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <span className="text-2xl font-bold text-black">Payce Finance</span>
            <ConnectButton />
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="borrow" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="borrow">Borrow</TabsTrigger>
              <TabsTrigger value="purse">Purse</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              {/* <TabsTrigger value="stake">Stake</TabsTrigger> */}
              {/* <TabsTrigger value="swap">Swap</TabsTrigger> */}
              {/* <TabsTrigger value="deposit">Deposit</TabsTrigger> */}
              <TabsTrigger value="contract">Manage</TabsTrigger>
            </TabsList>
            {/* <TabsContent value="swap">
              <SwapInterface tokens={mockTokens} />
            </TabsContent> */}
            {/* <TabsContent value="stake">
              <StakeInterface />
            </TabsContent> */}
            <TabsContent value="borrow">
              <BorrowPanel />
            </TabsContent>
            <TabsContent value="purse">
              <PursePanel />
            </TabsContent>
            <TabsContent value="withdraw">
              <WithdrawPanel />
            </TabsContent>
            <TabsContent value="status">
              <StatusPanel />
            </TabsContent>
            <TabsContent value="deposit">
              <DepositInterface />
            </TabsContent>
            <TabsContent value="contract">
              <ContractConsole />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}