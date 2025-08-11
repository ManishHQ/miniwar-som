import {
	usePlayersList,
	isHost,
	useMultiplayerState,
	myPlayer,
} from 'playroomkit';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { treasuryService } from '../services/treasuryService';

export const Leaderboard = () => {
	const players = usePlayersList(true);
	const [gameEnded, setGameEnded] = useMultiplayerState('gameEnded', false);
	const [totalStakedAmount, setTotalStakedAmount] = useMultiplayerState(
		'totalStakedAmount',
		0
	);
	const [stakingHistory, setStakingHistory] = useMultiplayerState(
		'stakingHistory',
		[]
	);
	const [redeeming, setRedeeming] = useState(false);
	const [redeemError, setRedeemError] = useState('');
	const [redeemSuccess, setRedeemSuccess] = useState(false);
	const [redeemTxHash, setRedeemTxHash] = useState('');
	const [redeemCountdown, setRedeemCountdown] = useState(0);
	const [treasuryBalance, setTreasuryBalance] = useState(0);
	const [treasuryStatus, setTreasuryStatus] = useState(null);

	const { address, isConnected } = useAccount();

	const currentPlayer = myPlayer();
	const isCurrentPlayerWinner =
		currentPlayer &&
		players.length > 0 &&
		players.find((p) => p.id === currentPlayer.id) ===
			[...players].sort(
				(a, b) =>
					b.state.kills - a.state.kills || a.state.deaths - b.state.deaths
			)[0];

	// Calculate total staked amount from different sources
	const calculatedTotalFromProfiles = players.reduce((sum, player) => {
		return sum + (player.state.profile?.stakeAmount || 0);
	}, 0);

	const calculatedTotalFromHistory = stakingHistory.reduce((sum, stake) => {
		return sum + (stake.amount || 0);
	}, 0);

	// Use the best available total (prefer history over profiles, then stored amount)
	const totalStaked =
		calculatedTotalFromHistory ||
		totalStakedAmount ||
		calculatedTotalFromProfiles;

	// Update the stored total when we have better data
	useEffect(() => {
		const bestTotal = calculatedTotalFromHistory || calculatedTotalFromProfiles;
		if (bestTotal > 0 && bestTotal !== totalStakedAmount) {
			console.log('Updating total staked amount:', {
				fromHistory: calculatedTotalFromHistory,
				fromProfiles: calculatedTotalFromProfiles,
				stored: totalStakedAmount,
				using: bestTotal,
			});
			setTotalStakedAmount(bestTotal);
		}
	}, [
		calculatedTotalFromHistory,
		calculatedTotalFromProfiles,
		totalStakedAmount,
		setTotalStakedAmount,
	]);

	// Redeem winnings function
	const handleRedeem = async () => {
		if (!address || !isConnected || !isCurrentPlayerWinner) return;

		setRedeeming(true);
		setRedeemError('');

		try {
			// Check treasury balance first
			const treasuryBalance = await treasuryService.getTreasuryBalance();
			console.log('Treasury balance:', treasuryBalance);
			if (treasuryBalance < 0.04) {
				setRedeemError(
					`Insufficient treasury balance. Treasury has ${treasuryBalance.toFixed(
						6
					)} STT but needs 0.04 STT`
				);
				return;
			}

			// Use treasury service to send winnings
			const result = await treasuryService.sendWinnings(
				address,
				0.04 // STT amount (equivalent to ETH on Somnia testnet)
			);

			console.log('Redeem result:', result);

			if (result.success) {
				setRedeemSuccess(true);
				setRedeemTxHash(result.hash);
				setRedeemCountdown(5); // Show for 2 seconds
				// Start 2-second countdown
				const interval = setInterval(() => {
					setRedeemCountdown((prev) => {
						if (prev <= 1) {
							clearInterval(interval);
							setRedeemTxHash('');
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
				console.log('Winnings sent successfully:', result.hash);
			} else {
				setRedeemError(result.error || 'Failed to redeem winnings');
			}
		} catch (err) {
			console.error('Redeem error:', err);
			setRedeemError(`Failed to redeem winnings: ${err.message}`);
		} finally {
			setRedeeming(false);
		}
	};

	// Win detection: host checks if any player has 1+ kills
	useEffect(() => {
		if (!isHost() || gameEnded) return;
		const winner = players.find((p) => p.state.kills >= 5);
		if (winner) {
			setGameEnded(true);
		}
		// remove the hasStaked from the localstorage
		localStorage.removeItem('hasStaked');
	}, [players, gameEnded, setGameEnded]);

	// Load treasury balance when game ends
	useEffect(() => {
		if (gameEnded) {
			const loadTreasuryInfo = async () => {
				try {
					const balance = await treasuryService.getTreasuryBalance();
					setTreasuryBalance(balance);

					const status = await treasuryService.checkTreasuryStatus();
					setTreasuryStatus(status);
					console.log('Treasury status:', status);
				} catch (error) {
					console.error('Failed to load treasury info:', error);
				}
			};
			loadTreasuryInfo();
		}
	}, [gameEnded]);

	// Sort players by kills descending, deaths ascending
	const sortedPlayers = [...players].sort(
		(a, b) => b.state.kills - a.state.kills || a.state.deaths - b.state.deaths
	);

	console.log('Sorted players:', sortedPlayers);

	return (
		<>
			{/* Always show leaderboard in top left */}
			<div className='fixed top-0 left-0 right-0 z-10 flex gap-4 p-4 pointer-events-none'>
				{players.map((player) => (
					<div
						key={player.id}
						className={`flex gap-2 items-center p-2 bg-white bg-opacity-60 rounded-lg backdrop-blur-sm pointer-events-auto min-w-[140px]`}
					>
						<img
							src={player.state.profile?.photo || ''}
							className='w-10 h-10 border-2 rounded-full'
							style={{
								borderColor: player.state.profile?.color,
							}}
						/>
						<div className='flex-grow'>
							<h2 className={`text-sm font-bold`}>
								{player.state.profile?.name}
							</h2>
							<div className='flex items-center gap-4 text-sm'>
								<p>🔫 {player.state.kills}</p>
								<p>💀 {player.state.deaths}</p>
							</div>
						</div>
					</div>
				))}
			</div>
			{/* Overlay when game ends */}
			{gameEnded && (
				<div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fadeIn'>
					<div className='flex flex-col items-center w-full max-w-md gap-6 p-8 bg-white shadow-2xl rounded-2xl'>
						<h2 className='mb-4 text-3xl font-bold text-center'>
							{isCurrentPlayerWinner ? '🏆 You Won!' : '💀 Game Over'}
						</h2>

						{/* Prize pool display */}
						<div className='p-3 text-center bg-yellow-100 rounded-lg'>
							<p className='text-lg font-bold'>💰 Prize Pool</p>
							<p className='text-2xl font-bold text-yellow-600'>0.04 STT</p>
							<p className='text-sm text-gray-600'>
								Treasury: {treasuryBalance.toFixed(6)} STT
							</p>
							<p className='text-xs text-gray-500'>
								Stakes: {stakingHistory.length} players
							</p>
							{treasuryStatus && !treasuryStatus.funded && (
								<p className='mt-1 text-xs text-red-600'>
									⚠️ Treasury not funded - Cannot pay winnings
								</p>
							)}
						</div>

						<div className='flex flex-col w-full gap-2'>
							{sortedPlayers.map((player, i) => (
								<div
									key={player.id}
									className={`flex items-center gap-3 p-2 rounded-lg ${
										i === 0
											? 'bg-yellow-100 border-2 border-yellow-300'
											: 'bg-gray-100'
									}`}
								>
									<span className='w-6 font-bold text-center'>
										{i === 0 ? '🏆' : i + 1}
									</span>
									<img
										src={player.state.profile?.photo || ''}
										className='w-8 h-8 border-2 rounded-full'
										style={{ borderColor: player.state.profile?.color }}
									/>
									<span className='flex-1 font-semibold'>
										{player.state.profile?.name || 'Player'}
									</span>
									<span>🔫 {player.state.kills}</span>
									<span>💀 {player.state.deaths}</span>
								</div>
							))}
						</div>

						{/* Action buttons */}
						<div className='flex flex-col w-full gap-3 mt-4'>
							{isCurrentPlayerWinner && !redeemSuccess ? (
								<button
									className='px-6 py-3 text-lg font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed'
									onClick={handleRedeem}
									disabled={redeeming || !isConnected}
								>
									{redeeming ? (
										<div className='flex items-center justify-center gap-2'>
											<div className='w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin'></div>
											Redeeming...
										</div>
									) : (
										`💎 Redeem 0.04 STT`
									)}
								</button>
							) : redeemSuccess ? (
								<div className='px-6 py-3 text-center text-green-700 bg-green-100 border border-green-400 rounded-lg'>
									🎉 Winnings redeemed successfully!
									{redeemTxHash && (
										<div className='p-4 mt-4 bg-white border-2 border-green-300 rounded-lg shadow-sm'>
											<div className='flex items-center justify-center mb-3'>
												<div className='w-3 h-3 mr-2 bg-green-500 rounded-full animate-pulse'></div>
												<span className='text-sm font-semibold text-green-700'>
													Payout Transaction
												</span>
											</div>
											<p className='mb-3 text-sm font-medium text-gray-700'>
												Transaction Hash:
											</p>
											<div className='p-3 mb-3 rounded-lg bg-gray-50'>
												<code className='font-mono text-xs text-gray-800 break-all'>
													{redeemTxHash}
												</code>
											</div>
											<a
												href={`https://shannon-explorer.somnia.network/tx/${redeemTxHash}`}
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
												View on Somnia Explorer
											</a>
											{redeemCountdown > 0 && (
												<div className='p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50'>
													<div className='flex items-center justify-center'>
														<div className='w-5 h-5 mr-2 border-2 border-blue-600 rounded-full border-t-transparent animate-spin'></div>
														<span className='font-medium text-blue-700'>
															This will close in {redeemCountdown} second
															{redeemCountdown !== 1 ? 's' : ''}...
														</span>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							) : null}

							{redeemError && (
								<div className='px-4 py-3 text-center text-red-700 bg-red-100 border border-red-400 rounded-lg'>
									{redeemError}
								</div>
							)}

							<button
								className='px-6 py-2 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700'
								onClick={() => {
									// Clear localStorage and go home
									localStorage.removeItem('hasStaked');
									window.location.href = '/';
								}}
							>
								{isCurrentPlayerWinner ? '🏠 Go Home' : '🏠 Try Again'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
