# Treasury Setup Guide

## Setting up the Treasury Wallet

### 1. Generate Treasury Keypair

You can generate a new treasury keypair using the Solana CLI:

```bash
solana-keygen new --outfile treasury-keypair.json
```

This will create a new keypair file. Keep this file secure and never share it.

### 2. Get the Private Key

To get the private key array for the treasury service:

```bash
cat treasury-keypair.json
```

This will show you an array like: `[123, 45, 67, ...]`

### 3. Update the Treasury Service

Replace the `YOUR_TREASURY_PRIVATE_KEY_HERE` in `/src/services/treasuryService.js` with your actual private key array:

```javascript
const TREASURY_PRIVATE_KEY = '[123, 45, 67, ...]'; // Your actual private key array
```

### 4. Fund the Treasury

Send GOR to your treasury address to fund it:

```bash
solana transfer <treasury-address> <amount> --url https://rpc.gorbagana.wtf
```

### 5. Security Best Practices

- **Never commit private keys to version control**
- Store private keys in environment variables in production
- Use a secure key management service for production deployments
- Regularly rotate treasury keypairs
- Monitor treasury balance and transactions

## Environment Variables (Production)

Instead of hardcoding the private key, use environment variables:

```javascript
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
```

Then set the environment variable:

```bash
export TREASURY_PRIVATE_KEY='[123, 45, 67, ...]'
```

## Testing

1. Start the application
2. Connect your wallet
3. Create or join a game
4. Play and win
5. Use the redeem button to test the treasury payout

## Troubleshooting

- **"Treasury address not available"**: Make sure the private key is correctly formatted
- **"Insufficient funds"**: Fund the treasury wallet with GOR
- **"Failed to send winnings"**: Check network connection and treasury balance
