"use client";

import { useChainId, useConnect } from "wagmi";

export function WalletConnectors() {
  const chainId = useChainId();
  const { connectors, connect } = useConnect();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-black">Available Wallets</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {connectors.map((connector) => (
          <button
            type="button"
            onClick={() => {
              connect({ connector, chainId });
            }}
            key={connector.id}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium border border-slate-600"
          >
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  );
}

