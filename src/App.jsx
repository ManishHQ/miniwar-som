import {
	KeyboardControls,
	Loader,
	PerformanceMonitor,
	SoftShadows,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
// import { Bloom, EffectComposer } from '@react-three/postprocessing'; // Temporarily disabled
import { Physics } from '@react-three/rapier';
import { Suspense, useState, useMemo } from 'react';
import { Experience } from './components/Experience';
import { Leaderboard } from './components/Leaderboard';
import {
	SolanaWalletProvider,
	ConnectWalletButton,
} from './components/WalletProvider';
import CompetitionUI from './components/CompetitionUI';

export const Controls = {
	forward: 'forward',
	back: 'back',
	left: 'left',
	right: 'right',
	fire: 'fire',
};

function App() {
	const [downgradedPerformance, setDowngradedPerformance] = useState(false);
	// Check localStorage for previous staking state
	const [hasStaked, setHasStaked] = useState(() => {
		return localStorage.getItem('hasStaked') === 'true';
	});
	// Only show modal if user hasn't staked before
	const [showStakeModal, setShowStakeModal] = useState(() => {
		return localStorage.getItem('hasStaked') !== 'true';
	});
	// Auto-start game if user has already staked
	const [gameStarted, setGameStarted] = useState(() => {
		return localStorage.getItem('hasStaked') === 'true';
	});
	const [gameMode, setGameMode] = useState('create'); // Default to create mode for quick testing
	const [roomId, setRoomId] = useState('');

	const handleGameStart = (mode, roomIdParam) => {
		setGameMode(mode);
		setRoomId(roomIdParam);
		setGameStarted(true);
		setShowStakeModal(false);
	};

	// Sync hasStaked state with localStorage changes
	const syncStakingState = () => {
		const stakedState = localStorage.getItem('hasStaked') === 'true';
		setHasStaked(stakedState);
		setShowStakeModal(!stakedState);
		setGameStarted(stakedState);
	};

	const keyboardMap = useMemo(
		() => [
			{ name: Controls.forward, keys: ['KeyW'] },
			{ name: Controls.back, keys: ['KeyS'] },
			{ name: Controls.left, keys: ['KeyA'] },
			{ name: Controls.right, keys: ['KeyD'] },
			{ name: Controls.fire, keys: ['Space'] },
		],
		[]
	);

	return (
		<SolanaWalletProvider>
			<KeyboardControls map={keyboardMap}>
				<div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
					<ConnectWalletButton />
				</div>
				<Loader />
				<Leaderboard />
				<CompetitionUI
					hasStaked={hasStaked}
					setHasStaked={setHasStaked}
					showStakeModal={showStakeModal}
					setShowStakeModal={setShowStakeModal}
					onGameStart={handleGameStart}
				/>
				<Canvas
					shadows
					camera={{ position: [0, 30, 0], fov: 30, near: 2 }}
					dpr={[1, 1.5]} // optimization to increase performance on retina/4k devices
				>
					<color attach='background' args={['#242424']} />
					<SoftShadows size={42} />

					<PerformanceMonitor
						// Detect low performance devices
						onDecline={() => {
							setDowngradedPerformance(true);
						}}
					/>
					<Suspense>
						<Physics>
							<Experience
								downgradedPerformance={downgradedPerformance}
								hasStaked={hasStaked}
								setHasStaked={setHasStaked}
								gameStarted={gameStarted}
								gameMode={gameMode}
								roomId={roomId.replace(/^r/i, '')}
							/>
						</Physics>
					</Suspense>
					{!downgradedPerformance &&
						// Temporarily disabled due to shader compatibility issues
						// <EffectComposer disableNormalPass>
						// 	<Bloom luminanceThreshold={1} intensity={1.5} mipmapBlur />
						// </EffectComposer>
						null}
				</Canvas>
			</KeyboardControls>
		</SolanaWalletProvider>
	);
}

export default App;
