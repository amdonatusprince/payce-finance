# Payce — Trustless Micropayments Infrastructure 

**Payce** is a dual-purse micropayment infrastructure built for Mezo-style BitcoinFi ecosystems.

## Description
Payce lets users preload a purse with tokens, sign off-chain vouchers for micro-payments, and let merchants redeem many vouchers in a single on-chain transaction — both users and merchants can view and withdraw their on-chain purse balances.

## What this repo contains
- `contracts/Payce.sol` — main contract implementing user & merchant purses, reservation, voucher redemption (single + batch), and withdrawals. Fully commented.
- `contracts/MockERC20.sol` — simple ERC-20 token for local demo (acts as MUSD).
- `scripts/` — `deploy.js` and `demoFlow.js` (end-to-end demo).
- `test/Payce.test.js` — unit tests covering deposit/reserve/redeem/withdraw flows.
- `hardhat.config.js` and `package.json`.

## Quick concepts
- **User Purse** — user deposits tokens into the contract (`deposit`) and can withdraw unreserved tokens (`withdrawUser`).
- **Reservation** — user calls `reserveFunds(amount)` once to lock funds equal to the sum of vouchers they intend to sign. This ensures merchants can redeem.
- **Voucher** — an off-chain EIP-712 signed object: `{payer, merchant, amount, nonce, expiry}`.
- **Redeem** — merchant calls `redeemVoucher` or `redeemBatch` with voucher(s)+signature(s). The contract verifies and moves funds into `merchantBalance`.
- **Merchant Withdraw** — merchant withdraws earned tokens from `merchantBalance` with `withdrawMerchant`.
- **Transparency** — both user and merchant can query balances via `getUserBalances` / `getMerchantBalance`.

## Why we use reservation
To guarantee that vouchers can be redeemed without failing due to insufficient funds, the user uses `reserveFunds(totalVoucherAmount)` in a single transaction. This is a one-time gas cost per session, and preserves the off-chain efficiency of per-micro-payment signing.

## How to run (local)
1. Install
```bash
npm install
