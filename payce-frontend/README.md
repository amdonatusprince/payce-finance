# Payce Finance Frontend

A Next.js frontend application for the Payce micropayment platform, built with Mezo Passport for wallet connectivity.

## Features

- 🔐 **Mezo Passport Integration** - Connect Bitcoin and EVM wallets
- 🌈 **RainbowKit UI** - Beautiful wallet connection experience
- ⚡ **Next.js 15** - Latest Next.js with App Router
- 🎨 **Tailwind CSS** - Modern, responsive styling
- 🔗 **Wagmi & Viem** - Type-safe Ethereum interactions
- 📊 **React Query** - Efficient state management

## Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm

## Installation

```bash
# Install dependencies
pnpm install
```

## Development

```bash
# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
payce-frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── layout.tsx    # Root layout with Web3Provider
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── ConnectWallet.tsx      # RainbowKit connect button
│   │   └── WalletConnectors.tsx   # Wagmi wallet connectors
│   └── providers/        # Context providers
│       └── Web3Provider.tsx       # Wagmi + RainbowKit setup
├── public/              # Static assets
└── package.json         # Dependencies
```

## Wallet Connection

The app supports multiple wallet types through Mezo Passport:

### RainbowKit Method (Recommended)

```tsx
import { ConnectWallet } from "@/components/ConnectWallet";

<ConnectWallet />
```

### Wagmi Method (Programmatic)

```tsx
import { WalletConnectors } from "@/components/WalletConnectors";

<WalletConnectors />
```

## Configuration

The Web3Provider is configured with:

- **App Name**: "Payce Finance"
- **Network**: Mezo Testnet
- **Connectors**: Automatically configured by Mezo Passport

## Key Technologies

- **@mezo-org/passport**: Mezo's wallet connection package
- **@rainbow-me/rainbowkit**: Wallet connection UI
- **wagmi**: React hooks for Ethereum
- **viem**: TypeScript Ethereum library
- **@tanstack/react-query**: Async state management

## Building for Production

```bash
pnpm build
pnpm start
```

## Integration with Smart Contracts

To connect with the Payce smart contracts:

1. Deploy contracts from `../payce-contract`
2. Add contract addresses to environment variables
3. Import contract ABIs from artifacts
4. Use Wagmi hooks to interact with contracts

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_PAYCE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MOCK_ERC20_ADDRESS=0x...
```
