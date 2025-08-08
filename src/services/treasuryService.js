import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains';

// Treasury configuration
const TREASURY_PRIVATE_KEY = '0x' + 'your-private-key-here'; // Replace with actual EVM private key
const RPC_ENDPOINT = 'https://eth.llamarpc.com'; // Public Ethereum RPC
const CHAIN = sepolia; // Using Sepolia testnet for development

export class TreasuryService {
	constructor() {
		this.publicClient = createPublicClient({
			chain: CHAIN,
			transport: http(RPC_ENDPOINT),
		});

		// Initialize treasury account from private key
		// In production, this should be stored securely (environment variables, key management service, etc.)
		try {
			this.treasuryAccount = privateKeyToAccount(TREASURY_PRIVATE_KEY);
			this.walletClient = createWalletClient({
				account: this.treasuryAccount,
				chain: CHAIN,
				transport: http(RPC_ENDPOINT),
			});
		} catch (error) {
			console.error('Failed to initialize treasury account:', error);
			this.treasuryAccount = null;
			this.walletClient = null;
		}
	}

	// Get treasury address
	getTreasuryAddress() {
		return this.treasuryAccount
			? this.treasuryAccount.address
			: null;
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
			console.log('Amount:', amountEth, 'ETH');

			// Check treasury balance first
			const treasuryBalance = await this.getTreasuryBalance();
			console.log('Treasury balance:', treasuryBalance, 'ETH');
			if (treasuryBalance < amountEth) {
				throw new Error(
					`Insufficient treasury balance. Has ${treasuryBalance.toFixed(
						6
					)} ETH but needs ${amountEth.toFixed(6)} ETH`
				);
			}

			// Send ETH transaction
			const hash = await this.walletClient.sendTransaction({
				to: winnerAddress,
				value: parseEther(amountEth.toString()),
			});

			console.log('Transaction sent, hash:', hash);

			// Wait for confirmation
			const receipt = await this.publicClient.waitForTransactionReceipt({ 
				hash 
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
	async verifyStakingTransaction(hash, expectedAmount, stakingAddress) {
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
