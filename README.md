# Gorbagana Shooter Game

Play it live: https://gor.superarcade.fun

A 4-player on-chain shooter built on the Gorbagana Solana-based testnet. Stake \$GOR, create or join rooms, and frag your friends to configurable kill targets—winner takes the pot! Perfect for degen playtesting with zero-MEV execution, instant finality, and Web2-like speed.

---

## 🚀 Demo & Alpha

🎥 Watch match clips and highlights on Twitter: use `#GorbaganaTestnet` and tag @Gorbagana\_chain @sarv\_shaktimaan @lex\_node
https://x.com/SuperArcadeFun/status/1940748622045630815

---

## 🎮 Features

* **4-player multiplayer**: Fast-paced shooter arena for up to 4 players
* **Configurable kill target**: Default 5 kills to win (adjustable per room)
* **On‑chain stakes**: Players stake \$GOR to enter, winner claims pot
* **Platform fee**: 5% fee deducted from pot for platform sustainability
* **Zero-MEV execution**: Fair ordering with no extractable value
* **Instant finality**: Gameplay outcomes recorded on-chain immediately
* **Web2‑like speed**: Built with React, Vite & Three.js for smooth experience
* **Backpack Wallet support**: Easy Solana wallet integration

---

## 🧩 Tech Stack

* **Frontend**: React.js, Vite, Three.js
* **Blockchain**: Solana-based Gorbagana testnet
* **Wallet**: Backpack Wallet (supports Solana and Gorbagana)
* **Styling**: Tailwind CSS

---

## 📗 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v16+)
* [Yarn](https://yarnpkg.com/) or npm
* Backpack Wallet browser extension
* Gorbagana testnet tokens (ask in [Telegram Group](https://t.me/gorbagana_portal))

### Clone the Repo

```bash
git clone https://github.com/theidealmanish/gorbagana-shooter.git
cd gorbagana-shooter
```

### Install Dependencies

```bash
# Using Yarn
yarn install

# Or using npm
npm install
```

### Configure Environment

Create a `.env.local` file in the project root with:

```bash
VITE_SOLANA_RPC=https://rpc.gorbagana.wtf
VITE_KILL_TARGET=5    # default kills to win (override per room)
```

* `VITE_SOLANA_RPC` – Gorbagana RPC endpoint
* `VITE_KILL_TARGET` – default kills to win

---

## 🏃‍♂️ Running Locally

```bash
# Start dev server
yarn dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your Backpack Wallet.

---

## 🔧 Gameplay Flow

1. **Connect Wallet**: Click **Connect** and select Backpack Wallet.
2. **Stake & Create Room**: Enter stake amount and click **Create Room**.
3. **Join Room**: Friends stake the same amount and join via room code.
4. **Frag Mode**: Navigate the arena, shoot opponents, and rack up kills.
5. **Claim Reward**: First to reach kill target claims the pot minus 5% fee.

---

## 🛠️ Deployment

```bash
# Build for production
yarn build
# or
npm run build
```

Serve the `dist/` folder on any static host (e.g., Netlify, Vercel).

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## 📖 Resources

* Gorbagana Docs: [https://docs.gorbagana.wtf/](https://docs.gorbagana.wtf/)
* Telegram Chat: [https://t.me/gorbagana\_portal](https://t.me/gorbagana_portal)
* Solana Docs: [https://docs.solana.com/](https://docs.solana.com/)

---

## ⚖️ License

MIT © Your Name
