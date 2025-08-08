import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Configure chains and transports
const config = createConfig({
	chains: [mainnet, sepolia],
	connectors: [injected()],
	transports: {
		[mainnet.id]: http(),
		[sepolia.id]: http(),
	},
});

const queryClient = new QueryClient();

export function SolanaWalletProvider({ children }) {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</WagmiProvider>
	);
}

export function ConnectWalletButton() {
	const { address, isConnected } = useAccount();
	const { connect } = useConnect();
	const { disconnect } = useDisconnect();

	const handleConnect = () => {
		connect({ connector: injected() });
	};

	if (isConnected) {
		return (
			<div className="flex items-center gap-2">
				<div className="text-sm text-gray-600">
					{address?.slice(0, 6)}...{address?.slice(-4)}
				</div>
				<button
					onClick={() => disconnect()}
					className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
				>
					Disconnect
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={handleConnect}
			className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
		>
			Connect Wallet
		</button>
	);
}
