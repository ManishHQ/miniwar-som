import {
	createPublicClient,
	createWalletClient,
	http,
	parseEther,
	formatEther,
	defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Somnia Testnet chain definition
// Read from Vite env (must be prefixed with VITE_) and normalize
const rawRpc = import.meta.env.VITE_SOMNIA_RPC_URL;
const RPC_ENDPOINT = rawRpc
	? rawRpc.startsWith('http')
		? rawRpc
		: `https://${rawRpc}`
	: 'https://rpc.ankr.com/somnia_testnet/6e3fd81558cf77b928b06b38e9409b4677b637118114e83364486294d5ff4811';

export const somniaTestnet = defineChain({
	id: 50312,
	name: 'Somnia Testnet',
	network: 'somnia-testnet',
	nativeCurrency: { name: 'Somnia Testnet Token', symbol: 'STT', decimals: 18 },
	rpcUrls: {
		default: { http: [RPC_ENDPOINT] },
		public: { http: [RPC_ENDPOINT] },
	},
	blockExplorers: {
		default: {
			name: 'Somnia Explorer',
			url: 'https://shannon-explorer.somnia.network',
		},
	},
});

// Treasury configuration (private key WILL be exposed in bundle – do NOT use a real key in production)
const envPk = import.meta.env.VITE_TREASURY_PRIVATE_KEY;
const TREASURY_PRIVATE_KEY = envPk ? '0x' + envPk.replace(/^0x/, '') : null;
const CHAIN = somniaTestnet;

export class TreasuryService {
	constructor() {
		try {
			if (!TREASURY_PRIVATE_KEY) {
				console.warn(
					'Treasury private key missing (VITE_TREASURY_PRIVATE_KEY)'
				);
			}
			this.publicClient = createPublicClient({
				chain: CHAIN,
				transport: http(RPC_ENDPOINT),
			});
			if (TREASURY_PRIVATE_KEY) {
				this.treasuryAccount = privateKeyToAccount(TREASURY_PRIVATE_KEY);
				this.walletClient = createWalletClient({
					account: this.treasuryAccount,
					chain: CHAIN,
					transport: http(RPC_ENDPOINT),
				});
			} else {
				this.treasuryAccount = null;
				this.walletClient = null;
			}
		} catch (error) {
			console.error('Failed to initialize treasury account:', error);
			this.treasuryAccount = null;
			this.walletClient = null;
		}
	}

	// Get treasury address
	getTreasuryAddress() {
		// Use environment variable if available, fallback to derived address
		const envAddress = import.meta.env.VITE_TREASURY_ADDRESS;
		if (envAddress) {
			return envAddress;
		}
		return this.treasuryAccount ? this.treasuryAccount.address : null;
	}

	// Check if treasury is properly initialized and funded
	async checkTreasuryStatus() {
		if (!this.treasuryAccount) {
			return {
				initialized: false,
				funded: false,
				balance: 0,
				address: null,
				error: 'Treasury account not initialized',
			};
		}

		try {
			const address = this.treasuryAccount.address;
			const balance = await this.getTreasuryBalance();

			return {
				initialized: true,
				funded: balance > 0,
				balance,
				address,
				error: null,
			};
		} catch (error) {
			return {
				initialized: true,
				funded: false,
				balance: 0,
				address: this.treasuryAccount.address,
				error: error.message,
			};
		}
	}

	// Send winnings to winner
	async sendWinnings(winnerAddress, amountEth) {
		if (!this.walletClient || !this.treasuryAccount) {
			throw new Error('Treasury account not initialized');
		}

		try {
			console.log('Treasury sending winnings...');
			console.log('From:', this.treasuryAccount.address);
			console.log('To:', winnerAddress);
			console.log('Amount:', amountEth, 'STT');

			// Check treasury balance first
			const treasuryBalance = await this.getTreasuryBalance();
			console.log('Treasury balance:', treasuryBalance, 'STT');
			if (treasuryBalance < amountEth) {
				throw new Error(
					`Insufficient treasury balance. Has ${treasuryBalance.toFixed(
						6
					)} STT but needs ${amountEth.toFixed(6)} STT`
				);
			}

			// Send STT transaction
			const hash = await this.walletClient.sendTransaction({
				to: winnerAddress,
				value: parseEther(amountEth.toString()),
			});

			console.log('Transaction sent, hash:', hash);

			// Wait for confirmation
			await this.publicClient.waitForTransactionReceipt({
				hash,
			});

			console.log('Transaction confirmed');

			return {
				success: true,
				hash,
				amount: amountEth,
			};
		} catch (error) {
			console.error('Failed to send winnings:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// Get treasury balance
	async getTreasuryBalance() {
		if (!this.treasuryAccount) {
			return 0;
		}

		try {
			const balance = await this.publicClient.getBalance({
				address: this.treasuryAccount.address,
			});
			return parseFloat(formatEther(balance));
		} catch (error) {
			console.error('Failed to get treasury balance:', error);
			return 0;
		}
	}

	// Verify staking transaction
	async verifyStakingTransaction(hash, expectedAmount) {
		try {
			const transaction = await this.publicClient.getTransaction({
				hash,
			});

			if (!transaction) {
				return { valid: false, error: 'Transaction not found' };
			}

			// Verify transaction details
			const actualAmount = parseFloat(formatEther(transaction.value));
			const amountMatch = Math.abs(actualAmount - expectedAmount) < 0.0001;

			if (!amountMatch) {
				return { valid: false, error: 'Amount mismatch' };
			}

			return { valid: true, amount: expectedAmount };
		} catch (error) {
			console.error('Failed to verify staking transaction:', error);
			return { valid: false, error: error.message };
		}
	}
}

// Create singleton instance
export const treasuryService = new TreasuryService();
