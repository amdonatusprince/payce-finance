export type Token = {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI: string
}

export type Pool = {
  id: string
  token0: Token
  token1: Token
  isStable: boolean
  fee: number
  volume24h: number
  tvl: number
  baseAPY: number
  matsAPY: number
  votes: number
  lpBalance?: number
  hasIncentives: boolean
}

export type Lock = {
  id: string
  amount: number
  endTime: number
  votingPower: number
  estimatedAPR: number
}
