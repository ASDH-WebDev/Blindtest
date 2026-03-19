'use client';

import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import GamePlayClient from '../[gameCode]/play/GamePlayClient';

function GamePlayInner() {
	const searchParams = useSearchParams();
	const gameCode = (searchParams.get('gameCode') || 'DEMO').toUpperCase();
	return <GamePlayClient gameCode={gameCode} />;
}

export default function GamePlayPage() {
	return (
		<Suspense fallback={null}>
			<GamePlayInner />
		</Suspense>
	);
}

