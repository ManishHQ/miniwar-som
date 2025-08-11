import React, { useState, useEffect } from 'react';
import { ConnectWalletButton } from './WalletProvider';
import { myPlayer, useMultiplayerState } from 'playroomkit';
import {
	useAccount,
	useSendTransaction,
	usePublicClient,
	useChainId,
	useSwitchChain,
} from 'wagmi';
import { parseEther } from 'viem';
import { somniaTestnet, treasuryService } from '../services/treasuryService';

export default function CompetitionUI({
	hasStaked,
	setHasStaked,
	showStakeModal,
	setShowStakeModal,
	onGameStart,
}) {
	const [mode, setMode] = useState(''); // 'create' or 'join'
	const [stakeAmount, setStakeAmount] = useState(0.1);
	const [roomId, setRoomId] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [createdRoomId, setCreatedRoomId] = useState('');
	const [showTxHash, setShowTxHash] = useState('');
	const [countdown, setCountdown] = useState(0);
	const [totalStakedAmount, setTotalStakedAmount] = useMultiplayerState(
		'totalStakedAmount',
		0
	);
	const [stakingHistory, setStakingHistory] = useMultiplayerState(
		'stakingHistory',
		[]
	);

	const { address, isConnected } = useAccount();
	const { sendTransactionAsync } = useSendTransaction();
	const publicClient = usePublicClient();
	const activeChainId = useChainId();
	const { switchChain } = useSwitchChain();

	useEffect(() => {
		if (!showStakeModal) return;
		try {
			let rid = null;
			// Hash fragment format: #r=ROOMID or #r=ROOMID&other=...
			if (window.location.hash) {
				const frag = window.location.hash.replace(/^#/, '');
				const hashParams = new URLSearchParams(frag);
				rid = hashParams.get('r');
			}
			// Also support query param ?r=ROOMID
			if (!rid && window.location.search) {
				const qs = new URLSearchParams(window.location.search);
				rid = qs.get('r');
			}
			if (rid) {
				setMode((m) => (m === '' ? 'join' : m));
				setRoomId(rid);
			}
		} catch (e) {
			console.warn('Room deeplink parse failed', e);
		}
	}, [showStakeModal]);

	const handleGoHome = () => {
		// Clear staking state to allow user to start over
		setHasStaked(false);
		localStorage.removeItem('hasStaked');
		localStorage.removeItem('playerProfile');
		setShowStakeModal(true);
		setMode('');
		setError('');
		setSuccess(false);
		setShowTxHash('');
		setCountdown(0);
	};

	const handleStake = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess(false);
		let txHash = '';

		// Triple-check to prevent duplicate staking
		if (hasStaked || localStorage.getItem('hasStaked') === 'true') {
			setError('You have already staked. Cannot stake multiple times.');
			return;
		}

		// Check staking history to prevent duplicates
		const hasAlreadyStaked = stakingHistory.some(
			(stake) => stake.wallet === address
		);
		if (hasAlreadyStaked) {
			setError(
				'You have already staked in this game. Cannot stake multiple times.'
			);
			return;
		}

		if (!address || !isConnected) {
			setError('Please connect your wallet first.');
			return;
		}

		if (stakeAmount <= 0) {
			setError('Please enter a valid stake amount.');
			return;
		}

		if (activeChainId && activeChainId !== somniaTestnet.id) {
			setError('Wrong network. Please switch to Somnia Testnet.');
			return;
		}

		setLoading(true);
		try {
			// Get treasury address from service
			const treasuryAddress = treasuryService.getTreasuryAddress();
			if (!treasuryAddress) {
				throw new Error('Treasury address not available');
			}
			console.log({ treasuryAddress });

			// 1. Send transaction (await user signature)
			txHash = await sendTransactionAsync({
				to: treasuryAddress,
				value: parseEther(stakeAmount.toString()),
				chainId: somniaTestnet.id,
			});
			console.log('Sent tx hash:', txHash);

			// 2. Wait for confirmation
			const receipt = await publicClient.waitForTransactionReceipt({
				hash: txHash,
			});
			console.log('Receipt status:', receipt.status);
			if (receipt.status !== 'success') {
				throw new Error('Transaction failed');
			}

			// 3. Only now update state to mark staking success
			const player = myPlayer();
			if (player) {
				const playerProfile = {
					color: '#64b5f6',
					photo: `https://api.dicebear.com/7.x/thumbs/svg?seed=${address}`,
					name: `Player${Math.floor(Math.random() * 1000)}`,
					wallet: address,
					stakeAmount,
				};
				player.setState('profile', playerProfile);
				localStorage.setItem('playerProfile', JSON.stringify(playerProfile));
			}

			const stakeRecord = {
				wallet: address,
				amount: stakeAmount,
				timestamp: Date.now(),
				txSignature: txHash,
			};
			setStakingHistory([...stakingHistory, stakeRecord]);
			setTotalStakedAmount((prevTotal) => prevTotal + stakeAmount);
			setHasStaked(true);
			localStorage.setItem('hasStaked', 'true');
			setSuccess(true);

			let finalRoomId = roomId.trim();
			if (mode === 'create') {
				const generatedRoomId = Math.floor(
					100000 + Math.random() * 900000
				).toString();
				setCreatedRoomId(generatedRoomId);
				finalRoomId = generatedRoomId;
			}

			setShowTxHash(txHash);
			setCountdown(2);
			const countdownInterval = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(countdownInterval);
						setShowStakeModal(false);
						if (onGameStart) onGameStart(mode, finalRoomId);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (err) {
			console.error('Staking error:', err);
			// Detect user rejection (MetaMask & others use code 4001 or specific names)
			if (
				err?.code === 4001 ||
				/UserRejected|Rejected/i.test(err?.message || err?.name)
			) {
				setError('Transaction cancelled by user.');
			} else {
				setError(err?.message || 'Failed to stake ETH. Please try again.');
			}
		} finally {
			setLoading(false);
		}
	};

	if (!showStakeModal) {
		return null;
	}

	// Don't show the modal if user has already staked (prevent double staking)
	if (hasStaked || localStorage.getItem('hasStaked') === 'true') {
		return null;
	}

	console.log('CompetitionUI showing:', {
		showStakeModal,
		hasStaked,
		showTxHash,
		totalStakedAmount,
	});

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center'>
			<div className='relative flex flex-col w-full max-w-lg gap-6 p-8 mx-4 bg-white shadow-2xl rounded-2xl animate-fadeIn'>
				<h2 className='mb-4 text-3xl font-bold text-center'>🎮 ETH War</h2>
				{isConnected && activeChainId !== somniaTestnet.id && (
					<div className='p-3 text-sm text-yellow-900 bg-yellow-100 border border-yellow-300 rounded'>
						Wrong network.{' '}
						<button
							type='button'
							className='font-semibold underline'
							onClick={() => switchChain({ chainId: somniaTestnet.id })}
						>
							Switch to Somnia Testnet
						</button>
					</div>
				)}

				<div className='mb-4 text-center'>
					<div className='wallet-button-container'>
						<ConnectWalletButton />
					</div>
					{!isConnected && (
						<p className='mt-2 text-sm text-gray-600'>
							Connect your wallet to participate in the tournament
						</p>
					)}
				</div>

				{!mode && (
					<div className='flex flex-col gap-4'>
						<h3 className='text-xl font-semibold text-center'>
							Choose Game Mode
						</h3>
						<div className='grid grid-cols-2 gap-4'>
							<button
								className='px-6 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 animate-pulse-hover'
								onClick={() => setMode('create')}
							>
								🎯 Create Room
							</button>
							<button
								className='px-6 py-4 text-lg font-bold text-white transition-all duration-200 bg-green-600 rounded-lg shadow-lg hover:bg-green-700 animate-pulse-hover'
								onClick={() => setMode('join')}
							>
								🚀 Join Room
							</button>
						</div>
						<div className='text-sm text-center text-gray-600'>
							<p>🔒 Secure ETH staking required to play</p>
							<p>💰 Winner takes all staked ETH</p>
							{totalStakedAmount > 0 && (
								<p className='text-green-600'>
									🏆 Current Prize Pool: {totalStakedAmount.toFixed(6)} ETH
								</p>
							)}
						</div>
					</div>
				)}

				{mode && (
					<form onSubmit={handleStake} className='flex flex-col gap-4'>
						<div className='flex items-center gap-2 mb-4'>
							<button
								type='button'
								className='text-sm text-blue-600 hover:text-blue-800'
								onClick={() => setMode('')}
							>
								← Back
							</button>
							<h3 className='text-lg font-semibold'>
								{mode === 'create'
									? '🎯 Create New Room'
									: '🚀 Join Existing Room'}
							</h3>
						</div>

						<div className='flex flex-col gap-2'>
							<label className='font-semibold'>Stake Amount (ETH)</label>
							<input
								className='px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400'
								type='number'
								step='0.001'
								min='0.001'
								value={stakeAmount}
								onChange={(e) =>
									setStakeAmount(parseFloat(e.target.value) || 0)
								}
								placeholder='0.1'
								required
							/>
						</div>

						{mode === 'join' && (
							<div className='flex flex-col gap-2'>
								<label className='font-semibold'>Room ID</label>
								<input
									className='px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400'
									type='text'
									value={roomId}
									onChange={(e) => setRoomId(e.target.value)}
									placeholder='Enter room ID'
									required
								/>
							</div>
						)}

						<button
							type='submit'
							className='py-3 mt-4 text-lg font-bold text-white transition-all duration-200 rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed'
							disabled={
								loading ||
								!isConnected ||
								hasStaked ||
								localStorage.getItem('hasStaked') === 'true' ||
								(activeChainId && activeChainId !== somniaTestnet.id)
							}
						>
							{' '}
							{loading ? (
								<div className='flex items-center justify-center gap-2'>
									<div className='w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent'></div>
									Processing...
								</div>
							) : hasStaked || localStorage.getItem('hasStaked') === 'true' ? (
								'Already Staked ✓'
							) : (
								`💎 Stake ${stakeAmount} ETH & ${
									mode === 'create' ? 'Create Room' : 'Join Room'
								}`
							)}
						</button>

						{error && (
							<div className='px-4 py-3 text-center text-red-700 bg-red-100 border border-red-400 rounded-lg'>
								{error}
							</div>
						)}

						{success && (
							<div className='px-4 py-3 text-center text-green-700 bg-green-100 border border-green-400 rounded-lg'>
								🎉 Transaction Confirmed!
								{mode === 'create' && createdRoomId && (
									<div className='p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50'>
										<p className='mb-2 text-sm font-semibold text-blue-700'>
											🎯 Room Created!
										</p>
										<p className='mb-2 text-xs text-blue-600'>
											Share this Room ID with other players:
										</p>
										<div className='p-2 bg-white border rounded'>
											<code className='font-mono text-lg font-bold text-blue-800'>
												{createdRoomId}
											</code>
										</div>
									</div>
								)}
								{showTxHash && (
									<div className='p-4 mt-4 bg-white border-2 border-green-300 rounded-lg shadow-sm'>
										<div className='flex items-center justify-center mb-3'>
											<div className='w-3 h-3 mr-2 bg-green-500 rounded-full animate-pulse'></div>
											<span className='text-sm font-semibold text-green-700'>
												Transaction Successful
											</span>
										</div>

										<p className='mb-3 text-sm font-medium text-gray-700'>
											Transaction Hash:
										</p>

										<div className='p-3 mb-3 rounded-lg bg-gray-50'>
											<code className='font-mono text-xs text-gray-800 break-all'>
												{showTxHash}
											</code>
										</div>

										<a
											href={`https://shannon-explorer.somnia.network/tx/${showTxHash}`}
											target='_blank'
											rel='noopener noreferrer'
											className='inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700'
										>
											<svg
												className='w-4 h-4 mr-2'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
												/>
											</svg>
											View on Explorer
										</a>
									</div>
								)}
								{showTxHash && countdown > 0 && (
									<div className='p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50'>
										<div className='flex items-center justify-center'>
											<div className='w-5 h-5 mr-2 border-2 border-blue-600 rounded-full border-t-transparent animate-spin'></div>
											<span className='font-medium text-blue-700'>
												Starting game in {countdown} second
												{countdown !== 1 ? 's' : ''}...
											</span>
										</div>
									</div>
								)}
								{!showTxHash && (
									<div className='mt-2'>
										<span>Processing transaction...</span>
									</div>
								)}
							</div>
						)}

						<div className='mt-2 text-xs text-center text-gray-500'>
							{mode === 'create'
								? 'You will create a new game room and wait for other players.'
								: 'You will join an existing room with other players.'}
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
