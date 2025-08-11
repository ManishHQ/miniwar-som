import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { somniaTestnet } from '../services/treasuryService';
import {
	useAccount,
	useConnect,
	useDisconnect,
	useChainId,
	useSwitchChain,
} from 'wagmi';
import { injected } from 'wagmi/connectors';

// Configure chains and transports (moved to include Somnia Testnet)
const config = createConfig({
	chains: [somniaTestnet],
	connectors: [injected()],
	transports: {
		[somniaTestnet.id]: http(somniaTestnet.rpcUrls.default.http[0]),
	},
});

const queryClient = new QueryClient();

export function SolanaWalletProvider({ children }) {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	);
}

export function ConnectWalletButton() {
	const { address, isConnected } = useAccount();
	const { connect } = useConnect();
	const { disconnect } = useDisconnect();
	const chainId = useChainId();
	const { switchChain } = useSwitchChain();

	const handleConnect = async () => {
		connect({ connector: injected() });
	};

	const needsSwitch = isConnected && chainId !== somniaTestnet.id;

	if (isConnected) {
		return (
			<div className='flex items-center gap-2'>
				<div className='text-sm text-gray-600'>
					{address?.slice(0, 6)}...{address?.slice(-4)}
				</div>
				{needsSwitch && (
					<button
						onClick={() => switchChain({ chainId: somniaTestnet.id })}
						className='px-4 py-2 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600'
					>
						Switch to Somnia
					</button>
				)}
				<button
					onClick={() => disconnect()}
					className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
				>
					Disconnect
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={handleConnect}
			className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
		>
			Connect Wallet
		</button>
	);
}
