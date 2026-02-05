# Zendvo
www.zendvo.com

Zendvo is a full-stack gifting platform that enables users to send cash gifts that remain completely hidden until a predetermined unlock date and time. By using the Stellar blockchain, Zendvo transforms digital money transfers into memorable experiences filled with mystery and anticipation.

## Who is Zendvo For?

- **Diaspora Senders:** Specifically targeting young adults (18-35) in the US, UK, and Canada looking for a more meaningful way to send money home to Nigeria.
- **Domestic Gifting (Future Phase):** Nigerians sending to Nigerians for birthdays, anniversaries, and holidays where surprise is key.
- **Memorable Occasions:** Perfect for Valentine's Day, graduations, and surprise celebrations where the timing of the gift is as important as the gift itself.

## Architecture Highlights

Zendvo is built with a modern full-stack App Router architecture:

- **Frontend:** Next.js with TypeScript and Vanilla CSS for a premium, fast, and responsive user experience.
- **Backend:** Integrated Route Handlers in `src/app/api` and a dedicated `src/server` layer for heavy business logic and data access.
- **Smart Escrow:** Powered by **Stellar Soroban** smart contracts to ensure trustless, time-locked fund management.

## Project Structure

```text
src/
├── app/                  # Next.js App Router
│   ├── (public)/         # Public pages (Landing, Gift Creation, Claim)
│   ├── api/              # Backend Route Handlers
│   ├── auth/             # Phone verification & Login
│   ├── dashboard/        # Recipient and Sender dashboards
│   └── ...               # Profile, Notifications, Help
├── server/               # Backend Business Logic
│   ├── services/         # Core logic (scheduling, processing)
│   ├── data-access/      # DB & Blockchain API interactions
│   ├── middleware/       # Security & Validation
│   └── config/           # Server configurations
├── components/           # UI Component Library
├── lib/                  # Third-party integrations (Stellar, Stripe, Paystack)
├── types/                # Global TypeScript definitions
└── styles/               # Vanilla CSS Design System
```

## Benefits to the Stellar Ecosystem

Zendvo showcases the power of Stellar through:

1.  **Stablecoin Infrastructure:** Utilizing **USDC** for value preservation, ensuring that the gift amount remains stable from creation to unlock.
2.  **Soroban Smart Contracts:** Implementing decentralized time-locking logic that prevents early withdrawal, providing a middleman-free guarantee of the "hidden" nature of the gift.
3.  **Low-Cost Transactions:** Leveraging Stellar's high speed and near-zero fees to ensure that more of the sender's money reaches the recipient.
4.  **Real-World Utility:** Connecting blockchain technology directly to Nigerian bank accounts via local payout partners, driving adoption of Web3 solutions for real-world financial needs.
5.  **Financial Inclusion:** Providing a good on/off-ramp experience that bridges global stablecoin liquidity with local financial systems.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
