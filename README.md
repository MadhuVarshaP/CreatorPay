# CreatorPay

CreatorPay is a decentralized subscription-based platform that allows users to support creators through recurring payments on-chain. Built with Solidity, Next.js, Tailwind CSS, and deployed using Vercel. The smart contract is deployed on the **Base Sepolia** testnet.

## Features

- On-chain creator registration and subscription logic
- Wallet connection and transaction signing via WalletConnect/RainbowKit
- ETH-based subscription fee with platform share split
- Creator and platform earnings tracking
- Fully responsive UI built with Tailwind CSS

## Roles

- Creator
- User (Subscriber)
- Admin

## Tech Stack

- **Smart Contract**: Solidity (deployed via Remix IDE)
- **Blockchain Network**: Base Sepolia
- **Frontend**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Wallet Integration**: wagmi + RainbowKit
- **Deployment**: Vercel

## Project Structure

```
/app - Next.js app pages
/components - UI components
/lib
/contract - Contract ABI and address
/utils - Utility functions (e.g. ETH formatting)
/types - TypeScript interfaces
/public - Static assets
/styles - Tailwind config and globals
```

## Contract Details

- **Network**: Base Sepolia Testnet
- **Contract Address**: `0xf964283178f9BE58ab1bE48f169cf61Bbb4e9aD9`
- **Deployed With**: [Remix IDE](https://remix.ethereum.org)

## Screenshots

<img width="1467" alt="Screenshot 2025-05-29 at 9 20 17 AM" src="https://github.com/user-attachments/assets/2470c74a-c4e0-439b-aa53-e0047bed1270" />
<img width="1470" alt="Screenshot 2025-05-29 at 9 20 40 AM" src="https://github.com/user-attachments/assets/12157063-b129-4dd4-b1dd-3a5086272560" />



## Running Locally

```
git clone https://github.com/MadhuVarshaP/CreatorPay.git
cd CreatorPay
npm install
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables
Create a .env.local file in the root and add:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```
⚠️ Ensure you’re connected to Base Sepolia in your wallet.

## Deployment

Deployed this CreatorPay project in Vercel [https://creator-pay-subscribe.vercel.app/](https://creator-pay-subscribe.vercel.app/)
