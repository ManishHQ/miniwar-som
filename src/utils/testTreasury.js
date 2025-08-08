import { treasuryService } from '../services/treasuryService';

// Test the treasury service setup
export const testTreasuryService = () => {
	console.log('Testing Treasury Service...');

	const address = treasuryService.getTreasuryAddress();
	if (address) {
		console.log('✅ Treasury address:', address);
	} else {
		console.log('❌ Treasury address not available');
	}

	// Test balance (async)
	treasuryService
		.getTreasuryBalance()
		.then((balance) => {
			console.log('💰 Treasury balance:', balance, 'ETH');
		})
		.catch((error) => {
			console.log('❌ Error getting treasury balance:', error);
		});
};

// Run test immediately
testTreasuryService();
