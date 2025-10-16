import { Token, Pool } from "@/types"

export const TokenIcon = ({
  token,
  className,
}: {
  token: Token
  className?: string
}) => (
  <div
    className={`w-6 h-6 flex-shrink-0 overflow-hidden rounded-full bg-white shadow-sm ${className}`}
  >
    <div
      dangerouslySetInnerHTML={{
        __html: decodeURIComponent(token.logoURI.split(",")[1]),
      }}
    />
  </div>
)

export const TokenOption = ({ token }: { token: Token }) => (
  <div className="flex items-center gap-2">
    <TokenIcon token={token} />
    <div>
      <div className="font-medium">{token.symbol}</div>
      <div className="text-sm text-gray-500">{token.name}</div>
    </div>
  </div>
)

export const TokenPair = ({
  token0,
  token1,
}: {
  token0: Token
  token1: Token
}) => (
  <div className="flex items-center">
    <TokenIcon token={token0} />
    <TokenIcon token={token1} className="-ml-2" />
    <span className="ml-2 font-medium">
      {token0.symbol}/{token1.symbol}
    </span>
  </div>
)

export const StabilityBadge = ({ isStable }: { isStable: boolean }) => (
  <span
    className={`
    inline-flex px-2 py-1 rounded-full text-xs font-medium
    ${isStable ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}
  `}
  >
    {isStable ? "Stable" : "Volatile"}
  </span>
)

export const PoolLabel = ({ pool }: { pool: Pool }) => (
  <div className="flex items-center justify-between gap-4">
    <TokenPair token0={pool.token0} token1={pool.token1} />
    <StabilityBadge isStable={pool.isStable} />
  </div>
)
