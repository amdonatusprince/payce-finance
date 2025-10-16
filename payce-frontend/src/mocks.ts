import { Pool, Lock, Token } from "./types"

export const mockTokens: Token[] = [
  {
    address: "0x...1",
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
                                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                                      <rect width="24" height="24" fill="white"/>
                                                                      <circle cx="12" cy="12" r="11" fill="#F7931A"/>
                                                                      <path d="M16 10.5c.2-1.4-1-2.2-2.2-2.7l.4-1.8-1-.3-.4 1.8-.8-.2.4-1.8-1-.3-.4 1.8-2.1-.5-.3 1.1s.8.2.8.2c.4.1.5.4.5.6l-.5 2.2-.1.3-.8 3.2c0 .2-.2.4-.5.3 0 0-.8-.2-.8-.2l-.5 1.2 2 .5-.4 1.8 1 .3.4-1.8.8.2-.4 1.8 1 .3.4-1.8c1.7.3 3 .2 3.5-1.4.4-1.3 0-2.1-.9-2.6.6-.1 1.1-.5 1.2-1.4zm-2.1 3c-.3 1.1-2.1.5-2.7.4l.5-1.9c.6.1 2.5.4 2.2 1.5zm.3-2.9c-.3 1-1.6.5-2.1.4l.4-1.7c.5.1 1.9.3 1.7 1.3z" fill="white"/>
                                                                      </svg>
                                                                      `),
  },
  {
    address: "0x...2",
    symbol: "mUSD",
    name: "Mezo USD",
    decimals: 18,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#FF004D"/>
        <path d="M13.5 7.5c1-.8 2.5-1.4 2.5-1.4v2c-.4.2-1.1.5-1.5.8-.7.5-1 1.2-1 2.1 0 .9.4 1.5 1.1 1.9.4.2 1 .4 1.4.5v2c-.9-.2-1.8-.6-2.5-1.1v1.1h-1v-1.1c-.7.5-1.6.9-2.5 1.1v-2c.4-.1.9-.3 1.4-.5.7-.4 1.1-1 1.1-1.9 0-.9-.3-1.6-1-2.1-.4-.3-1-.6-1.5-.8v-2s1.5.6 2.5 1.4V6.5h1v1zm-1 3.9c.3.2.4.5.4.9s-.1.7-.4.9c-.2.1-.4.2-.6.3-.2-.1-.4-.2-.6-.3-.3-.2-.4-.5-.4-.9s.1-.7.4-.9c.2-.1.4-.2.6-.3.2.1.4.2.6.3z" fill="white"/>
      </svg>
    `),
  },
  {
    address: "0x...3",
    symbol: "HUH",
    name: "HUH Token",
    decimals: 18,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#6B7280"/>
        <path d="M7 8c0.5-0.5 1.5-0.5 2 0s0.5 1.5 0 2s-1.5 0.5-2 0s-0.5-1.5 0-2z" fill="white"/>
        <path d="M15 8c0.5-0.5 1.5-0.5 2 0s0.5 1.5 0 2s-1.5 0.5-2 0s-0.5-1.5 0-2z" fill="white"/>
        <path d="M12 14c3 0 4 2 4 2l-8 0c0 0 1-2 4-2z" fill="white"/>
        <circle cx="18" cy="18" r="3" fill="#FF6B6B"/>
        <text x="18" y="19" text-anchor="middle" fill="white" style="font-family: system-ui; font-weight: bold; font-size: 4px;">?</text>
      </svg>
    `),
  },
  {
    address: "0x...4",
    symbol: "LOLA",
    name: "LOLA",
    decimals: 18,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#000000"/>
        <path d="M12 6L17 18H7L12 6z" fill="white"/>
      </svg>
    `),
  },
  {
    address: "0x...5",
    symbol: "T",
    name: "Threshold",
    decimals: 18,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#1CD8D2"/>
        <path d="M8 8h8v2h-3v7h-2v-7h-3v-2z" fill="white"/>
      </svg>
    `),
  },
  {
    address: "0x...6",
    symbol: "thUSD",
    name: "Threshold USD",
    decimals: 18,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#1CD8D2"/>
        <path d="M7 9h10v1.5h-4v6h-2v-6h-4v-1.5z" fill="white"/>
        <path d="M12.5 13.5c1-.8 2-1.2 2-1.2v1.5c-.3.2-.8.4-1.2.6-.5.4-.8.9-.8 1.6 0 .7.3 1.2.9 1.5.3.2.7.3 1.1.4v1.5c-.7-.2-1.4-.5-2-.9v.9h-.8v-.9c-.6.4-1.3.7-2 .9v-1.5c.3-.1.7-.2 1.1-.4.5-.3.9-.8.9-1.5 0-.7-.3-1.2-.8-1.6-.4-.2-.9-.4-1.2-.6v-1.5s1 .4 2 1.2v-1.1h.8v1.1z" fill="white"/>
      </svg>
    `),
  },
  {
    address: "0x...7",
    symbol: "solvBTC",
    name: "Solvent BTC",
    decimals: 8,
    logoURI:
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="white"/>
        <circle cx="12" cy="12" r="11" fill="#0066FF"/>
        <path d="M16 10.5c.2-1.4-1-2.2-2.2-2.7l.4-1.8-1-.3-.4 1.8-.8-.2.4-1.8-1-.3-.4 1.8-2.1-.5-.3 1.1s.8.2.8.2c.4.1.5.4.5.6l-.5 2.2-.1.3-.8 3.2c0 .2-.2.4-.5.3 0 0-.8-.2-.8-.2l-.5 1.2 2 .5-.4 1.8 1 .3.4-1.8.8.2-.4 1.8 1 .3.4-1.8c1.7.3 3 .2 3.5-1.4.4-1.3 0-2.1-.9-2.6.6-.1 1.1-.5 1.2-1.4zm-2.1 3c-.3 1.1-2.1.5-2.7.4l.5-1.9c.6.1 2.5.4 2.2 1.5zm.3-2.9c-.3 1-1.6.5-2.1.4l.4-1.7c.5.1 1.9.3 1.7 1.3z" fill="white"/>
      </svg>
    `),
  },
]

export const mockPools: Pool[] = [
  {
    id: "btc-musd-stable",
    token0: mockTokens.find((t) => t.symbol === "BTC")!,
    token1: mockTokens.find((t) => t.symbol === "mUSD")!,
    isStable: true,
    fee: 0.01,
    volume24h: 1000000,
    tvl: 5000000,
    baseAPY: 12.5,
    matsAPY: 8.3,
    votes: 1500,
    lpBalance: 0.5,
    hasIncentives: true,
  },
  {
    id: "btc-musd-volatile",
    token0: mockTokens.find((t) => t.symbol === "BTC")!,
    token1: mockTokens.find((t) => t.symbol === "mUSD")!,
    isStable: false,
    fee: 0.03,
    volume24h: 2000000,
    tvl: 3000000,
    baseAPY: 15.5,
    matsAPY: 10.3,
    votes: 2500,
    lpBalance: 0,
    hasIncentives: false,
  },
  {
    id: "huh-btc",
    token0: mockTokens.find((t) => t.symbol === "HUH")!,
    token1: mockTokens.find((t) => t.symbol === "BTC")!,
    isStable: false,
    fee: 0.03,
    volume24h: 500000,
    tvl: 1000000,
    baseAPY: 25.5,
    matsAPY: 15.3,
    votes: 800,
    lpBalance: 0.1,
    hasIncentives: true,
  },
  {
    id: "huh-musd",
    token0: mockTokens.find((t) => t.symbol === "HUH")!,
    token1: mockTokens.find((t) => t.symbol === "mUSD")!,
    isStable: false,
    fee: 0.03,
    volume24h: 300000,
    tvl: 800000,
    baseAPY: 30.5,
    matsAPY: 20.3,
    votes: 600,
    lpBalance: 0,
    hasIncentives: true,
  },
  {
    id: "thusd-musd",
    token0: mockTokens.find((t) => t.symbol === "thUSD")!,
    token1: mockTokens.find((t) => t.symbol === "mUSD")!,
    isStable: true,
    fee: 0.01,
    volume24h: 1500000,
    tvl: 4000000,
    baseAPY: 8.5,
    matsAPY: 5.3,
    votes: 1200,
    lpBalance: 0,
    hasIncentives: false,
  },
  {
    id: "solvbtc-btc",
    token0: mockTokens.find((t) => t.symbol === "solvBTC")!,
    token1: mockTokens.find((t) => t.symbol === "BTC")!,
    isStable: true,
    fee: 0.01,
    volume24h: 800000,
    tvl: 2500000,
    baseAPY: 10.5,
    matsAPY: 7.3,
    votes: 900,
    lpBalance: 0.2,
    hasIncentives: true,
  },
  {
    id: "lola-btc",
    token0: mockTokens.find((t) => t.symbol === "LOLA")!,
    token1: mockTokens.find((t) => t.symbol === "BTC")!,
    isStable: false,
    fee: 0.03,
    volume24h: 400000,
    tvl: 1200000,
    baseAPY: 20.5,
    matsAPY: 12.3,
    votes: 700,
    lpBalance: 0,
    hasIncentives: false,
  },
  {
    id: "t-btc",
    token0: mockTokens.find((t) => t.symbol === "T")!,
    token1: mockTokens.find((t) => t.symbol === "BTC")!,
    isStable: false,
    fee: 0.03,
    volume24h: 600000,
    tvl: 1500000,
    baseAPY: 18.5,
    matsAPY: 11.3,
    votes: 1000,
    lpBalance: 0.3,
    hasIncentives: true,
  },
]

export const mockLocks: Lock[] = [
  {
    id: "veBTC-1",
    amount: 1.5,
    endTime: Date.now() + 365 * 24 * 60 * 60 * 1000,
    votingPower: 1.5,
    estimatedAPR: 15.5,
  },
]
